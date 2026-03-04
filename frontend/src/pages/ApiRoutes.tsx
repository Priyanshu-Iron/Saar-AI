import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { backendRoutes } from "../constants/backendRoutes";

export function ApiRoutes() {
  return (
    <div className="space-y-6">
      <div>
        <PageHeader title="Backend Routes" subtitle="Path and purpose derived from FastAPI routers." />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Method</th>
                <th className="py-2 pr-3">Path</th>
                <th className="py-2">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {backendRoutes.map((route) => (
                <tr key={`${route.method}-${route.path}`} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-3 text-sky-700">{route.method}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-slate-700">{route.path}</td>
                  <td className="py-3 text-slate-600">{route.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default ApiRoutes;
