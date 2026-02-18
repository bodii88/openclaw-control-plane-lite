/**
 * Channel types matching OpenClaw configuration docs:
 * https://docs.openclaw.ai/configuration
 *
 * Supported providers: whatsapp, telegram, discord, slack,
 * signal, imessage, googlechat, mattermost, msteams
 */

import type { DmPolicy } from "./gateway.js";

export const CHANNEL_PROVIDERS = [
    "whatsapp",
    "telegram",
    "discord",
    "slack",
    "signal",
    "imessage",
    "googlechat",
    "mattermost",
    "msteams",
] as const;

export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number];

// ── Channel config (in openclaw.json under channels.<provider>) ──

export interface ChannelConfig {
    enabled?: boolean;
    dmPolicy?: DmPolicy;
    allowFrom?: string[];
    groupPolicy?: string;
    groupAllowFrom?: string[];
    groups?: Record<
        string,
        {
            requireMention?: boolean;
        }
    >;
    // Provider-specific fields
    botToken?: string;       // telegram, discord, slack
    [key: string]: unknown;
}

// ── Channel detail for the dashboard ────────────────────────

export interface ChannelDetail {
    provider: ChannelProvider;
    enabled: boolean;
    connected: boolean;
    dmPolicy: DmPolicy;
    allowFrom: string[];
    groups: Record<string, { requireMention: boolean }>;
    requireMention: boolean;
    mentionPatterns: string[];
}

// ── Mention config (from agents.list[].groupChat) ───────────

export interface MentionConfig {
    mentionPatterns: string[];
}
