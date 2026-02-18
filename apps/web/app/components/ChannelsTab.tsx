"use client";

import { useState, useEffect } from "react";

interface Props {
    api: (path: string, options?: RequestInit) => Promise<any>;
}

export default function ChannelsTab({ api }: Props) {
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ dmPolicy: "pairing", allowFrom: "", requireMention: false, mentionPatterns: "" });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await api("/api/channels/list");
            if (res.ok) setChannels(res.data || []);
        } catch { }
        setLoading(false);
    }

    function startEdit(ch: any) {
        setEditForm({
            dmPolicy: ch.dmPolicy || "pairing",
            allowFrom: (ch.allowFrom || []).join(", "),
            requireMention: ch.groups?.["*"]?.requireMention || false,
            mentionPatterns: "",
        });
        setEditing(ch.provider);
    }

    async function saveChannel() {
        if (!editing) return;
        const body: any = {
            dmPolicy: editForm.dmPolicy,
            allowFrom: editForm.allowFrom.split(",").map((s: string) => s.trim()).filter(Boolean),
            groups: { "*": { requireMention: editForm.requireMention } },
        };
        const res = await api(`/api/channels/${editing}`, { method: "PUT", body: JSON.stringify(body) });
        if (res.ok) { setEditing(null); loadData(); }
        else alert(res.error || "Failed to save");
    }

    if (loading) return <div className="empty-state"><div className="loading-spinner" /></div>;

    const configuredChannels = channels.filter((c: any) => c.configured);

    return (
        <div className="flex-col">
            <div className="section-header">
                <div>
                    <h2 className="section-title">📡 Channels & Access</h2>
                    <p className="section-subtitle">Configure channel DM policies, allowlists, and mention gating</p>
                </div>
            </div>

            <div className="alert alert-info mb-md">
                <span>ℹ️</span>
                <div>Channel config changes require a <strong>Gateway restart</strong> (not hot-reloaded). DM policies: <code>pairing</code> (default), <code>allowlist</code>, <code>open</code>, <code>disabled</code>.</div>
            </div>

            {configuredChannels.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📡</div>
                    <p className="empty-state-title">No channels configured</p>
                    <p className="empty-state-text">Add channel configurations in <code>~/.openclaw/openclaw.json</code> under <code>channels.&lt;provider&gt;</code>. See <a href="https://docs.openclaw.ai/channels/telegram" target="_blank">Channels docs</a>.</p>
                </div>
            ) : (
                <div className="table-wrapper" id="channels-table">
                    <table className="table">
                        <thead>
                            <tr><th>Provider</th><th>Status</th><th>DM Policy</th><th>Allow From</th><th>Mention Gating</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {configuredChannels.map((ch: any) => (
                                <tr key={ch.provider}>
                                    <td><strong style={{ textTransform: "capitalize" }}>{ch.provider}</strong></td>
                                    <td>{ch.enabled ? <span className="badge badge-success">Enabled</span> : <span className="badge badge-danger">Disabled</span>}</td>
                                    <td><span className="badge badge-info">{ch.dmPolicy}</span></td>
                                    <td><code style={{ fontSize: "0.75rem" }}>{(ch.allowFrom || []).join(", ") || "—"}</code></td>
                                    <td>{ch.groups?.["*"]?.requireMention ? <span className="badge badge-warning">Required</span> : <span className="badge badge-neutral">Off</span>}</td>
                                    <td><button className="btn btn-sm" onClick={() => startEdit(ch)}>✏️ Edit</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Unconfigured providers */}
            {channels.filter((c: any) => !c.configured).length > 0 && (
                <div className="card mt-lg">
                    <h3 className="card-title mb-md">Available Providers (not configured)</h3>
                    <div className="flex-row gap-sm" style={{ flexWrap: "wrap" }}>
                        {channels.filter((c: any) => !c.configured).map((ch: any) => (
                            <span key={ch.provider} className="badge badge-neutral" style={{ textTransform: "capitalize" }}>{ch.provider}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editing && (
                <div className="modal-overlay" onClick={() => setEditing(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ textTransform: "capitalize" }}>✏️ {editing} Config</h2>
                            <button className="modal-close" onClick={() => setEditing(null)}>✕</button>
                        </div>
                        <div className="flex-col">
                            <div className="form-group">
                                <label className="form-label">DM Policy</label>
                                <select className="select" value={editForm.dmPolicy} onChange={(e) => setEditForm({ ...editForm, dmPolicy: e.target.value })}>
                                    <option value="pairing">Pairing (default)</option>
                                    <option value="allowlist">Allowlist</option>
                                    <option value="open">Open</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Allow From (comma-separated)</label>
                                <input className="input" placeholder="e.g., +15551234567, tg:123" value={editForm.allowFrom} onChange={(e) => setEditForm({ ...editForm, allowFrom: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Require Mention in Groups</label>
                                <div className={`toggle ${editForm.requireMention ? "active" : ""}`} onClick={() => setEditForm({ ...editForm, requireMention: !editForm.requireMention })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveChannel}>💾 Save & Restart Required</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
