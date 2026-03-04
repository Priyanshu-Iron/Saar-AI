import { motion } from "framer-motion";
import { useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateApi } from "../../api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";

type GenerateType = "mom" | "insights" | "strategy";

type GenerateTemplateProps = {
  title: string;
  type: GenerateType;
};

export function GenerateTemplate({ title, type }: GenerateTemplateProps) {
  const { botId = "" } = useParams();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    const id = Number(botId);
    if (!id) return;
    setLoading(true);
    setError("");
    setContent("");
    try {
      const res = await generateApi.all(id);
      setContent(res[type]);
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={`Meeting #${botId}`} />

      <Card>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">Click generate to produce {title.toLowerCase()} using AI.</p>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card title="Output">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : content ? (
            <div className="prose prose-slate prose-sm max-w-none
              [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul_li]:my-0.5
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
              [&_p]:my-2 [&_p]:leading-relaxed
              [&_strong]:font-semibold
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm
              [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-left
              [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-1.5
              [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No output yet. Click Generate above.</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default GenerateTemplate;
