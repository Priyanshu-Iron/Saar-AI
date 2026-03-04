import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting } from "../api";
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

export function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meetingsApi.list().then((data) => setMeetings(data.meetings)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" subtitle="All your recorded meetings. Click a completed meeting to see details and generate AI outputs." />
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : meetings.length === 0 ? (
          <Card>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">No meetings yet. Go to the Dashboard to send a bot to a meeting.</p>
              <Link to="/dashboard" className="mt-3 inline-block text-sm font-medium text-sky-600 hover:underline">
                → Go to Dashboard
              </Link>
            </div>
          </Card>
        ) : (
          meetings.map((meeting, i) => {
            const state = stateLabels[meeting.state] || { text: `State ${meeting.state}`, color: "bg-slate-100 text-slate-600" };
            const isCompleted = meeting.state === 9;
            return (
              <motion.div key={meeting.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900">{meeting.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(meeting.created_at).toLocaleString()} •{" "}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${state.color}`}>{state.text}</span>
                      </p>
                    </div>
                    {isCompleted && (
                      <div className="flex gap-2 text-xs">
                        <Link to={`/meetings/${meeting.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50">Details</Link>
                        <Link to={`/meetings/${meeting.id}/transcript`} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50">Transcript</Link>
                        <Link to={`/meetings/${meeting.id}`} className="rounded-lg bg-sky-600 px-3 py-2 text-white hover:bg-sky-500">View & AI</Link>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Meetings;
