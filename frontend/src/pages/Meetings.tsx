import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting } from "../api";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";

const stateLabels: Record<number, { text: string; color: string; dot?: string }> = {
  1: { text: "Ready", color: "bg-[#f6f9fc] text-[#425466]" },
  2: { text: "Joining", color: "bg-[#fffbeb] text-[#92400e]", dot: "bg-[#f5a623]" },
  3: { text: "In Meeting", color: "bg-[#eff6ff] text-[#1e40af]", dot: "bg-[#3b82f6]" },
  4: { text: "Recording", color: "bg-[#ecfdf5] text-[#065f46]", dot: "bg-[#0caf60]" },
  5: { text: "Leaving", color: "bg-[#fff7ed] text-[#9a3412]", dot: "bg-[#f97316]" },
  6: { text: "Processing", color: "bg-[#faf5ff] text-[#6b21a8]", dot: "bg-[#a855f7]" },
  7: { text: "Error", color: "bg-[#fef2f2] text-[#991b1b]" },
  8: { text: "Waiting Room", color: "bg-[#fffbeb] text-[#92400e]", dot: "bg-[#f5a623]" },
  9: { text: "Completed", color: "bg-[#ecfdf5] text-[#065f46]" },
  11: { text: "Scheduled", color: "bg-[#eff6ff] text-[#1e40af]" },
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

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
    <svg
      className={`ml-1 inline h-3 w-3 transition-transform ${sortField === field && sortDir === "asc" ? "rotate-180" : ""} ${sortField === field ? "text-[#635bff]" : "text-[#8898aa]"}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
    >
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


  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#0a2540]">Meetings</h1>
        <p className="mt-1 text-[15px] text-[#697386]">
          All your recorded meetings. Click a meeting to view details and generate AI outputs.
        </p>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8898aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search meetings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-[#e3e8ee] bg-white py-2 pl-10 pr-4 text-sm text-[#0a2540] outline-none transition-all placeholder:text-[#8898aa] focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 shadow-[0_1px_2px_rgba(50,50,93,0.06)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-[#e3e8ee] bg-white px-3 py-2 text-sm text-[#425466] outline-none transition-all focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 shadow-[0_1px_2px_rgba(50,50,93,0.06)]"
        >
          <option value="all">All Statuses</option>
          {Object.entries(stateLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.text}</option>
          ))}
        </select>
        <span className="text-xs font-medium text-[#8898aa]">{filtered.length} meeting{filtered.length !== 1 ? "s" : ""}</span>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card noPadding>
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <svg className="mx-auto h-10 w-10 text-[#8898aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <p className="mt-3 text-sm font-medium text-[#425466]">
                {meetings.length === 0 ? "No meetings yet" : "No meetings match your filters"}
              </p>
              <p className="mt-1 text-xs text-[#8898aa]">
                {meetings.length === 0 ? "Go to the Dashboard to send a bot to a meeting." : "Try adjusting your search or filters."}
              </p>
              {meetings.length === 0 && (
                <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#635bff] hover:text-[#7a73ff] transition-colors">
                  Go to Dashboard
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc]">
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#697386] cursor-pointer select-none" onClick={() => toggleSort("name")}>
                        Meeting Name <SortIcon field="name" />
                      </th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#697386] hidden sm:table-cell">Bot ID</th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#697386] cursor-pointer select-none" onClick={() => toggleSort("date")}>
                        Date <SortIcon field="date" />
                      </th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#697386] cursor-pointer select-none" onClick={() => toggleSort("state")}>
                        Status <SortIcon field="state" />
                      </th>
                      <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#697386] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((meeting, i) => {
                      const state = stateLabels[meeting.state] || { text: `State ${meeting.state}`, color: "bg-[#f6f9fc] text-[#425466]" };
                      const isCompleted = meeting.state === 9;
                      return (
                        <motion.tr
                          key={meeting.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          className="border-b border-[#e3e8ee] last:border-0 hover:bg-[#f6f9fc] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-[#0a2540] truncate max-w-[280px]">{meeting.name}</p>
                          </td>
                          <td className="px-5 py-3.5 text-[#697386] hidden sm:table-cell">#{meeting.id}</td>
                          <td className="px-5 py-3.5 text-[#697386]">
                            {new Date(meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1">
                              {state.dot && <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />}
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${state.color}`}>{state.text}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isCompleted ? (
                              <div className="flex justify-end gap-2">
                                <Link
                                  to={`/meetings/${meeting.id}`}
                                  className="rounded-md border border-[#e3e8ee] bg-white px-3 py-1.5 text-xs font-medium text-[#425466] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] hover:shadow-[0_2px_5px_-1px_rgba(50,50,93,0.1)]"
                                >
                                  Details
                                </Link>
                                <Link
                                  to={`/meetings/${meeting.id}`}
                                  className="rounded-md bg-[#635bff] px-3 py-1.5 text-xs font-medium text-white shadow-[0_2px_5px_-1px_rgba(50,50,93,0.25)] transition-all hover:bg-[#7a73ff] hover:shadow-[0_4px_8px_-2px_rgba(50,50,93,0.3)]"
                                >
                                  View & AI
                                </Link>
                              </div>
                            ) : (
                              <span className="text-xs text-[#8898aa]">—</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[#e3e8ee] px-5 py-3">
                  <p className="text-xs text-[#697386]">
                    Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e3e8ee] bg-white text-[#697386] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="px-2 text-xs font-medium text-[#425466]">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e3e8ee] bg-white text-[#697386] shadow-[0_1px_2px_rgba(50,50,93,0.06)] transition-all hover:bg-[#f6f9fc] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default Meetings;
