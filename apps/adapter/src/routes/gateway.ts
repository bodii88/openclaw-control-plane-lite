import { Router } from "express";
import { runCli, runCliJson } from "../lib/cli.js";

export const gatewayRoutes = Router();

/** GET /api/gateway/status — Gateway status */
gatewayRoutes.get("/status", async (_req, res) => {
    try {
        const result = await runCli(["gateway", "status", "--json"]);
        if (result.exitCode === 0) {
            try {
                const data = JSON.parse(result.stdout);
                res.json({ ok: true, data });
            } catch {
                // Not JSON, parse text output
                const running = result.stdout.toLowerCase().includes("running");
                res.json({
                    ok: true,
                    data: {
                        running,
                        rpcProbe: running ? "ok" : "unknown",
                        port: 18789,
                        bindHost: "127.0.0.1",
                        raw: result.stdout
                    }
                });
            }
        } else {
            res.json({
                ok: true,
                data: {
                    running: false,
                    rpcProbe: "fail",
                    port: 18789,
                    bindHost: "127.0.0.1",
                    error: result.stderr || "Gateway not running"
                }
            });
        }
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/gateway/health — full system status */
gatewayRoutes.get("/health", async (_req, res) => {
    try {
        const result = await runCli(["status"]);
        res.json({ ok: true, data: { raw: result.stdout, exitCode: result.exitCode } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/gateway/doctor — run diagnostics */
gatewayRoutes.get("/doctor", async (_req, res) => {
    try {
        const result = await runCli(["doctor"]);
        res.json({
            ok: true,
            data: {
                passed: result.exitCode === 0,
                raw: result.stdout + result.stderr,
            },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/gateway/restart — restart the gateway */
gatewayRoutes.post("/restart", async (_req, res) => {
    try {
        const result = await runCli(["gateway", "restart"]);
        res.json({ ok: result.exitCode === 0, data: { raw: result.stdout } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/gateway/channels-status — probe channels */
gatewayRoutes.get("/channels-status", async (_req, res) => {
    try {
        const result = await runCli(["channels", "status", "--probe"]);
        res.json({ ok: true, data: { raw: result.stdout, exitCode: result.exitCode } });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
