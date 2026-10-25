import type { Request, Response, NextFunction } from "express";

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
){
    console.log(err);
    return res.status(501).json({
        message: "Internal server error"
    })
}