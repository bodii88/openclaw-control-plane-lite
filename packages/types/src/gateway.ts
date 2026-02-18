/** Gateway status from `openclaw gateway status --json` */
export interface GatewayStatus {
    running: boolean;
    pid?: number;
    port: number;
    bindHost: string;
    uptime?: string;
    uptimeMs?: number;
    rpcProbe: "ok" | "fail" | "unknown";
    version?: string;
    lastHeartbeat?: string;
}

/** Control-plane (WebSocket) connectivity */
export interface ControlPlaneStatus {
    connected: boolean;
    latencyMs?: number;
    error?: string;
}

/** High-level overview for the Overview tab */
export interface OverviewData {
    gateway: GatewayStatus;
    controlPlane: ControlPlaneStatus;
    channels: ChannelStatusSummary[];
    agents: AgentSummary[];
    skills: SkillsSummary;
    cron: CronSummary;
}

export interface ChannelStatusSummary {
    provider: string;
    enabled: boolean;
    connected: boolean;
    dmPolicy: DmPolicy;
}

export type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

export interface AgentSummary {
    id: string;
    workspace: string;
    isDefault: boolean;
}

export interface SkillsSummary {
    totalInstalled: number;
    eligible: number;
    disabled: number;
    missingRequirements: number;
}

export interface CronSummary {
    enabled: boolean;
    totalJobs: number;
    enabledJobs: number;
    disabledJobs: number;
    nextRun?: string;
    lastRunFailures: number;
}

/** Quick actions available from the Overview */
export type QuickAction =
    | "open-control-ui"
    | "tail-logs"
    | "restart-gateway"
    | "run-doctor";
