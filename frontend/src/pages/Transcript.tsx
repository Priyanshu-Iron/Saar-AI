import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { meetingsApi, type Utterance } from "../api";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorNotice from "../components/ui/ErrorNotice";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";

export function Transcript() {
  const { botId = "" } = useParams();
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = Number(botId);
    if (!id) return;
    meetingsApi
      .transcript(id)
      .then((data) => setUtterances(data.transcript))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [botId]);

  const formatTime = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Transcript" subtitle={`Meeting #${botId} — ${utterances.length} utterances`} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorNotice message={error} />
      ) : utterances.length === 0 ? (
        <EmptyState
          devanagari="मौन"
          title="No transcript available"
          body="The bot didn't capture any speech in this meeting."
        />
      ) : (
        <div className="space-y-2">
          {utterances.map((u, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet/10 text-small text-violet">
                  {(u.speaker || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-small text-ink">{u.speaker}</span>
                    <span className="text-small text-ink-2">{formatTime(u.timestamp_ms)}</span>
                  </div>
                  <p className="mt-1 text-body text-ink-2">{u.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Transcript;
