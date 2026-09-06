import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "../ui/Button";

const markdownClass = "prose prose-sm max-w-none text-ink-2\n    [&_h1]:text-h2 [&_h1]:text-ink [&_h1]:mt-6 [&_h1]:mb-3\n    [&_h2]:text-h3 [&_h2]:text-ink [&_h2]:mt-5 [&_h2]:mb-2\n    [&_h3]:text-h3 [&_h3]:text-ink [&_h3]:mt-4 [&_h3]:mb-2\n    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2\n    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2\n    [&_li]:my-1 [&_li]:leading-relaxed\n    [&_p]:my-2 [&_p]:leading-relaxed\n    [&_strong]:font-semibold [&_strong]:text-ink\n    [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-body [&_table]:rounded-panel [&_table]:overflow-hidden\n    [&_th]:border [&_th]:border-line [&_th]:bg-raised [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-ink [&_th]:text-small\n    [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2\n    [&_blockquote]:border-l-2 [&_blockquote]:border-violet [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-2\n    [&_code]:bg-raised [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-control [&_code]:text-violet [&_code]:text-small\n  ";

export function LegacyMarkdown({ markdown, onRegenerate }: { markdown: string; onRegenerate: () => void }) {
  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-raised px-4 py-2 text-small text-ink-2">
        <span>Generated before citations were available.</span>
        <Button variant="secondary" onClick={onRegenerate}>Regenerate for citations</Button>
      </div>
      <div className={markdownClass}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export default LegacyMarkdown;
