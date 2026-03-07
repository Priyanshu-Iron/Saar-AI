import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

type TopBarProps = {
    onMenuToggle?: () => void;
};

export function TopBar({ onMenuToggle }: TopBarProps) {
    const { user } = useAuth();
    const [searchFocused, setSearchFocused] = useState(false);

    const initials = user?.email
        ? user.email.charAt(0).toUpperCase()
        : "U";

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-xl sm:px-6"
        >
            {/* Left: hamburger + search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Mobile hamburger */}
                <button
                    onClick={onMenuToggle}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                    aria-label="Toggle sidebar"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                {/* Search */}
                <div className="relative max-w-md flex-1">
                    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search meetings, insights…"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className={[
                            "w-full rounded-xl border bg-slate-50/80 py-2 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400",
                            searchFocused
                                ? "border-primary-600 bg-white shadow-[0_0_0_3px_rgba(13,89,242,0.1)]"
                                : "border-slate-200 hover:border-slate-300",
                        ].join(" ")}
                    />
                </div>
            </div>

            {/* Right: notification + avatar */}
            <div className="flex items-center gap-2">
                {/* Notification bell */}
                <button className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-600" />
                </button>

                {/* User avatar */}
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-semibold text-white shadow-md">
                    {initials}
                </div>
            </div>
        </motion.header>
    );
}

export default TopBar;
