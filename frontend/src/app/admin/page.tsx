"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Activity, Shield, LogOut, RefreshCw, BarChart3, ArrowLeft } from "lucide-react";
import API_BASE from "../../lib/api";

interface ActivityEntry {
  id: number; user_id: number | null; username: string;
  email: string; action: string; details: string; timestamp: string;
}
interface UserEntry {
  id: number; username: string; email: string; role: string; created_at: string;
}
interface Stats {
  total_users: number; today_actions: number;
  action_counts: { action: string; count: number }[];
}

const ACTION_META: Record<string, { label: string }> = {
  login:           { label: "Login"            },
  register:        { label: "Register"         },
  parse_resume:    { label: "Resume Upload"    },
  analyze_ats:     { label: "ATS Scan"         },
  generate_resume: { label: "Resume / Cover"   },
  start_interview: { label: "Interview"        },
  roast_resume:    { label: "Resume Roaster"   },
};

function Badge({ action }: { action: string }) {
  const meta = ACTION_META[action] || { label: action };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, background: "#f4f4f4", color: "#444", fontSize: 11, fontWeight: 600, border: "1px solid #e0e0e0" }}>
      {meta.label}
    </span>
  );
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts + "Z").getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ activities: ActivityEntry[]; users: UserEntry[]; stats: Stats } | null>(null);
  const [tab, setTab] = useState<"activity" | "users">("activity");
  const [filterAction, setFilterAction] = useState("all");
  const [adminUser, setAdminUser] = useState<{ username: string; email: string; role: string } | null>(null);

  const fetchData = async () => {
    const token = localStorage.getItem("ca_token");
    if (!token) { router.replace("/"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("ca_user");
    if (!raw) { router.replace("/"); return; }
    let u: any;
    try { u = JSON.parse(raw); } catch { router.replace("/"); return; }
    if (u.role !== "admin") { router.replace("/"); return; }
    setAdminUser(u);
    fetchData();
  }, []);

  const logout = () => {
    localStorage.removeItem("ca_token");
    localStorage.removeItem("ca_user");
    router.push("/");
  };

  const S = {
    bg: "#fafafa", surface: "#ffffff", border: "#e8e8e8",
    text: "#0a0a0a", textSub: "#666", textFaint: "#bbb",
    navBg: "rgba(255,255,255,0.95)",
  };

  const activities = data?.activities || [];
  const users = data?.users || [];
  const stats = data?.stats;
  const filtered = filterAction === "all" ? activities : activities.filter(a => a.action === filterAction);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${S.border}`, background: S.navBg, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 30, height: 30, background: "#0a0a0a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={15} color="#fff" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.03em" }}>RoastMyResume<span style={{ color: S.textSub, fontWeight: 600 }}>.ai</span></span>
              <span style={{ fontSize: 13, color: S.textSub, marginLeft: 8 }}>Admin Panel</span>
            </div>
            {adminUser && (
              <span style={{ fontSize: 12, color: S.textSub, border: `1px solid ${S.border}`, borderRadius: 4, padding: "2px 10px" }}>
                {adminUser.username}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: `1px solid ${S.border}`, background: "none", cursor: "pointer", color: S.textSub, fontSize: 12, fontWeight: 500 }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: `1px solid ${S.border}`, background: "none", cursor: "pointer", color: S.textSub, fontSize: 12, fontWeight: 500 }}>
              <ArrowLeft size={13} /> Back to App
            </button>
            <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px" }}>
        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 16 }}>
            <div style={{ width: 32, height: 32, border: "2px solid #e8e8e8", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            <p style={{ color: S.textSub, fontSize: 14 }}>Loading admin data…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: "20px 24px", border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 14 }}>
            <strong>Error:</strong> {error}
            <button onClick={fetchData} style={{ marginLeft: 16, fontSize: 12, fontWeight: 600, color: "#dc2626", background: "none", border: "1px solid #fecaca", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Users",      value: stats?.total_users ?? 0,    sub: "registered accounts"    },
                { label: "Actions Today",    value: stats?.today_actions ?? 0,  sub: "since midnight"         },
                { label: "Total Activities", value: activities.length,          sub: "all time"               },
                { label: "Top Feature",      value: stats?.action_counts?.[0] ? (ACTION_META[stats.action_counts[0].action]?.label ?? stats.action_counts[0].action) : "—", sub: "most used", isText: true },
              ].map(s => (
                <div key={s.label} style={{ padding: "24px", background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: S.textSub, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 12px" }}>{s.label}</p>
                  <p style={{ fontSize: (s as any).isText ? 18 : 32, fontWeight: 800, letterSpacing: "-0.03em", color: S.text, margin: "0 0 4px" }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: S.textFaint, margin: 0 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Feature breakdown */}
            {stats?.action_counts && stats.action_counts.length > 0 && (
              <div style={{ padding: "20px 24px", background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, marginBottom: 28 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: S.text, margin: "0 0 16px" }}>Feature Usage</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {stats.action_counts.map((ac) => {
                    const meta = ACTION_META[ac.action] || { label: ac.action };
                    const pct = activities.length ? Math.round((ac.count / activities.length) * 100) : 0;
                    return (
                      <div key={ac.action} style={{ padding: "10px 16px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: S.text, margin: "0 0 2px" }}>{meta.label}</p>
                        <p style={{ fontSize: 11, color: S.textSub, margin: 0 }}>{ac.count}× · {pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, marginBottom: 20, gap: 0 }}>
              {[
                { id: "activity" as const, label: "Activity Log", count: activities.length },
                { id: "users"    as const, label: "Users",        count: users.length      },
              ].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "10px 20px", fontWeight: 600, fontSize: 13, border: "none", background: "none", cursor: "pointer",
                  color: tab === t.id ? S.text : S.textSub,
                  borderBottom: `2px solid ${tab === t.id ? S.text : "transparent"}`,
                  marginBottom: -1,
                }}>
                  {t.label} <span style={{ fontSize: 11, color: S.textFaint, marginLeft: 4 }}>({t.count})</span>
                </button>
              ))}
            </div>

            {/* Activity log */}
            {tab === "activity" && (
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
                {/* Filter */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: S.textSub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Filter:</span>
                  {["all", ...Object.keys(ACTION_META)].map(f => (
                    <button key={f} onClick={() => setFilterAction(f)} style={{
                      padding: "3px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${filterAction === f ? S.text : S.border}`,
                      background: filterAction === f ? S.text : "none",
                      color: filterAction === f ? S.bg : S.textSub,
                    }}>
                      {f === "all" ? "All" : (ACTION_META[f]?.label ?? f)}
                    </button>
                  ))}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: S.bg }}>
                        {["User", "Email", "Action", "Details", "When"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: S.textSub, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${S.border}`, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: S.textFaint }}>No activity yet</td></tr>
                      )}
                      {filtered.slice(0, 200).map((a, i) => (
                        <tr key={a.id} style={{ borderTop: `1px solid ${S.border}`, background: i % 2 === 0 ? S.surface : S.bg }}>
                          <td style={{ padding: "11px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                {a.username.charAt(0).toUpperCase()}
                              </div>
                              {a.username}
                            </div>
                          </td>
                          <td style={{ padding: "11px 16px", color: S.textSub, whiteSpace: "nowrap" }}>{a.email || "—"}</td>
                          <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}><Badge action={a.action} /></td>
                          <td style={{ padding: "11px 16px", color: S.textSub, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.details || "—"}</td>
                          <td style={{ padding: "11px 16px", color: S.textFaint, whiteSpace: "nowrap", fontSize: 12 }}>{timeAgo(a.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users table */}
            {tab === "users" && (
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: S.bg }}>
                      {["#", "User", "Email", "Role", "Actions", "Joined"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: S.textSub, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${S.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: S.textFaint }}>No users yet</td></tr>
                    )}
                    {users.map((u, i) => {
                      const actionCount = activities.filter(a => a.email === u.email).length;
                      const lastActivity = activities.filter(a => a.email === u.email)[0];
                      return (
                        <tr key={u.id} style={{ borderTop: `1px solid ${S.border}`, background: i % 2 === 0 ? S.surface : S.bg }}>
                          <td style={{ padding: "12px 16px", color: S.textFaint, fontSize: 12 }}>{u.id}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              {u.username}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: S.textSub }}>{u.email}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: u.role === "admin" ? "#0a0a0a" : "#f4f4f4", color: u.role === "admin" ? "#fff" : "#444", border: `1px solid ${u.role === "admin" ? "#0a0a0a" : "#e0e0e0"}` }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontWeight: 700, color: actionCount > 0 ? S.text : S.textFaint }}>{actionCount}</span>
                            {lastActivity && <span style={{ fontSize: 11, color: S.textFaint, marginLeft: 6 }}>· last {timeAgo(lastActivity.timestamp)}</span>}
                          </td>
                          <td style={{ padding: "12px 16px", color: S.textFaint, fontSize: 12 }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
      <footer style={{ borderTop: `1px solid ${S.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: S.textFaint }}>RoastMyResume.ai · Admin Panel</span>
        <span style={{ fontSize: 11, color: S.textFaint }}>Built by <span style={{ fontWeight: 600, color: S.textSub }}>Tharini Parthasarathy</span></span>
      </footer>
    </div>
  );
}