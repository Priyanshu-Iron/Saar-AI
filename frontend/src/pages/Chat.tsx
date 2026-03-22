import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
};

const initialMessages: Message[] = [
  { id: 1, role: "ai", content: "Hi! I'm your SaarAI assistant. Ask me anything about your meetings — summaries, key decisions, action items, or trends across conversations.", timestamp: new Date() },
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // TODO: Replace with actual API call to backend AI endpoint
    try {
      // Placeholder: no mock response — just stop typing indicator after a moment
      setTimeout(() => {
        const aiMsg: Message = {
          id: Date.now() + 1,
          role: "ai",
          content: "This feature is coming soon. The AI chat backend is not yet connected.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, 800);
    } catch {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)]">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">SaarAI Assistant</p>
              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-2 max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "ai" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[10px] font-bold text-white mb-1">
                    AI
                  </div>
                )}
                <div className={[
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary-600 text-white rounded-br-md"
                    : "bg-slate-100 text-slate-700 rounded-bl-md",
                ].join(" ")}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[10px] font-bold text-white">
                AI
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-4 sm:px-6">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your meetings…"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(13,89,242,0.1)]"
                style={{ maxHeight: "120px" }}
              />
            </div>
            <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

export default Chat;
