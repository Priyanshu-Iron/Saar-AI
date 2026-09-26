import { useState } from "react";
import KeysPanel from "../components/admin/KeysPanel";
import UsersPanel from "../components/admin/UsersPanel";
import PageHeader from "../components/ui/PageHeader";

const tabs = [
  { key: "users", label: "Users" },
  { key: "keys", label: "AI and keys" },
] as const;

type TabKey = typeof tabs[number]["key"];

export function Admin() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Approve accounts and manage the keys SaarAI runs on." />

      <div className="flex gap-6 border-b border-line">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              "-mb-px px-1 py-2 text-small transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
              activeTab === key ? "text-ink border-b-2 border-violet" : "text-ink-2 hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "users" && <UsersPanel />}
      {activeTab === "keys" && <KeysPanel />}
    </div>
  );
}

export default Admin;
