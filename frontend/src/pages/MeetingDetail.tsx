import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { meetingsApi, generateApi, type Meeting, type Participant, type Utterance } from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorNotice from "../components/ui/ErrorNotice";
import Skeleton from "../components/ui/Skeleton";
import Thread from "../components/ui/Thread";
import { botStateToThreadState } from "../lib/status";

type OutputData = { content: string; created_at: string };
type Outputs = Record<string, OutputData>;

const outputSections = [
  {
    key: "mom",
    label: "MOM",
    fullLabel: "Minutes of meeting",
    tint: "bg-violet/10 text-violet",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    key: "insights",
    label: "Insights",
    fullLabel: "Key insights",
    tint: "bg-cyan/10 text-cyan",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    key: "strategy",
    label: "Strategy",
    fullLabel: "Strategic analysis",
    tint: "bg-gold/10 text-gold",
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
        setOutputs(outputsData.outputs as unknown as Outputs);
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
      setOutputs(data.outputs as unknown as Outputs);
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
        <h1 className="text-h1 text-ink">Meeting not found</h1>
        <ErrorNotice message={error} />
      </div>
    );
  }

  if (!meeting) return null;

  const isCompleted = meeting.state === 9;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/meetings" className="mb-3 inline-flex items-center gap-1.5 text-small text-ink-2 hover:text-violet transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to meetings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-h1 text-ink">{meeting.name}</h1>
            <p className="mt-1 text-body text-ink-2">
              Bot #{botId} — {new Date(meeting.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          {(() => {
            const status = botStateToThreadState(meeting.state);
            return (
              <span className="mt-1 inline-flex items-center gap-3">
                <Thread state={status.state} size="inline" label={`Status: ${status.label}`} />
                <span className="text-small text-ink-2">{status.label}</span>
              </span>
            );
          })()}
        </div>
      </div>

      {/* Meeting Info Card */}
      <Card>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-small text-ink-2">Meeting URL</dt>
            <dd className="mt-1.5 break-all text-body text-ink">{meeting.meeting_url}</dd>
          </div>
          <div>
            <dt className="text-small text-ink-2">Participants</dt>
            <dd className="mt-1.5 text-body text-ink">{participants.length}</dd>
          </div>
          <div>
            <dt className="text-small text-ink-2">Created</dt>
            <dd className="mt-1.5 text-body text-ink">
              {new Date(meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </dd>
          </div>
          <div>
            <dt className="text-small text-ink-2">AI outputs</dt>
            <dd className="mt-1.5">
              {hasOutputs ? (
                <span className="text-body text-cyan">Generated</span>
              ) : (
                <span className="text-body text-ink-2">Pending</span>
              )}
            </dd>
          </div>
        </div>
        {participants.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
            {participants.map((p, i) => (
              <div key={p.id || i} className="flex items-center gap-2 rounded-control border border-line bg-raised px-3 py-1.5 text-small">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet/10 text-small text-violet">
                  {(p.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-ink">{p.full_name || "Unknown"}</span>
                {p.is_host && <span className="text-small text-gold">Host</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Split View: Transcript + AI Outputs */}
      {isCompleted && (
        <div className={`grid gap-6 ${expanded ? 'grid-cols-1' : 'lg:grid-cols-[1fr_1.2fr]'}`}>
          {/* Left: Transcript */}
          {!expanded && (
            <Card className="lg:max-h-[700px] lg:overflow-hidden lg:flex lg:flex-col">
              <div className="flex items-center gap-2 pb-4 border-b border-line mb-4">
                <svg className="h-4 w-4 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <h3 className="text-h3 text-ink">Transcript</h3>
                <span className="ml-auto text-small text-ink-2">{transcript.length} utterance{transcript.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {transcript.length === 0 ? (
                  <EmptyState
                    devanagari="मौन"
                    title="No transcript available"
                    body="The bot didn't capture any speech in this meeting."
                  />
                ) : (
                  transcript.map((u, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-control p-3 hover:bg-raised transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet/10 text-small text-violet">
                        {(u.speaker || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-small text-ink">{u.speaker}</span>
                          <span className="text-small text-ink-2">{formatTime(u.timestamp_ms)}</span>
                        </div>
                        <p className="mt-0.5 text-body text-ink-2 leading-relaxed">{u.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Right: AI Outputs */}
          <Card className={`${expanded ? '' : 'lg:max-h-[700px]'} lg:overflow-hidden lg:flex lg:flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-control bg-violet/10 text-violet">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-h3 text-ink">AI outputs</h3>
                  <p className="text-small text-ink-2">
                    {hasOutputs ? "Generated and saved" : "Generate minutes, insights, and strategy"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasOutputs && (
                  <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
                    {generating ? "Regenerating…" : "Regenerate"}
                  </Button>
                )}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-2 transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
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

            {error && <ErrorNotice className="mt-4" message={error} />}

            {generating && (
              <div className="mt-5 space-y-4">
                <p className="text-body text-ink-2">Analyzing transcript and generating outputs…</p>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            )}

            {!hasOutputs && !generating && (
              <EmptyState
                devanagari="सार"
                title="Ready to extract the essence"
                body="Generate minutes, insights, and strategy from this transcript."
                action={
                  <Button onClick={handleGenerate} disabled={generating}>
                    Generate essence
                  </Button>
                }
              />
            )}

            {hasOutputs && !generating && (
              <div className="mt-4 flex-1 overflow-y-auto min-h-0">
                {/* Tab Bar */}
                <div className="flex border-b border-line">
                  {outputSections.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={[
                        "flex items-center gap-1.5 px-4 py-2.5 text-small transition-colors border-b-2 -mb-px",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
                        activeTab === key
                          ? "text-ink border-violet"
                          : "text-ink-2 border-transparent hover:text-ink hover:border-line",
                      ].join(" ")}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {outputSections.map(({ key, fullLabel, tint, icon }) => {
                  if (activeTab !== key) return null;
                  const data = outputs[key];
                  return (
                    <div key={key} className="mt-5">
                      {/* Section header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-control ${tint}`}>
                            {icon}
                          </div>
                          <h4 className="text-h3 text-ink">{fullLabel}</h4>
                        </div>
                        {data?.created_at && (
                          <span className="text-small text-ink-2">
                            {new Date(data.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-line mb-4" />

                      {/* Markdown Content */}
                      <div className="prose prose-sm max-w-none text-ink-2
                          [&_h1]:text-h2 [&_h1]:text-ink [&_h1]:mt-6 [&_h1]:mb-3
                          [&_h2]:text-h3 [&_h2]:text-ink [&_h2]:mt-5 [&_h2]:mb-2
                          [&_h3]:text-h3 [&_h3]:text-ink [&_h3]:mt-4 [&_h3]:mb-2
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
                          [&_li]:my-1 [&_li]:leading-relaxed
                          [&_p]:my-2 [&_p]:leading-relaxed
                          [&_strong]:font-semibold [&_strong]:text-ink
                          [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-body [&_table]:rounded-panel [&_table]:overflow-hidden
                          [&_th]:border [&_th]:border-line [&_th]:bg-raised [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-ink [&_th]:text-small
                          [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2
                          [&_blockquote]:border-l-2 [&_blockquote]:border-violet [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-2
                          [&_code]:bg-raised [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-control [&_code]:text-violet [&_code]:text-small
                        ">
                        {data?.content
                          ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
                          : <p className="text-body text-ink-2">Not generated yet.</p>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default MeetingDetail;
