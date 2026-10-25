import express from "express";
import router from "./routes/jobRoutes.js";
import pool from "./db.js";
import redisClient from "./redis.js";
import { errorHandler } from "./middleware/errorHandler.js"
import type { Request, Response, NextFunction } from "express";

const app = express();
app.use(express.json());
app.use(logger);

function logger(req: Request, res: Response, next: NextFunction){
    console.log(`${req.method} ${req.url}`);
    next();
}

app.get("/", (_, res) => {
    res.send("Job queue API running")
});

app.use("/jobs", router);
app.use(errorHandler);

pool.query("SELECT NOW()")
    .then((res)=>{
        console.log("Database connected", res.rows[0]);
    })
    .catch((error)=>{
        console.log("Database connection failed", error);
    });

redisClient.connect()
    .then(async() => {
        console.log("Redis connected");

        await redisClient.set("name", "Abhi");

        const value = await redisClient.get("name");

        console.log("Redis value:", value);
    })
    .catch((error) => {
        console.log("Redis connection failed", error);
    });

app.listen(3000, () => {
    console.log("Server running in PORT 3000");
});