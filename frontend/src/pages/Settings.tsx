import { motion } from "framer-motion";
import { useState } from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import PageHeader from "../components/ui/PageHeader";

export function Settings() {
  const [name, setName] = useState("Priyanshu");
  const [email, setEmail] = useState("priyanshu@example.com");
  const [timezone, setTimezone] = useState("America/New_York");

  return (
    <div className="space-y-6">
      <div>
        <PageHeader title="Settings" subtitle="Manage profile details and workspace preferences." />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card title="Profile" subtitle="Visible across your workspace">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Full Name" value={name} onChange={(event) => setName(event.target.value)} />
            <FormField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="mt-4 max-w-md">
            <FormField label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </div>
          <div className="mt-6 flex gap-3">
            <Button>Save Changes</Button>
            <Button variant="secondary">Cancel</Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default Settings;
