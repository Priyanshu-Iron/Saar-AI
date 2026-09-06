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
        throw new Error(message);
    }
    return res.json();
}

/* ---------- Auth ---------- */
export const authApi = {
    register: (email: string, password: string) =>
        apiFetch<{ api_key: string; message: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    login: (email: string, password: string) =>
        apiFetch<{ api_key: string; message: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),
};

/* ---------- Meetings ---------- */
export type Meeting = {
    id: number;
    object_id: string;
    name: string;
    meeting_url: string;
    state: number;
    created_at: string;
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
        apiFetch<{ bot_id: number; has_outputs: boolean; outputs: Record<string, { content: string; created_at: string }> }>(
            `/meetings/${botId}/outputs`,
        ),

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
};

/* ---------- AI Generation (generate & save) ---------- */
export const generateApi = {
    all: (botId: number) =>
        apiFetch<{ bot_id: number; mom: string; insights: string; strategy: string }>(
            `/generate/all/${botId}`,
            { method: "POST" },
        ),
};
