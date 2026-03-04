import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";

export function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto w-fit text-left">
        <PageHeader title="Page not found" subtitle="The route does not exist in this UI." />
      </div>
      <Link to="/dashboard" className="mt-4 inline-block rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white">Go to Dashboard</Link>
    </div>
  );
}

export default NotFound;
