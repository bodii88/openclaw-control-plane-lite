/**
 * Config file utilities — reads and writes ~/.openclaw/openclaw.json (JSON5).
 *
 * WSL support: When running on Windows with OpenClaw in WSL, config files
 * live inside the WSL filesystem (e.g. \\wsl$\Ubuntu\home\user\.openclaw\).
 * This module auto-detects the correct path using `wsl` commands.
 *
 * IMPORTANT: OpenClaw uses strict validation. Unknown keys cause
 * boot failure. The adapter validates before writing.
 */

import { readFile, writeFile, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import JSON5 from "json5";
import { exec } from "child_process";
import { shouldUseWsl } from "./cli.js";

/** Cache the resolved WSL home so we don't shell out every time */
let _wslHome: string | null = null;

/**
 * Get the WSL user's home directory, accessible from Windows via \\wsl$\ UNC path.
 * Caches the result after first call.
 */
async function getWslHome(): Promise<string> {
    if (_wslHome) return _wslHome;

    const distro = process.env.OPENCLAW_WSL_DISTRO;

    return new Promise((resolve, reject) => {
        // Ask WSL for the home directory and the distro name
        const distroFlag = distro ? `-d ${distro} ` : "";
        exec(
            `wsl ${distroFlag}-- bash -lc 'echo $HOME'`,
            { timeout: 10_000 },
            (error, stdout) => {
                if (error) {
                    // Fallback: try common default
                    const fallback = "\\\\wsl$\\Ubuntu\\home\\user";
                    console.warn(`⚠️ Could not detect WSL home, falling back to ${fallback}`);
                    _wslHome = fallback;
                    resolve(fallback);
                    return;
                }

                const wslHomePath = stdout.toString().trim(); // e.g. /home/user
                // Now we need the distro name to build the UNC path
                exec(
                    `wsl ${distroFlag}-- bash -c "cat /etc/os-release | grep ^ID= | cut -d= -f2"`,
                    { timeout: 10_000 },
                    (err2, stdout2) => {
                        // Also get the actual WSL distro name for the \\wsl$\ path
                        exec("wsl -l -q", { timeout: 10_000 }, (err3, wslListOut) => {
                            let distroName = "Ubuntu";

                            if (!err3 && wslListOut) {
                                // wsl -l -q returns distro names, first one is default
                                const names = wslListOut
                                    .toString()
                                    .replace(/\0/g, "") // Remove null bytes from wsl output
                                    .split("\n")
                                    .map(s => s.trim())
                                    .filter(Boolean);
                                if (distro) {
                                    distroName = names.find(n => n.toLowerCase() === distro.toLowerCase()) || distro;
                                } else if (names.length > 0) {
                                    distroName = names[0];
                                }
                            }

                            // Convert WSL path to Windows UNC: \\wsl$\<distro>\home\user
                            const winPath = `\\\\wsl$\\${distroName}${wslHomePath.replace(/\//g, "\\")}`;
                            _wslHome = winPath;
                            console.log(`🐧 WSL home detected: ${winPath}`);
                            resolve(winPath);
                        });
                    }
                );
            }
        );
    });
}

export async function getConfigPath(): Promise<string> {
    if (process.env.OPENCLAW_CONFIG_PATH) {
        return process.env.OPENCLAW_CONFIG_PATH;
    }

    if (shouldUseWsl()) {
        const wslHome = await getWslHome();
        return path.join(wslHome, ".openclaw", "openclaw.json");
    }

    return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

export async function getStateDir(): Promise<string> {
    if (process.env.OPENCLAW_STATE_DIR) {
        return process.env.OPENCLAW_STATE_DIR;
    }

    if (shouldUseWsl()) {
        const wslHome = await getWslHome();
        return path.join(wslHome, ".openclaw");
    }

    return path.join(os.homedir(), ".openclaw");
}

export async function getCronDir(): Promise<string> {
    const stateDir = await getStateDir();
    return path.join(stateDir, "cron");
}

export async function getSkillsDir(): Promise<string> {
    const stateDir = await getStateDir();
    return path.join(stateDir, "skills");
}

export async function readConfig(): Promise<{ raw: string; parsed: Record<string, unknown> }> {
    const configPath = await getConfigPath();
    if (!existsSync(configPath)) {
        return { raw: "{}", parsed: {} };
    }
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON5.parse(raw);
    return { raw, parsed };
}

export async function writeConfig(raw: string): Promise<void> {
    const configPath = await getConfigPath();

    // Validate JSON5 can parse
    try {
        JSON5.parse(raw);
    } catch (e: any) {
        throw new Error(`Invalid JSON5: ${e.message}`);
    }

    // Backup before write
    if (existsSync(configPath)) {
        await copyFile(configPath, configPath + ".bak");
    }

    await writeFile(configPath, raw, "utf-8");
}

/**
 * Generate a simple hash of config content for optimistic concurrency.
 */
export function hashConfig(raw: string): string {
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Read cron jobs.json
 */
export async function readCronJobs(): Promise<unknown[]> {
    const cronDir = await getCronDir();
    const jobsPath = path.join(cronDir, "jobs.json");
    if (!existsSync(jobsPath)) return [];
    try {
        const raw = await readFile(jobsPath, "utf-8");
        return JSON.parse(raw);
    } catch {
        return [];
    }
}
