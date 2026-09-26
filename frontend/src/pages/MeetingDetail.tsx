import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { SECTION_KEYS, type Insights, type Minutes, type SectionKey, type Strategy } from "../api";
import InsightsSection from "../components/meeting/InsightsSection";
import MinutesSection from "../components/meeting/MinutesSection";
import ParticipantChips from "../components/meeting/ParticipantChips";
import SectionFrame from "../components/meeting/SectionFrame";
import SectionNav, { SECTION_TITLES } from "../components/meeting/SectionNav";
import StrategySection from "../components/meeting/StrategySection";
import TranscriptDrawer from "../components/meeting/TranscriptDrawer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ErrorNotice from "../components/ui/ErrorNotice";
import LinkButton from "../components/ui/LinkButton";
import LoadingThread from "../components/ui/LoadingThread";
import Thread from "../components/ui/Thread";
import { useMeetingContext } from "../context/MeetingContext";
import { useMeeting } from "../hooks/useMeeting";
import { botStateToThreadState } from "../lib/status";
import { formatDate, formatDuration } from "../lib/time";

const PHASE_BODY: Record<string, string> = {
  live: "The bot is in the call and the transcript is growing beside you.",
  processing: "The call has ended and the recording is being transcribed.",
};

const CITE_HIGHLIGHT_MS = 1500;

export function MeetingDetail() {
  const { botId } = useParams<{ botId: string }>();
  const id = Number(botId);
  const { meeting, participants, utterances, essence, phase, error, regenerate, retry } = useMeeting(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [focus, setFocus] = useState<{ index: number; nonce: number } | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (focusTimer.current) clearTimeout(focusTimer.current); }, []);
  const { setCurrent } = useMeetingContext();

  const drawerOpen = searchParams.get("transcript") === "open";
  const setDrawer = useCallback((open: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (open) next.set("transcript", "open"); else next.delete("transcript");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Live meetings open the drawer by default, but only once per meeting: `setDrawer`
  // changes identity with the query string, so re-running this would reopen the drawer
  // the instant the reader closes it.
  const openedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (phase === "live" && openedFor.current !== botId) {
      openedFor.current = botId;
      setDrawer(true);
    }
  }, [phase, botId, setDrawer]);

  // Publish name and thread to the top bar; clear on unmount.
  const status = meeting ? botStateToThreadState(meeting.state) : null;
  const name = meeting?.name;
  const threadState = status?.state;
  const threadLabel = status?.label;
  useEffect(() => {
    if (name && threadState && threadLabel) setCurrent({ name, thread: threadState, label: threadLabel });
    return () => setCurrent(null);
  }, [name, threadState, threadLabel, setCurrent]);

  // Each click gets a fresh nonce so a repeat click scrolls again; the highlight
  // clears 1500 ms after the last click.
  const onCite = (index: number) => {
    setFocus((prev) => ({ index, nonce: (prev?.nonce ?? 0) + 1 }));
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => { focusTimer.current = null; setFocus(null); }, CITE_HIGHLIGHT_MS);
    setDrawer(true);
  };

  // A non-404 failure on the very first load leaves the phase at "loading" with an
  // error set; that falls through to the error notice below rather than spinning.
  if (phase === "loading" && !error) return <LoadingThread />;
  if (phase === "notfound") {
    return (
      <EmptyState devanagari="खाली" title="Meeting not found" body="It may have been deleted, or the link is wrong." action={<LinkButton to="/meetings">All meetings</LinkButton>} />
    );
  }
  if (!meeting || !status) return <ErrorNotice message={error ?? "Couldn't load this meeting."} onRetry={retry} />;

  const last = utterances[utterances.length - 1];
  const duration = last ? formatDuration(last.timestamp_ms + last.duration_ms) : null;
  const regenerating = Object.fromEntries(SECTION_KEYS.map((k) => [k, essence[k].status === "generating"])) as Record<SectionKey, boolean>;
  const showEssence = phase === "generating" || phase === "ready";

  return (
    <div className="flex items-start gap-8">
      <div className="min-w-0 flex-1">
        <header className="mb-6">
          <h1 className="text-h1">{meeting.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-ink-2">
            <span>{formatDate(meeting.created_at)}</span>
            {duration ? <span>{duration}</span> : null}
            <ParticipantChips participants={participants} />
          </div>
          <Thread state={status.state} size="large" label={`Status: ${status.label}`} className="mt-4 max-w-[640px]" />
          {!drawerOpen ? (
            <Button variant="ghost" className="mt-3" onClick={() => setDrawer(true)}>Show transcript</Button>
          ) : null}
        </header>

        {error ? <ErrorNotice className="mb-4" message={error} onRetry={retry} /> : null}

        {phase === "failed" ? (
          <ErrorNotice message="The bot could not complete this meeting. Any transcript it captured is still available." />
        ) : showEssence ? (
          <div className="max-w-[720px]">
            <SectionNav onRegenerate={(k) => void regenerate(k)} regenerating={regenerating} />
            <SectionFrame id="mom" title={SECTION_TITLES.mom} state={essence.mom} onRetry={() => void regenerate("mom")}>
              {essence.mom.data ? <MinutesSection data={essence.mom.data as Minutes} utterances={utterances} onCite={onCite} /> : null}
            </SectionFrame>
            <SectionFrame id="insights" title={SECTION_TITLES.insights} state={essence.insights} onRetry={() => void regenerate("insights")}>
              {essence.insights.data ? <InsightsSection data={essence.insights.data as Insights} utterances={utterances} onCite={onCite} /> : null}
            </SectionFrame>
            <SectionFrame id="strategy" title={SECTION_TITLES.strategy} state={essence.strategy} onRetry={() => void regenerate("strategy")}>
              {essence.strategy.data ? <StrategySection data={essence.strategy.data as Strategy} utterances={utterances} onCite={onCite} /> : null}
            </SectionFrame>
          </div>
        ) : (
          <EmptyState devanagari="प्रतीक्षा" title="Essence arrives when the call ends" body={PHASE_BODY[phase] ?? ""} />
        )}
      </div>

      <TranscriptDrawer open={drawerOpen} onClose={() => setDrawer(false)} utterances={utterances} focus={focus} live={phase === "live"} />
    </div>
  );
}

export default MeetingDetail;
