/**
 * Skills routes — wraps `openclaw skills` and `clawhub` CLI commands.
 * Also reads skills config from openclaw.json.
 */

import { Router } from "express";
import { runCli } from "../lib/cli.js";
import { readConfig, writeConfig, getSkillsDir } from "../lib/config.js";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import JSON5 from "json5";

export const skillsRoutes = Router();

/** GET /api/skills/list — list all skills with status */
skillsRoutes.get("/list", async (_req, res) => {
    try {
        const result = await runCli(["skills", "list", "--json"]);
        if (result.exitCode === 0) {
            try {
                res.json({ ok: true, data: JSON.parse(result.stdout) });
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

/** GET /api/skills/check — check skills requirements */
skillsRoutes.get("/check", async (_req, res) => {
    try {
        const result = await runCli(["skills", "check"]);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout + result.stderr },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/skills/info/:name — skill details */
skillsRoutes.get("/info/:name", async (req, res) => {
    try {
        const result = await runCli(["skills", "info", req.params.name]);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
            error: result.exitCode !== 0 ? result.stderr : undefined,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/skills/install — install from ClawHub */
skillsRoutes.post("/install", async (req, res) => {
    try {
        const { slug } = req.body;
        if (!slug) return res.status(400).json({ ok: false, error: "slug is required" });

        const result = await runCli(["clawhub", "install", slug]);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
            error: result.exitCode !== 0 ? result.stderr || result.stdout : undefined,
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/skills/update-all — update all installed skills */
skillsRoutes.post("/update-all", async (_req, res) => {
    try {
        const result = await runCli(["clawhub", "update", "--all"]);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/skills/sync — sync all skills */
skillsRoutes.post("/sync", async (_req, res) => {
    try {
        const result = await runCli(["clawhub", "sync", "--all"]);
        res.json({
            ok: result.exitCode === 0,
            data: { raw: result.stdout },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/skills/create — create a new skill file */
skillsRoutes.post("/create", async (req, res) => {
    try {
        const { name, content, filename } = req.body;
        if (!name || !content) return res.status(400).json({ ok: false, error: "name and content are required" });

        const skillsDir = await getSkillsDir();
        await mkdir(skillsDir, { recursive: true });

        const safeFilename = (filename || name).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() + ".ts";
        const filePath = path.join(skillsDir, safeFilename);

        await writeFile(filePath, content, "utf-8");

        res.json({
            ok: true,
            data: { path: filePath, name },
            warnings: ["Skill created. You may need to restart the Gateway for it to be loaded if it's not hot-reloaded."],
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/skills/config — get skills config section */
skillsRoutes.get("/config", async (_req, res) => {
    try {
        const { parsed } = await readConfig();
        res.json({ ok: true, data: (parsed as any).skills || {} });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/skills/config — update skill config entry */
skillsRoutes.put("/config", async (req, res) => {
    try {
        const { skillKey, entry } = req.body;
        if (!skillKey) return res.status(400).json({ ok: false, error: "skillKey is required" });

        const { raw, parsed } = await readConfig();
        const config = parsed as any;

        if (!config.skills) config.skills = {};
        if (!config.skills.entries) config.skills.entries = {};

        config.skills.entries[skillKey] = {
            ...config.skills.entries[skillKey],
            ...entry,
        };

        const newRaw = JSON5.stringify(config, null, 2);
        await writeConfig(newRaw);
        res.json({
            ok: true,
            data: config.skills.entries[skillKey],
            warnings: [
                "skills.entries.*.env and skills.entries.*.apiKey inject secrets into the host agent run, NOT the sandbox.",
                "Config hot-reload will apply this change. No restart needed.",
            ],
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/skills/locations — show skill locations and precedence */
skillsRoutes.get("/locations", async (_req, res) => {
    try {
        const { parsed } = await readConfig();
        const config = parsed as any;
        const workspace = config?.agents?.defaults?.workspace || "~/.openclaw/workspace";
        const extraDirs = config?.skills?.load?.extraDirs || [];

        res.json({
            ok: true,
            data: {
                precedence: [
                    { order: 1, label: "Bundled", description: "Shipped with OpenClaw install", path: "(built-in)" },
                    { order: 2, label: "Managed/Local", description: "~/.openclaw/skills", path: await getSkillsDir() },
                    { order: 3, label: "Workspace", description: "Wins on name conflicts", path: `${workspace}/skills` },
                    ...(extraDirs.map((dir: string, i: number) => ({
                        order: 4 + i,
                        label: `Extra dir ${i + 1}`,
                        description: "From skills.load.extraDirs",
                        path: dir,
                    }))),
                ],
                note: "Workspace skills override managed and bundled skills on name conflict.",
            },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
