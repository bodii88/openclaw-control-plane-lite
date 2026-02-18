/**
 * Config routes — reads/writes ~/.openclaw/openclaw.json.
 *
 * IMPORTANT: OpenClaw uses strict validation. Unknown keys cause
 * the Gateway to refuse to boot.
 */

import { Router } from "express";
import { readConfig, writeConfig, hashConfig } from "../lib/config.js";
import JSON5 from "json5";

export const configRoutes = Router();

/** GET /api/config — get full config */
configRoutes.get("/", async (_req, res) => {
    try {
        const { raw, parsed } = await readConfig();
        res.json({
            ok: true,
            data: {
                raw,
                parsed,
                hash: hashConfig(raw),
            },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/config — replace full config */
configRoutes.put("/", async (req, res) => {
    try {
        const { raw, baseHash } = req.body;

        if (!raw) {
            return res.status(400).json({ ok: false, error: "raw config content is required" });
        }

        // Validate JSON5
        try {
            JSON5.parse(raw);
        } catch (e: any) {
            return res.status(400).json({
                ok: false,
                error: `Invalid JSON5: ${e.message}`,
                warnings: [
                    "⚠️ OpenClaw rejects unknown keys and will refuse to boot on invalid config.",
                    "Check your config against the docs: https://docs.openclaw.ai/configuration",
                ],
            });
        }

        // Optimistic concurrency
        if (baseHash) {
            const { raw: currentRaw } = await readConfig();
            const currentHash = hashConfig(currentRaw);
            if (currentHash !== baseHash) {
                return res.status(409).json({
                    ok: false,
                    error: "Config was modified since you loaded it. Refresh and try again.",
                });
            }
        }

        await writeConfig(raw);
        const newHash = hashConfig(raw);

        res.json({
            ok: true,
            data: { hash: newHash },
            warnings: [
                "⚠️ OpenClaw strict validation: unknown keys cause boot failure.",
                "A backup was saved as openclaw.json.bak.",
                "Config hot-reload is active for most keys (hybrid mode).",
                "Channel and gateway.* changes require a restart.",
            ],
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/config/patch — partial config update */
configRoutes.post("/patch", async (req, res) => {
    try {
        const { patch } = req.body;

        if (!patch || typeof patch !== "object") {
            return res.status(400).json({ ok: false, error: "patch object is required" });
        }

        const { raw, parsed } = await readConfig();
        const config = parsed as any;

        // Deep merge patch
        function deepMerge(target: any, source: any): any {
            for (const key of Object.keys(source)) {
                if (source[key] === null) {
                    delete target[key];
                } else if (typeof source[key] === "object" && !Array.isArray(source[key]) &&
                    typeof target[key] === "object" && !Array.isArray(target[key])) {
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        }

        deepMerge(config, patch);
        const newRaw = JSON5.stringify(config, null, 2);
        await writeConfig(newRaw);

        res.json({
            ok: true,
            data: {
                hash: hashConfig(newRaw),
                applied: patch,
            },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** POST /api/config/validate — validate JSON5 without saving */
configRoutes.post("/validate", async (req, res) => {
    try {
        const { raw } = req.body;
        JSON5.parse(raw);
        res.json({
            ok: true,
            data: { valid: true },
            warnings: [
                "JSON5 syntax is valid. Note: OpenClaw may still reject unknown keys at boot time.",
            ],
        });
    } catch (e: any) {
        res.json({
            ok: true,
            data: {
                valid: false,
                error: e.message,
                line: e.lineNumber,
                column: e.columnNumber,
            },
        });
    }
});
