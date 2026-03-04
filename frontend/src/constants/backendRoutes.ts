export type BackendRoute = {
  path: string;
  method: "GET" | "POST";
  purpose: string;
};

export const backendRoutes: BackendRoute[] = [
  { path: "/", method: "GET", purpose: "Health check for SaarAI service status" },
  { path: "/auth/register", method: "POST", purpose: "Create account and issue default API key" },
  { path: "/auth/login", method: "POST", purpose: "Authenticate user and issue fresh API key" },
  { path: "/meetings", method: "GET", purpose: "List all completed meetings for project" },
  { path: "/meetings/{bot_id}", method: "GET", purpose: "Get single meeting details and participants" },
  { path: "/meetings/{bot_id}/transcript", method: "GET", purpose: "Fetch transcript utterances for meeting" },
  { path: "/meetings/{bot_id}/chat", method: "GET", purpose: "Fetch chat messages for meeting" },
  { path: "/generate/mom/{bot_id}", method: "POST", purpose: "Generate minutes of meeting" },
  { path: "/generate/insights/{bot_id}", method: "POST", purpose: "Generate meeting insights" },
  { path: "/generate/strategy/{bot_id}", method: "POST", purpose: "Generate strategic recommendations" },
  { path: "/generate/all/{bot_id}", method: "POST", purpose: "Generate MOM, insights, and strategy together" },
];
