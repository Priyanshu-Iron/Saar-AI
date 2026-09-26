export const API_BASE: string =
    (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
    "http://localhost:8001";

function getApiKey(): string | null {
    return window.localStorage.getItem("saarai_api_key");
}

export function setApiKey(key: string) {
    window.localStorage.setItem("saarai_api_key", key);
}

export function clearApiKey() {
    window.localStorage.removeItem("saarai_api_key");
}

export function hasApiKey(): boolean {
    return Boolean(getApiKey());
}

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export type AccountStatus = "pending" | "approved" | "disabled";

/** Fired when the API says the account is pending or disabled; AuthContext listens. */
export const ACCESS_EVENT = "saarai:access";
const ACCESS_DETAILS = new Set(["account_pending", "account_disabled"]);

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const apiKey = getApiKey();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Request failed" }));
        let message = `Error ${res.status}`;
        if (typeof body.detail === "string") {
            message = body.detail;
        } else if (Array.isArray(body.detail)) {
            message = body.detail.map((e: any) => e.msg || String(e)).join(", ");
        } else if (body.message) {
            message = body.message;
        }
        if (res.status === 403 && ACCESS_DETAILS.has(message)) {
            window.dispatchEvent(new CustomEvent(ACCESS_EVENT, { detail: message }));
        }
        throw new ApiError(res.status, message);
    }
    return res.json();
}

/* ---------- Auth ---------- */
export type AuthResponse = { api_key: string; message: string; email: string; status: AccountStatus; is_admin: boolean };
export type Me = { email: string; status: AccountStatus; is_admin: boolean };

export const authApi = {
    register: (email: string, password: string) =>
        apiFetch<AuthResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    login: (email: string, password: string) =>
        apiFetch<AuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    me: () => apiFetch<Me>("/auth/me"),
};

/* ---------- Meetings ---------- */
export type Meeting = {
    id: number;
    object_id: string;
    name: string;
    meeting_url: string;
    state: number;
    created_at: string;
    transcription_state?: number;
};

export type Participant = {
    id: number;
    full_name: string;
    email: string | null;
    is_host: boolean;
};

export type Utterance = {
    speaker: string;
    timestamp_ms: number;
    duration_ms: number;
    text: string;
};

/* ---------- Structured essence ---------- */
export type Cited = { text: string; refs: number[] };
export type Action = { text: string; owner: string | null; due: string | null; refs: number[] };
export type Participation = { name: string; share: number; note: string; refs: number[] };
export type Priority = { action: string; owner: string | null; why: string; refs: number[] };
export type Level = "low" | "medium" | "high";
export type Risk = { risk: string; likelihood: Level; impact: Level; mitigation: string; refs: number[] };
export type Sentiment = { overall: "positive" | "neutral" | "tense"; note: string };

export type Minutes = { summary: string; discussion: Cited[]; decisions: Cited[]; actions: Action[]; notes: Cited[] };
export type Insights = { participation: Participation[]; themes: Cited[]; patterns: Cited[]; concerns: Cited[]; sentiment: Sentiment; takeaways: Cited[] };
export type Strategy = { priorities: Priority[]; followups: Cited[]; resources: Cited[]; risks: Risk[]; opportunities: Cited[]; agenda: Cited[] };

export type SectionKey = "mom" | "insights" | "strategy";
export const SECTION_KEYS: SectionKey[] = ["mom", "insights", "strategy"];

export type Output =
    | { format: "json"; content: Minutes | Insights | Strategy; created_at: string }
    | { format: "markdown"; content: string; created_at: string };

export type OutputsResponse = { bot_id: number; has_outputs: boolean; outputs: Partial<Record<SectionKey, Output>> };
export type GenerateStatus = { running: boolean; done: SectionKey[] };
export type RecentMeeting = { meeting: Meeting; teaser: string | null };

export const meetingsApi = {
    create: (meeting_url: string, bot_name = "SaarAI Bot") =>
        apiFetch<{ bot_id: number; object_id: string; name: string; status: string; message: string }>(
            "/meetings",
            { method: "POST", body: JSON.stringify({ meeting_url, bot_name }) },
        ),

    list: () =>
        apiFetch<{ count: number; meetings: Meeting[] }>("/meetings"),

    botsStatus: () =>
        apiFetch<{ count: number; bots: Meeting[] }>("/meetings/bots/status"),

    outputs: (botId: number) =>
        apiFetch<OutputsResponse>(`/meetings/${botId}/outputs`),

    detail: (botId: number) =>
        apiFetch<{ meeting: Meeting; participants: Participant[] }>(`/meetings/${botId}`),

    transcript: (botId: number) =>
        apiFetch<{ bot_id: number; utterance_count: number; transcript: Utterance[] }>(
            `/meetings/${botId}/transcript`,
        ),

    chat: (botId: number) =>
        apiFetch<{ bot_id: number; message_count: number; messages: any[] }>(
            `/meetings/${botId}/chat`,
        ),

    recent: (limit = 5) =>
        apiFetch<{ count: number; meetings: RecentMeeting[] }>(`/meetings/recent?limit=${limit}`),
};

/* ---------- AI Generation (generate & save) ---------- */
export const generateApi = {
    mom: (botId: number) =>
        apiFetch<{ bot_id: number; type: "mom"; format: "json"; content: Minutes }>(`/generate/mom/${botId}`, { method: "POST" }),
    insights: (botId: number) =>
        apiFetch<{ bot_id: number; type: "insights"; format: "json"; content: Insights }>(`/generate/insights/${botId}`, { method: "POST" }),
    strategy: (botId: number) =>
        apiFetch<{ bot_id: number; type: "strategy"; format: "json"; content: Strategy }>(`/generate/strategy/${botId}`, { method: "POST" }),
    all: (botId: number) =>
        apiFetch<{ bot_id: number; done: SectionKey[]; failed: Partial<Record<SectionKey, string>> }>(`/generate/all/${botId}`, { method: "POST" }),
    status: (botId: number) =>
        apiFetch<GenerateStatus>(`/generate/status/${botId}`),
};

/* ---------- Admin ---------- */
export type AdminUser = {
    id: number;
    email: string;
    status: AccountStatus;
    joined_at: string;
    decided_at: string | null;
    is_admin: boolean;
};
export type KeyState = { set: boolean; last4: string | null; updated_at: string | null };
export type LlmProvider = "openai" | "google";
export type SecretKey = "openai_api_key" | "google_api_key" | "deepgram_api_key";
export type AdminSettings = { llm_provider: LlmProvider | null; llm_model: string | null } & Record<SecretKey, KeyState>;
export type SettingsUpdate = Partial<{ llm_provider: LlmProvider; llm_model: string } & Record<SecretKey, string>>;

export const DEFAULT_MODELS: Record<LlmProvider, string> = { openai: "gpt-4o-mini", google: "gemini-1.5-flash" };

export const adminApi = {
    users: () => apiFetch<{ users: AdminUser[] }>("/admin/users"),
    approve: (id: number) => apiFetch<{ id: number; status: AccountStatus }>(`/admin/users/${id}/approve`, { method: "POST" }),
    disable: (id: number) => apiFetch<{ id: number; status: AccountStatus }>(`/admin/users/${id}/disable`, { method: "POST" }),
    enable: (id: number) => apiFetch<{ id: number; status: AccountStatus }>(`/admin/users/${id}/enable`, { method: "POST" }),
    settings: () => apiFetch<AdminSettings>("/admin/settings"),
    saveSettings: (body: SettingsUpdate) =>
        apiFetch<AdminSettings>("/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
};
