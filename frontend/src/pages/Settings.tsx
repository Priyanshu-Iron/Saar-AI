import { motion } from "framer-motion";
import { useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { key: "profile", label: "Profile" },
  { key: "organization", label: "Organization" },
  { key: "apikeys", label: "API Keys" },
] as const;

type TabKey = typeof tabs[number]["key"];

export function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [timezone, setTimezone] = useState("");
  const [orgName, setOrgName] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile, organization, and API access." />

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card title="Profile" subtitle="Your personal information visible across the workspace.">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Full Name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
              <FormField label="Email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="mt-4 max-w-md">
              <FormField label="Timezone" placeholder="e.g. Asia/Kolkata" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </div>
            <div className="mt-6 flex gap-3">
              <Button>Save Changes</Button>
              <Button variant="secondary">Cancel</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Organization Tab */}
      {activeTab === "organization" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card title="Organization" subtitle="Manage your organization settings.">
            <div className="max-w-md space-y-4">
              <FormField label="Organization Name" placeholder="Your organization" value={orgName} onChange={(event) => setOrgName(event.target.value)} />
            </div>
            <div className="mt-6 flex gap-3">
              <Button>Update Organization</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* API Keys Tab */}
      {activeTab === "apikeys" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">API Keys</h3>
                <p className="mt-0.5 text-xs text-slate-500">Manage your API keys for authenticating with SaarAI services.</p>
              </div>
              <Button>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Generate New Key
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No API keys yet.</p>
              <p className="mt-1 text-xs text-slate-400">Click "Generate New Key" to create your first API key.</p>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default Settings;
