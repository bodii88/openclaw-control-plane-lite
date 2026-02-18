"use client";
import { useState, useEffect } from "react";

interface Props { api: (path: string, options?: RequestInit) => Promise<any>; }
type Filter = "all" | "eligible" | "disabled" | "missing" | "bundled" | "managed" | "workspace";

export default function SkillsTab({ api }: Props) {
    const [skills, setSkills] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [filter, setFilter] = useState<Filter>("all");
    const [loading, setLoading] = useState(true);
    const [installSlug, setInstallSlug] = useState("");
    const [installing, setInstalling] = useState(false);
    const [editingSkill, setEditingSkill] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ enabled: true, apiKey: "", env: "{}" });

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [lr, locr] = await Promise.allSettled([api("/api/skills/list"), api("/api/skills/locations")]);
            if (lr.status === "fulfilled" && lr.value.ok) setSkills(Array.isArray(lr.value.data) ? lr.value.data : lr.value.data?.skills || []);
            if (locr.status === "fulfilled" && locr.value.ok) setLocations(locr.value.data?.precedence || []);
        } catch { }
        setLoading(false);
    }

    async function installSkill() {
        if (!installSlug.trim()) return;
        setInstalling(true);
        const res = await api("/api/skills/install", { method: "POST", body: JSON.stringify({ slug: installSlug }) });
        setInstalling(false);
        if (res.ok) { setInstallSlug(""); loadData(); } else alert(res.error || "Install failed");
    }

    function startEdit(key: string) {
        setEditForm({ enabled: true, apiKey: "", env: "{}" });
        setEditingSkill(key);
    }

    async function saveSkillConfig() {
        if (!editingSkill) return;
        let envObj = {};
        try { envObj = JSON.parse(editForm.env); } catch { alert("Invalid JSON"); return; }
        const entry: any = { enabled: editForm.enabled };
        if (editForm.apiKey) entry.apiKey = editForm.apiKey;
        if (Object.keys(envObj).length > 0) entry.env = envObj;
        const res = await api("/api/skills/config", { method: "PUT", body: JSON.stringify({ skillKey: editingSkill, entry }) });
        if (res.ok) { setEditingSkill(null); loadData(); } else alert(res.error || "Failed");
    }

    const filtered = skills.filter((s: any) => {
        if (filter === "all") return true;
        if (filter === "eligible") return s.status === "eligible" || s.eligible;
        if (filter === "disabled") return s.enabled === false;
        if (filter === "missing") return s.missingRequirements?.length > 0;
        return s.location === filter;
    });

    return (
        <div className="flex-col">
            <div className="section-header">
                <div><h2 className="section-title">🧩 Skills Manager</h2><p className="section-subtitle">Install, configure, and manage OpenClaw skills</p></div>
                <div className="flex-row gap-sm">
                    <button className="btn btn-sm" onClick={() => api("/api/skills/update-all", { method: "POST" }).then(loadData)}>📦 Update All</button>
                    <button className="btn btn-sm" onClick={() => api("/api/skills/sync", { method: "POST" }).then(loadData)}>🔄 Sync</button>
                </div>
            </div>

            <div className="alert alert-warning mb-md"><span>⚠️</span><div><strong>Treat skills as untrusted code.</strong> Read source before enabling. <code>env</code> and <code>apiKey</code> inject into host agent run, not the sandbox.</div></div>

            <div className="card mb-md">
                <h3 className="card-title mb-md">📥 Install from ClawHub</h3>
                <div className="flex-row gap-sm">
                    <input className="input" placeholder="ClawHub slug" value={installSlug} onChange={(e) => setInstallSlug(e.target.value)} onKeyDown={(e) => e.key === "Enter" && installSkill()} style={{ maxWidth: 400 }} id="clawhub-slug" />
                    <button className="btn btn-primary" onClick={installSkill} disabled={installing || !installSlug.trim()}>{installing ? <span className="loading-spinner" /> : "Install"}</button>
                </div>
            </div>

            {locations.length > 0 && (
                <div className="card mb-md">
                    <h3 className="card-title mb-md">📂 Skill Locations & Precedence</h3>
                    <div className="table-wrapper"><table className="table"><thead><tr><th>#</th><th>Location</th><th>Path</th></tr></thead><tbody>
                        {locations.map((l: any) => <tr key={l.order}><td>{l.order}</td><td><strong>{l.label}</strong></td><td><code style={{ fontSize: "0.75rem" }}>{l.path}</code></td></tr>)}
                    </tbody></table></div>
                </div>
            )}

            <div className="filter-bar">
                {(["all", "eligible", "disabled", "missing", "bundled", "managed", "workspace"] as Filter[]).map((f) => (
                    <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f === "all" ? `All (${skills.length})` : f}</button>
                ))}
            </div>

            {loading ? <div className="empty-state"><div className="loading-spinner" /></div> : filtered.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">🧩</div><p className="empty-state-title">No skills found</p></div>
            ) : (
                <div className="table-wrapper">
                    <table className="table"><thead><tr><th>Skill</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                        {filtered.map((s: any) => {
                            const k = s.key || s.name;
                            return <tr key={k}>
                                <td><strong>{s.name || k}</strong>{s.description && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{s.description}</div>}</td>
                                <td><span className="badge badge-neutral">{s.location || "?"}</span></td>
                                <td>{s.enabled !== false ? <span className="badge badge-success">Enabled</span> : <span className="badge badge-danger">Disabled</span>}</td>
                                <td><button className="btn btn-sm" onClick={() => startEdit(k)}>⚙️</button></td>
                            </tr>;
                        })}
                    </tbody></table>
                </div>
            )}

            {editingSkill && (
                <div className="modal-overlay" onClick={() => setEditingSkill(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h2>⚙️ {editingSkill}</h2><button className="modal-close" onClick={() => setEditingSkill(null)}>✕</button></div>
                        <div className="flex-col">
                            <div className="form-group"><label className="form-label">Enabled</label><div className={`toggle ${editForm.enabled ? "active" : ""}`} onClick={() => setEditForm({ ...editForm, enabled: !editForm.enabled })} /></div>
                            <div className="form-group"><label className="form-label">API Key</label><input className="input" type="password" value={editForm.apiKey} onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Env (JSON)</label><textarea className="textarea" value={editForm.env} onChange={(e) => setEditForm({ ...editForm, env: e.target.value })} rows={3} /></div>
                            <div className="alert alert-warning"><span>⚠️</span><div><code>env</code> and <code>apiKey</code> inject into host agent run, not sandbox.</div></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setEditingSkill(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveSkillConfig}>💾 Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
