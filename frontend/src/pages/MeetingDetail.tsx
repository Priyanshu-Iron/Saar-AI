import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { meetingsApi, generateApi, type Meeting, type Participant } from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";

const stateLabels: Record<number, { text: string; color: string }> = {
  1: { text: "Ready", color: "bg-slate-100 text-slate-600" },
  2: { text: "Joining", color: "bg-amber-100 text-amber-700" },
  4: { text: "Recording", color: "bg-green-100 text-green-700" },
  6: { text: "Processing", color: "bg-purple-100 text-purple-700" },
  7: { text: "Error", color: "bg-red-100 text-red-700" },
  9: { text: "Completed", color: "bg-emerald-100 text-emerald-700" },
};

type OutputData = { content: string; created_at: string };
type Outputs = Record<string, OutputData>;

const outputSections = [
  { key: "mom", label: "📋 Minutes of Meeting", accent: "border-l-sky-500 bg-sky-50/30" },
  { key: "insights", label: "💡 Insights", accent: "border-l-emerald-500 bg-emerald-50/30" },
  { key: "strategy", label: "🎯 Strategy", accent: "border-l-purple-500 bg-purple-50/30" },
] as const;

export function MeetingDetail() {
  const { botId = "" } = useParams();
  const id = Number(botId);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [outputs, setOutputs] = useState<Outputs>({});
  const [hasOutputs, setHasOutputs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("mom");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      meetingsApi.detail(id),
      meetingsApi.outputs(id),
    ])
      .then(([detail, outputsData]) => {
        setMeeting(detail.meeting);
        setParticipants(detail.participants);
        setOutputs(outputsData.outputs);
        setHasOutputs(outputsData.has_outputs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      await generateApi.all(id);
      // Re-fetch saved outputs
      const data = await meetingsApi.outputs(id);
      setOutputs(data.outputs);
      setHasOutputs(data.has_outputs);
      setActiveTab("mom");
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meeting Not Found" subtitle="Could not load this meeting." />
        <Card><p className="text-sm text-red-500">{error}</p></Card>
      </div>
    );
  }

  if (!meeting) return null;

  const state = stateLabels[meeting.state] || { text: `State ${meeting.state}`, color: "bg-slate-100 text-slate-600" };
  const isCompleted = meeting.state === 9;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/meetings" className="mb-2 inline-block text-xs text-slate-400 hover:text-sky-600">← Back to Meetings</Link>
          <PageHeader title={meeting.name} subtitle={`Bot #${botId} • ${new Date(meeting.created_at).toLocaleString()}`} />
        </div>
        <span className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${state.color}`}>{state.text}</span>
      </div>

      {/* Meeting Info Card */}
      <Card title="Meeting Info">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Meeting URL</dt>
            <dd className="mt-1 break-all text-sm text-slate-800">{meeting.meeting_url}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Participants</dt>
            <dd className="mt-1 text-sm text-slate-800">{participants.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-800">{new Date(meeting.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">AI Outputs</dt>
            <dd className="mt-1 text-sm text-slate-800">{hasOutputs ? "✅ Generated" : "⏳ Not yet generated"}</dd>
          </div>
        </dl>
      </Card>

      {/* Participants */}
      {participants.length > 0 && (
        <Card title="Participants">
          <div className="flex flex-wrap gap-2">
            {participants.map((p, i) => (
              <div key={p.id || i} className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-700">
                  {(p.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-700">{p.full_name || "Unknown"}</span>
                {p.is_host && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">Host</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Outputs Section */}
      {isCompleted && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">🤖 AI Outputs</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {hasOutputs ? "Generated and saved. View below." : "Generate MOM, Insights, and Strategy for this meeting."}
                </p>
              </div>
              {!hasOutputs && (
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "Generating… (may take a minute)" : "Generate All"}
                </Button>
              )}
              {hasOutputs && (
                <Button variant="ghost" onClick={handleGenerate} disabled={generating}>
                  {generating ? "Regenerating…" : "🔄 Regenerate"}
                </Button>
              )}
            </div>

            {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

            {generating && (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}

            {hasOutputs && !generating && (
              <div className="mt-4">
                {/* Tabs */}
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {outputSections.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={[
                        "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                        activeTab === key
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                {outputSections.map(({ key, label, accent }) => {
                  if (activeTab !== key) return null;
                  const data = outputs[key];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 rounded-xl border border-slate-200 p-5 border-l-4 ${accent}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">{label}</h4>
                        {data?.created_at && (
                          <span className="text-[10px] text-slate-400">
                            Generated {new Date(data.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="prose prose-slate prose-sm max-w-none
                        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3
                        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2
                        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
                        [&_p]:my-2 [&_p]:leading-relaxed
                        [&_strong]:font-semibold
                        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm
                        [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-left
                        [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-1.5
                      ">
                        {data?.content
                          ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
                          : <p className="text-sm text-slate-400">Not generated yet.</p>
                        }
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link to={`/meetings/${botId}/transcript`}>
          <Button variant="secondary">View Transcript</Button>
        </Link>
      </div>
    </div>
  );
}

export default MeetingDetail;
