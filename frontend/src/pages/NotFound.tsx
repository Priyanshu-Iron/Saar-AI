import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";

export function NotFound() {
  return (
    <div className="mx-auto max-w-canvas px-4 sm:px-8">
      <EmptyState
        devanagari="खाली"
        title="There's nothing here"
        body="The page you're looking for doesn't exist or moved."
        action={
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-control bg-violet px-4 py-2 text-small text-white hover:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
          >
            Go to Dashboard
          </Link>
        }
      />
    </div>
  );
}

export default NotFound;
