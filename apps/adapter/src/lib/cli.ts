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

const DEFAULT_TIMEOUT_MS = 30_000;

const COMMAND_TIMEOUTS: Record<string, number> = {
    "gateway restart": 60_000,
    "cron add": 10_000,
    "cron remove": 10_000,
    "skills install": 120_000,
    "clawhub install": 120_000,
    "clawhub update": 120_000,
    doctor: 60_000,
};

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
    duration: number;
    retries?: number;
}

export async function runCli(args: string[], options?: ExecOptions & { retries?: number }): Promise<CliResult> {
    const command = buildCommand(args);
    const maxRetries = options?.retries ?? 1;
    const commandKey = args.slice(0, 2).join(" ");
    const timeout = COMMAND_TIMEOUTS[commandKey] || DEFAULT_TIMEOUT_MS;
    
    let lastError: Error | null = null;
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await executeCommand(command, { timeout, ...options });
            
            // If command succeeded but stderr has content (warnings), log it
            if (result.stderr && result.exitCode === 0) {
                console.warn(`[CLI WARNING] ${commandKey}: ${result.stderr.substring(0, 200)}`);
            }
            
            return {
                ...result,
                duration: Date.now() - startTime,
                retries: attempt > 1 ? attempt : undefined,
            };
        } catch (error) {
            lastError = error as Error;
            
            // Don't retry if it's a user error (bad arguments, etc.)
            if (isUserError(error as Error)) {
                break;
            }
            
            // Don't retry on last attempt
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * attempt, 3000); // Exponential backoff capped at 3s
                console.log(`[CLI RETRY] ${commandKey} attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await sleep(delay);
            }
        }
    }
    
    // All retries exhausted
    return {
        stdout: "",
        stderr: formatError(lastError),
        exitCode: (lastError as any)?.code ?? 1,
        duration: Date.now() - startTime,
        retries: maxRetries,
    };
}

function executeCommand(command: string, options: ExecOptions): Promise<Omit<CliResult, "duration" | "retries">> {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error && !stderr) {
                reject(error);
            } else {
                resolve({
                    stdout: stdout?.toString() || "",
                    stderr: stderr?.toString() || "",
                    exitCode: error ? (error as any).code ?? 1 : 0,
                });
            }
        });
    });
}

function isUserError(error: Error): boolean {
    const userErrorCodes = ["ENOENT", "EACCES", "EPERM"];
    return userErrorCodes.some(code => error.message?.includes(code));
}

function formatError(error: Error | null): string {
    if (!error) return "Unknown error";
    
    if (error.message?.includes("ETIMEDOUT") || error.message?.includes("timeout")) {
        return `Command timed out after ${DEFAULT_TIMEOUT_MS}ms`;
    }
    if (error.message?.includes("ECONNREFUSED")) {
        return "Connection refused. Is the OpenClaw Gateway running?";
    }
    
    return error.message;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
