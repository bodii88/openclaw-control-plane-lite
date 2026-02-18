/**
 * CLI executor — runs openclaw CLI commands and returns output.
 *
 * WSL support: When OPENCLAW_USE_WSL=true (or auto-detected on Windows),
 * all commands are prefixed with `wsl` so they execute inside WSL.
 * Uses `bash -lc` (login shell) to ensure the user's PATH is loaded.
 *
 * Safety: All commands are constructed from allowlisted command fragments,
 * never from raw user input.
 */

import { exec, ExecOptions } from "child_process";
import os from "os";

const TIMEOUT_MS = 30_000;

/**
 * Detect whether to use WSL.
 * Priority: env OPENCLAW_USE_WSL > auto-detect Windows platform.
 */
function shouldUseWsl(): boolean {
    const envVal = process.env.OPENCLAW_USE_WSL;
    if (envVal !== undefined) {
        return envVal === "true" || envVal === "1";
    }
    // Auto-detect: if we're on Windows, assume WSL
    return os.platform() === "win32";
}

/** The WSL distro to use. Defaults to the default distro if unset. */
function getWslDistro(): string | undefined {
    return process.env.OPENCLAW_WSL_DISTRO || undefined;
}

/**
 * Build the full shell command, prefixing with `wsl` if needed.
 *
 * On Windows: uses `wsl -- bash -lc '<command>'` so the user's login
 * profile is loaded (PATH includes ~/.npm-global/bin etc).
 *
 * Single quotes are used for the bash -lc argument. Any inner single
 * quotes in the command are escaped using the bash idiom: ' -> '\''
 */
export function buildCommand(args: string[]): string {
    const openclawCmd = `openclaw ${args.join(" ")}`;

    if (shouldUseWsl()) {
        const distro = getWslDistro();
        const distroFlag = distro ? `-d ${distro} ` : "";
        // Escape any single quotes in the command for safe nesting
        const escaped = openclawCmd.replace(/'/g, "'\\''");
        return `wsl ${distroFlag}-- bash -lc '${escaped}'`;
    }

    return openclawCmd;
}

/**
 * Build a spawn-compatible command + args array for streaming processes.
 * For WSL, uses bash -lc so PATH includes user-installed binaries.
 */
export function buildSpawnArgs(args: string[]): { cmd: string; spawnArgs: string[] } {
    if (shouldUseWsl()) {
        const distro = getWslDistro();
        const distroArgs = distro ? ["-d", distro] : [];
        const fullCmd = `openclaw ${args.join(" ")}`;
        return {
            cmd: "wsl",
            spawnArgs: [...distroArgs, "--", "bash", "-lc", fullCmd],
        };
    }
    return {
        cmd: "openclaw",
        spawnArgs: args,
    };
}

export interface CliResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export async function runCli(args: string[], options?: ExecOptions): Promise<CliResult> {
    const command = buildCommand(args);

    return new Promise((resolve) => {
        exec(command, { timeout: TIMEOUT_MS, ...options }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout?.toString() || "",
                stderr: stderr?.toString() || "",
                exitCode: error ? (error as any).code ?? 1 : 0,
            });
        });
    });
}

/**
 * Run a CLI command and attempt to parse JSON from stdout.
 */
export async function runCliJson<T = unknown>(args: string[]): Promise<{ data?: T; error?: string }> {
    const result = await runCli(args);
    if (result.exitCode !== 0) {
        return { error: result.stderr || result.stdout || "Command failed" };
    }
    try {
        const data = JSON.parse(result.stdout) as T;
        return { data };
    } catch {
        return { data: result.stdout as unknown as T };
    }
}

/**
 * Run openclaw gateway call <method> --params '<json>'
 *
 * Note: The JSON params are single-quoted for bash. The buildCommand
 * function handles escaping, so we do NOT add extra quotes here.
 */
export async function gatewayCall<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
    const paramsStr = JSON.stringify(params);
    // Don't wrap in extra quotes — buildCommand handles the quoting via bash -lc
    return runCliJson<T>(["gateway", "call", method, "--params", paramsStr]);
}

/** Expose WSL detection for other modules */
export { shouldUseWsl };
