/**
 * Config types for the OpenClaw config editor.
 *
 * - Config file: ~/.openclaw/openclaw.json (JSON5)
 * - Strict validation: unknown keys cause boot failure
 * - Hot reload: hybrid mode (most keys hot-apply)
 * - Config RPC: config.get, config.apply, config.patch
 */

import type { SkillsConfig } from "./skills.js";
import type { ChannelConfig, ChannelProvider } from "./channels.js";

// ── Config file shape (top-level keys) ──────────────────────

export interface OpenClawConfig {
    $schema?: string;
    agents?: AgentsConfig;
    channels?: Partial<Record<ChannelProvider, ChannelConfig>>;
    gateway?: GatewayConfig;
    cron?: CronConfig;
    skills?: SkillsConfig;
    env?: EnvConfig;
    tools?: Record<string, unknown>;
    messages?: MessagesConfig;
    hooks?: HooksConfig;
    [key: string]: unknown;
}

export interface AgentsConfig {
    defaults?: AgentDefaults;
    list?: AgentEntry[];
}

export interface AgentDefaults {
    workspace?: string;
    model?: ModelConfig;
    models?: Record<string, { alias?: string }>;
    heartbeat?: { every?: string };
    sandbox?: Record<string, unknown>;
}

export interface AgentEntry {
    id: string;
    workspace?: string;
    groupChat?: {
        mentionPatterns?: string[];
    };
    [key: string]: unknown;
}

export interface ModelConfig {
    primary?: string;
    fallbacks?: string[];
}

export interface GatewayConfig {
    port?: number;
    bind?: string;
    auth?: {
        token?: string;
        password?: string;
        mode?: "token" | "password";
        allowTailscale?: boolean;
    };
    controlUi?: {
        enabled?: boolean;
        basePath?: string;
        allowedOrigins?: string[];
    };
    reload?: {
        mode?: "hybrid" | "hot" | "restart" | "off";
        debounceMs?: number;
    };
    tailscale?: {
        mode?: "serve" | "funnel";
    };
}

export interface CronConfig {
    enabled?: boolean;
    store?: string;
    maxConcurrentRuns?: number;
    webhook?: string;
    webhookToken?: string;
}

export interface EnvConfig {
    [key: string]: string | { vars?: Record<string, string> } | unknown;
    shellEnv?: { enabled?: boolean; timeoutMs?: number };
}

export interface MessagesConfig {
    groupChat?: {
        mentionPatterns?: string[];
    };
    [key: string]: unknown;
}

export interface HooksConfig {
    enabled?: boolean;
    [key: string]: unknown;
}

// ── Config RPC types ────────────────────────────────────────

export interface ConfigGetResponse {
    raw: string;
    hash: string;
    parsed?: OpenClawConfig;
}

export interface ConfigApplyParams {
    raw: string;
    baseHash?: string;
    sessionKey?: string;
    note?: string;
    restartDelayMs?: number;
}

export interface ConfigPatchParams {
    raw: string;
    baseHash: string;
    sessionKey?: string;
    note?: string;
    restartDelayMs?: number;
}

// ── Hot reload categories ───────────────────────────────────

/** Keys that hot-apply in hybrid mode (no restart needed) */
export const HOT_APPLY_KEYS = [
    "web",
    "agent",
    "agents",
    "models",
    "routing",
    "hooks",
    "cron",
    "agent.heartbeat",
    "session",
    "messages",
    "tools",
    "browser",
    "skills",
    "audio",
    "talk",
    "ui",
    "logging",
    "identity",
    "bindings",
] as const;

/** Keys that need a Gateway restart */
export const RESTART_KEYS = [
    "channels.*",
    "gateway.*",
    "discovery",
    "canvasHost",
    "plugins",
    "gateway.reload",
    "gateway.remote",
] as const;
