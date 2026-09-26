import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError, generateApi, meetingsApi, SECTION_KEYS,
  type Insights, type Meeting, type Minutes, type OutputsResponse, type Participant, type SectionKey, type Strategy, type Utterance,
} from "../api";
import { botStateToThreadState, isFinishedState } from "../lib/status";
import { usePolling } from "./usePolling";

export type Phase = "loading" | "live" | "processing" | "generating" | "ready" | "failed" | "notfound";
export type SectionStatus = "empty" | "generating" | "ready" | "legacy" | "error";
export type SectionState = {
  status: SectionStatus;
  data?: Minutes | Insights | Strategy;
  markdown?: string;
  createdAt?: string;
  error?: string;
  /** A failed regenerate on a section that still has stored content. */
  notice?: string;
};
export type IndexedUtterance = Utterance & { index: number };
export type MeetingView = {
  meeting: Meeting | null;
  participants: Participant[];
  utterances: IndexedUtterance[];
  essence: Record<SectionKey, SectionState>;
  phase: Phase;
  error: string | null;
  regenerate: (section: SectionKey) => Promise<void>;
  retry: () => void;
};

const LIVE_MS = 5000;
const STATUS_MS = 3000;

const emptyEssence = (): Record<SectionKey, SectionState> => ({ mom: { status: "empty" }, insights: { status: "empty" }, strategy: { status: "empty" } });

function essenceFrom(res: OutputsResponse, previous: Record<SectionKey, SectionState>, generating: boolean): Record<SectionKey, SectionState> {
  const next = { ...previous };
  for (const key of SECTION_KEYS) {
    const out = res.outputs[key];
    if (out?.format === "json") next[key] = { status: "ready", data: out.content, createdAt: out.created_at };
    else if (out?.format === "markdown") next[key] = { status: "legacy", markdown: out.content, createdAt: out.created_at };
    else if (generating) next[key] = { status: "generating" };
    else if (previous[key].status === "generating") next[key] = { status: "error", error: "Could not generate this section." };
    else next[key] = previous[key].status === "error" ? previous[key] : { status: "empty" };
  }
  return next;
}

const NOT_GENERATED = "This section wasn't generated.";

/** Sections with no stored output of either format become errors the user can retry. */
function markMissing(res: OutputsResponse, essence: Record<SectionKey, SectionState>): Record<SectionKey, SectionState> {
  const next = { ...essence };
  for (const key of SECTION_KEYS) {
    if (!res.outputs[key]) next[key] = { status: "error", error: NOT_GENERATED };
  }
  return next;
}

function phaseFor(state: number): Exclude<Phase, "loading" | "notfound" | "generating"> {
  const thread = botStateToThreadState(state).state;
  if (thread === "failed") return "failed";
  if (thread === "ready") return "ready";
  if (thread === "transcribing") return "processing";
  return "live";
}

export function useMeeting(botId: number): MeetingView {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [utterances, setUtterances] = useState<IndexedUtterance[]>([]);
  const [essence, setEssence] = useState(emptyEssence);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadTranscript = useCallback(async () => {
    const res = await meetingsApi.transcript(botId);
    setUtterances(res.transcript.map((u, index) => ({ ...u, index })));
  }, [botId]);

  const loadOutputs = useCallback(async (generating: boolean) => {
    const res = await meetingsApi.outputs(botId);
    setEssence((prev) => essenceFrom(res, prev, generating));
    return res;
  }, [botId]);

  const loadDetail = useCallback(async () => {
    try {
      const res = await meetingsApi.detail(botId);
      setMeeting(res.meeting);
      setParticipants(res.participants);
      setError(null);
      return res.meeting;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setPhase("notfound");
      else setError(err instanceof Error ? err.message : "Couldn't load this meeting.");
      return null;
    }
  }, [botId]);

  // Once the meeting is finished. Only a state-9 meeting with no outputs at all auto-generates;
  // otherwise ask whether a generation is running (reload, second tab) and either wait for it
  // or show the missing sections as errors with Try again.
  const settleFinished = useCallback(async (state: number, isCancelled: () => boolean) => {
    const res = await meetingsApi.outputs(botId);
    if (isCancelled()) return;
    const present = SECTION_KEYS.filter((k) => res.outputs[k]);
    if (present.length === 0 && state === 9) {
      setEssence((prev) => essenceFrom(res, prev, true));
      setPhase("generating");
      generateApi.all(botId).catch((err) => {
        if (err instanceof ApiError && err.status === 409) return; // already running elsewhere
        if (!isCancelled()) setError(err instanceof Error ? err.message : "Generation failed.");
      });
      return;
    }
    if (present.length === 0 || present.length === SECTION_KEYS.length) {
      setEssence((prev) => essenceFrom(res, prev, false));
      setPhase("ready");
      return;
    }
    const running = await generateApi.status(botId).then((s) => s.running, () => false);
    if (isCancelled()) return;
    if (running) {
      setEssence((prev) => essenceFrom(res, prev, true));
      setPhase("generating");
    } else {
      setEssence((prev) => markMissing(res, essenceFrom(res, prev, false)));
      setPhase("ready");
    }
  }, [botId]);

  // Initial load and phase decision.
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setError(null);
    (async () => {
      const m = await loadDetail();
      if (!m || cancelled) return;
      await loadTranscript().catch(() => undefined);
      const next = phaseFor(m.state);
      if (next === "ready") await settleFinished(m.state, () => cancelled);
      else setPhase(next);
    })();
    return () => { cancelled = true; };
  }, [botId, reloadKey, loadDetail, loadTranscript, settleFinished]);

  // Live and processing: poll detail (and transcript when live) until finished.
  const livePolling = phase === "live" || phase === "processing";
  usePolling(async () => {
    const m = await loadDetail();
    if (!m) return;
    if (phase === "live") await loadTranscript().catch(() => undefined);
    const next = phaseFor(m.state);
    if (next === "failed") setPhase("failed");
    else if (isFinishedState(m.state)) await settleFinished(m.state, () => false);
    else if (next !== phase) setPhase(next);
  }, livePolling ? LIVE_MS : null, false);

  // Generating: poll status until the lock clears.
  usePolling(async () => {
    const status = await generateApi.status(botId);
    await loadOutputs(status.running);
    if (!status.running) {
      await loadTranscript().catch(() => undefined);
      setPhase("ready");
    }
  }, phase === "generating" ? STATUS_MS : null, false);

  const essenceRef = useRef(essence);
  essenceRef.current = essence;

  const regenerate = useCallback(async (section: SectionKey) => {
    const previous = essenceRef.current[section];
    setEssence((prev) => ({ ...prev, [section]: { status: "generating" } }));
    try {
      const res = await generateApi[section](botId);
      setEssence((prev) => ({ ...prev, [section]: { status: "ready", data: res.content, createdAt: new Date().toISOString() } }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPhase("generating"); // another generation holds the lock; the status poll picks it up
        return;
      }
      const message = err instanceof Error ? err.message : "Could not generate this section.";
      const keepsContent = previous.status === "ready" || previous.status === "legacy";
      setEssence((prev) => ({
        ...prev,
        [section]: keepsContent ? { ...previous, notice: message } : { status: "error", error: message },
      }));
    }
  }, [botId]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { meeting, participants, utterances, essence, phase, error, regenerate, retry };
}

export default useMeeting;
