export interface Job {
    id: string;
    type: string;
    payload: any;
    status: "pending" | "processing" | "completed" | "failed";
    retryCount: number;
    createdAt: Date;
}