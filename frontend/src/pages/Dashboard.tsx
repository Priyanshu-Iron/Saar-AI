import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting } from "../api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Skeleton from "../components/ui/Skeleton";

const stateLabels: Record<number, { text: string; color: string; dot?: string }> = {
  1: { text: "Ready", color: "bg-[#f6f9fc] text-[#425466]" },
  2: { text: "Joining", color: "bg-[#fffbeb] text-[#92400e]", dot: "bg-[#f5a623]" },
  3: { text: "In Meeting", color: "bg-[#eff6ff] text-[#1e40af]", dot: "bg-[#3b82f6]" },
  4: { text: "Recording", color: "bg-[#ecfdf5] text-[#065f46]", dot: "bg-[#0caf60]" },
  5: { text: "Leaving", color: "bg-[#fff7ed] text-[#9a3412]", dot: "bg-[#f97316]" },
  6: { text: "Processing", color: "bg-[#faf5ff] text-[#6b21a8]", dot: "bg-[#a855f7]" },
  7: { text: "Error", color: "bg-[#fef2f2] text-[#991b1b]" },
  8: { text: "Waiting Room", color: "bg-[#fffbeb] text-[#92400e]", dot: "bg-[#f5a623]" },
  9: { text: "Completed", color: "bg-[#ecfdf5] text-[#065f46]" },
  11: { text: "Scheduled", color: "bg-[#eff6ff] text-[#1e40af]" },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const [bots, setBots] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("SaarAI Bot");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [error, setError] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 6;

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
  const stats = [
    {
      label: "Total Meetings",
      value: bots.length,
      accent: "#635bff",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="#635bff" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M16.5 3v1.5M16.5 19.5V21m-9-1.5h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 16.5 4.5h-9A2.25 2.25 0 0 0 5.25 6.75v10.5A2.25 2.25 0 0 0 7.5 19.5Z" />
        </svg>
      ),
    },
    {
      label: "Completed",
      value: completedBots.length,
      accent: "#0caf60",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="#0caf60" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Active Now",
      value: activeBots.length,
      accent: "#f5a623",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="#f5a623" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[28px] font-semibold tracking-tight text-[#0a2540]">
          {getGreeting()}
        </h1>
        <p className="mt-1 text-[15px] text-[#697386]">
          Here's an overview of your meeting intelligence.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <div
              className="rounded-lg border bg-white p-5 transition-shadow duration-200 hover:shadow-[0_6px_12px_-2px_rgba(50,50,93,0.1),0_3px_7px_-3px_rgba(0,0,0,0.06)]"
              style={{
                borderColor: '#e3e8ee',
                borderLeftWidth: '3px',
                borderLeftColor: stat.accent,
                boxShadow: '0 2px 5px -1px rgba(50,50,93,0.08), 0 1px 3px -1px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-[#697386] uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[#0a2540]">{stat.value}</p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${stat.accent}10` }}
                >
                  {stat.icon}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Send Bot to Meeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <Card title="Send Bot to Meeting" subtitle="Paste a Zoom, Google Meet, or Teams link to start recording.">
          <div className="mt-1 grid gap-4 sm:grid-cols-[1fr_220px_auto]">
            <FormField
              label="Meeting URL"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
            <FormField
              label="Bot Name"
              placeholder="SaarAI Bot"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={handleSendBot} disabled={creating || !meetingUrl.trim()}>
                {creating ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                    Send Bot
                  </span>
                )}
              </Button>
            </div>
          </div>
          {createMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#0caf60]/20 bg-[#ecfdf5] px-4 py-3 text-sm text-[#065f46]">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {createMsg}
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#e25950]/20 bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {error}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Active Bots */}
      {activeBots.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card title="Active Bots" subtitle="Live status — auto-refreshes every 10 seconds.">
            <div className="space-y-2">
              {activeBots.map((bot, i) => {
                const state = stateLabels[bot.state] || { text: `State ${bot.state}`, color: "bg-[#f6f9fc] text-[#425466]" };
                return (
                  <motion.div
                    key={bot.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-md border border-[#e3e8ee] bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0a2540]">{bot.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[#8898aa]">{bot.meeting_url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {state.dot && (
                        <span className="relative flex h-2 w-2">
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${state.dot}`} />
                          <span className={`inline-flex h-2 w-2 rounded-full ${state.dot}`} />
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${state.color}`}>
                        {state.text}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        <Card title="Recent Activity" subtitle="Completed meetings ready for AI analysis.">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : completedBots.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#e3e8ee] bg-[#f6f9fc] p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-[#8898aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-[#425466]">No completed meetings yet</p>
              <p className="mt-1 text-xs text-[#8898aa]">Send a bot to a meeting to get started.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-[#e3e8ee]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc]">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Name</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Date</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Status</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedBots
                    .slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE)
                    .map((bot, i) => (
                    <motion.tr
                      key={bot.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-[#e3e8ee] last:border-0 transition-colors hover:bg-[#f6f9fc]"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#0a2540]">{bot.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[#697386]">{new Date(bot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-medium text-[#065f46]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0caf60]" />
                          Completed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/meetings/${bot.id}`}
                            className="rounded-md border border-[#e3e8ee] bg-white px-3 py-1.5 text-xs font-medium text-[#425466] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] hover:shadow-[0_2px_5px_-1px_rgba(50,50,93,0.1)]"
                          >
                            Details
                          </Link>
                          <Link
                            to={`/meetings/${bot.id}`}
                            className="rounded-md bg-[#635bff] px-3 py-1.5 text-xs font-medium text-white shadow-[0_2px_5px_-1px_rgba(50,50,93,0.25)] transition-all hover:bg-[#7a73ff] hover:shadow-[0_4px_8px_-2px_rgba(50,50,93,0.3)]"
                          >
                            View & Generate AI
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              {completedBots.length > ACTIVITY_PER_PAGE && (
                <div className="flex items-center justify-between border-t border-[#e3e8ee] px-4 py-3">
                  <p className="text-xs text-[#697386]">
                    Showing {(activityPage - 1) * ACTIVITY_PER_PAGE + 1}–{Math.min(activityPage * ACTIVITY_PER_PAGE, completedBots.length)} of {completedBots.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e3e8ee] bg-white text-[#697386] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setActivityPage((p) => Math.min(Math.ceil(completedBots.length / ACTIVITY_PER_PAGE), p + 1))}
                      disabled={activityPage >= Math.ceil(completedBots.length / ACTIVITY_PER_PAGE)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e3e8ee] bg-white text-[#697386] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default Dashboard;
