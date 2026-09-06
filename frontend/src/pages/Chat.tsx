import { useState, useRef, useEffect } from "react";
import Button from "../components/ui/Button";

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
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-panel border border-line bg-surface">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet text-small text-white">
              AI
            </div>
            <div>
              <p className="text-body text-ink">SaarAI assistant</p>
              <p className="text-small text-cyan">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-2 max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "ai" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet text-small text-white mb-1">
                    AI
                  </div>
                )}
                <div className={[
                  "rounded-panel px-4 py-3 text-body leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-violet text-white rounded-br-control"
                    : "bg-raised text-ink rounded-bl-control",
                ].join(" ")}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet text-small text-white">
                AI
              </div>
              <div className="rounded-panel bg-raised px-4 py-3 text-body text-ink-2">
                Thinking…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-line p-4 sm:px-6">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your meetings…"
                className="w-full resize-none rounded-control border border-line bg-surface px-4 py-3 pr-12 text-body text-ink outline-none transition-colors placeholder:text-ink-2 focus-visible:outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
                style={{ maxHeight: "120px" }}
              />
            </div>
            <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="shrink-0">
              Send
            </Button>
          </div>
          <p className="mt-2 text-small text-ink-2 text-center">Press Enter to send. Shift+Enter for a new line.</p>
        </div>
      </div>
    </div>
  );
}

export default Chat;
