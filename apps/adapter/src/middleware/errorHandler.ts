import { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
}

export const errorHandler = (
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const code = err.code || "INTERNAL_ERROR";
    
    console.error(`[ERROR] ${code}: ${err.message}`, {
        stack: err.stack,
        details: err.details,
    });
    
    res.status(statusCode).json({
        ok: false,
        error: {
            code,
            message: err.message || "An unexpected error occurred",
            details: err.details,
            timestamp: new Date().toISOString(),
        },
    });
};

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        ok: false,
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.method} ${req.path} not found`,
            timestamp: new Date().toISOString(),
        },
    });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
