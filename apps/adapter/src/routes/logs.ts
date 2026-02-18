/**
 * Logs routes — tails OpenClaw logs.
 * Uses `openclaw logs --follow` for streaming.
 *
 * WSL-aware: Uses buildSpawnArgs to route through WSL when needed.
 */

import { Router } from "express";
import { runCli, buildSpawnArgs } from "../lib/cli.js";

export const logsRoutes = Router();

/** GET /api/logs — get recent logs */
logsRoutes.get("/", async (req, res) => {
    try {
        const lines = req.query.lines as string || "100";
        const result = await runCli(["logs", "--lines", lines]);

        // Parse JSON lines format
        const entries = result.stdout
            .split("\n")
            .filter(Boolean)
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { message: line, level: "info", timestamp: new Date().toISOString() };
                }
            });

        res.json({ ok: true, data: entries });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/logs/stream — SSE stream for live logs */
logsRoutes.get("/stream", async (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });

    const { spawn } = await import("child_process");

    // Use buildSpawnArgs to route through WSL if needed
    const { cmd, spawnArgs } = buildSpawnArgs(["logs", "--follow"]);

    const proc = spawn(cmd, spawnArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
    });

    proc.stdout.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
            res.write(`data: ${line}\n\n`);
        }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
        res.write(`data: ${JSON.stringify({ level: "error", message: chunk.toString() })}\n\n`);
    });

    proc.on("close", () => {
        res.write("event: close\ndata: done\n\n");
        res.end();
    });

    req.on("close", () => {
        proc.kill();
    });
});
