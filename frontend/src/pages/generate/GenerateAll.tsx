import { motion } from "framer-motion";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { generateApi } from "../../api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";

export function GenerateAll() {
  const { botId = "" } = useParams();
  const [loading, setLoading] = useState(false);
  const [mom, setMom] = useState("");
  const [insights, setInsights] = useState("");
  const [strategy, setStrategy] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    const id = Number(botId);
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await generateApi.all(id);
      setMom(res.mom);
      setInsights(res.insights);
      setStrategy(res.strategy);
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { label: "📋 Minutes of Meeting", content: mom, color: "border-l-sky-500" },
    { label: "💡 Insights", content: insights, color: "border-l-emerald-500" },
    { label: "🎯 Strategy", content: strategy, color: "border-l-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Generate All AI Outputs" subtitle={`Meeting #${botId} — MOM, Insights & Strategy in one click`} />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">Generate all three AI outputs for this meeting at once.</p>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating… (this may take a minute)" : "Generate All"}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="space-y-4">
          {["Minutes of Meeting", "Insights", "Strategy"].map((label) => (
            <Card key={label} title={label}>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && (mom || insights || strategy) && (
        <div className="space-y-4">
          {sections.map(({ label, content, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 ${color}`}>
                <h3 className="mb-3 text-base font-semibold text-slate-800">{label}</h3>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{content || "No content generated."}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GenerateAll;
