import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../components/ui/Button";
import BrandLogo from "../components/ui/BrandLogo";

export function Home() {
  return (
    <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-35px_rgba(2,132,199,0.5)] sm:p-12">
      <BrandLogo className="h-20" />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500"
      >
        SaarAI Overview
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-4 text-4xl font-semibold text-slate-900"
      >
        Turn meetings into decisions, automatically.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 max-w-2xl text-slate-600"
      >
        Generate minutes, insights, and strategy from your conversations with a clean workflow built for teams.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-8 flex flex-wrap gap-3"
      >
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/signup">
          <Button variant="secondary">Sign Up</Button>
        </Link>
      </motion.div>
    </section>
  );
}

export default Home;
