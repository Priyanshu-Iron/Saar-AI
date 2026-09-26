import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import {
  type AdminSettings,
  type KeyState,
  type LlmProvider,
  type SecretKey,
  type SettingsUpdate,
  DEFAULT_MODELS,
  adminApi,
} from "../../api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ErrorNotice from "../ui/ErrorNotice";
import FormField from "../ui/FormField";
import LoadingThread from "../ui/LoadingThread";

const KEY_FIELDS: { key: SecretKey; label: string; note?: string }[] = [
  { key: "openai_api_key", label: "OpenAI API key" },
  { key: "google_api_key", label: "Gemini API key" },
  { key: "deepgram_api_key", label: "Deepgram API key", note: "Saving updates transcription for every approved account." },
];

const PROVIDER_LABEL: Record<LlmProvider, string> = { openai: "OpenAI", google: "Gemini" };
const PROVIDER_KEY: Record<LlmProvider, SecretKey> = { openai: "openai_api_key", google: "google_api_key" };
const EMPTY_KEYS: Record<SecretKey, string> = { openai_api_key: "", google_api_key: "", deepgram_api_key: "" };

const updatedFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function keyHint(state: KeyState): string {
  if (!state.set) return "Not set";
  const updated = state.updated_at ? ` Updated ${updatedFormat.format(new Date(state.updated_at))}.` : "";
  return `Set, ends in ${state.last4}.${updated}`;
}

export function KeysPanel() {
  const providerId = useId();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [model, setModel] = useState("");
  const [keys, setKeys] = useState<Record<SecretKey, string>>(EMPTY_KEYS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const apply = (next: AdminSettings) => {
    const nextProvider = next.llm_provider ?? "openai";
    setSettings(next);
    setProvider(nextProvider);
    setModel(next.llm_model ?? DEFAULT_MODELS[nextProvider]);
  };

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      apply(await adminApi.settings());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeProvider = (next: LlmProvider) => {
    setProvider(next);
    setModel(DEFAULT_MODELS[next]);
    setSaved(false);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const body: SettingsUpdate = { llm_provider: provider, llm_model: model.trim() || DEFAULT_MODELS[provider] };
    for (const { key } of KEY_FIELDS) {
      const value = keys[key].trim();
      if (value) body[key] = value;
    }
    try {
      apply(await adminApi.saveSettings(body));
      setKeys(EMPTY_KEYS);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save the keys.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorNotice message={loadError} onRetry={() => void load()} />;
  if (!settings) return <LoadingThread />;

  const providerKeyMissing = !settings[PROVIDER_KEY[provider]].set && !keys[PROVIDER_KEY[provider]].trim();

  return (
    <Card title="AI and keys" subtitle="Every approved account uses these keys. Saved keys are never shown again.">
      <form onSubmit={(event) => void save(event)} className="max-w-md space-y-4">
        <div>
          <label htmlFor={providerId} className="mb-1.5 block text-small text-ink-2">
            Provider
          </label>
          <select
            id={providerId}
            value={provider}
            onChange={(event) => changeProvider(event.target.value as LlmProvider)}
            className="w-full rounded-control border border-line bg-raised px-3 py-2 text-body text-ink focus-visible:outline-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
          >
            <option value="openai">OpenAI</option>
            <option value="google">Gemini</option>
          </select>
          {providerKeyMissing ? (
            <span className="mt-1.5 block text-small text-danger">
              Add a {PROVIDER_LABEL[provider]} API key, or generation will fail.
            </span>
          ) : null}
        </div>
        <FormField label="Model" value={model} onChange={(event) => setModel(event.target.value)} />
        {KEY_FIELDS.map(({ key, label, note }) => (
          <div key={key}>
            <FormField
              label={label}
              type="password"
              autoComplete="off"
              hint={keyHint(settings[key])}
              value={keys[key]}
              onChange={(event) => {
                setKeys((current) => ({ ...current, [key]: event.target.value }));
                setSaved(false);
              }}
            />
            {/* The note sits outside the hint so the hint reads exactly "Not set" or "Set, ends in ...". */}
            {note ? <p className="mt-1 text-small text-ink-2">{note}</p> : null}
          </div>
        ))}
        {saveError ? <ErrorNotice message={saveError} /> : null}
        {saved ? <p className="text-small text-ink-2">Saved.</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving keys" : "Save keys"}
        </Button>
      </form>
    </Card>
  );
}

export default KeysPanel;
