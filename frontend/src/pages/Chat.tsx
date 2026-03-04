import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";

const chatMessages = [
  { user: "Alice", text: "Can someone share the latest deck?" },
  { user: "Raj", text: "Uploading now." },
  { user: "Mikhail", text: "Please include churn breakdown by segment." },
];

export function Chat() {
  const { botId = "" } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={`Chat #${botId}`} subtitle="Meeting chat stream captured during the session." />
      <Card>
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
            : chatMessages.map((message) => (
                <div key={message.text} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">{message.user}</p>
                  <p className="mt-1 text-slate-600">{message.text}</p>
                </div>
              ))}
        </div>
      </Card>
    </div>
  );
}

export default Chat;
