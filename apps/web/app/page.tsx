"use client";

import { useState, useEffect, useCallback } from "react";
import OverviewTab from "./components/OverviewTab";
import CronTab from "./components/CronTab";
import SkillsTab from "./components/SkillsTab";
import ChannelsTab from "./components/ChannelsTab";
import ConfigTab from "./components/ConfigTab";
import LogsTab from "./components/LogsTab";
import WorkflowsTab from "./components/WorkflowsTab";
import ConnectModal from "./components/ConnectModal";

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "workflows", label: "Workflows", icon: "⚡" },
  { id: "cron", label: "Tasks", icon: "⏰" },
  { id: "skills", label: "Skills", icon: "🧩" },
  { id: "channels", label: "Channels", icon: "📡" },
  { id: "config", label: "Config", icon: "⚙️" },
  { id: "logs", label: "Sessions & Logs", icon: "📋" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ADAPTER_URL =
  typeof window !== "undefined"
    ? (window as any).__NEXT_PUBLIC_ADAPTER_URL || "http://127.0.0.1:3005"
    : "http://127.0.0.1:3005";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showConnect, setShowConnect] = useState(false);
  const [connected, setConnected] = useState(false);
  const [adapterUrl, setAdapterUrl] = useState(ADAPTER_URL);

  // Check adapter health on mount
  useEffect(() => {
    fetch(`${adapterUrl}/health`)
      .then((r) => r.json())
      .then((d) => setConnected(d.ok === true))
      .catch(() => setConnected(false));
  }, [adapterUrl]);

  const api = useCallback(
    async (path: string, options?: RequestInit) => {
      const res = await fetch(`${adapterUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });
      return res.json();
    },
    [adapterUrl]
  );

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">🦞</span>
          <span>OpenClaw Control Plane Lite</span>
        </div>
        <div className="app-header-actions">
          <span
            className="flex-row"
            style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}
          >
            <span
              className={`status-dot ${connected ? "online" : "offline"}`}
            />
            {connected ? "Connected" : "Disconnected"}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => setShowConnect(true)}
            id="connect-btn"
          >
            🔗 Connect
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="tab-nav" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            id={`tab-${tab.id}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="app-main" role="tabpanel">
        {activeTab === "overview" && <OverviewTab api={api} />}
        {activeTab === "workflows" && <WorkflowsTab api={api} />}
        {activeTab === "cron" && <CronTab api={api} />}
        {activeTab === "skills" && <SkillsTab api={api} />}
        {activeTab === "channels" && <ChannelsTab api={api} />}
        {activeTab === "config" && <ConfigTab api={api} />}
        {activeTab === "logs" && <LogsTab api={api} />}
      </main>

      {/* ── Connect modal ── */}
      {showConnect && (
        <ConnectModal
          adapterUrl={adapterUrl}
          onChangeUrl={setAdapterUrl}
          onClose={() => setShowConnect(false)}
          onConnect={() => {
            setConnected(true);
            setShowConnect(false);
          }}
        />
      )}
    </div>
  );
}
