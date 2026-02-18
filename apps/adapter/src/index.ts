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
import { gatewayRoutes } from "./routes/gateway.js";
import { cronRoutes } from "./routes/cron.js";
import { skillsRoutes } from "./routes/skills.js";
import { channelsRoutes } from "./routes/channels.js";
import { configRoutes } from "./routes/config.js";
import { logsRoutes } from "./routes/logs.js";
import { sessionsRoutes } from "./routes/sessions.js";

import { shouldUseWsl } from "./lib/cli.js";

const app = express();
const PORT = parseInt(process.env.ADAPTER_PORT || "3001", 10);
const HOST = process.env.ADAPTER_HOST || "127.0.0.1";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "openclaw-control-plane-adapter", time: new Date().toISOString(), wsl: shouldUseWsl() });
});

// Route groups
app.use("/api/gateway", gatewayRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/config", configRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/sessions", sessionsRoutes);

app.listen(PORT, HOST, () => {
    const useWsl = shouldUseWsl();
    console.log(`\n🦞 OpenClaw Control Plane Adapter`);
    console.log(`   Listening on http://${HOST}:${PORT}`);
    console.log(`   Gateway URL: ${process.env.GATEWAY_URL || "ws://127.0.0.1:18789"}`);
    console.log(`   WSL mode: ${useWsl ? "✅ ENABLED (commands routed via wsl)" : "❌ disabled (native)"}`);
    if (useWsl && process.env.OPENCLAW_WSL_DISTRO) {
        console.log(`   WSL distro: ${process.env.OPENCLAW_WSL_DISTRO}`);
    }
    console.log();
});

