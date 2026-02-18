"use client";

import { useState, useEffect } from "react";

interface Props { api: (path: string, options?: RequestInit) => Promise<any>; }

// Types mirroring backend config
interface ApprovalConfig {
    groups: { intake: string; gm: string; ceo: string; publish: string[]; logs?: string; };
    roles: { designers: string[]; gms: string[]; ceos: string[]; };
    triggers: { newRequest: string[]; approve: string[]; reject: string[]; changes: string[]; };
    rules: { requireMedia: boolean; allowVideo: boolean; };
}

const DEFAULT_CONFIG: ApprovalConfig = {
    groups: { intake: "", gm: "", ceo: "", publish: [] },
    roles: { designers: [], gms: [], ceos: [] },
    triggers: { newRequest: ["#approve"], approve: ["approve"], reject: ["reject"], changes: ["changes"] },
    rules: { requireMedia: true, allowVideo: false },
};

export default function ApprovalWorkflowTab({ api }: Props) {
    const [config, setConfig] = useState<ApprovalConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<"flow" | "groups" | "roles" | "triggers">("flow");

    useEffect(() => { loadConfig(); }, []);

    async function loadConfig() {
        setLoading(true);
        const res = await api("/api/approval/config");
        if (res) setConfig(res);
        setLoading(false);
    }

    async function saveConfig() {
        setSaving(true);
        const res = await api("/api/approval/config", {
            method: "POST",
            body: JSON.stringify(config)
        });
        setSaving(false);
        if (res.ok) alert("✅ Workflow Saved & Skill Generated!");
        else alert("❌ Error saving workflow: " + res.error);
    }

    function addList(path: string[], val: string) {
        if (!val.trim()) return;
        const keys = [...path];
        const last = keys.pop()!;
        const obj: any = keys.reduce((o: any, k) => o[k], config);
        // Avoid dupes
        if (!obj[last].includes(val)) {
            const newConfig = JSON.parse(JSON.stringify(config));
            const target = keys.reduce((o: any, k) => o[k], newConfig);
            target[last] = [...target[last], val];
            setConfig(newConfig);
        }
    }

    function removeList(path: string[], idx: number) {
        const keys = [...path];
        const last = keys.pop()!;
        const newConfig = JSON.parse(JSON.stringify(config));
        const target = keys.reduce((o: any, k) => o[k], newConfig);
        target[last].splice(idx, 1);
        setConfig(newConfig);
    }

    if (loading) return <div className="loading-spinner" />;

    return (
        <div className="flex-col gap-md">
            <div className="section-header">
                <div>
                    <h2 className="section-title">🚀 WhatsApp Approval Workflow</h2>
                    <p className="section-subtitle">Manage design approvals: Intake → GM → CEO → Publish</p>
                </div>
                <div className="flex-row gap-sm">
                    <button className={`btn btn-sm ${activeSection === "flow" ? "btn-neutral" : "btn-ghost"}`} onClick={() => setActiveSection("flow")}>👀 Visual Flow</button>
                    <button className={`btn btn-sm ${activeSection === "groups" ? "btn-neutral" : "btn-ghost"}`} onClick={() => setActiveSection("groups")}>🏘️ Groups</button>
                    <button className={`btn btn-sm ${activeSection === "roles" ? "btn-neutral" : "btn-ghost"}`} onClick={() => setActiveSection("roles")}>👥 Roles</button>
                    <button className={`btn btn-sm ${activeSection === "triggers" ? "btn-neutral" : "btn-ghost"}`} onClick={() => setActiveSection("triggers")}>⚡ Triggers</button>
                    <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>{saving ? "Saving..." : "💾 Save & Deploy"}</button>
                </div>
            </div>

            <div className="card">
                {activeSection === "flow" && (
                    <div className="flow-visualizer animate-in">
                        <div className="flow-step">
                            <div className="flow-icon">🎨</div>
                            <strong>Designer</strong>
                            <div className="text-secondary text-xs">Submits #{config.triggers.newRequest[0]}</div>
                        </div>
                        <div className="flow-arrow">➜</div>
                        <div className="flow-step">
                            <div className="flow-icon">📥</div>
                            <strong>Intake Group</strong>
                            <div className="text-secondary text-xs">{config.groups.intake || "Not set"}</div>
                        </div>
                        <div className="flow-arrow">➜</div>
                        <div className="flow-step">
                            <div className="flow-icon">👔</div>
                            <strong>GM Approval</strong>
                            <div className="text-secondary text-xs">{config.groups.gm || "Not set"}</div>
                        </div>
                        <div className="flow-arrow">➜</div>
                        <div className="flow-step">
                            <div className="flow-icon">👑</div>
                            <strong>CEO Approval</strong>
                            <div className="text-secondary text-xs">{config.groups.ceo || "Not set"}</div>
                        </div>
                        <div className="flow-arrow">➜</div>
                        <div className="flow-step">
                            <div className="flow-icon">🚀</div>
                            <strong>Publishing</strong>
                            <div className="text-secondary text-xs">{config.groups.publish.length} Groups</div>
                        </div>
                    </div>
                )}

                {activeSection === "groups" && (
                    <div className="flex-col gap-md animate-in">
                        <h3 className="card-title">WhatsApp Groups Configuration</h3>
                        <p className="text-sm text-secondary">Enter Group IDs (e.g. 12036302...)</p>

                        <div className="form-group">
                            <label className="form-label">🧩 Design Intake Group</label>
                            <input className="input" placeholder="Group ID for new requests" value={config.groups.intake} onChange={e => setConfig({ ...config, groups: { ...config.groups, intake: e.target.value } })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">✅ GM Approvals Group</label>
                            <input className="input" placeholder="Group ID for GM review" value={config.groups.gm} onChange={e => setConfig({ ...config, groups: { ...config.groups, gm: e.target.value } })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">👑 CEO Approvals Group</label>
                            <input className="input" placeholder="Group ID for CEO review" value={config.groups.ceo} onChange={e => setConfig({ ...config, groups: { ...config.groups, ceo: e.target.value } })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">📣 Publishing Groups</label>
                            <div className="flex-col gap-sm">
                                {config.groups.publish.map((g, i) => (
                                    <div key={i} className="flex-row gap-sm">
                                        <input className="input" value={g} disabled />
                                        <button className="btn btn-sm btn-danger" onClick={() => removeList(["groups", "publish"], i)}>🗑️</button>
                                    </div>
                                ))}
                                <div className="flex-row gap-sm">
                                    <input className="input" placeholder="Add Publishing Group ID" id="new-pub-group" onKeyDown={e => e.key === "Enter" && addList(["groups", "publish"], e.currentTarget.value)} />
                                    <button className="btn btn-sm" onClick={() => {
                                        const el = document.getElementById("new-pub-group") as HTMLInputElement;
                                        addList(["groups", "publish"], el.value);
                                        el.value = "";
                                    }}>➕ Add</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === "roles" && (
                    <div className="flex-col gap-md animate-in">
                        <h3 className="card-title">Permission Roles</h3>
                        <p className="text-sm text-secondary">Add Phone Numbers / WhatsApp IDs (e.g. 97150000000)</p>

                        <RoleEditor title="🎨 Designers (Can submit)" items={config.roles.designers} onAdd={v => addList(["roles", "designers"], v)} onRemove={i => removeList(["roles", "designers"], i)} />
                        <RoleEditor title="👔 GMs (Can approve Step 1)" items={config.roles.gms} onAdd={v => addList(["roles", "gms"], v)} onRemove={i => removeList(["roles", "gms"], i)} />
                        <RoleEditor title="👑 CEOs (Can approve Step 2)" items={config.roles.ceos} onAdd={v => addList(["roles", "ceos"], v)} onRemove={i => removeList(["roles", "ceos"], i)} />
                    </div>
                )}

                {activeSection === "triggers" && (
                    <div className="flex-col gap-md animate-in">
                        <h3 className="card-title">Keyword Triggers</h3>
                        <p className="text-sm text-secondary">Define keywords that trigger bot actions (supports multi-language)</p>

                        <RoleEditor title="✨ New Request Trigger" items={config.triggers.newRequest} onAdd={v => addList(["triggers", "newRequest"], v)} onRemove={i => removeList(["triggers", "newRequest"], i)} />
                        <RoleEditor title="✅ Approve Trigger" items={config.triggers.approve} onAdd={v => addList(["triggers", "approve"], v)} onRemove={i => removeList(["triggers", "approve"], i)} />
                        <RoleEditor title="❌ Reject Trigger" items={config.triggers.reject} onAdd={v => addList(["triggers", "reject"], v)} onRemove={i => removeList(["triggers", "reject"], i)} />
                        <RoleEditor title="✏️ Request Changes Trigger" items={config.triggers.changes} onAdd={v => addList(["triggers", "changes"], v)} onRemove={i => removeList(["triggers", "changes"], i)} />

                        <div className="form-group mt-md">
                            <label className="form-label">Rules</label>
                            <label className="flex-row items-center gap-sm">
                                <input type="checkbox" checked={config.rules.requireMedia} onChange={e => setConfig({ ...config, rules: { ...config.rules, requireMedia: e.target.checked } })} />
                                Require Media (Image/Video) for new requests
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .flow-visualizer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 2rem;
                    background: var(--bg-subtle);
                    border-radius: 12px;
                    overflow-x: auto;
                }
                .flow-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    background: var(--bg-surface);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    min-width: 120px;
                }
                .flow-icon { font-size: 2rem; margin-bottom: 0.5rem; }
                .flow-arrow { font-size: 1.5rem; color: var(--text-secondary); }
            `}</style>
        </div>
    );
}

function RoleEditor({ title, items, onAdd, onRemove }: { title: string, items: string[], onAdd: (v: string) => void, onRemove: (i: number) => void }) {
    const [val, setVal] = useState("");
    return (
        <div className="form-group">
            <label className="form-label">{title}</label>
            <div className="flex-row flex-wrap gap-xs mb-sm">
                {items.length === 0 && <span className="text-secondary text-sm italic">No users added (Everyone allowed if empty)</span>}
                {items.map((item, i) => (
                    <span key={i} className="badge badge-neutral flex-row gap-xs items-center">
                        {item}
                        <button className="btn-icon-sm" onClick={() => onRemove(i)}>✕</button>
                    </span>
                ))}
            </div>
            <div className="flex-row gap-sm">
                <input className="input" placeholder="Add value..." value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && (onAdd(val), setVal(""))} />
                <button className="btn btn-sm" onClick={() => { onAdd(val); setVal(""); }}>➕ Add</button>
            </div>
        </div>
    );
}
