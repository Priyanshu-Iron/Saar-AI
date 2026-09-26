import { useState } from "react";
import ThemeToggle from "../components/layout/ThemeToggle";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { key: "profile", label: "Profile" },
  { key: "organization", label: "Organization" },
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
      <PageHeader title="Settings" subtitle="Manage your profile and organization." />

      {/* Tab navigation */}
      <div className="flex gap-6 border-b border-line">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              "-mb-px px-1 py-2 text-small transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
              activeTab === key
                ? "text-ink border-b-2 border-violet"
                : "text-ink-2 hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <Card title="Profile" subtitle="Your personal information visible across the workspace.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Full name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
            <FormField label="Email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="mt-4 max-w-md">
            <FormField label="Timezone" placeholder="e.g. Asia/Kolkata" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-small text-ink-2">Theme</span>
            <ThemeToggle />
          </div>
          <div className="mt-6 flex gap-3">
            <Button>Save changes</Button>
            <Button variant="secondary">Cancel</Button>
          </div>
        </Card>
      )}

      {/* Organization Tab */}
      {activeTab === "organization" && (
        <Card title="Organization" subtitle="Manage your organization settings.">
          <div className="max-w-md space-y-4">
            <FormField label="Organization name" placeholder="Your organization" value={orgName} onChange={(event) => setOrgName(event.target.value)} />
          </div>
          <div className="mt-6 flex gap-3">
            <Button>Update organization</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default Settings;
