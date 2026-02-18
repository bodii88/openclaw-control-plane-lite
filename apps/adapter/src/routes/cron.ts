/**
 * Cron routes — wraps `openclaw cron` CLI commands.
 *
 * IMPORTANT: Do NOT edit jobs.json directly while the Gateway is
 * running. Always use CLI/tool calls.
 */

import { Router } from "express";
import { runCli } from "../lib/cli.js";

export const cronRoutes = Router();

/** GET /api/cron/list — list all cron jobs */
cronRoutes.get("/list", async (_req, res) => {
    try {
        const result = await runCli(["cron", "list", "--json"]);
        if (result.exitCode === 0) {
            try {
                const data = JSON.parse(result.stdout);
                res.json({ ok: true, data });
            } catch {
                res.json({ ok: true, data: { raw: result.stdout } });
            }
        } else {
            res.json({ ok: false, error: result.stderr || result.stdout });
        }
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/cron/add — add a new cron job */
cronRoutes.post("/add", async (req, res) => {
    try {
        const { name, schedule, sessionTarget, wakeMode, payload, delivery, agentId, deleteAfterRun, description } = req.body;

        const args: string[] = ["cron", "add", "--name", `"${name}"`];

        // Schedule
        if (schedule.kind === "at") {
            args.push("--at", schedule.at);
        } else if (schedule.kind === "cron") {
            args.push("--cron", `"${schedule.expr}"`);
            if (schedule.tz) args.push("--tz", schedule.tz);
        } else if (schedule.kind === "every") {
            args.push("--every", String(schedule.everyMs));
        }

        // Session target
        args.push("--session", sessionTarget || "main");

        // Payload
        if (payload.kind === "systemEvent") {
            args.push("--system-event", `"${payload.text}"`);
        } else {
            args.push("--message", `"${payload.message}"`);
        }

        // Wake mode
        if (wakeMode) args.push("--wake", wakeMode);

        // Delivery
        if (delivery?.mode === "announce") {
            args.push("--announce");
            if (delivery.channel) args.push("--channel", delivery.channel);
            if (delivery.to) args.push("--to", `"${delivery.to}"`);
        } else if (delivery?.mode === "webhook") {
            args.push("--webhook", `"${delivery.to}"`);
        }

        // Agent
        if (agentId) args.push("--agent", agentId);

        // Options
        if (deleteAfterRun) args.push("--delete-after-run");

        const result = await runCli(args);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
            error: result.exitCode !== 0 ? result.stderr || result.stdout : undefined,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/cron/run — run a cron job now */
cronRoutes.post("/run", async (req, res) => {
    try {
        const { jobId, mode } = req.body;
        const args = ["cron", "run", jobId];
        if (mode === "due") args.push("--due");
        const result = await runCli(args);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
            error: result.exitCode !== 0 ? result.stderr : undefined,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/cron/runs?jobId=xxx — get run history */
cronRoutes.get("/runs", async (req, res) => {
    try {
        const jobId = req.query.jobId as string;
        const limit = req.query.limit as string || "50";
        const args = ["cron", "runs"];
        if (jobId) args.push("--id", jobId);
        args.push("--limit", limit);
        const result = await runCli(args);
        if (result.exitCode === 0) {
            try {
                res.json({ ok: true, data: JSON.parse(result.stdout) });
            } catch {
                res.json({ ok: true, data: { raw: result.stdout } });
            }
        } else {
            res.json({ ok: false, error: result.stderr });
        }
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** DELETE /api/cron/:jobId — remove a cron job */
cronRoutes.delete("/:jobId", async (req, res) => {
    try {
        const result = await runCli(["cron", "remove", req.params.jobId]);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
            error: result.exitCode !== 0 ? result.stderr : undefined,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
