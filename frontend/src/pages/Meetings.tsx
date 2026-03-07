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
  3: { text: "In Meeting", color: "bg-blue-100 text-blue-700" },
  4: { text: "Recording", color: "bg-green-100 text-green-700" },
  5: { text: "Leaving", color: "bg-orange-100 text-orange-700" },
  6: { text: "Processing", color: "bg-purple-100 text-purple-700" },
  7: { text: "Error", color: "bg-red-100 text-red-700" },
  8: { text: "Waiting Room", color: "bg-yellow-100 text-yellow-700" },
  9: { text: "Completed", color: "bg-emerald-100 text-emerald-700" },
  11: { text: "Scheduled", color: "bg-sky-100 text-sky-700" },
};

type SortField = "name" | "date" | "state";
type SortDir = "asc" | "desc";

export function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    meetingsApi.list().then((data) => setMeetings(data.meetings)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <svg className={`ml-1 inline h-3 w-3 transition-transform ${sortField === field && sortDir === "asc" ? "rotate-180" : ""} ${sortField === field ? "text-primary-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );

  const filtered = meetings
    .filter((m) => {
      if (statusFilter !== "all" && String(m.state) !== statusFilter) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else cmp = a.state - b.state;
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" subtitle="All your recorded meetings. Click a completed meeting to see details and generate AI outputs." />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search meetings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(13,89,242,0.1)]"
          />
        </div>
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-primary-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(stateLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.text}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{filtered.length} meeting{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <Card noPadding>
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">
              {meetings.length === 0
                ? "No meetings yet. Go to the Dashboard to send a bot."
                : "No meetings match your filters."}
            </p>
            {meetings.length === 0 && (
              <Link to="/dashboard" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
                → Go to Dashboard
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Meeting Name <SortIcon field="name" />
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600 hidden sm:table-cell">Bot ID</th>
                  <th className="px-5 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    Date <SortIcon field="date" />
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => toggleSort("state")}>
                    Status <SortIcon field="state" />
                  </th>
                  <th className="px-5 py-3 font-medium text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((meeting, i) => {
                  const state = stateLabels[meeting.state] || { text: `State ${meeting.state}`, color: "bg-slate-100 text-slate-600" };
                  const isCompleted = meeting.state === 9;
                  return (
                    <motion.tr
                      key={meeting.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="border-b border-slate-100/60 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 truncate max-w-[240px]">{meeting.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">#{meeting.id}</td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(meeting.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${state.color}`}>{state.text}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isCompleted ? (
                          <div className="flex justify-end gap-2">
                            <Link to={`/meetings/${meeting.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">Details</Link>
                            <Link to={`/meetings/${meeting.id}`} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs text-white hover:bg-primary-500 transition-colors shadow-sm">AI</Link>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Meetings;
