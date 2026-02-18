"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
    api: (path: string, options?: RequestInit) => Promise<any>;
}

export default function LogsTab({ api }: Props) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [streaming, setStreaming] = useState(false);
    const [logLevel, setLogLevel] = useState("all");
    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        loadSessions();
        loadRecentLogs();
        return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
    }, []);

    async function loadSessions() {
        setLoadingSessions(true);
        try {
            const res = await api("/api/sessions");
            if (res.ok) setSessions(Array.isArray(res.data) ? res.data : []);
        } catch { }
        setLoadingSessions(false);
    }

    async function loadRecentLogs() {
        setLoadingLogs(true);
        try {
            const res = await api("/api/logs?lines=100");
            if (res.ok) setLogs(res.data || []);
        } catch { }
        setLoadingLogs(false);
    }

    function toggleStream() {
        if (streaming && eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setStreaming(false);
            return;
        }
        const adapterUrl = "http://127.0.0.1:3001";
        const es = new EventSource(`${adapterUrl}/api/logs/stream`);
        es.onmessage = (event) => {
            try {
                const logLine = JSON.parse(event.data);
                setLogs((prev) => [...prev.slice(-500), logLine]);
                logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
            } catch { }
        };
        es.onerror = () => { es.close(); setStreaming(false); };
        eventSourceRef.current = es;
        setStreaming(true);
    }

    const filteredLogs = logs.filter((l: any) => {
        if (logLevel === "all") return true;
        return (l.level || "").toLowerCase() === logLevel;
    });

    return (
        <div className="flex-col">
            <div className="section-header">
                <div>
                    <h2 className="section-title">📋 Sessions & Logs</h2>
                    <p className="section-subtitle">View active sessions and stream live gateway logs</p>
                </div>
                <button className="btn btn-sm" onClick={loadSessions}>🔄 Refresh</button>
            </div>

            {/* Sessions */}
            <div className="card" id="sessions-card">
                <div className="card-header">
                    <h3 className="card-title">🔗 Active Sessions</h3>
                    <span className="badge badge-info">{sessions.length} active</span>
                </div>
                {loadingSessions ? (
                    <div className="loading-dots"><span /><span /><span /></div>
                ) : sessions.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>No active sessions — the Gateway is the source of truth for sessions.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr><th>Session ID</th><th>Channel</th><th>User</th><th>Agent</th><th>Started</th></tr>
                            </thead>
                            <tbody>
                                {sessions.map((s: any, i: number) => (
                                    <tr key={s.sessionId || i}>
                                        <td><code style={{ fontSize: "0.75rem" }}>{s.sessionId || `s-${i}`}</code></td>
                                        <td><span className="badge badge-info">{s.channel || "—"}</span></td>
                                        <td>{s.userId || s.user || "—"}</td>
                                        <td>{s.agentId || s.agent || "default"}</td>
                                        <td>{s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Logs */}
            <div className="card" id="logs-card">
                <div className="card-header">
                    <h3 className="card-title">📜 Gateway Logs</h3>
                    <div className="flex-row gap-sm">
                        <div className="filter-bar" style={{ marginBottom: 0 }}>
                            {["all", "info", "warn", "error", "debug"].map((level) => (
                                <button key={level} className={`filter-chip ${logLevel === level ? "active" : ""}`} onClick={() => setLogLevel(level)}>
                                    {level.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button className={`btn btn-sm ${streaming ? "btn-danger" : "btn-success"}`} onClick={toggleStream} id="stream-toggle">
                            {streaming ? "⏹️ Stop" : "▶️ Stream"}
                        </button>
                        <button className="btn btn-sm" onClick={loadRecentLogs}>🔄</button>
                    </div>
                </div>

                <div className="log-viewer" id="log-viewer">
                    {loadingLogs && !streaming ? (
                        <div className="loading-dots"><span /><span /><span /></div>
                    ) : filteredLogs.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-muted)" }}>
                            {streaming ? "Waiting for log events..." : "No logs to display"}
                        </div>
                    ) : (
                        filteredLogs.map((log: any, i: number) => (
                            <div key={i} className="log-line">
                                <span className="log-time">{log.time || log.timestamp ? new Date(log.time || log.timestamp).toLocaleTimeString() : ""}</span>
                                <span className={`log-level ${(log.level || "info").toLowerCase()}`}>{(log.level || "INFO").toUpperCase()}</span>
                                <span className="log-message">{log.message || log.msg || JSON.stringify(log)}</span>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            <div className="alert alert-info">
                <span>ℹ️</span>
                <div><strong>Session state lives in the Gateway.</strong> Sessions cannot be inferred locally. The Gateway manages routing, sandboxing, and orchestrates all channel interactions. Log streaming uses SSE via <code>openclaw logs --follow</code>.</div>
            </div>
        </div>
    );
}
