/**
 * Cron job types matching OpenClaw cron docs:
 * https://docs.openclaw.ai/cron
 *
 * Jobs persist under ~/.openclaw/cron/jobs.json
 * Run history: ~/.openclaw/cron/runs/<jobId>.jsonl
 */

// ── Schedule types ──────────────────────────────────────────

export interface ScheduleAt {
    kind: "at";
    at: string; // ISO 8601 or relative ("20m")
}

export interface ScheduleEvery {
    kind: "every";
    everyMs: number;
}

export interface ScheduleCron {
    kind: "cron";
    expr: string;  // 5-field cron
    tz?: string;   // IANA timezone
}

export type CronSchedule = ScheduleAt | ScheduleEvery | ScheduleCron;

// ── Payload types ───────────────────────────────────────────

export interface PayloadSystemEvent {
    kind: "systemEvent";
    text: string;
}

export interface PayloadAgentTurn {
    kind: "agentTurn";
    message: string;
}

export type CronPayload = PayloadSystemEvent | PayloadAgentTurn;

// ── Delivery ────────────────────────────────────────────────

export type DeliveryMode = "announce" | "webhook" | "none";

export interface CronDelivery {
    mode: DeliveryMode;
    channel?: string;
    to?: string;
    bestEffort?: boolean;
}

// ── Wake mode ───────────────────────────────────────────────

export type WakeMode = "now" | "next-heartbeat";

// ── Session target ──────────────────────────────────────────

export type SessionTarget = "main" | "isolated";

// ── Cron Job (full shape) ───────────────────────────────────

export interface CronJob {
    jobId: string;
    name: string;
    description?: string;
    enabled: boolean;
    schedule: CronSchedule;
    sessionTarget: SessionTarget;
    wakeMode: WakeMode;
    payload: CronPayload;
    delivery?: CronDelivery;
    agentId?: string;
    deleteAfterRun: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ── Cron Add params ─────────────────────────────────────────

export interface CronAddParams {
    name: string;
    description?: string;
    schedule: CronSchedule;
    sessionTarget: SessionTarget;
    wakeMode?: WakeMode;         // defaults to "now"
    payload: CronPayload;
    delivery?: CronDelivery;
    agentId?: string;
    enabled?: boolean;           // defaults to true
    deleteAfterRun?: boolean;    // defaults to true for "at"
}

// ── Cron Update params ──────────────────────────────────────

export interface CronUpdateParams {
    jobId: string;
    patch: Partial<Omit<CronJob, "jobId" | "createdAt" | "updatedAt">>;
}

// ── Cron Run/Remove params ──────────────────────────────────

export interface CronRunParams {
    jobId: string;
    mode?: "force" | "due";
}

export interface CronRemoveParams {
    jobId: string;
}

// ── Cron Run History Entry ──────────────────────────────────

export interface CronRunEntry {
    jobId: string;
    runId: string;
    startedAt: string;
    finishedAt?: string;
    status: "success" | "failure" | "running";
    error?: string;
    deliveryResult?: string;
}

// ── Wizard form state (UI-only) ─────────────────────────────

export type WizardScheduleType = "once" | "daily" | "weekly" | "monthly" | "custom";

export interface CronWizardForm {
    name: string;
    description: string;
    scheduleType: WizardScheduleType;
    // Once
    dateTime?: string;
    // Repeating
    time?: string;  // HH:mm
    timezone: string;
    dayOfWeek?: number;   // 0-6 for weekly
    dayOfMonth?: number;  // 1-31 for monthly
    // Custom cron
    cronExpr?: string;
    // Execution
    sessionTarget: SessionTarget;
    wakeMode: WakeMode;
    // Payload
    payloadKind: "systemEvent" | "agentTurn";
    payloadText: string;
    // Delivery
    deliveryMode: DeliveryMode;
    deliveryChannel?: string;
    deliveryTo?: string;
    // Options
    deleteAfterRun: boolean;
    agentId?: string;
}
