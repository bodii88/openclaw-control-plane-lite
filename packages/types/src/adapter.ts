/**
 * Adapter API types — the contract between the Node adapter
 * service and the Next.js frontend.
 */

// ── Generic API envelope ────────────────────────────────────

export interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
    warnings?: string[];
}

// ── Connection ──────────────────────────────────────────────

export interface ConnectParams {
    gatewayUrl: string;
    token?: string;
    password?: string;
    saveCredentials?: boolean;
}

export interface ConnectionStatus {
    connected: boolean;
    gatewayUrl: string;
    authenticated: boolean;
    error?: string;
}

// ── Log entry ───────────────────────────────────────────────

export interface LogEntry {
    timestamp: string;
    level: "debug" | "info" | "warn" | "error";
    subsystem?: string;
    channel?: string;
    message: string;
    raw?: string;
}

export type LogFilter = {
    level?: LogEntry["level"];
    subsystem?: string;
    channel?: string;
    search?: string;
};

// ── Session ─────────────────────────────────────────────────

export interface SessionInfo {
    sessionId: string;
    agentId: string;
    channel?: string;
    tokenCount?: number;
    compacted?: boolean;
    lastActivity?: string;
}

// ── Doctor results ──────────────────────────────────────────

export interface DoctorResult {
    passed: boolean;
    checks: DoctorCheck[];
}

export interface DoctorCheck {
    name: string;
    status: "pass" | "fail" | "warn";
    message: string;
    fix?: string;
}
