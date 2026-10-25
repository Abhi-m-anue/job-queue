import { createClient } from "redis";

const redisClient = createClient({
    url: "redis://localhost:6379"
});

const blockingRedisClient = redisClient.duplicate();

redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
})

blockingRedisClient.on("error", (err) => {
    console.error("Blocking Redis Client Error", err);
})

export default redisClient;
export { blockingRedisClient };