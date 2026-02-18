"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
    api: (path: string, options?: RequestInit) => Promise<any>;
}

export default function ConfigTab({ api }: Props) {
    const [rawConfig, setRawConfig] = useState("");
    const [configHash, setConfigHash] = useState("");
    const [originalRaw, setOriginalRaw] = useState("");
    const [loading, setLoading] = useState(true);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<"form" | "raw">("form");
    const [parsed, setParsed] = useState<any>({});

    useEffect(() => { loadConfig(); }, []);

    async function loadConfig() {
        setLoading(true);
        try {
            const res = await api("/api/config");
            if (res.ok) {
                setRawConfig(res.data.raw || "{}");
                setOriginalRaw(res.data.raw || "{}");
                setConfigHash(res.data.hash || "");
                setParsed(res.data.parsed || {});
            }
        } catch { }
        setLoading(false);
    }

    async function validate() {
        const res = await api("/api/config/validate", { method: "POST", body: JSON.stringify({ raw: rawConfig }) });
        setValidationResult(res.data);
    }

    async function saveConfig() {
        setSaving(true);
        const res = await api("/api/config", { method: "PUT", body: JSON.stringify({ raw: rawConfig, baseHash: configHash }) });
        setSaving(false);
        if (res.ok) {
            setConfigHash(res.data.hash);
            setOriginalRaw(rawConfig);
            setShowDiff(false);
            alert("✅ Config saved. " + (res.warnings || []).join(" "));
        } else {
            alert("❌ " + (res.error || "Save failed"));
        }
    }

    function computeDiff() {
        const oldLines = originalRaw.split("\n");
        const newLines = rawConfig.split("\n");
        const diff: { type: string; line: string }[] = [];
        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
            const o = oldLines[i]; const n = newLines[i];
            if (o === n) diff.push({ type: "same", line: o || "" });
            else {
                if (o !== undefined) diff.push({ type: "removed", line: o });
                if (n !== undefined) diff.push({ type: "added", line: n });
            }
        }
        return diff;
    }

    if (loading) return <div className="empty-state"><div className="loading-spinner" /></div>;

    const hasChanges = rawConfig !== originalRaw;

    return (
        <div className="flex-col">
            <div className="section-header">
                <div>
                    <h2 className="section-title">⚙️ Config Editor</h2>
                    <p className="section-subtitle">Edit <code>~/.openclaw/openclaw.json</code> with guardrails</p>
                </div>
                <div className="flex-row gap-sm">
                    <button className={`btn btn-sm ${mode === "form" ? "btn-primary" : ""}`} onClick={() => setMode("form")}>📋 Form</button>
                    <button className={`btn btn-sm ${mode === "raw" ? "btn-primary" : ""}`} onClick={() => setMode("raw")}>📝 Raw JSON5</button>
                </div>
            </div>

            <div className="alert alert-danger mb-md">
                <span>⚠️</span>
                <div><strong>Strict validation:</strong> OpenClaw rejects unknown keys and will refuse to boot on invalid config. Run <code>openclaw doctor</code> to diagnose issues. Always review changes before saving.</div>
            </div>

            {mode === "raw" ? (
                <div className="card">
                    <textarea className="textarea" style={{ minHeight: "400px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }} value={rawConfig} onChange={(e) => setRawConfig(e.target.value)} id="config-editor" />
                    <div className="flex-row gap-sm mt-md">
                        <button className="btn" onClick={validate}>✅ Validate</button>
                        {hasChanges && <button className="btn" onClick={() => setShowDiff(!showDiff)}>{showDiff ? "Hide Diff" : "📊 Show Diff"}</button>}
                        <button className="btn btn-primary" onClick={saveConfig} disabled={saving || !hasChanges}>{saving ? "Saving..." : "💾 Save Config"}</button>
                        {hasChanges && <button className="btn btn-danger" onClick={() => setRawConfig(originalRaw)}>↩️ Revert</button>}
                    </div>
                    {validationResult && (
                        <div className={`alert ${validationResult.valid ? "alert-success" : "alert-danger"} mt-md`}>
                            {validationResult.valid ? "✅ JSON5 is valid" : `❌ Invalid: ${validationResult.error}`}
                        </div>
                    )}
                </div>
            ) : (
                <div className="card">
                    <h3 className="card-title mb-md">Common Settings</h3>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Workspace</label>
                            <input className="input" value={parsed?.agents?.defaults?.workspace || ""} onChange={(e) => { const p = { ...parsed }; if (!p.agents) p.agents = {}; if (!p.agents.defaults) p.agents.defaults = {}; p.agents.defaults.workspace = e.target.value; setParsed(p); setRawConfig(JSON.stringify(p, null, 2)); }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Primary Model</label>
                            <input className="input" value={parsed?.agents?.defaults?.model?.primary || ""} onChange={(e) => { const p = { ...parsed }; if (!p.agents) p.agents = {}; if (!p.agents.defaults) p.agents.defaults = {}; if (!p.agents.defaults.model) p.agents.defaults.model = {}; p.agents.defaults.model.primary = e.target.value; setParsed(p); setRawConfig(JSON.stringify(p, null, 2)); }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gateway Port</label>
                            <input className="input" type="number" value={parsed?.gateway?.port || 18789} onChange={(e) => { const p = { ...parsed }; if (!p.gateway) p.gateway = {}; p.gateway.port = Number(e.target.value); setParsed(p); setRawConfig(JSON.stringify(p, null, 2)); }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reload Mode</label>
                            <select className="select" value={parsed?.gateway?.reload?.mode || "hybrid"} onChange={(e) => { const p = { ...parsed }; if (!p.gateway) p.gateway = {}; if (!p.gateway.reload) p.gateway.reload = {}; p.gateway.reload.mode = e.target.value; setParsed(p); setRawConfig(JSON.stringify(p, null, 2)); }}>
                                <option value="hybrid">Hybrid (recommended)</option>
                                <option value="hot">Hot</option>
                                <option value="restart">Restart</option>
                                <option value="off">Off</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex-row gap-sm mt-md">
                        <button className="btn btn-primary" onClick={saveConfig} disabled={saving || !hasChanges}>{saving ? "Saving..." : "💾 Save"}</button>
                        {hasChanges && <button className="btn btn-danger" onClick={loadConfig}>↩️ Revert</button>}
                    </div>
                </div>
            )}

            {/* Diff view */}
            {showDiff && hasChanges && (
                <div className="card mt-md">
                    <h3 className="card-title mb-md">📊 Changes Preview</h3>
                    <div className="diff-view">
                        {computeDiff().map((d, i) => (
                            <div key={i} className={`diff-line ${d.type}`}>{d.type === "added" ? "+" : d.type === "removed" ? "-" : " "} {d.line}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hot reload info */}
            <div className="card mt-md">
                <h3 className="card-title mb-md">🔄 Config Hot Reload</h3>
                <div className="grid-2">
                    <div>
                        <h4 style={{ fontSize: "0.875rem", color: "var(--accent-success)", marginBottom: "var(--space-sm)" }}>✅ Hot-applies (no restart)</h4>
                        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>agents, models, routing, hooks, cron, session, messages, tools, browser, skills, audio, ui, logging</div>
                    </div>
                    <div>
                        <h4 style={{ fontSize: "0.875rem", color: "var(--accent-warning)", marginBottom: "var(--space-sm)" }}>⚠️ Needs restart</h4>
                        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>channels.*, gateway.*, discovery, canvasHost, plugins</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
