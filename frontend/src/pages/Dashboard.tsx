import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting, type RecentMeeting } from "../api";
import StatusThread from "../components/meeting/StatusThread";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import LinkButton from "../components/ui/LinkButton";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { usePolling } from "../hooks/usePolling";
import { botStateToThreadState, isLiveState } from "../lib/status";
import { formatDate, formatDuration } from "../lib/time";

const BOTS_MS = 10_000;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const rowLink = "flex items-center gap-4 rounded-control px-3 py-2 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function Dashboard() {
  const [bots, setBots] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<RecentMeeting[] | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("SaarAI Bot");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadBots = useCallback(async () => {
    try {
      const data = await meetingsApi.botsStatus();
      setBots(data.bots);
    } catch {
      // Live rows are a convenience; a failed poll keeps the last known state.
    }
  }, []);
  usePolling(loadBots, BOTS_MS);

  const loadRecent = useCallback(async () => {
    try {
      const data = await meetingsApi.recent(5);
      setRecent(data.meetings);
      setRecentError(null);
    } catch (err) {
      setRecentError(err instanceof Error ? err.message : "Couldn't load recent meetings.");
      setRecent([]);
    }
  }, []);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const sendBot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!meetingUrl.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await meetingsApi.create(meetingUrl.trim(), botName.trim() || "SaarAI Bot");
      setMeetingUrl("");
      await loadBots();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send the bot.");
    } finally {
      setSending(false);
    }
  };

  const live = bots.filter((b) => isLiveState(b.state));

  return (
    <div className="space-y-8">
      <PageHeader title={greeting()} subtitle={formatDate(new Date().toISOString())} />

      <Card title="Send a bot" subtitle="Paste a Google Meet, Zoom, or Teams link.">
        <form onSubmit={sendBot} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <FormField label="Meeting URL" type="url" placeholder="https://meet.google.com/abc-defg-hij" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} required />
          <FormField label="Bot name" value={botName} onChange={(e) => setBotName(e.target.value)} />
          <Button type="submit" disabled={sending}>{sending ? "Sending" : "Send bot"}</Button>
        </form>
        {sendError ? <ErrorNotice className="mt-4" message={sendError} /> : null}
      </Card>

      {live.length > 0 ? (
        <Card title="Live now" noPadding>
          <ul className="px-3 pb-3">
            {live.map((b) => {
              const s = botStateToThreadState(b.state);
              return (
                <li key={b.id}>
                  <Link to={`/meetings/${b.id}`} className={rowLink}>
                    <span className="min-w-0 flex-1 truncate text-body">{b.name}</span>
                    <StatusThread state={s.state} label={s.label} size="card" />
                    <span className="text-small text-ink-2">{formatDuration(Date.now() - new Date(b.created_at).getTime())}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card title="Recent" noPadding>
        {recent === null ? (
          <div className="space-y-2 px-6 pb-6"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : recentError ? (
          <div className="px-6 pb-6"><ErrorNotice message={recentError} onRetry={() => void loadRecent()} /></div>
        ) : recent.length === 0 ? (
          <p className="px-6 pb-6 text-body text-ink-2">Finished meetings and their first decision will appear here.</p>
        ) : (
          <ul className="px-3 pb-3">
            {recent.map(({ meeting, teaser }) => (
              <li key={meeting.id}>
                <Link to={`/meetings/${meeting.id}`} className={rowLink}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">{meeting.name}</span>
                    <span className={["block truncate text-small", teaser ? "text-ink-2" : "text-gold"].join(" ")}>{teaser ?? "Essence pending"}</span>
                  </span>
                  <span className="text-small text-ink-2">{formatDate(meeting.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-6 py-3">
          <LinkButton to="/meetings" variant="secondary">All meetings</LinkButton>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
