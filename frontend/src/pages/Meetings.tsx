import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { meetingsApi, type Meeting } from "../api";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorNotice from "../components/ui/ErrorNotice";
import { LinkButton } from "../components/ui/LinkButton";
import Skeleton from "../components/ui/Skeleton";
import StatusThread from "../components/meeting/StatusThread";
import { botStateToThreadState, isLiveState } from "../lib/status";

const FILTER_STATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

type SortField = "name" | "date" | "state";
type SortDir = "asc" | "desc";

export function Meetings() {
  const [searchParams] = useSearchParams();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.list();
      setMeetings(data.meetings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load meetings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // The top bar navigates to /meetings?q=… while this page is already mounted,
  // so the query has to be read on every searchParams change, not just on mount.
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

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
      className={`ml-1 inline h-3 w-3 transition-transform ${sortField === field && sortDir === "asc" ? "rotate-180" : ""} ${sortField === field ? "text-violet" : "text-ink-2"}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );

  const sorted = meetings
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

  // Live meetings sort to the top within any sort order
  const ordered = [...sorted.filter((m) => isLiveState(m.state)), ...sorted.filter((m) => !isLiveState(m.state))];

  const totalPages = Math.ceil(ordered.length / PER_PAGE);
  const paginated = ordered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-ink">Meetings</h1>
        <p className="mt-1 text-body text-ink-2">
          All your recorded meetings. Click a meeting to view details and generate AI outputs.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search meetings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-control border border-line bg-surface py-2 pl-10 pr-4 text-body text-ink outline-none transition-colors placeholder:text-ink-2 focus-visible:outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-control border border-line bg-surface px-3 py-2 text-body text-ink-2 outline-none transition-colors focus-visible:outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
        >
          <option value="all">All statuses</option>
          {FILTER_STATES.map((code) => (
            <option key={code} value={code}>{botStateToThreadState(code).label}</option>
          ))}
        </select>
        <span className="text-small text-ink-2">{ordered.length} meeting{ordered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table or error */}
      <div>
        <Card noPadding>
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorNotice message={error} onRetry={() => void load()} />
            </div>
          ) : ordered.length === 0 ? (
            <div className="px-6">
              {meetings.length === 0 ? (
                <EmptyState
                  devanagari="खाली"
                  title="No meetings yet"
                  body="Send a bot to your next call to see it here."
                  action={
                    <LinkButton to="/dashboard">Send bot</LinkButton>
                  }
                />
              ) : (
                <EmptyState
                  devanagari="खोज"
                  title="No meetings match"
                  body="Try a different name or clear the status filter."
                />
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-line bg-raised">
                      <th className="px-5 py-3 text-small text-ink-2 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                        Meeting name <SortIcon field="name" />
                      </th>
                      <th className="px-5 py-3 text-small text-ink-2 hidden sm:table-cell">Bot ID</th>
                      <th className="px-5 py-3 text-small text-ink-2 cursor-pointer select-none" onClick={() => toggleSort("date")}>
                        Date <SortIcon field="date" />
                      </th>
                      <th className="px-5 py-3 text-small text-ink-2 cursor-pointer select-none" onClick={() => toggleSort("state")}>
                        Status <SortIcon field="state" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((meeting) => {
                      const status = botStateToThreadState(meeting.state);
                      return (
                        <tr
                          key={meeting.id}
                          className="relative border-b border-line last:border-0 hover:bg-raised transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <Link
                              to={`/meetings/${meeting.id}`}
                              className="font-medium text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                            >
                              {meeting.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-ink-2 hidden sm:table-cell">#{meeting.id}</td>
                          <td className="px-5 py-3.5 text-ink-2">
                            {new Date(meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusThread state={status.state} label={status.label} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-5 py-3">
                  <p className="text-small text-ink-2">
                    Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, ordered.length)} of {ordered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-2 transition-colors hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="px-2 text-small text-ink-2">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-ink-2 transition-colors hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
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
      </div>
    </div>
  );
}

export default Meetings;
