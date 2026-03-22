import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { meetingsApi, generateApi, type Meeting, type Participant, type Utterance } from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";

const stateLabels: Record<number, { text: string; color: string }> = {
  1: { text: "Ready", color: "bg-[#f6f9fc] text-[#425466]" },
  2: { text: "Joining", color: "bg-[#fffbeb] text-[#92400e]" },
  4: { text: "Recording", color: "bg-[#ecfdf5] text-[#065f46]" },
  6: { text: "Processing", color: "bg-[#faf5ff] text-[#6b21a8]" },
  7: { text: "Error", color: "bg-[#fef2f2] text-[#991b1b]" },
  9: { text: "Completed", color: "bg-[#ecfdf5] text-[#065f46]" },
};

type OutputData = { content: string; created_at: string };
type Outputs = Record<string, OutputData>;

const outputSections = [
  {
    key: "mom",
    label: "MOM",
    fullLabel: "Minutes of Meeting",
    accent: "#635bff",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    key: "insights",
    label: "Insights",
    fullLabel: "Key Insights",
    accent: "#0caf60",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    key: "strategy",
    label: "Strategy",
    fullLabel: "Strategic Analysis",
    accent: "#f5a623",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
] as const;

export function MeetingDetail() {
  const { botId = "" } = useParams();
  const id = Number(botId);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [outputs, setOutputs] = useState<Outputs>({});
  const [hasOutputs, setHasOutputs] = useState(false);
  const [transcript, setTranscript] = useState<Utterance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("mom");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      meetingsApi.detail(id),
      meetingsApi.outputs(id),
      meetingsApi.transcript(id).catch(() => ({ transcript: [] })),
    ])
      .then(([detail, outputsData, transcriptData]) => {
        setMeeting(detail.meeting);
        setParticipants(detail.participants);
        setOutputs(outputsData.outputs);
        setHasOutputs(outputsData.has_outputs);
        setTranscript((transcriptData as any).transcript || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      await generateApi.all(id);
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

  const formatTime = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-[#0a2540]">Meeting Not Found</h1>
        <Card><p className="text-sm text-[#e25950]">{error}</p></Card>
      </div>
    );
  }

  if (!meeting) return null;

  const state = stateLabels[meeting.state] || { text: `State ${meeting.state}`, color: "bg-[#f6f9fc] text-[#425466]" };
  const isCompleted = meeting.state === 9;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link to="/meetings" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#697386] hover:text-[#635bff] transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Meetings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#0a2540]">{meeting.name}</h1>
            <p className="mt-1 text-[15px] text-[#697386]">
              Bot #{botId} · {new Date(meeting.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${state.color}`}>
            {state.text}
          </span>
        </div>
      </motion.div>

      {/* Meeting Info Card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Meeting URL</dt>
              <dd className="mt-1.5 break-all text-sm text-[#0a2540]">{meeting.meeting_url}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Participants</dt>
              <dd className="mt-1.5 text-sm font-medium text-[#0a2540]">{participants.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">Created</dt>
              <dd className="mt-1.5 text-sm text-[#0a2540]">
                {new Date(meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">AI Outputs</dt>
              <dd className="mt-1.5">
                {hasOutputs ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0caf60]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Generated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-[#8898aa]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Pending
                  </span>
                )}
              </dd>
            </div>
          </div>
          {participants.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e3e8ee] pt-5">
              {participants.map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3 py-1.5 text-xs">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#635bff]/10 text-[9px] font-semibold text-[#635bff]">
                    {(p.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[#0a2540] font-medium">{p.full_name || "Unknown"}</span>
                  {p.is_host && <span className="rounded-full bg-[#fffbeb] border border-[#f5a623]/20 px-1.5 py-0.5 text-[9px] font-medium text-[#92400e]">Host</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Split View: Transcript + AI Outputs */}
      {isCompleted && (
        <div className={`grid gap-6 ${expanded ? 'grid-cols-1' : 'lg:grid-cols-[1fr_1.2fr]'}`}>
          {/* Left: Transcript */}
          {!expanded && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="lg:max-h-[700px] lg:overflow-hidden lg:flex lg:flex-col">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e3e8ee] mb-4">
                <svg className="h-4 w-4 text-[#697386]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <h3 className="text-sm font-semibold text-[#0a2540]">Transcript</h3>
                <span className="ml-auto text-[11px] text-[#8898aa]">{transcript.length} utterance{transcript.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {transcript.length === 0 ? (
                  <div className="py-12 text-center">
                    <svg className="mx-auto h-8 w-8 text-[#8898aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <p className="mt-2 text-sm text-[#697386]">No transcript available.</p>
                  </div>
                ) : (
                  transcript.map((u, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.01, 0.3) }}
                      className="flex items-start gap-3 rounded-md p-3 hover:bg-[#f6f9fc] transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#635bff]/10 text-[10px] font-semibold text-[#635bff]">
                        {(u.speaker || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#0a2540]">{u.speaker}</span>
                          <span className="text-[10px] font-medium text-[#8898aa]">{formatTime(u.timestamp_ms)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-[#425466] leading-relaxed">{u.text}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
          )}

          {/* Right: AI Outputs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className={`${expanded ? '' : 'lg:max-h-[700px]'} lg:overflow-hidden lg:flex lg:flex-col`}>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#e3e8ee]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635bff]/10">
                    <svg className="h-4 w-4 text-[#635bff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0a2540]">AI Outputs</h3>
                    <p className="text-[11px] text-[#8898aa]">
                      {hasOutputs ? "Generated and saved" : "Generate MOM, Insights & Strategy"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!hasOutputs && (
                    <Button onClick={handleGenerate} disabled={generating}>
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating…
                        </span>
                      ) : "Generate All"}
                    </Button>
                  )}
                  {hasOutputs && (
                    <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
                      {generating ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Regenerating…
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                          </svg>
                          Regenerate
                        </span>
                      )}
                    </Button>
                  )}
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e3e8ee] bg-white text-[#697386] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] hover:text-[#0a2540]"
                    title={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-[#e25950]/20 bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {error}
                </div>
              )}

              {generating && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-[#697386]">
                    <svg className="h-5 w-5 animate-spin text-[#635bff]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing transcript and generating outputs…
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              )}

              {!hasOutputs && !generating && (
                <div className="mt-6 flex flex-col items-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#635bff]/10 mb-4">
                    <svg className="h-7 w-7 text-[#635bff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-[#0a2540]">Ready to analyze</h4>
                  <p className="mt-1 max-w-[280px] text-xs text-[#697386]">
                    Generate AI-powered meeting minutes, key insights, and strategic recommendations from your transcript.
                  </p>
                </div>
              )}

              {hasOutputs && !generating && (
                <div className="mt-4 flex-1 overflow-y-auto min-h-0">
                  {/* Tab Bar */}
                  <div className="flex border-b border-[#e3e8ee]">
                    {outputSections.map(({ key, label, icon, accent }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={[
                          "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 -mb-px",
                          activeTab === key
                            ? "text-[#0a2540] border-[#635bff]"
                            : "text-[#697386] border-transparent hover:text-[#0a2540] hover:border-[#e3e8ee]",
                        ].join(" ")}
                      >
                        <span style={{ color: activeTab === key ? accent : undefined }}>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {outputSections.map(({ key, fullLabel, accent, icon }) => {
                    if (activeTab !== key) return null;
                    const data = outputs[key];
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-5"
                      >
                        {/* Section header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-md"
                              style={{ background: `${accent}15` }}
                            >
                              <span style={{ color: accent }}>{icon}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-[#0a2540]">{fullLabel}</h4>
                          </div>
                          {data?.created_at && (
                            <span className="text-[10px] font-medium text-[#8898aa]">
                              {new Date(data.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-[#e3e8ee] mb-4" />

                        {/* Markdown Content */}
                        <div className="prose prose-sm max-w-none text-[#425466]
                          [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#0a2540] [&_h1]:mt-6 [&_h1]:mb-3
                          [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#0a2540] [&_h2]:mt-5 [&_h2]:mb-2
                          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#0a2540] [&_h3]:mt-4 [&_h3]:mb-2
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
                          [&_li]:my-1 [&_li]:leading-relaxed
                          [&_p]:my-2 [&_p]:leading-relaxed
                          [&_strong]:font-semibold [&_strong]:text-[#0a2540]
                          [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm [&_table]:rounded-md [&_table]:overflow-hidden
                          [&_th]:border [&_th]:border-[#e3e8ee] [&_th]:bg-[#f6f9fc] [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-left [&_th]:text-[#0a2540] [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider
                          [&_td]:border [&_td]:border-[#e3e8ee] [&_td]:px-3 [&_td]:py-2
                          [&_blockquote]:border-l-2 [&_blockquote]:border-[#635bff] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#697386]
                          [&_code]:bg-[#f6f9fc] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[#635bff] [&_code]:text-xs
                        ">
                          {data?.content
                            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
                            : <p className="text-sm text-[#8898aa]">Not generated yet.</p>
                          }
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default MeetingDetail;
