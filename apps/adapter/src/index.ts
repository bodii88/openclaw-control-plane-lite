/**
 * OpenClaw Control Plane Lite — Adapter Service
 *
 * Node.js service that bridges the UI to the OpenClaw Gateway:
 * - Executes CLI commands (cron, skills, doctor, logs)
 * - Reads/writes config files
 * - Manages Gateway WebSocket connections
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { gatewayRoutes } from "./routes/gateway.js";
import { cronRoutes } from "./routes/cron.js";
import { skillsRoutes } from "./routes/skills.js";
import { channelsRoutes } from "./routes/channels.js";
import { configRoutes } from "./routes/config.js";
import { logsRoutes } from "./routes/logs.js";
import { sessionsRoutes } from "./routes/sessions.js";
import { systemRoutes } from "./routes/system.js";
import { approvalRoutes } from "./routes/approval.js";

import { shouldUseWsl } from "./lib/cli.js";
import {
    errorHandler,
    notFoundHandler,
    requestLogger,
    rateLimiter,
    securityHeaders,
    corsOptions,
    sanitizeInput,
    bodySizeLimiter,
} from "./middleware/index.js";

const app = express();
const PORT = parseInt(process.env.ADAPTER_PORT || "3001", 10);
const HOST = process.env.ADAPTER_HOST || "127.0.0.1";

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(bodySizeLimiter);

// Request tracking & logging
app.use(requestLogger);
app.use(rateLimiter);
app.use(sanitizeInput);

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Health check (before routes)
app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        service: "openclaw-control-plane-adapter",
        version: "1.1.0",
        time: new Date().toISOString(),
        wsl: shouldUseWsl(),
    });
});

// Route groups
app.use("/api/gateway", gatewayRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/config", configRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/approval", approvalRoutes);

// 404 handler (after all routes)
app.use(notFoundHandler);

// Global error handler (last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, HOST, () => {
    const useWsl = shouldUseWsl();
    console.log(`\n🦞 OpenClaw Control Plane Adapter v1.1.0`);
    console.log(`   Listening on http://${HOST}:${PORT}`);
    console.log(`   Gateway URL: ${process.env.GATEWAY_URL || "ws://127.0.0.1:18789"}`);
    console.log(`   WSL mode: ${useWsl ? "✅ ENABLED (commands routed via wsl)" : "❌ disabled (native)"}`);
    console.log(`   Security: ✅ Helmet, Rate Limiting, Validation`);
    if (useWsl && process.env.OPENCLAW_WSL_DISTRO) {
        console.log(`   WSL distro: ${process.env.OPENCLAW_WSL_DISTRO}`);
    }
    console.log();
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Unhandled errors
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
