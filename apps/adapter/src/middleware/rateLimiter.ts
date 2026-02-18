import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const ipLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 100; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute

const cleanup = () => {
    const now = Date.now();
    for (const [ip, entry] of ipLimits.entries()) {
        if (entry.resetTime < now) {
            ipLimits.delete(ip);
        }
    }
};

// Cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown") as string;
    const now = Date.now();
    
    let entry = ipLimits.get(clientIp);
    
    if (!entry || entry.resetTime < now) {
        // New window
        entry = {
            count: 1,
            resetTime: now + WINDOW_MS,
        };
        ipLimits.set(clientIp, entry);
    } else {
        // Existing window
        entry.count++;
    }
    
    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000));
    
    if (entry.count > RATE_LIMIT) {
        res.status(429).json({
            ok: false,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: `Rate limit exceeded. Try again after ${new Date(entry.resetTime).toISOString()}`,
                retryAfter: Math.ceil((entry.resetTime - now) / 1000),
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    
    next();
};
