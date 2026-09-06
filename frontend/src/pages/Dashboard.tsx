import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting } from "../api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import Skeleton from "../components/ui/Skeleton";
import Thread from "../components/ui/Thread";
import { botStateToThreadState } from "../lib/status";

const PRIMARY_LINK =
  "inline-flex items-center justify-center rounded-control bg-violet px-3 py-1.5 text-small text-white transition-colors duration-150 hover:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";
const SECONDARY_LINK =
  "inline-flex items-center justify-center rounded-control border border-line bg-surface px-3 py-1.5 text-small text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";

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
      label: "Total meetings",
      value: bots.length,
      border: "border-l-violet",
      tint: "bg-violet/10 text-violet",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M16.5 3v1.5M16.5 19.5V21m-9-1.5h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 16.5 4.5h-9A2.25 2.25 0 0 0 5.25 6.75v10.5A2.25 2.25 0 0 0 7.5 19.5Z" />
        </svg>
      ),
    },
    {
      label: "Completed",
      value: completedBots.length,
      border: "border-l-cyan",
      tint: "bg-cyan/10 text-cyan",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Active now",
      value: activeBots.length,
      border: "border-l-gold",
      tint: "bg-gold/10 text-gold",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-h1 text-ink">{getGreeting()}</h1>
        <p className="mt-1 text-body text-ink-2">
          Here's an overview of your meeting intelligence.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-panel border border-l-[3px] border-line bg-surface p-5 ${stat.border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small text-ink-2">{stat.label}</p>
                <p className="mt-2 text-h1 text-ink">{stat.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-control ${stat.tint}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Send Bot to Meeting */}
      <Card title="Send bot to meeting" subtitle="Paste a Zoom, Google Meet, or Teams link to start recording.">
        <div className="mt-1 grid gap-4 sm:grid-cols-[1fr_220px_auto]">
          <FormField
            label="Meeting URL"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
          />
          <FormField
            label="Bot name"
            placeholder="SaarAI Bot"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
          />
          <div className="flex items-end">
            <Button onClick={handleSendBot} disabled={creating || !meetingUrl.trim()}>
              {creating ? "Sending…" : "Send bot"}
            </Button>
          </div>
        </div>
        {createMsg && <p className="mt-4 text-small text-cyan">{createMsg}</p>}
        {error && <ErrorNotice className="mt-4" message={error} />}
      </Card>

      {/* Active Bots */}
      {activeBots.length > 0 && (
        <Card title="Active bots" subtitle="Live status — auto-refreshes every 10 seconds.">
          <div className="space-y-2">
            {activeBots.map((bot) => (
              <div
                key={bot.id}
                className="flex items-center justify-between gap-4 rounded-control border border-line bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-ink">{bot.name}</p>
                  <p className="mt-0.5 truncate text-small text-ink-2">{bot.meeting_url}</p>
                </div>
                {(() => {
                  const status = botStateToThreadState(bot.state);
                  return (
                    <span className="inline-flex items-center gap-3">
                      <Thread state={status.state} size="inline" label={`Status: ${status.label}`} />
                      <span className="text-small text-ink-2">{status.label}</span>
                    </span>
                  );
                })()}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card title="Recent activity" subtitle="Completed meetings ready for AI analysis.">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : completedBots.length === 0 ? (
          <EmptyState
            devanagari="खाली"
            title="No completed meetings yet"
            body="Send a bot to a meeting and it will show up here once the call ends."
          />
        ) : (
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-raised">
                  <th className="px-4 py-2.5 text-left text-small text-ink-2">Name</th>
                  <th className="px-4 py-2.5 text-left text-small text-ink-2">Date</th>
                  <th className="px-4 py-2.5 text-left text-small text-ink-2">Status</th>
                  <th className="px-4 py-2.5 text-right text-small text-ink-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedBots
                  .slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE)
                  .map((bot) => (
                    <tr
                      key={bot.id}
                      className="border-b border-line last:border-0 transition-colors hover:bg-raised"
                    >
                      <td className="px-4 py-3">
                        <p className="text-body text-ink">{bot.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-body text-ink-2">{new Date(bot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const status = botStateToThreadState(bot.state);
                          return (
                            <span className="inline-flex items-center gap-3">
                              <Thread state={status.state} size="inline" label={`Status: ${status.label}`} />
                              <span className="text-small text-ink-2">{status.label}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/meetings/${bot.id}`} className={SECONDARY_LINK}>
                            Details
                          </Link>
                          <Link to={`/meetings/${bot.id}`} className={PRIMARY_LINK}>
                            Open essence
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {/* Pagination */}
            {completedBots.length > ACTIVITY_PER_PAGE && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <p className="text-small text-ink-2">
                  Showing {(activityPage - 1) * ACTIVITY_PER_PAGE + 1}–{Math.min(activityPage * ACTIVITY_PER_PAGE, completedBots.length)} of {completedBots.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-2 transition-colors hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActivityPage((p) => Math.min(Math.ceil(completedBots.length / ACTIVITY_PER_PAGE), p + 1))}
                    disabled={activityPage >= Math.ceil(completedBots.length / ACTIVITY_PER_PAGE)}
                    className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-2 transition-colors hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
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
    </div>
  );
}

export default Dashboard;
