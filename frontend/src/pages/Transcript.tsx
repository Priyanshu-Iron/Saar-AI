import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { meetingsApi, type Utterance } from "../api";
import Card from "../components/ui/Card";
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
      <PageHeader title="Transcript" subtitle={`Meeting #${botId} • ${utterances.length} utterances`} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <Card><p className="text-sm text-red-500">{error}</p></Card>
      ) : utterances.length === 0 ? (
        <Card><p className="text-center text-sm text-slate-500">No transcript available for this meeting.</p></Card>
      ) : (
        <div className="space-y-2">
          {utterances.map((u, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}>
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                    {(u.speaker || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{u.speaker}</span>
                      <span className="text-[10px] text-slate-400">{formatTime(u.timestamp_ms)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{u.text}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Transcript;
