/**
 * Skills types matching OpenClaw skills docs:
 * https://docs.openclaw.ai/skills
 *
 * Locations and precedence:
 *   1. Bundled (shipped with install)
 *   2. Managed/local: ~/.openclaw/skills
 *   3. Workspace: <workspace>/skills  (wins on name conflict)
 */

// ── Skill metadata from SKILL.md frontmatter ────────────────

export interface SkillMetadataOpenclaw {
    always?: boolean;
    emoji?: string;
    homepage?: string;
    os?: Array<"darwin" | "linux" | "win32">;
    requires?: SkillRequirements;
    primaryEnv?: string;
    skillKey?: string;
    install?: SkillInstaller[];
}

export interface SkillRequirements {
    bins?: string[];
    anyBins?: string[];
    env?: string[];
    config?: string[];
}

export interface SkillInstaller {
    id: string;
    kind: "brew" | "node" | "go" | "uv" | "download";
    formula?: string;
    package?: string;
    bins?: string[];
    label?: string;
    url?: string;
    os?: string[];
}

export interface SkillFrontmatter {
    name: string;
    description: string;
    metadata?: {
        openclaw?: SkillMetadataOpenclaw;
    };
}

// ── Skill entry as listed in the dashboard ──────────────────

export type SkillLocation = "bundled" | "managed" | "workspace" | "extraDirs";

export type SkillStatus = "eligible" | "disabled" | "missing-requirements";

export interface SkillEntry {
    key: string;
    name: string;
    description: string;
    location: SkillLocation;
    locationPath: string;
    status: SkillStatus;
    enabled: boolean;
    missingRequirements?: string[];
    metadata?: SkillMetadataOpenclaw;
}

// ── Skills config shape (in openclaw.json) ──────────────────

export interface SkillConfigEntry {
    enabled?: boolean;
    apiKey?: string;
    env?: Record<string, string>;
    config?: Record<string, unknown>;
}

export interface SkillsLoadConfig {
    watch?: boolean;
    watchDebounceMs?: number;
    extraDirs?: string[];
}

export interface SkillsInstallConfig {
    nodeManager?: "npm" | "pnpm" | "yarn" | "bun";
}

export interface SkillsConfig {
    entries?: Record<string, SkillConfigEntry>;
    allowBundled?: string[];
    load?: SkillsLoadConfig;
    install?: SkillsInstallConfig;
}

// ── ClawHub operations ──────────────────────────────────────

export interface ClawHubInstallParams {
    slug: string;
}

export interface ClawHubUpdateParams {
    all: boolean;
}

export interface ClawHubSyncParams {
    all: boolean;
}
