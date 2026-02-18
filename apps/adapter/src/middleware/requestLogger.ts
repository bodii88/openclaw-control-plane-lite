import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export interface RequestWithId extends Request {
    requestId: string;
    startTime: number;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startTime = Date.now();
    
    (req as RequestWithId).requestId = requestId;
    (req as RequestWithId).startTime = startTime;
    
    // Add request ID to response headers
    res.setHeader("X-Request-Id", requestId);
    
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    
    console.log(`[REQUEST] ${requestId} | ${req.method} ${req.path} | IP: ${clientIp} | Start: ${new Date().toISOString()}`);
    
    // Log response when finished
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const statusColor = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
        const resetColor = "\x1b[0m";
        
        console.log(
            `${statusColor}[RESPONSE]${resetColor} ${requestId} | ${req.method} ${req.path} | Status: ${status} | Duration: ${duration}ms | End: ${new Date().toISOString()}`
        );
    });
    
    next();
};

export const getRequestId = (req: Request): string => {
    return (req as RequestWithId).requestId || "unknown";
};

export const getRequestDuration = (req: Request): number => {
    return Date.now() - ((req as RequestWithId).startTime || Date.now());
};
