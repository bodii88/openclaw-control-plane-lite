"use client";

import { useState, useEffect } from "react";

interface Props {
    api: (path: string, options?: RequestInit) => Promise<any>;
}

/**
 * Safely convert any value to a renderable string.
 * Prevents "Objects are not valid as a React child" errors.
 */
function safe(val: unknown, fallback: string = "—"): string {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
}

export default function OverviewTab({ api }: Props) {
    const [gwData, setGwData] = useState<any>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [statusRes, channelsRes] = await Promise.allSettled([
                api("/api/gateway/status"),
                api("/api/channels/list"),
            ]);

            const status =
                statusRes.status === "fulfilled" ? statusRes.value : null;
            const ch =
                channelsRes.status === "fulfilled" ? channelsRes.value : null;

            setGwData(status?.data || null);
            setChannels(Array.isArray(ch?.data) ? ch.data : []);
        } catch {
            setGwData(null);
            setChannels([]);
        }
        setLoading(false);
    }

    async function handleQuickAction(action: string) {
        switch (action) {
            case "open-control-ui":
                window.open("http://127.0.0.1:18789", "_blank");
                break;
            case "restart-gateway":
                if (confirm("Restart the OpenClaw Gateway?")) {
                    await api("/api/gateway/restart", { method: "POST" });
                    setTimeout(loadData, 3000);
                }
                break;
            case "run-doctor":
                const res = await api("/api/gateway/doctor");
                alert(res?.data?.raw || "Doctor completed.");
                break;
            case "tail-logs":
                alert("Switch to Sessions & Logs tab to tail logs.");
                break;
        }
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="loading-spinner" />
                <p className="mt-md" style={{ color: "var(--text-secondary)" }}>
                    Loading dashboard...
                </p>
            </div>
        );
    }

    // ── Map the real CLI output structure ──
    // Real shape: { service, config, gateway, port, rpc, extraServices }
    //   port:    { port: 18789, status: "busy", listeners: [...], hints: [...] }
    //   rpc:     { ok: true, url: "ws://..." }
    //   gateway: { bindMode, bindHost }
    //   service: { label, loaded, runtime: { status, state, ... } }
    //   config:  { path, exists, valid }

    const portInfo = gwData?.port || {};
    const rpcInfo = gwData?.rpc || {};
    const gatewayInfo = gwData?.gateway || {};
    const serviceInfo = gwData?.service || {};
    const configInfo = gwData?.config || {};

    // Gateway is "running" if the port is busy (something is listening)
    const isRunning = portInfo.status === "busy" || rpcInfo.ok === true;
    const portNumber = portInfo.port || 18789;
    const bindHost = gatewayInfo.bindHost || "127.0.0.1";
    const rpcOk = rpcInfo.ok === true;

    // Get connected channels from list
    const connectedChannels = channels.filter(
        (c: any) => c.enabled && c.configured
    );

    return (
        <div className="flex-col">
            {/* ── Gateway Status ── */}
            <div className="stats-grid">
                <div className="stat-card" id="stat-gateway">
                    <div className="stat-label">Gateway Status</div>
                    <div className="stat-value flex-row">
                        <span
                            className={`status-dot ${isRunning ? "online" : "offline"}`}
                        />
                        {isRunning ? "Running" : "Stopped"}
                    </div>
                    <div className="stat-detail">
                        Port {portNumber} · {bindHost}
                    </div>
                </div>

                <div className="stat-card" id="stat-rpc">
                    <div className="stat-label">RPC Probe</div>
                    <div className="stat-value">
                        {rpcOk ? (
                            <span className="badge badge-success">OK</span>
                        ) : (
                            <span className="badge badge-danger">
                                {gwData ? "FAIL" : "Unknown"}
                            </span>
                        )}
                    </div>
                    <div className="stat-detail">
                        {rpcInfo.url || "WebSocket control/RPC"}
                    </div>
                </div>

                <div className="stat-card" id="stat-channels">
                    <div className="stat-label">Channels</div>
                    <div className="stat-value">{connectedChannels.length}</div>
                    <div className="stat-detail">
                        {connectedChannels.length > 0
                            ? connectedChannels.map((c: any) => safe(c.provider, "?")).join(", ")
                            : "No channels configured"}
                    </div>
                </div>

                <div className="stat-card" id="stat-service">
                    <div className="stat-label">Service</div>
                    <div className="stat-value" style={{ fontSize: "1.25rem" }}>
                        {safe(serviceInfo.label, "—")}
                    </div>
                    <div className="stat-detail">
                        {serviceInfo.loaded
                            ? `✅ ${safe(serviceInfo.loadedText, "loaded")}`
                            : `❌ ${safe(serviceInfo.notLoadedText, "not loaded")}`}
                    </div>
                </div>
            </div>

            {/* ── Config audit ── */}
            {configInfo.path && (
                <div className={`alert ${configInfo.valid ? "alert-success" : "alert-danger"}`}>
                    <span>{configInfo.valid ? "✅" : "❌"}</span>
                    <div>
                        <strong>Config:</strong>{" "}
                        <code style={{ fontSize: "0.8125rem" }}>{safe(configInfo.path)}</code>
                        {configInfo.exists === false && " — file not found!"}
                        {configInfo.valid === false && " — invalid config detected!"}
                    </div>
                </div>
            )}

            {/* ── Port listeners ── */}
            {portInfo.listeners && portInfo.listeners.length > 0 && (
                <div className="card" id="listeners-card">
                    <div className="card-header">
                        <h3 className="card-title">🔌 Port {portNumber} Listeners</h3>
                        <span className={`badge ${portInfo.status === "busy" ? "badge-success" : "badge-warning"}`}>
                            {safe(portInfo.status, "unknown")}
                        </span>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>PID</th>
                                    <th>Command</th>
                                    <th>Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portInfo.listeners.map((l: any, i: number) => (
                                    <tr key={i}>
                                        <td><code>{safe(l.pid)}</code></td>
                                        <td>{safe(l.command || l.commandLine)}</td>
                                        <td><code>{safe(l.address)}</code></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Hints ── */}
            {portInfo.hints && portInfo.hints.length > 0 && (
                <div className="alert alert-warning">
                    <span>💡</span>
                    <div>
                        {portInfo.hints.map((h: any, i: number) => (
                            <div key={i} style={{ marginBottom: i < portInfo.hints.length - 1 ? "0.25rem" : 0 }}>
                                {safe(h)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Channels summary ── */}
            <div className="card" id="channels-summary-card">
                <div className="card-header">
                    <h3 className="card-title">📡 Channel Status</h3>
                    <span className="badge badge-neutral">
                        {channels.length} providers
                    </span>
                </div>
                {channels.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        No channels configured. Check the Channels tab to set up WhatsApp,
                        Telegram, Discord and more.
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Provider</th>
                                    <th>Status</th>
                                    <th>DM Policy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {channels
                                    .filter((c: any) => c.configured)
                                    .map((ch: any) => (
                                        <tr key={safe(ch.provider, String(Math.random()))}>
                                            <td>
                                                <strong style={{ textTransform: "capitalize" }}>
                                                    {safe(ch.provider)}
                                                </strong>
                                            </td>
                                            <td>
                                                {ch.enabled ? (
                                                    <span className="badge badge-success">Enabled</span>
                                                ) : (
                                                    <span className="badge badge-danger">Disabled</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge badge-info">{safe(ch.dmPolicy)}</span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Quick Actions ── */}
            <div className="card" id="quick-actions-card">
                <div className="card-header">
                    <h3 className="card-title">⚡ Quick Actions</h3>
                </div>
                <div className="quick-actions">
                    <button
                        className="quick-action-btn"
                        onClick={() => handleQuickAction("open-control-ui")}
                        id="action-open-ui"
                    >
                        <span className="icon">🌐</span>
                        Open Control UI
                    </button>
                    <button
                        className="quick-action-btn"
                        onClick={() => handleQuickAction("tail-logs")}
                        id="action-tail-logs"
                    >
                        <span className="icon">📜</span>
                        Tail Logs
                    </button>
                    <button
                        className="quick-action-btn"
                        onClick={() => handleQuickAction("restart-gateway")}
                        id="action-restart"
                    >
                        <span className="icon">🔄</span>
                        Restart Gateway
                    </button>
                    <button
                        className="quick-action-btn"
                        onClick={() => handleQuickAction("run-doctor")}
                        id="action-doctor"
                    >
                        <span className="icon">🩺</span>
                        Run Doctor
                    </button>
                </div>
            </div>

            {/* ── Security notes ── */}
            <div className="alert alert-info" id="security-note">
                <span>ℹ️</span>
                <div>
                    <strong>Gateway is the source of truth</strong> for sessions, routing,
                    and channels. This dashboard connects to the Gateway via its local
                    adapter service. Auth is required by default (token or password). See{" "}
                    <a
                        href="https://docs.openclaw.ai/gateway/security"
                        target="_blank"
                        rel="noopener"
                    >
                        Security docs
                    </a>{" "}
                    for hardening guidance.
                </div>
            </div>
        </div>
    );
}
