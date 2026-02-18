import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});

export const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = [
            "http://localhost:3004",
            "http://127.0.0.1:3004",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ];
        
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
};

// Prevent common attacks
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
    // Simple sanitization to prevent NoSQL injection
    if (req.body && typeof req.body === "object") {
        for (const key of Object.keys(req.body)) {
            if (key.startsWith("$") || key.includes(".")) {
                delete req.body[key];
            }
        }
    }
    next();
};

// Request size limiter
export const bodySizeLimiter = (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (contentLength > maxSize) {
        res.status(413).json({
            ok: false,
            error: {
                code: "PAYLOAD_TOO_LARGE",
                message: `Request body too large. Max size is ${maxSize / 1024 / 1024}MB`,
                timestamp: new Date().toISOString(),
            },
        });
        return;
    }
    
    next();
};
