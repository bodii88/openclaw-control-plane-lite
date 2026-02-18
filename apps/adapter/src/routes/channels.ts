/**
 * Channels routes — reads channel config from openclaw.json
 * and provides editing with hot-reload.
 */

import { Router } from "express";
import { readConfig, writeConfig } from "../lib/config.js";
import { runCli } from "../lib/cli.js";
import JSON5 from "json5";

export const channelsRoutes = Router();

const SUPPORTED_PROVIDERS = [
    "whatsapp", "telegram", "discord", "slack",
    "signal", "imessage", "googlechat", "mattermost", "msteams",
];

/** GET /api/channels/list — list all configured channels */
channelsRoutes.get("/list", async (_req, res) => {
    try {
        const { parsed } = await readConfig();
        const config = parsed as any;
        const channels = config.channels || {};

        const result = SUPPORTED_PROVIDERS.map(provider => ({
            provider,
            enabled: channels[provider]?.enabled !== false && !!channels[provider],
            configured: !!channels[provider],
            dmPolicy: channels[provider]?.dmPolicy || "pairing",
            allowFrom: channels[provider]?.allowFrom || [],
            groups: channels[provider]?.groups || {},
        }));

        res.json({ ok: true, data: result });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** GET /api/channels/status — probe channel connectivity */
channelsRoutes.get("/status", async (_req, res) => {
    try {
        const result = await runCli(["channels", "status", "--probe"]);
        res.json({
            ok: true,
            data: { raw: result.stdout, exitCode: result.exitCode },
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/** PUT /api/channels/:provider — update channel config */
channelsRoutes.put("/:provider", async (req, res) => {
    try {
        const { provider } = req.params;
        if (!SUPPORTED_PROVIDERS.includes(provider)) {
            return res.status(400).json({ ok: false, error: `Unknown provider: ${provider}` });
        }

        const { parsed } = await readConfig();
        const config = parsed as any;

        if (!config.channels) config.channels = {};
        config.channels[provider] = {
            ...config.channels[provider],
            ...req.body,
        };

        const newRaw = JSON5.stringify(config, null, 2);
        await writeConfig(newRaw);

        res.json({
            ok: true,
            data: config.channels[provider],
            warnings: [
                "Channel config changes require a Gateway restart (not hot-reloaded).",
                "Run `openclaw gateway restart` or use the restart button.",
            ],
        });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
