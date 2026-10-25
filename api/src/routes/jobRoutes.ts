import { Router } from "express";
import pool from "../db.js"
import redisClient from "../redis.js";

const router = Router();

// Get all jobs
router.get("/", async(_, res) => {
    const result = await pool.query("SELECT * FROM jobs");
    
    return res.status(200).json(result.rows);
})

// Get job with given id
router.get("/:id", async(req, res) => {
    const id = req.params.id;

    const query = `SELECT * FROM jobs where id = $1`;
    const values = [id];
    const result = await pool.query(query, values);

    if(!result.rows[0]){
        return res.status(404).json({
            message: `No job found for Id: ${id}`
        });
    }

    return res.status(200).json(result.rows[0]);
})

// Create a job
router.post("/", async(req, res) => {
    if(!req.body.type || !req.body.payload){
        return res.status(400).json({
            message: "type and payload are required"
        });
    }

    const query = `INSERT into jobs (id, type, payload, status) values($1, $2, $3, $4) RETURNING *`;
    const values = [Date.now().toString(), req.body.type, req.body.payload, "pending"];
    const result = await pool.query(query, values);

    const job = result.rows[0];
    // add job to Redis
    await redisClient.lPush("jobs", job.id);

    return res.status(201).json(job);
})

// Delete a job
router.delete("/:id", async(req, res) => {
    const id = req.params.id;

    const query = `DELETE FROM jobs where id = $1`;
    const values = [id];
    const result = await pool.query(query, values);

    if (result.rowCount == 0) {
        return res.status(404).json({
            message: `No job found for Id: ${id}`
        });
    }

    return res.status(200).json({
        message: "Job deleted successfully"
    });
})

export default router;

