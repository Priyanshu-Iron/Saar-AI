import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting } from "../api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";

const stateLabels: Record<number, { text: string; color: string; pulse?: boolean }> = {
  1: { text: "Ready", color: "bg-slate-100 text-slate-600" },
  2: { text: "Joining…", color: "bg-amber-100 text-amber-700", pulse: true },
  3: { text: "In Meeting", color: "bg-blue-100 text-blue-700", pulse: true },
  4: { text: "Recording", color: "bg-green-100 text-green-700", pulse: true },
  5: { text: "Leaving", color: "bg-orange-100 text-orange-700", pulse: true },
  6: { text: "Processing", color: "bg-purple-100 text-purple-700", pulse: true },
  7: { text: "Error", color: "bg-red-100 text-red-700" },
  8: { text: "Waiting Room", color: "bg-yellow-100 text-yellow-700", pulse: true },
  9: { text: "Completed", color: "bg-emerald-100 text-emerald-700" },
  11: { text: "Scheduled", color: "bg-sky-100 text-sky-700" },
};

const statCardConfig = [
  {
    label: "Total Bots",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M16.5 3v1.5M16.5 19.5V21m-9-1.5h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 16.5 4.5h-9A2.25 2.25 0 0 0 5.25 6.75v10.5A2.25 2.25 0 0 0 7.5 19.5Z" />
      </svg>
    ),
    gradient: "from-primary-500/10 to-primary-600/5",
    textColor: "text-primary-700",
    iconBg: "bg-primary-100",
    iconColor: "text-primary-600",
  },
  {
    label: "Completed",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    gradient: "from-emerald-500/10 to-emerald-600/5",
    textColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "Active",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
    gradient: "from-amber-500/10 to-amber-600/5",
    textColor: "text-amber-700",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export function Dashboard() {
  const [bots, setBots] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("SaarAI Bot");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [error, setError] = useState("");

  const fetchBots = async () => {
    try {
      const data = await meetingsApi.botsStatus();
      setBots(data.bots);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSendBot = async () => {
    if (!meetingUrl.trim()) return;
    setCreating(true);
    setCreateMsg("");
    setError("");
    try {
      const res = await meetingsApi.create(meetingUrl, botName);
      setCreateMsg(res.message);
      setMeetingUrl("");
      setBotName("SaarAI Bot");
      fetchBots();
    } catch (err: any) {
      setError(err.message || "Failed to send bot");
    } finally {
      setCreating(false);
    }
  };

  const activeBots = bots.filter((b) => ![7, 9, 10].includes(b.state));
  const completedBots = bots.filter((b) => b.state === 9);
  const statValues = [bots.length, completedBots.length, activeBots.length];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Send bots to meetings and track their status in real-time." />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCardConfig.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className={`bg-gradient-to-br ${stat.gradient} !border-white/40`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{statValues[i]}</p>
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Send Bot to Meeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card title="🤖 Send Bot to Meeting" subtitle="Paste a Zoom, Google Meet, or Teams link to start recording.">
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <FormField label="Meeting URL" placeholder="https://meet.google.com/abc-defg-hij" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
            <FormField label="Bot Name" placeholder="SaarAI Bot" value={botName} onChange={(e) => setBotName(e.target.value)} />
            <div className="flex items-end">
              <Button onClick={handleSendBot} disabled={creating || !meetingUrl.trim()}>
                {creating ? "Sending…" : "Send Bot"}
              </Button>
            </div>
          </div>
          {createMsg && <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">✅ {createMsg}</div>}
          {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
        </Card>
      </motion.div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link to="/meetings">
          <Button variant="secondary">
            <svg className="mr-2 h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            Connect New Bot
          </Button>
        </Link>
      </div>

      {/* Active Bots */}
      {activeBots.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card title="⚡ Active Bots" subtitle="Live status — auto-refreshes every 10 seconds.">
            <div className="space-y-2">
              {activeBots.map((bot, i) => {
                const state = stateLabels[bot.state] || { text: `State ${bot.state}`, color: "bg-slate-100 text-slate-600" };
                return (
                  <motion.div key={bot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-xl border border-slate-100/80 bg-white/60 p-3 backdrop-blur-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{bot.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{bot.meeting_url}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state.pulse && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" /><span className="inline-flex h-2 w-2 rounded-full bg-green-500" /></span>}
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${state.color}`}>{state.text}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity — Completed Meetings */}
      <Card title="📊 Recent Activity" subtitle="Completed meetings ready for AI analysis.">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : completedBots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
            No completed meetings yet. Send a bot to a meeting to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {completedBots.map((bot, i) => (
              <motion.div key={bot.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="flex items-center justify-between rounded-xl border border-slate-100/80 bg-white/60 p-3 transition-all hover:shadow-sm backdrop-blur-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{bot.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(bot.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Link to={`/meetings/${bot.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors">Details</Link>
                    <Link to={`/meetings/${bot.id}`} className="rounded-lg bg-primary-600 px-3 py-1.5 text-white hover:bg-primary-500 transition-colors shadow-sm">View & Generate AI</Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;
