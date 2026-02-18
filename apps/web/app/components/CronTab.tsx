"use client";

import { useState, useEffect } from "react";

interface Props {
    api: (path: string, options?: RequestInit) => Promise<any>;
}

const TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Auckland",
    "UTC",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ScheduleType = "once" | "daily" | "weekly" | "monthly" | "custom";

export default function CronTab({ api }: Props) {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [runHistory, setRunHistory] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [wizardStep, setWizardStep] = useState(0);

    // Wizard form state
    const [form, setForm] = useState({
        name: "",
        description: "",
        scheduleType: "once" as ScheduleType,
        dateTime: "",
        time: "09:00",
        timezone: "UTC",
        dayOfWeek: 1,
        dayOfMonth: 1,
        cronExpr: "0 9 * * *",
        sessionTarget: "main" as "main" | "isolated",
        wakeMode: "now" as "now" | "next-heartbeat",
        payloadKind: "systemEvent" as "systemEvent" | "agentTurn",
        payloadText: "",
        deliveryMode: "none" as "announce" | "webhook" | "none",
        deliveryChannel: "",
        deliveryTo: "",
        deleteAfterRun: false,
        agentId: "",
    });

    useEffect(() => {
        loadJobs();
    }, []);

    async function loadJobs() {
        setLoading(true);
        try {
            const res = await api("/api/cron/list");
            if (res.ok) {
                setJobs(Array.isArray(res.data) ? res.data : res.data?.jobs || []);
            }
        } catch { }
        setLoading(false);
    }

    async function runJob(jobId: string) {
        await api("/api/cron/run", {
            method: "POST",
            body: JSON.stringify({ jobId, mode: "force" }),
        });
        loadJobs();
    }

    async function removeJob(jobId: string) {
        if (!confirm(`Remove job "${jobId}"?`)) return;
        await api(`/api/cron/${jobId}`, { method: "DELETE" });
        loadJobs();
    }

    async function viewRuns(jobId: string) {
        setSelectedJob(jobId);
        const res = await api(`/api/cron/runs?jobId=${jobId}`);
        setRunHistory(Array.isArray(res.data) ? res.data : []);
    }

    function buildSchedule() {
        const { scheduleType, dateTime, time, timezone, dayOfWeek, dayOfMonth, cronExpr } = form;
        switch (scheduleType) {
            case "once":
                return { kind: "at" as const, at: dateTime || new Date().toISOString() };
            case "daily": {
                const [h, m] = time.split(":").map(Number);
                return { kind: "cron" as const, expr: `${m} ${h} * * *`, tz: timezone };
            }
            case "weekly": {
                const [h, m] = time.split(":").map(Number);
                return { kind: "cron" as const, expr: `${m} ${h} * * ${dayOfWeek}`, tz: timezone };
            }
            case "monthly": {
                const [h, m] = time.split(":").map(Number);
                return { kind: "cron" as const, expr: `${m} ${h} ${dayOfMonth} * *`, tz: timezone };
            }
            case "custom":
                return { kind: "cron" as const, expr: cronExpr, tz: timezone };
        }
    }

    async function submitWizard() {
        const schedule = buildSchedule();
        const payload =
            form.sessionTarget === "main"
                ? { kind: "systemEvent", text: form.payloadText }
                : { kind: "agentTurn", message: form.payloadText };

        const body: any = {
            name: form.name,
            description: form.description,
            schedule,
            sessionTarget: form.sessionTarget,
            wakeMode: form.wakeMode,
            payload,
            deleteAfterRun: form.deleteAfterRun || form.scheduleType === "once",
        };

        if (form.deliveryMode !== "none") {
            body.delivery = {
                mode: form.deliveryMode,
                ...(form.deliveryChannel && { channel: form.deliveryChannel }),
                ...(form.deliveryTo && { to: form.deliveryTo }),
            };
        }
        if (form.agentId) body.agentId = form.agentId;

        const res = await api("/api/cron/add", {
            method: "POST",
            body: JSON.stringify(body),
        });

        if (res.ok) {
            setShowWizard(false);
            setWizardStep(0);
            setForm({ ...form, name: "", description: "", payloadText: "" });
            loadJobs();
        } else {
            alert(res.error || "Failed to create job");
        }
    }

    const WIZARD_STEPS = ["Schedule", "Execution", "Delivery", "Review"];

    return (
        <div className="flex-col">
            {/* ── Header ── */}
            <div className="section-header">
                <div>
                    <h2 className="section-title">⏰ Tasks (Cron Jobs)</h2>
                    <p className="section-subtitle">
                        Create and manage scheduled jobs — no CLI or JSON needed
                    </p>
                </div>
                <div className="flex-row gap-sm">
                    <button
                        className="btn btn-sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        id="toggle-advanced"
                    >
                        {showAdvanced ? "📋 Hide CLI" : "💻 Show CLI"}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setShowWizard(true);
                            setWizardStep(0);
                        }}
                        id="new-job-btn"
                    >
                        ✨ New Job
                    </button>
                </div>
            </div>

            {/* ── CLI equivalents (advanced) ── */}
            {showAdvanced && (
                <div className="card" style={{ marginBottom: "var(--space-md)" }}>
                    <h3 className="card-title mb-md">💻 CLI Equivalents</h3>
                    <div className="code-block">
                        {`# List jobs
openclaw cron list

# Add a one-time reminder
openclaw cron add --name "Reminder" --at "2026-02-01T16:00:00Z" \\
  --session main --system-event "Check the docs" --wake now --delete-after-run

# Add a recurring job
openclaw cron add --name "Morning brief" --cron "0 7 * * *" \\
  --tz "America/Los_Angeles" --session isolated \\
  --message "Summarize overnight updates." --announce --channel slack

# Run / remove
openclaw cron run <job-id>
openclaw cron remove <job-id>
openclaw cron runs --id <job-id>`}
                    </div>
                </div>
            )}

            {/* ── Jobs list ── */}
            {loading ? (
                <div className="empty-state">
                    <div className="loading-spinner" />
                </div>
            ) : jobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <p className="empty-state-title">No cron jobs yet</p>
                    <p className="empty-state-text">
                        Create your first scheduled job with the wizard — set reminders,
                        daily briefings, or any recurring task.
                    </p>
                    <button
                        className="btn btn-primary mt-lg"
                        onClick={() => setShowWizard(true)}
                    >
                        ✨ Create your first job
                    </button>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table className="table" id="cron-jobs-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Schedule</th>
                                <th>Session</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job: any) => (
                                <tr key={job.jobId || job.id}>
                                    <td>
                                        <strong>{job.name}</strong>
                                        {job.description && (
                                            <div
                                                className="stat-detail"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                {job.description}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <code style={{ fontSize: "0.75rem" }}>
                                            {job.schedule?.kind === "at"
                                                ? `Once: ${new Date(job.schedule.at).toLocaleString()}`
                                                : job.schedule?.kind === "cron"
                                                    ? `Cron: ${job.schedule.expr}${job.schedule.tz ? ` (${job.schedule.tz})` : ""}`
                                                    : job.schedule?.kind === "every"
                                                        ? `Every ${job.schedule.everyMs}ms`
                                                        : "—"}
                                        </code>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">
                                            {job.sessionTarget || "main"}
                                        </span>
                                    </td>
                                    <td>
                                        {job.enabled !== false ? (
                                            <span className="badge badge-success">Enabled</span>
                                        ) : (
                                            <span className="badge badge-danger">Disabled</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex-row gap-sm">
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => runJob(job.jobId || job.id)}
                                                title="Run now"
                                            >
                                                ▶️
                                            </button>
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => viewRuns(job.jobId || job.id)}
                                                title="View runs"
                                            >
                                                📊
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => removeJob(job.jobId || job.id)}
                                                title="Remove"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Run History ── */}
            {selectedJob && (
                <div className="card mt-lg" id="run-history-card">
                    <div className="card-header">
                        <h3 className="card-title">📊 Run History — {selectedJob}</h3>
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setSelectedJob(null)}
                        >
                            ✕
                        </button>
                    </div>
                    {runHistory.length === 0 ? (
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            No runs recorded yet.
                        </p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Run ID</th>
                                        <th>Started</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runHistory.map((run: any, i: number) => (
                                        <tr key={run.runId || i}>
                                            <td>
                                                <code style={{ fontSize: "0.75rem" }}>
                                                    {run.runId || `run-${i}`}
                                                </code>
                                            </td>
                                            <td>{new Date(run.startedAt || run.ts).toLocaleString()}</td>
                                            <td>
                                                <span
                                                    className={`badge ${run.status === "success"
                                                            ? "badge-success"
                                                            : run.status === "failure"
                                                                ? "badge-danger"
                                                                : "badge-warning"
                                                        }`}
                                                >
                                                    {run.status || "unknown"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Cron storage note ── */}
            <div className="alert alert-info">
                <span>ℹ️</span>
                <div>
                    <strong>Cron jobs persist</strong> under{" "}
                    <code>~/.openclaw/cron/jobs.json</code> and survive Gateway restarts.
                    Do not edit <code>jobs.json</code> directly while the Gateway is
                    running — use CLI or this wizard.
                </div>
            </div>

            {/* ═══════ Wizard Modal ═══════ */}
            {showWizard && (
                <div className="modal-overlay" onClick={() => setShowWizard(false)}>
                    <div
                        className="modal"
                        style={{ maxWidth: "640px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>✨ New Cron Job</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowWizard(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Wizard steps indicator */}
                        <div className="wizard-steps">
                            {WIZARD_STEPS.map((step, i) => (
                                <div
                                    key={step}
                                    className={`wizard-step ${i === wizardStep
                                            ? "active"
                                            : i < wizardStep
                                                ? "completed"
                                                : ""
                                        }`}
                                >
                                    <div className="wizard-step-dot">
                                        {i < wizardStep ? "✓" : i + 1}
                                    </div>
                                    <span className="wizard-step-label">{step}</span>
                                    {i < WIZARD_STEPS.length - 1 && (
                                        <div className="wizard-step-line" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step 0: Schedule */}
                        {wizardStep === 0 && (
                            <div className="flex-col">
                                <div className="form-group">
                                    <label className="form-label">Job Name *</label>
                                    <input
                                        className="input"
                                        placeholder="e.g., Morning Briefing"
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm({ ...form, name: e.target.value })
                                        }
                                        id="wizard-name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Schedule Type</label>
                                    <div className="filter-bar">
                                        {(["once", "daily", "weekly", "monthly", "custom"] as ScheduleType[]).map(
                                            (t) => (
                                                <button
                                                    key={t}
                                                    className={`filter-chip ${form.scheduleType === t ? "active" : ""
                                                        }`}
                                                    onClick={() =>
                                                        setForm({
                                                            ...form,
                                                            scheduleType: t,
                                                            deleteAfterRun: t === "once",
                                                        })
                                                    }
                                                >
                                                    {t === "once"
                                                        ? "⏱️ One-time"
                                                        : t === "daily"
                                                            ? "📅 Daily"
                                                            : t === "weekly"
                                                                ? "📆 Weekly"
                                                                : t === "monthly"
                                                                    ? "🗓️ Monthly"
                                                                    : "⚙️ Custom cron"}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {form.scheduleType === "once" && (
                                    <div className="form-group">
                                        <label className="form-label">Date & Time</label>
                                        <input
                                            className="input"
                                            type="datetime-local"
                                            value={form.dateTime}
                                            onChange={(e) =>
                                                setForm({ ...form, dateTime: e.target.value })
                                            }
                                            id="wizard-datetime"
                                        />
                                        <span className="form-hint">
                                            Or enter a relative time like &quot;20m&quot; for 20 minutes from
                                            now
                                        </span>
                                    </div>
                                )}

                                {["daily", "weekly", "monthly"].includes(form.scheduleType) && (
                                    <>
                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label className="form-label">Time</label>
                                                <input
                                                    className="input"
                                                    type="time"
                                                    value={form.time}
                                                    onChange={(e) =>
                                                        setForm({ ...form, time: e.target.value })
                                                    }
                                                    id="wizard-time"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Timezone</label>
                                                <select
                                                    className="select"
                                                    value={form.timezone}
                                                    onChange={(e) =>
                                                        setForm({ ...form, timezone: e.target.value })
                                                    }
                                                    id="wizard-tz"
                                                >
                                                    {TIMEZONES.map((tz) => (
                                                        <option key={tz} value={tz}>
                                                            {tz}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {form.scheduleType === "weekly" && (
                                            <div className="form-group">
                                                <label className="form-label">Day of Week</label>
                                                <select
                                                    className="select"
                                                    value={form.dayOfWeek}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            dayOfWeek: Number(e.target.value),
                                                        })
                                                    }
                                                    id="wizard-dow"
                                                >
                                                    {DAYS.map((d, i) => (
                                                        <option key={i} value={i}>
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {form.scheduleType === "monthly" && (
                                            <div className="form-group">
                                                <label className="form-label">Day of Month</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min={1}
                                                    max={31}
                                                    value={form.dayOfMonth}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            dayOfMonth: Number(e.target.value),
                                                        })
                                                    }
                                                    id="wizard-dom"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {form.scheduleType === "custom" && (
                                    <div className="form-group">
                                        <label className="form-label">
                                            Cron Expression (5-field)
                                        </label>
                                        <input
                                            className="input mono"
                                            placeholder="0 9 * * *"
                                            value={form.cronExpr}
                                            onChange={(e) =>
                                                setForm({ ...form, cronExpr: e.target.value })
                                            }
                                            id="wizard-cron"
                                        />
                                        <span className="form-hint">
                                            min hour day-of-month month day-of-week
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 1: Execution */}
                        {wizardStep === 1 && (
                            <div className="flex-col">
                                <div className="form-group">
                                    <label className="form-label">Session Target</label>
                                    <div className="grid-2">
                                        <button
                                            className={`quick-action-btn ${form.sessionTarget === "main"
                                                    ? "active"
                                                    : ""
                                                }`}
                                            style={
                                                form.sessionTarget === "main"
                                                    ? { borderColor: "var(--accent-primary)" }
                                                    : {}
                                            }
                                            onClick={() =>
                                                setForm({
                                                    ...form,
                                                    sessionTarget: "main",
                                                    payloadKind: "systemEvent",
                                                })
                                            }
                                        >
                                            <span className="icon">🏠</span>
                                            <strong>Main Session</strong>
                                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                                Enqueue a system event, runs on next heartbeat
                                            </span>
                                        </button>
                                        <button
                                            className={`quick-action-btn ${form.sessionTarget === "isolated"
                                                    ? "active"
                                                    : ""
                                                }`}
                                            style={
                                                form.sessionTarget === "isolated"
                                                    ? { borderColor: "var(--accent-primary)" }
                                                    : {}
                                            }
                                            onClick={() =>
                                                setForm({
                                                    ...form,
                                                    sessionTarget: "isolated",
                                                    payloadKind: "agentTurn",
                                                })
                                            }
                                        >
                                            <span className="icon">🔒</span>
                                            <strong>Isolated Session</strong>
                                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                                Dedicated cron session, fresh context
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        {form.sessionTarget === "main"
                                            ? "System Event Text *"
                                            : "Agent Message *"}
                                    </label>
                                    <textarea
                                        className="textarea"
                                        placeholder={
                                            form.sessionTarget === "main"
                                                ? "Reminder: check the docs"
                                                : "Summarize overnight updates."
                                        }
                                        value={form.payloadText}
                                        onChange={(e) =>
                                            setForm({ ...form, payloadText: e.target.value })
                                        }
                                        rows={3}
                                        id="wizard-payload"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Wake Mode</label>
                                    <select
                                        className="select"
                                        value={form.wakeMode}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                wakeMode: e.target.value as "now" | "next-heartbeat",
                                            })
                                        }
                                        id="wizard-wakemode"
                                    >
                                        <option value="now">Now (immediate heartbeat)</option>
                                        <option value="next-heartbeat">
                                            Next Heartbeat (wait for scheduled)
                                        </option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Delivery */}
                        {wizardStep === 2 && (
                            <div className="flex-col">
                                <div className="form-group">
                                    <label className="form-label">Delivery Mode</label>
                                    <div className="filter-bar">
                                        {(["none", "announce", "webhook"] as const).map((m) => (
                                            <button
                                                key={m}
                                                className={`filter-chip ${form.deliveryMode === m ? "active" : ""
                                                    }`}
                                                onClick={() =>
                                                    setForm({ ...form, deliveryMode: m })
                                                }
                                            >
                                                {m === "none"
                                                    ? "🚫 None"
                                                    : m === "announce"
                                                        ? "📢 Announce"
                                                        : "🔗 Webhook"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {form.deliveryMode === "announce" && (
                                    <div className="grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Channel</label>
                                            <select
                                                className="select"
                                                value={form.deliveryChannel}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        deliveryChannel: e.target.value,
                                                    })
                                                }
                                                id="wizard-channel"
                                            >
                                                <option value="">(default)</option>
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="telegram">Telegram</option>
                                                <option value="discord">Discord</option>
                                                <option value="slack">Slack</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Target</label>
                                            <input
                                                className="input"
                                                placeholder="e.g., +15551234567 or channel:C123"
                                                value={form.deliveryTo}
                                                onChange={(e) =>
                                                    setForm({ ...form, deliveryTo: e.target.value })
                                                }
                                                id="wizard-target"
                                            />
                                        </div>
                                    </div>
                                )}

                                {form.deliveryMode === "webhook" && (
                                    <div className="form-group">
                                        <label className="form-label">Webhook URL</label>
                                        <input
                                            className="input"
                                            placeholder="https://example.com/webhook"
                                            value={form.deliveryTo}
                                            onChange={(e) =>
                                                setForm({ ...form, deliveryTo: e.target.value })
                                            }
                                            id="wizard-webhook"
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Options</label>
                                    <label className="flex-row gap-sm" style={{ cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={form.deleteAfterRun}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    deleteAfterRun: e.target.checked,
                                                })
                                            }
                                        />
                                        <span style={{ fontSize: "0.875rem" }}>
                                            Delete after run (auto-cleanup)
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {wizardStep === 3 && (
                            <div className="flex-col">
                                <div className="code-block">
                                    {JSON.stringify(
                                        {
                                            name: form.name,
                                            schedule: buildSchedule(),
                                            sessionTarget: form.sessionTarget,
                                            wakeMode: form.wakeMode,
                                            payload:
                                                form.sessionTarget === "main"
                                                    ? { kind: "systemEvent", text: form.payloadText }
                                                    : { kind: "agentTurn", message: form.payloadText },
                                            ...(form.deliveryMode !== "none" && {
                                                delivery: {
                                                    mode: form.deliveryMode,
                                                    ...(form.deliveryChannel && {
                                                        channel: form.deliveryChannel,
                                                    }),
                                                    ...(form.deliveryTo && { to: form.deliveryTo }),
                                                },
                                            }),
                                            deleteAfterRun: form.deleteAfterRun,
                                        },
                                        null,
                                        2
                                    )}
                                </div>

                                <div className="alert alert-warning">
                                    <span>⚠️</span>
                                    <div>
                                        This will create a cron job via{" "}
                                        <code>openclaw cron add</code>. Jobs persist under{" "}
                                        <code>~/.openclaw/cron/</code> and survive restarts.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="modal-footer">
                            <button
                                className="btn"
                                onClick={() =>
                                    wizardStep > 0
                                        ? setWizardStep(wizardStep - 1)
                                        : setShowWizard(false)
                                }
                            >
                                {wizardStep > 0 ? "← Back" : "Cancel"}
                            </button>
                            {wizardStep < WIZARD_STEPS.length - 1 ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    disabled={!form.name && wizardStep === 0}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={submitWizard}
                                    id="wizard-submit"
                                >
                                    🚀 Create Job
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
