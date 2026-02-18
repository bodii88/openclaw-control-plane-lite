"use client";
import { useState, useEffect } from "react";

interface Props { api: (path: string, options?: RequestInit) => Promise<any>; }
type Filter = "all" | "eligible" | "disabled" | "missing" | "bundled" | "managed" | "workspace";
type ViewMode = "installed" | "discover";

const FEATURED_SKILLS = [
    { name: "Web Search", slug: "clawhub:official/web-search", icon: "🌐", description: "Search the internet for real-time information." },
    { name: "Calculator", slug: "clawhub:official/calculator", icon: "🧮", description: "Perform complex mathematical calculations." },
    { name: "Weather", slug: "clawhub:official/weather", icon: "⛈️", description: "Get current weather and forecasts." },
    { name: "Spotify", slug: "clawhub:community/spotify", icon: "🎵", description: "Control music and playlists." },
    { name: "GitHub", slug: "clawhub:official/github", icon: "🐙", description: "Interact with repositories, issues, and PRs." },
    { name: "Memory", slug: "clawhub:official/memory", icon: "🧠", description: "Long-term memory for remembering user details." },
];

export default function SkillsTab({ api }: Props) {
    const [skills, setSkills] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [filter, setFilter] = useState<Filter>("all");
    const [view, setView] = useState<ViewMode>("installed");
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

    async function installSkill(slug: string = installSlug) {
        if (!slug.trim()) return;
        setInstalling(true);
        const res = await api("/api/skills/install", { method: "POST", body: JSON.stringify({ slug }) });
        setInstalling(false);
        if (res.ok) {
            setInstallSlug("");
            setView("installed");
            loadData();
            alert(`✅ Installed ${slug}`);
        } else {
            alert(res.error || "Install failed");
        }
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
                    {/* View Toggle */}
                    <div className="flex-row" style={{ backgroundColor: "var(--bg-subtle)", padding: "4px", borderRadius: "8px" }}>
                        <button className={`btn btn-sm ${view === "installed" ? "btn-neutral" : "btn-ghost"}`} onClick={() => setView("installed")}>📂 My Skills</button>
                        <button className={`btn btn-sm ${view === "discover" ? "btn-neutral" : "btn-ghost"}`} onClick={() => setView("discover")}>🌍 Marketplace</button>
                    </div>
                </div>
            </div>

            {view === "discover" ? (
                <div className="flex-col gap-lg animate-in">
                    <div className="card p-lg" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", borderRadius: "12px", color: "white" }}>
                        <h2 className="text-xl font-bold mb-xs" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Discover New Capabilities</h2>
                        <p style={{ opacity: 0.9 }}>Browse the ClawHub marketplace to give your agent new powers.</p>
                    </div>

                    <div className="grid-cols-3 gap-md" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                        {FEATURED_SKILLS.map(skill => (
                            <div key={skill.slug} className="card p-md hover-up flex-col gap-sm" style={{ border: "1px solid var(--border)" }}>
                                <div className="flex-row items-center gap-sm">
                                    <div style={{ fontSize: "2rem", background: "var(--bg-subtle)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>{skill.icon}</div>
                                    <div>
                                        <h3 className="font-bold">{skill.name}</h3>
                                        <div className="text-xs" style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{skill.slug.split("/")[0]}</div>
                                    </div>
                                </div>
                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", flex: 1, minHeight: "2.5em" }}>{skill.description}</p>
                                <button className="btn btn-sm btn-outline w-full" onClick={() => installSkill(skill.slug)} disabled={installing}>
                                    {installing ? "Installing..." : "Install"}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="card p-md flex-row items-center gap-md">
                        <div style={{ flex: 1 }}>
                            <h3 className="font-bold">Install Custom Skill</h3>
                            <p className="text-sm text-secondary" style={{ color: "var(--text-secondary)" }}>Have a specific ClawHub slug or URL?</p>
                        </div>
                        <div className="flex-row gap-sm">
                            <input className="input" placeholder="clawhub:user/skill" value={installSlug} onChange={(e) => setInstallSlug(e.target.value)} onKeyDown={(e) => e.key === "Enter" && installSkill()} />
                            <button className="btn btn-primary" onClick={() => installSkill()} disabled={installing || !installSlug.trim()}>Install</button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-row gap-sm justify-end mb-md">
                        <button className="btn btn-sm" onClick={() => api("/api/skills/update-all", { method: "POST" }).then(loadData)}>📦 Update All</button>
                        <button className="btn btn-sm" onClick={() => api("/api/skills/sync", { method: "POST" }).then(loadData)}>🔄 Sync</button>
                    </div>

                    {/* Filter Bar */}
                    <div className="filter-bar mb-md">
                        {(["all", "eligible", "disabled", "missing", "bundled", "managed", "workspace"] as Filter[]).map((f) => (
                            <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f === "all" ? `All (${skills.length})` : f}</button>
                        ))}
                    </div>

                    {loading ? <div className="empty-state"><div className="loading-spinner" /></div> : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🧩</div>
                            <p className="empty-state-title">No skills found</p>
                            <button className="btn btn-primary mt-md" onClick={() => setView("discover")}>Browse Marketplace</button>
                        </div>
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
                </>
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
