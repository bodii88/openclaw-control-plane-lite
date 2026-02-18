/**
 * Sessions routes — session listing.
 * Gateway is the source of truth for session state.
 */

import { Router } from "express";
import { runCli } from "../lib/cli.js";

export const sessionsRoutes = Router();

/** GET /api/sessions — list sessions */
sessionsRoutes.get("/", async (_req, res) => {
    try {
        const result = await runCli(["sessions", "list", "--json"]);
        if (result.exitCode === 0) {
            try {
                res.json({ ok: true, data: JSON.parse(result.stdout) });
            } catch {
                res.json({ ok: true, data: { raw: result.stdout } });
            }
        } else {
            res.json({
                ok: false,
                error: result.stderr || result.stdout,
                warnings: [
                    "The Gateway is the source of truth for session state.",
                    "Sessions cannot be inferred from local files.",
                ],
            });
        }
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
