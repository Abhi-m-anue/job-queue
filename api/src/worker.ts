import redisClient, { blockingRedisClient } from "./redis.js";
import pool from "./db.js";

export async function startWorker() {
    console.log("Worker started");

    // every 5 seconds, check for stale jobs and recover them
    setInterval(async () => {
        try{
            await recoverStaleJobs();
        }
        catch(error){
            console.error("Error recovering stale jobs:", error);
        }
    }, 5000);

    while(true){
        const result = await blockingRedisClient.brPop("jobs", 0);
        const jobId = result?.element;

        if(!jobId){
            continue;
        }

        await redisClient.zAdd("processing", {
            score: Date.now(),
            value: jobId 
        });
        
        console.log("Job received", jobId);

        let interval;
        try{
            // Query full job from postgres
            const jobResult = await pool.query(`SELECT * FROM jobs where id = $1`, [jobId]);
            const job = jobResult.rows[0];
            if(!job){
                console.log(`Job ${jobId} not found`);

                await redisClient.zRem("processing", jobId);
                
                continue;
            }

            // Set status of job to processing
            await pool.query(`UPDATE jobs SET status = $1 WHERE id = $2`, ["processing", jobId]);

            interval = setInterval(async() => {
                try {
                    await redisClient.zAdd("processing", {
                        score: Date.now(),
                        value: jobId
                    });
                } catch (error) {
                    console.error(`Heartbeat failed for job ${jobId}:`, error);
                }
            }, 5000);

            console.log("Processing job:", job);
            // dummy processing
            await new Promise(resolve => setTimeout(resolve, 45000));   

            // remove heartbeat interval
            clearInterval(interval);
            // Mark job as completed
            await pool.query(`UPDATE jobs SET status = $1 WHERE id = $2`, ["completed", jobId]);

            await redisClient.zRem("processing", jobId);

            console.log(`Job ${jobId} completed`);
        }
        catch(error){
            console.log(`Job ${jobId} failed to run:`, error);
            
            const result = await pool.query(`UPDATE jobs SET retry_count = retry_count + 1 WHERE id = $1 RETURNING retry_count`,[jobId]);

            const retryCount = result.rows[0].retry_count;
            if(retryCount <= 3){
                console.log(`Retrying job ${jobId}. Attempt ${retryCount}`); 

                await redisClient.zRem("processing", jobId);

                await pool.query(`UPDATE jobs SET status = $1 WHERE id = $2`, ["pending", jobId]);

                await redisClient.lPush("jobs", jobId);  
            }
            else{
                console.log(`Job ${jobId} permanently failed`);

                await redisClient.zRem("processing", jobId);

                await pool.query(`UPDATE jobs SET status = $1 WHERE id = $2`, ["failed", jobId]);
            }
        }
        finally{
            clearInterval(interval);
        }
    }
}

// Just function declaration. Started from workerMain.js

async function recoverStaleJobs() {
    const cutoffTime = Date.now() - 30000; 
    const staleJobs = await redisClient.zRangeByScore("processing", "-inf", cutoffTime);

    for(const jobId of staleJobs){
        const result = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
        const job = result.rows[0];
        if(!job){
            console.log(`Stale job ${jobId} not found in database. Removing from processing set.`);

            await redisClient.zRem("processing", jobId);

            continue;   
        }
        if(job.status === "failed" || job.status === "completed"){
            console.log(`Stale job ${jobId} is already ${job.status}. Removing from processing set.`);

            await redisClient.zRem("processing", jobId);

            continue;
        }
        if (job.status === "processing") {
            console.log(`Found stale job ${jobId} in processing status.`);

            await pool.query(
                `UPDATE jobs SET status = $1 WHERE id = $2`,
                ["pending", jobId]  
            );

            await redisClient.zRem("processing", jobId);
            await redisClient.lPush("jobs", jobId);
        }
    }
}