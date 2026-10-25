import { startWorker } from "./worker.js";
import redisClient, { blockingRedisClient } from "./redis.js";

async function main() {
    try{
        // Separate Redis client/connection from the API process,
        // but both connect to the same Redis server.        
        await redisClient.connect();
        await blockingRedisClient.connect();
        await startWorker();
    }
    catch(error){
        console.error("Worker failed to start:", error);
    }
}

main();

