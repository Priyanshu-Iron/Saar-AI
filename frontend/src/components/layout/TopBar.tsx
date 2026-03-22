import { motion } from "framer-motion";

type TopBarProps = {
  onMenuToggle?: () => void;
};

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-20 flex h-14 items-center border-b border-[#e3e8ee] bg-white px-4 sm:px-6"
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-[#425466] hover:bg-[#f6f9fc] lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="flex-1" />
    </motion.header>
  );
}

export default TopBar;
