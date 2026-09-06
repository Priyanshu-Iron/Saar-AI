import { type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { meetingsApi } from "../../api";
import { breadcrumbFor } from "../../lib/breadcrumb";
import { isLiveState } from "../../lib/status";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

const LIVE_POLL_MS = 30_000;

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await meetingsApi.botsStatus();
        if (!cancelled) setLiveCount(data.bots.filter((b) => isLiveState(b.state)).length);
      } catch {
        // The live count is a convenience; failures stay silent.
      }
    };
    void load();
    const id = window.setInterval(load, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/meetings?q=${encodeURIComponent(q)}` : "/meetings");
  };

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center gap-4 border-b border-line bg-ground/70 px-4 backdrop-blur-md sm:px-6">
      <p className="min-w-0 flex-1 truncate text-small text-ink-2 sm:flex-none">{breadcrumbFor(location.pathname)}</p>

      {/* Thread slot: filled by the meeting workspace phase. */}
      <div id="topbar-thread" className="hidden flex-1 justify-center sm:flex" />

      <form onSubmit={onSearch} role="search" className="hidden sm:block">
        <label htmlFor="topbar-search" className="sr-only">Search meetings</label>
        <input
          id="topbar-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search meetings"
          className="h-8 w-48 rounded-control border border-line bg-raised px-3 text-small text-ink placeholder:text-ink-2 focus-visible:outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
        />
      </form>

      {liveCount > 0 ? (
        <span className="flex items-center gap-2 text-small text-gold">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgb(var(--gold))]" />
          {liveCount} live
        </span>
      ) : null}

      {/* Theme toggle and account menu appear here only on mobile; the rail carries both on desktop. */}
      <ThemeToggle className="md:hidden" />
      <UserMenu placement="below" className="md:hidden" />
    </header>
  );
}

export default TopBar;
