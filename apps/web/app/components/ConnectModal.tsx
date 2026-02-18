"use client";

import { useState } from "react";

interface Props {
    adapterUrl: string;
    onChangeUrl: (url: string) => void;
    onClose: () => void;
    onConnect: () => void;
}

export default function ConnectModal({ adapterUrl, onChangeUrl, onClose, onConnect }: Props) {
    const [url, setUrl] = useState(adapterUrl);
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState<"ok" | "fail" | null>(null);

    async function testConnection() {
        setTesting(true);
        setResult(null);
        try {
            const res = await fetch(`${url}/health`);
            const data = await res.json();
            if (data.ok) {
                setResult("ok");
                onChangeUrl(url);
            } else {
                setResult("fail");
            }
        } catch {
            setResult("fail");
        }
        setTesting(false);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔗 Connect to Adapter</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="flex-col">
                    <div className="form-group">
                        <label className="form-label">Adapter URL</label>
                        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:3001" id="adapter-url-input" />
                        <span className="form-hint">The Node.js adapter bridges this UI to the OpenClaw Gateway</span>
                    </div>

                    {result === "ok" && <div className="alert alert-success"><span>✅</span> Connected successfully!</div>}
                    {result === "fail" && <div className="alert alert-danger"><span>❌</span> Connection failed. Ensure the adapter is running.</div>}

                    <div className="alert alert-info">
                        <span>ℹ️</span>
                        <div>Start the adapter with <code>cd apps/adapter && pnpm dev</code>. It runs on port 3001 by default.</div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn" onClick={testConnection} disabled={testing}>{testing ? "Testing..." : "🔍 Test"}</button>
                    <button className="btn btn-primary" onClick={() => { onChangeUrl(url); onConnect(); }} disabled={result !== "ok"}>Connect</button>
                </div>
            </div>
        </div>
    );
}
