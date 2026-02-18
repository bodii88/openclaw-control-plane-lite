import { Router } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const systemRoutes = Router();

const getRootDir = () => {
    return join(__dirname, "../../.."); // Go up from routes to adapter root
};

/** GET /api/system/version — version info */
systemRoutes.get("/version", async (_req, res) => {
    try {
        const rootDir = getRootDir();
        const packageJson = JSON.parse(await readFile(join(rootDir, "package.json"), "utf-8"));
        
        res.json({
            ok: true,
            data: {
                version: packageJson.version,
                name: packageJson.name,
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || "development",
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err: any) {
        res.status(500).json({
            ok: false,
            error: {
                code: "VERSION_ERROR",
                message: err.message,
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/** GET /api/system/metrics — system metrics */
systemRoutes.get("/metrics", async (_req, res) => {
    try {
        const memUsage = process.memoryUsage();
        
        res.json({
            ok: true,
            data: {
                uptime: {
                    seconds: process.uptime(),
                    formatted: formatUptime(process.uptime()),
                },
                memory: {
                    heapUsed: formatBytes(memUsage.heapUsed),
                    heapTotal: formatBytes(memUsage.heapTotal),
                    rss: formatBytes(memUsage.rss),
                    external: formatBytes(memUsage.external || 0),
                },
                system: {
                    platform: os.platform(),
                    arch: os.arch(),
                    cpus: os.cpus().length,
                    totalMemory: formatBytes(os.totalmem()),
                    freeMemory: formatBytes(os.freemem()),
                },
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err: any) {
        res.status(500).json({
            ok: false,
            error: {
                code: "METRICS_ERROR",
                message: err.message,
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/** GET /api/system/health — detailed health check */
systemRoutes.get("/health", async (_req, res) => {
    try {
        const checks = {
            memory: checkMemory(),
            process: checkProcess(),
        };
        
        const allHealthy = Object.values(checks).every(c => c.healthy);
        
        res.status(allHealthy ? 200 : 503).json({
            ok: allHealthy,
            data: {
                status: allHealthy ? "healthy" : "degraded",
                checks,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err: any) {
        res.status(503).json({
            ok: false,
            error: {
                code: "HEALTH_CHECK_FAILED",
                message: err.message,
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Helpers
function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function checkMemory(): { healthy: boolean; message: string } {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (heapUsedPercent > 90) {
        return { healthy: false, message: `Heap usage critical: ${heapUsedPercent.toFixed(1)}%` };
    }
    if (heapUsedPercent > 75) {
        return { healthy: true, message: `Heap usage high: ${heapUsedPercent.toFixed(1)}%` };
    }
    return { healthy: true, message: `Heap usage normal: ${heapUsedPercent.toFixed(1)}%` };
}

function checkProcess(): { healthy: boolean; message: string } {
    if (process.uptime() < 5) {
        return { healthy: true, message: "Process recently started" };
    }
    return { healthy: true, message: `Process uptime: ${formatUptime(process.uptime())}` };
}
