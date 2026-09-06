# SaarAI Identity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's mixed Stripe/blue styling with the "Signal mesh" identity: token system with light and dark themes, Anek Devanagari type, icon-rail shell, thread-based status, rebuilt UI kit, and redesigned public pages.

**Architecture:** CSS custom properties on `:root` switched by a `data-theme` attribute are the single source of color; Tailwind reads them so utility classes stay usable. A `ThemeContext` owns the toggle. New primitives (`Thread`, `LoadingThread`, `EmptyState`, `ErrorNotice`) replace pills, spinners, and ad hoc error markup. The shell becomes a 56px `Rail` plus a working `TopBar`. App pages that are not redesigned in this phase get only token and primitive swaps so they compile and look coherent.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind 3.4, react-router-dom 6, Vitest + React Testing Library + jsdom (added in Task 1). All commands run from `frontend/`.

**Spec:** `docs/superpowers/specs/2026-09-06-identity-foundation-design.md`

## Global Constraints

- Node commands run from `frontend/`. `npm run typecheck`, `npm run build`, and `npm test` must pass at the end of every task.
- One font family only: `"Anek Devanagari"` with fallback `"Noto Sans Devanagari", system-ui, sans-serif`. No Inter anywhere.
- Gradient `linear-gradient(90deg, cyan, violet, gold)` appears only in `Thread`, `LoadingThread`, the logo mark, the active rail icon, the EmptyState Devanagari word, and the Home hero's Devanagari word. Never on buttons or card backgrounds.
- No status pills, no status dots, no `animate-ping`. Status is always a `Thread`.
- No framer-motion in any file touched by this plan. Remove the import when you touch a file.
- Sentence case for every label and button. No `uppercase` or `tracking-[...]` label classes. No arrows in button text. No middle-dot separators.
- Radius: `rounded-panel` (12px) for cards and panels, `rounded-control` (6px) for buttons and inputs, `rounded-full` for markers and avatars. No box shadows.
- Devanagari text appears only in: Home hero headline, `EmptyState` word, NotFound.
- Focus: every interactive element uses `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground`.
- Reduced motion: any animation is wrapped in `@media (prefers-reduced-motion: no-preference)` or disabled under `(prefers-reduced-motion: reduce)`.
- Copy rules from the spec are verbatim; do not paraphrase button or error text.
- Commit after every task with the message given in the task. Do not commit `node_modules` or `dist`.

---

## File structure

Created:
- `frontend/vitest.config.ts` — Vitest config (jsdom, setup file).
- `frontend/src/test/setup.ts` — jest-dom matchers, `matchMedia` stub.
- `frontend/src/test/render.tsx` — `renderWithProviders` helper (router + theme + auth).
- `frontend/.env.example` — documents `VITE_API_BASE`.
- `frontend/src/context/ThemeContext.tsx` — theme state, persistence, `data-theme`.
- `frontend/src/lib/status.ts` — `botStateToThreadState`.
- `frontend/src/components/ui/Thread.tsx` — status thread.
- `frontend/src/components/ui/LoadingThread.tsx` — loading indicator.
- `frontend/src/components/ui/EmptyState.tsx`
- `frontend/src/components/ui/ErrorNotice.tsx`
- `frontend/src/components/layout/Rail.tsx` — replaces `Sidebar.tsx`.
- `frontend/src/components/layout/CornerMesh.tsx` — fixed corner SVG.
- `frontend/src/components/layout/ThemeToggle.tsx` — shared toggle button.
- `frontend/src/lib/breadcrumb.ts` — path to breadcrumb text.

Modified:
- `frontend/index.html` — font link, theme bootstrap script.
- `frontend/src/index.css` — tokens, type utilities, dot grid, animations.
- `frontend/tailwind.config.ts` — token-backed colors, radius, font.
- `frontend/src/api.ts` — `API_BASE` from env.
- `frontend/src/main.tsx` — wrap in `ThemeProvider`.
- `frontend/src/context/AuthContext.tsx` — optional `name` on user, `signup(email, password, name?)`.
- `frontend/src/layouts/AppShell.tsx` — rail layout, corner mesh, no motion.
- `frontend/src/components/layout/TopBar.tsx` — breadcrumb, thread slot, search, live count.
- `frontend/src/components/layout/Navbar.tsx` — public nav.
- `frontend/src/components/ui/{Button,Card,FormField,Skeleton,PageHeader,BrandLogo}.tsx` — restyled.
- `frontend/src/components/auth/{IndexRedirect,ProtectedRoute,PublicOnlyRoute}.tsx` — `LoadingThread`.
- `frontend/src/pages/{Home,Login,Signup,NotFound}.tsx` — redesigned.
- `frontend/src/pages/{Dashboard,Meetings,MeetingDetail,Transcript,Chat,Settings}.tsx` — token and primitive swaps only.

Deleted:
- `frontend/src/components/ui/LoadingSpinner.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/pages/generate/` (whole directory)
- `frontend/src/pages/ApiRoutes.tsx`
- `frontend/src/constants/backendRoutes.ts`

---

### Task 1: Test tooling and API base URL from env

**Files:**
- Create: `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/src/test/render.tsx`, `frontend/.env.example`, `frontend/src/lib/__tests__/apiBase.test.ts`
- Modify: `frontend/package.json`, `frontend/tsconfig.app.json`, `frontend/src/api.ts`, `frontend/.gitignore`

**Interfaces:**
- Produces: `npm test` (runs Vitest once), `renderWithProviders(ui, { route?: string })` from `src/test/render.tsx` (router-only in this task; later tasks add providers), `API_BASE` exported from `src/api.ts`.

- [ ] **Step 1: Install test dependencies**

Run from `frontend/`:
```bash
npm install -D vitest@^2.1.8 jsdom@^25.0.1 @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.3 @testing-library/user-event@^14.5.2
```

- [ ] **Step 2: Add the test script and Vitest config**

In `frontend/package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `frontend/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

Create `frontend/src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom has no matchMedia. Default to light; tests override with vi.spyOn.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
```

Create `frontend/src/test/render.tsx`:
```tsx
import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

type Options = { route?: string };

export function renderWithProviders(ui: ReactElement, { route = "/" }: Options = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
```

In `frontend/tsconfig.app.json`, change `"types": ["vite/client"]` to `"types": ["vite/client", "vitest/globals"]` is NOT needed because `globals` is false. Leave `types` as is. Confirm `"include": ["src"]` already covers `src/test`.

- [ ] **Step 3: Write the failing test for the env-driven API base**

Create `frontend/src/lib/__tests__/apiBase.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { API_BASE } from "../../api";

describe("API_BASE", () => {
  it("falls back to localhost:8001 when VITE_API_BASE is unset", () => {
    expect(API_BASE).toBe("http://localhost:8001");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- src/lib/__tests__/apiBase.test.ts`
Expected: FAIL, `API_BASE` is not exported.

- [ ] **Step 5: Export API_BASE from env**

In `frontend/src/api.ts`, replace the first line:
```ts
export const API_BASE: string =
    (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
    "http://localhost:8001";
```

Create `frontend/.env.example`:
```
# Base URL of the SaarAI FastAPI backend (no trailing slash)
VITE_API_BASE=http://localhost:8001
```

Append to `frontend/.gitignore`:
```
.env
.env.local
```

- [ ] **Step 6: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 1 test passes, typecheck clean, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test frontend/src/lib/__tests__/apiBase.test.ts frontend/src/api.ts frontend/.env.example frontend/.gitignore
git commit -m "chore(frontend): add vitest tooling and env-driven API base"
```

---

### Task 2: Design tokens, type scale, and font

**Files:**
- Modify: `frontend/index.html`, `frontend/src/index.css`, `frontend/tailwind.config.ts`
- Test: `frontend/src/__tests__/tokens.test.ts`

**Interfaces:**
- Produces Tailwind color names `ground`, `surface`, `raised`, `ink`, `cyan`, `violet`, `gold`, `danger` (all support `/alpha`), plus `ink-2`, `line`, `grid` (no alpha). Radius `rounded-panel`, `rounded-control`. Utilities `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small`, `bg-dotgrid`, `bg-thread`, `text-thread`. CSS variables `--thread`, `--mesh-opacity`.

- [ ] **Step 1: Write the failing test for the Tailwind theme**

Create `frontend/src/__tests__/tokens.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

const colors = (config.theme?.extend?.colors ?? {}) as Record<string, unknown>;
const radius = (config.theme?.extend?.borderRadius ?? {}) as Record<string, string>;
const fonts = (config.theme?.extend?.fontFamily ?? {}) as Record<string, string[]>;

describe("design tokens", () => {
  it("exposes the identity colors", () => {
    for (const name of ["ground", "surface", "raised", "ink", "cyan", "violet", "gold", "danger", "ink-2", "line", "grid"]) {
      expect(colors[name], name).toBeDefined();
    }
    expect(colors.primary).toBeUndefined();
  });

  it("exposes panel and control radii", () => {
    expect(radius.panel).toBe("12px");
    expect(radius.control).toBe("6px");
  });

  it("uses Anek Devanagari only", () => {
    expect(fonts.sans[0]).toBe('"Anek Devanagari"');
    expect(JSON.stringify(fonts)).not.toContain("Inter");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/tokens.test.ts`
Expected: FAIL on `colors.ground` undefined.

- [ ] **Step 3: Rewrite tailwind.config.ts**

Replace the whole file:
```ts
import type { Config } from "tailwindcss";

// Core colors are stored as "r g b" channel triplets in CSS variables so
// Tailwind's /alpha modifier works: bg-violet/25 -> rgb(var(--violet) / 0.25).
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Anek Devanagari"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      colors: {
        ground: channel("ground"),
        surface: channel("surface"),
        raised: channel("raised"),
        ink: channel("ink"),
        cyan: channel("cyan"),
        violet: channel("violet"),
        gold: channel("gold"),
        danger: channel("danger"),
        "ink-2": "var(--ink-2)",
        line: "var(--line)",
        grid: "var(--grid)",
      },
      borderRadius: {
        panel: "12px",
        control: "6px",
      },
      maxWidth: {
        prose: "70ch",
        canvas: "1280px",
      },
      backgroundImage: {
        thread: "var(--thread)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Rewrite index.css**

Replace the whole file:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---------- Tokens ----------
   Core colors are r g b channels so Tailwind can add alpha.
   Light is the default; [data-theme="dark"] overrides. */
:root {
  color-scheme: light;

  --ground: 238 242 250;   /* #EEF2FA */
  --surface: 255 255 255;  /* #FFFFFF */
  --raised: 246 248 253;   /* #F6F8FD */
  --ink: 22 28 63;         /* #161C3F */
  --cyan: 2 132 199;       /* #0284C7 */
  --violet: 109 40 217;    /* #6D28D9 */
  --gold: 161 98 7;        /* #A16207 */
  --danger: 200 30 60;     /* #C81E3C */

  --ink-2: rgba(22, 28, 63, 0.65);
  --line: rgba(109, 40, 217, 0.22);
  --grid: rgba(40, 60, 160, 0.16);
  --mesh-opacity: 0.22;

  --thread: linear-gradient(90deg, rgb(var(--cyan)), rgb(var(--violet)), rgb(var(--gold)));
}

:root[data-theme="dark"] {
  color-scheme: dark;

  --ground: 11 15 42;      /* #0B0F2A */
  --surface: 18 23 58;     /* #12173A */
  --raised: 26 32 80;      /* #1A2050 */
  --ink: 233 236 250;      /* #E9ECFA */
  --cyan: 56 189 248;      /* #38BDF8 */
  --violet: 139 92 246;    /* #8B5CF6 */
  --gold: 242 193 78;      /* #F2C14E */
  --danger: 240 86 107;    /* #F0566B */

  --ink-2: rgba(233, 236, 250, 0.65);
  --line: rgba(139, 92, 246, 0.28);
  --grid: rgba(120, 140, 255, 0.22);
  --mesh-opacity: 0.45;
}

/* ---------- Base ---------- */
* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: "Anek Devanagari", "Noto Sans Devanagari", system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  background: rgb(var(--ground));
  color: rgb(var(--ink));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--line); border-radius: 999px; }

/* ---------- Type scale ---------- */
@layer utilities {
  .text-display { font-size: 48px; line-height: 1; font-weight: 700; font-stretch: 125%; letter-spacing: -0.02em; }
  .text-h1 { font-size: 28px; line-height: 1.15; font-weight: 600; font-stretch: 110%; letter-spacing: -0.01em; }
  .text-h2 { font-size: 22px; line-height: 1.2; font-weight: 600; font-stretch: 110%; }
  .text-h3 { font-size: 18px; line-height: 1.3; font-weight: 600; font-stretch: 110%; }
  .text-body { font-size: 15px; line-height: 1.5; font-weight: 400; font-stretch: 100%; }
  .text-small { font-size: 13px; line-height: 1.4; font-weight: 500; font-stretch: 100%; }
  @media (max-width: 640px) {
    .text-display { font-size: 36px; }
  }

  /* Devanagari and hero words filled with the gradient */
  .text-thread {
    background: var(--thread);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* Dot grid: only ever on the ground, never on a surface */
  .bg-dotgrid {
    background-image: radial-gradient(circle at 1px 1px, var(--grid) 1px, transparent 0);
    background-size: 22px 22px;
  }
}

/* ---------- Motion ---------- */
@keyframes thread-draw {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes thread-sweep {
  0% { left: 0; }
  50% { left: calc(100% - 10px); }
  100% { left: 0; }
}
@media (prefers-reduced-motion: no-preference) {
  .thread-draw { transform-origin: left; animation: thread-draw 0.6s ease-out both; }
  .thread-sweep { animation: thread-sweep 1.4s ease-in-out infinite; }
}
```

- [ ] **Step 5: Update index.html**

Replace the whole file:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="SaarAI sends a bot to your meeting, transcribes Hindi and English, and returns the decisions, owners, and next steps." />
    <link rel="icon" type="image/png" href="/saarai-logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Anek+Devanagari:wdth,wght@75..125,100..800&display=swap" rel="stylesheet" />
    <title>SaarAI</title>
    <script>
      // Set the theme before React mounts so there is no flash.
      (function () {
        try {
          var stored = localStorage.getItem("saarai_theme");
          var system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          var theme = stored === "dark" || stored === "light" ? stored : system;
          document.documentElement.setAttribute("data-theme", theme);
        } catch (e) {
          document.documentElement.setAttribute("data-theme", "light");
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Run the token test**

Run: `npm test -- src/__tests__/tokens.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: build succeeds. Pages still reference old hex classes; that is fine, arbitrary values compile. Any reference to `primary-*` classes now produces no CSS but does not fail the build.

- [ ] **Step 8: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/tailwind.config.ts frontend/src/__tests__/tokens.test.ts
git commit -m "feat(frontend): add identity tokens, type scale, and Anek Devanagari"
```

---

### Task 3: ThemeContext and ThemeToggle

**Files:**
- Create: `frontend/src/context/ThemeContext.tsx`, `frontend/src/components/layout/ThemeToggle.tsx`, `frontend/src/context/__tests__/ThemeContext.test.tsx`
- Modify: `frontend/src/main.tsx`, `frontend/src/test/render.tsx`

**Interfaces:**
- Produces: `ThemeProvider`, `useTheme(): { theme: "light" | "dark"; setTheme(t): void; toggleTheme(): void }`, `THEME_STORAGE_KEY = "saarai_theme"`, `<ThemeToggle className? />` (a button with `aria-label` "Switch to dark theme" or "Switch to light theme").

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/context/__tests__/ThemeContext.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, THEME_STORAGE_KEY, useTheme } from "../ThemeContext";
import ThemeToggle from "../../components/layout/ThemeToggle";

function Probe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

describe("ThemeContext", () => {
  it("defaults to the system preference when storage is empty", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("reads a stored theme over the system preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("toggles, persists, and updates data-theme", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Probe /><ThemeToggle /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/context/__tests__/ThemeContext.test.tsx`
Expected: FAIL, module `../ThemeContext` not found.

- [ ] **Step 3: Implement ThemeContext**

Create `frontend/src/context/ThemeContext.tsx`:
```tsx
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "saarai_theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // storage unavailable; fall through to system preference
  }
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore storage failures; the in-memory theme still applies
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

export default ThemeContext;
```

- [ ] **Step 4: Implement ThemeToggle**

Create `frontend/src/components/layout/ThemeToggle.tsx`:
```tsx
import { useTheme } from "../../context/ThemeContext";

type ThemeToggleProps = { className?: string };

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={[
        "flex h-10 w-10 items-center justify-center rounded-control text-ink-2 hover:bg-raised hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
        className,
      ].join(" ")}
    >
      {theme === "dark" ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M18.72 18.72l1.06 1.06M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M18.72 5.28l1.06-1.06M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9-5.998Z" />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
```

- [ ] **Step 5: Wire the provider into main.tsx and the test helper**

`frontend/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
```

`frontend/src/test/render.tsx`:
```tsx
import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

type Options = { route?: string };

export function renderWithProviders(ui: ReactElement, { route = "/" }: Options = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}
```

- [ ] **Step 6: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/context/ThemeContext.tsx frontend/src/context/__tests__/ThemeContext.test.tsx frontend/src/components/layout/ThemeToggle.tsx frontend/src/main.tsx frontend/src/test/render.tsx
git commit -m "feat(frontend): add theme context with persisted light/dark toggle"
```

---

### Task 4: Thread, LoadingThread, and bot state mapping

**Files:**
- Create: `frontend/src/components/ui/Thread.tsx`, `frontend/src/components/ui/LoadingThread.tsx`, `frontend/src/lib/status.ts`, `frontend/src/components/ui/__tests__/Thread.test.tsx`, `frontend/src/lib/__tests__/status.test.ts`

**Interfaces:**
- Produces:
  - `type ThreadState = "joined" | "recording" | "transcribing" | "ready"`
  - `THREAD_STEPS: ReadonlyArray<{ state: ThreadState; label: string }>` in order joined, recording, transcribing, ready with labels "Bot joined", "Recording", "Transcribing", "Essence ready".
  - `<Thread state size? label? className? />` where `size` is `"inline" | "card" | "large"` (default `"card"`). Root has `role="img"` and `aria-label` equal to `label` or `Status: {step label}`. Markers carry `data-marker="done" | "now" | "todo"`.
  - `<LoadingThread label? className? />` with `role="status"`, default label "Loading".
  - `botStateToThreadState(state: number): ThreadStatus` where `type ThreadStatus = { state: ThreadState; label: string }`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/__tests__/status.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { botStateToThreadState } from "../status";

describe("botStateToThreadState", () => {
  it("maps pre-join states to joined with their own label", () => {
    expect(botStateToThreadState(1)).toEqual({ state: "joined", label: "Ready to join" });
    expect(botStateToThreadState(2)).toEqual({ state: "joined", label: "Joining" });
    expect(botStateToThreadState(8)).toEqual({ state: "joined", label: "In waiting room" });
    expect(botStateToThreadState(11)).toEqual({ state: "joined", label: "Scheduled" });
  });

  it("maps in-meeting states to recording", () => {
    expect(botStateToThreadState(3)).toEqual({ state: "recording", label: "In meeting" });
    expect(botStateToThreadState(4)).toEqual({ state: "recording", label: "Recording" });
  });

  it("maps post-meeting processing to transcribing", () => {
    expect(botStateToThreadState(5)).toEqual({ state: "transcribing", label: "Leaving" });
    expect(botStateToThreadState(6)).toEqual({ state: "transcribing", label: "Transcribing" });
  });

  it("maps 9 to ready", () => {
    expect(botStateToThreadState(9)).toEqual({ state: "ready", label: "Essence ready" });
  });

  it("maps error and unknown states to joined with Unavailable", () => {
    expect(botStateToThreadState(7)).toEqual({ state: "joined", label: "Unavailable" });
    expect(botStateToThreadState(42)).toEqual({ state: "joined", label: "Unavailable" });
  });
});
```

Create `frontend/src/components/ui/__tests__/Thread.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Thread from "../Thread";
import LoadingThread from "../LoadingThread";

function markers(kind: "done" | "now" | "todo") {
  return document.querySelectorAll(`[data-marker="${kind}"]`).length;
}

describe("Thread", () => {
  it("renders four markers with the current one highlighted", () => {
    render(<Thread state="transcribing" />);
    expect(markers("done")).toBe(2);
    expect(markers("now")).toBe(1);
    expect(markers("todo")).toBe(1);
  });

  it("fills every marker when ready", () => {
    render(<Thread state="ready" />);
    expect(markers("done")).toBe(3);
    expect(markers("now")).toBe(1);
    expect(markers("todo")).toBe(0);
  });

  it("exposes an accessible name from the step label", () => {
    render(<Thread state="recording" />);
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
  });

  it("prefers an explicit label", () => {
    render(<Thread state="joined" label="Status: Scheduled" />);
    expect(screen.getByRole("img", { name: "Status: Scheduled" })).toBeInTheDocument();
  });

  it("shows step labels only at large size", () => {
    const { rerender } = render(<Thread state="joined" size="large" />);
    expect(screen.getByText("Essence ready")).toBeInTheDocument();
    rerender(<Thread state="joined" size="inline" />);
    expect(screen.queryByText("Essence ready")).not.toBeInTheDocument();
  });
});

describe("LoadingThread", () => {
  it("renders a status region", () => {
    render(<LoadingThread />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/__tests__/status.test.ts src/components/ui/__tests__/Thread.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement status.ts**

Create `frontend/src/lib/status.ts`:
```ts
import type { ThreadState } from "../components/ui/Thread";

export type ThreadStatus = { state: ThreadState; label: string };

const MAP: Record<number, ThreadStatus> = {
  1: { state: "joined", label: "Ready to join" },
  2: { state: "joined", label: "Joining" },
  3: { state: "recording", label: "In meeting" },
  4: { state: "recording", label: "Recording" },
  5: { state: "transcribing", label: "Leaving" },
  6: { state: "transcribing", label: "Transcribing" },
  8: { state: "joined", label: "In waiting room" },
  9: { state: "ready", label: "Essence ready" },
  11: { state: "joined", label: "Scheduled" },
};

const UNAVAILABLE: ThreadStatus = { state: "joined", label: "Unavailable" };

/** Maps the backend bot state code to a position on the meeting thread. */
export function botStateToThreadState(state: number): ThreadStatus {
  return MAP[state] ?? UNAVAILABLE;
}

/** Bot states that mean a bot is currently inside a call. */
export function isLiveState(state: number): boolean {
  return state === 3 || state === 4;
}
```

- [ ] **Step 4: Implement Thread**

Create `frontend/src/components/ui/Thread.tsx`:
```tsx
export type ThreadState = "joined" | "recording" | "transcribing" | "ready";

export const THREAD_STEPS: ReadonlyArray<{ state: ThreadState; label: string }> = [
  { state: "joined", label: "Bot joined" },
  { state: "recording", label: "Recording" },
  { state: "transcribing", label: "Transcribing" },
  { state: "ready", label: "Essence ready" },
];

type ThreadSize = "inline" | "card" | "large";

type ThreadProps = {
  state: ThreadState;
  size?: ThreadSize;
  label?: string;
  className?: string;
};

const widthBySize: Record<ThreadSize, string> = {
  inline: "w-16",
  card: "w-full",
  large: "w-full",
};

const markerClass: Record<"done" | "now" | "todo", string> = {
  done: "bg-cyan border-cyan",
  now: "bg-gold border-gold shadow-[0_0_10px_rgb(var(--gold))]",
  todo: "bg-surface border-violet",
};

export function Thread({ state, size = "card", label, className = "" }: ThreadProps) {
  const current = THREAD_STEPS.findIndex((step) => step.state === state);
  const stepLabel = THREAD_STEPS[current]?.label ?? "Unavailable";
  const markerSize = size === "inline" ? "h-2 w-2 -top-[3px]" : "h-2.5 w-2.5 -top-1";

  return (
    <div
      role="img"
      aria-label={label ?? `Status: ${stepLabel}`}
      className={[widthBySize[size], className].join(" ")}
    >
      <div className="relative h-0.5 rounded-full bg-thread thread-draw">
        {THREAD_STEPS.map((step, index) => {
          const kind = index < current ? "done" : index === current ? "now" : "todo";
          const left = `${(index / (THREAD_STEPS.length - 1)) * 100}%`;
          return (
            <span
              key={step.state}
              data-marker={kind}
              aria-hidden="true"
              className={[
                "absolute -translate-x-1/2 rounded-full border-2",
                markerSize,
                markerClass[kind],
              ].join(" ")}
              style={{ left }}
            />
          );
        })}
      </div>
      {size === "large" ? (
        <div className="mt-2 flex justify-between text-small text-ink-2" aria-hidden="true">
          {THREAD_STEPS.map((step) => (
            <span key={step.state}>{step.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default Thread;
```

- [ ] **Step 5: Implement LoadingThread**

Create `frontend/src/components/ui/LoadingThread.tsx`:
```tsx
type LoadingThreadProps = {
  label?: string;
  className?: string;
};

export function LoadingThread({ label = "Loading", className = "" }: LoadingThreadProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={["flex min-h-[40vh] items-center justify-center", className].join(" ")}
    >
      <div className="relative h-0.5 w-12 rounded-full bg-thread">
        <span
          aria-hidden="true"
          className="thread-sweep absolute -top-1 h-2.5 w-2.5 rounded-full border-2 border-gold bg-gold"
          style={{ left: 0 }}
        />
      </div>
    </div>
  );
}

export default LoadingThread;
```

- [ ] **Step 6: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/Thread.tsx frontend/src/components/ui/LoadingThread.tsx frontend/src/lib/status.ts frontend/src/components/ui/__tests__/Thread.test.tsx frontend/src/lib/__tests__/status.test.ts
git commit -m "feat(frontend): add Thread status primitive and bot state mapping"
```

---

### Task 5: EmptyState and ErrorNotice

**Files:**
- Create: `frontend/src/components/ui/EmptyState.tsx`, `frontend/src/components/ui/ErrorNotice.tsx`, `frontend/src/components/ui/__tests__/EmptyState.test.tsx`, `frontend/src/components/ui/__tests__/ErrorNotice.test.tsx`

**Interfaces:**
- Produces: `<EmptyState devanagari title body action? className? />`, `<ErrorNotice message onRetry? retryLabel? className? />` (root has `role="alert"`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ui/__tests__/EmptyState.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders the word, title, body, and action", () => {
    render(
      <EmptyState
        devanagari="खाली"
        title="No meetings yet"
        body="Send a bot to your next call to see it here."
        action={<button type="button">Send bot</button>}
      />,
    );
    expect(screen.getByText("खाली")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No meetings yet" })).toBeInTheDocument();
    expect(screen.getByText("Send a bot to your next call to see it here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send bot" })).toBeInTheDocument();
  });
});
```

Create `frontend/src/components/ui/__tests__/ErrorNotice.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorNotice from "../ErrorNotice";

describe("ErrorNotice", () => {
  it("renders as an alert with the message", () => {
    render(<ErrorNotice message="Couldn't reach SaarAI. Check your connection and try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach SaarAI.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorNotice message="Something failed" onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/ui/__tests__/EmptyState.test.tsx src/components/ui/__tests__/ErrorNotice.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement EmptyState**

Create `frontend/src/components/ui/EmptyState.tsx`:
```tsx
import { type ReactNode } from "react";

type EmptyStateProps = {
  devanagari: string;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ devanagari, title, body, action, className = "" }: EmptyStateProps) {
  return (
    <div className={["flex flex-col items-start gap-3 py-10", className].join(" ")}>
      <span lang="hi" className="text-display text-thread" style={{ fontStretch: "100%" }} aria-hidden="true">
        {devanagari}
      </span>
      <h2 className="text-h2">{title}</h2>
      <p className="max-w-prose text-body text-ink-2">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
```

- [ ] **Step 4: Implement ErrorNotice**

Create `frontend/src/components/ui/ErrorNotice.tsx`:
```tsx
type ErrorNoticeProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorNotice({ message, onRetry, retryLabel = "Try again", className = "" }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={[
        "flex flex-wrap items-center gap-3 rounded-r-control border-l-[3px] border-danger bg-raised px-4 py-3 text-body",
        className,
      ].join(" ")}
    >
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control px-3 py-1 text-small text-violet hover:bg-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ErrorNotice;
```

- [ ] **Step 5: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/EmptyState.tsx frontend/src/components/ui/ErrorNotice.tsx frontend/src/components/ui/__tests__/EmptyState.test.tsx frontend/src/components/ui/__tests__/ErrorNotice.test.tsx
git commit -m "feat(frontend): add EmptyState and ErrorNotice primitives"
```

---

### Task 6: Restyle the UI kit and remove LoadingSpinner

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/Card.tsx`, `frontend/src/components/ui/FormField.tsx`, `frontend/src/components/ui/Skeleton.tsx`, `frontend/src/components/ui/PageHeader.tsx`, `frontend/src/components/ui/BrandLogo.tsx`, `frontend/src/components/auth/IndexRedirect.tsx`, `frontend/src/components/auth/ProtectedRoute.tsx`, `frontend/src/components/auth/PublicOnlyRoute.tsx`
- Delete: `frontend/src/components/ui/LoadingSpinner.tsx`
- Test: `frontend/src/components/ui/__tests__/kit.test.tsx`

**Interfaces:**
- Consumes: `LoadingThread` from Task 4.
- Produces: `Button` (same props: `variant`, `fullWidth`), `Card` (props: `title?`, `subtitle?`, `footer?`, `noPadding?`, `className?`, `children`), `FormField` (adds `error?: string`), `Skeleton`, `PageHeader` (unchanged props), `BrandLogo` with `mode?: "wordmark" | "mark"` (default `"wordmark"`). `Sidebar.tsx` still imports `BrandLogo` with `mode="icon"`; update that call to `mode="mark"` in this task so it compiles until Task 7 deletes the file. Same for `Navbar.tsx` and any page using `mode="icon"`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ui/__tests__/kit.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Button from "../Button";
import Card from "../Card";
import FormField from "../FormField";
import BrandLogo from "../BrandLogo";

describe("UI kit", () => {
  it("Button primary uses the violet token and no shadow", () => {
    render(<Button>Send bot</Button>);
    const button = screen.getByRole("button", { name: "Send bot" });
    expect(button.className).toContain("bg-violet");
    expect(button.className).not.toContain("shadow");
  });

  it("Card renders title, subtitle, and footer", () => {
    render(
      <Card title="Send bot to meeting" subtitle="Paste a link" footer={<span>footer</span>}>
        body
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Send bot to meeting" })).toBeInTheDocument();
    expect(screen.getByText("Paste a link")).toBeInTheDocument();
    expect(screen.getByText("footer")).toBeInTheDocument();
  });

  it("FormField shows an error message linked to the input", () => {
    render(<FormField label="Work email" error="Enter a valid email address." />);
    const input = screen.getByLabelText("Work email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("BrandLogo mark renders an inline SVG, wordmark renders the PNG", () => {
    const { rerender } = render(<BrandLogo mode="mark" />);
    expect(document.querySelector("svg")).not.toBeNull();
    rerender(<BrandLogo />);
    expect(screen.getByRole("img", { name: "SaarAI" })).toHaveAttribute("src", "/saarai-logo.png");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/ui/__tests__/kit.test.tsx`
Expected: FAIL (Button contains "shadow", Card has no footer, FormField has no error, BrandLogo has no `mark` mode).

- [ ] **Step 3: Rewrite Button.tsx**

```tsx
import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-violet text-white hover:bg-violet/90",
  secondary: "border border-violet text-ink hover:bg-violet/10",
  ghost: "text-ink-2 hover:bg-raised hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger/90",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-control px-4 py-2 text-small transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
```

- [ ] **Step 4: Rewrite Card.tsx**

```tsx
import { type ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function Card({ title, subtitle, footer, children, className = "", noPadding = false }: CardProps) {
  const hasHeader = Boolean(title || subtitle);
  return (
    <section className={["rounded-panel border border-line bg-surface", noPadding ? "" : "p-6", className].join(" ")}>
      {hasHeader ? (
        <header className={noPadding ? "px-6 pt-6 pb-4" : "mb-4"}>
          {title ? <h3 className="text-h3">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-small text-ink-2">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
      {footer ? (
        <footer className={["border-t border-line", noPadding ? "px-6 py-4" : "mt-4 pt-4"].join(" ")}>{footer}</footer>
      ) : null}
    </section>
  );
}

export default Card;
```

- [ ] **Step 5: Rewrite FormField.tsx**

```tsx
import { type InputHTMLAttributes, useId } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function FormField({ label, hint, error, className = "", id, ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-small text-ink-2">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={[
          "w-full rounded-control border bg-raised px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-2",
          "focus:border-violet focus:ring-2 focus:ring-violet/25",
          error ? "border-danger" : "border-line",
          className,
        ].join(" ")}
        {...props}
      />
      {error ? (
        <span id={errorId} className="mt-1.5 block text-small text-danger">{error}</span>
      ) : hint ? (
        <span id={hintId} className="mt-1.5 block text-small text-ink-2">{hint}</span>
      ) : null}
    </div>
  );
}

export default FormField;
```

- [ ] **Step 6: Rewrite Skeleton.tsx and PageHeader.tsx**

`Skeleton.tsx`:
```tsx
type SkeletonProps = { className?: string };

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={["animate-pulse rounded-control bg-raised", className].join(" ")} />;
}

export default Skeleton;
```

`PageHeader.tsx`:
```tsx
import { type ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, className = "", action }: PageHeaderProps) {
  return (
    <header className={["flex items-start justify-between gap-4", className].join(" ")}>
      <div>
        <h1 className="text-h1">{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-ink-2">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export default PageHeader;
```

- [ ] **Step 7: Rewrite BrandLogo.tsx**

```tsx
type BrandLogoProps = {
  className?: string;
  mode?: "wordmark" | "mark";
};

export function BrandLogo({ className = "", mode = "wordmark" }: BrandLogoProps) {
  if (mode === "mark") {
    return (
      <svg
        viewBox="0 0 32 32"
        className={["h-8 w-8", className].join(" ")}
        role="img"
        aria-label="SaarAI"
      >
        <defs>
          <linearGradient id="saarai-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--cyan))" />
            <stop offset="0.6" stopColor="rgb(var(--violet))" />
            <stop offset="1" stopColor="rgb(var(--gold))" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#saarai-mark)" />
        <path
          d="M21 11.5c-1.2-1.3-3-2-4.9-2C13 9.5 11 11 11 13.2c0 4.6 10 2.4 10 7.2 0 2.3-2.2 3.6-4.9 3.6-2.2 0-4.2-.9-5.4-2.3"
          fill="none"
          stroke="rgb(var(--surface))"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <img
      src="/saarai-logo.png"
      alt="SaarAI"
      className={["h-16 w-auto object-contain", className].join(" ")}
      loading="eager"
    />
  );
}

export default BrandLogo;
```

- [ ] **Step 8: Replace LoadingSpinner and fix BrandLogo callers**

Delete `frontend/src/components/ui/LoadingSpinner.tsx`.

In `IndexRedirect.tsx`, `ProtectedRoute.tsx`, `PublicOnlyRoute.tsx`: change `import LoadingSpinner from "../ui/LoadingSpinner";` to `import LoadingThread from "../ui/LoadingThread";` and `<LoadingSpinner />` to `<LoadingThread />`.

In `frontend/src/layouts/AppShell.tsx`: same import swap and `<LoadingSpinner />` to `<LoadingThread />` (full rewrite comes in Task 7).

Run `grep -rn 'mode="icon"\|mode="full"' src` and change every `mode="icon"` to `mode="mark"` and remove `mode="full"` (it is now the default). Expected files: `Sidebar.tsx`, `Navbar.tsx`.

- [ ] **Step 9: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass. If typecheck reports `alt` passed to `BrandLogo` anywhere, remove that prop at the call site.

- [ ] **Step 10: Commit**

```bash
git add -A frontend/src/components
git commit -m "feat(frontend): restyle UI kit to identity tokens and replace spinner with LoadingThread"
```

---

### Task 7: Rail, TopBar, CornerMesh, and AppShell

**Files:**
- Create: `frontend/src/components/layout/Rail.tsx`, `frontend/src/components/layout/CornerMesh.tsx`, `frontend/src/lib/breadcrumb.ts`, `frontend/src/components/layout/__tests__/Rail.test.tsx`, `frontend/src/lib/__tests__/breadcrumb.test.ts`
- Modify: `frontend/src/components/layout/TopBar.tsx`, `frontend/src/layouts/AppShell.tsx`
- Delete: `frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`, `BrandLogo mode="mark"`, `LoadingThread`, `useAuth`, `meetingsApi.botsStatus`, `isLiveState` from `src/lib/status.ts`.
- Produces: `<Rail />` (desktop rail and mobile bottom tab bar in one component), `<TopBar />` (no props), `<CornerMesh />`, `breadcrumbFor(pathname: string): string`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/__tests__/breadcrumb.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { breadcrumbFor } from "../breadcrumb";

describe("breadcrumbFor", () => {
  it("names top-level pages", () => {
    expect(breadcrumbFor("/dashboard")).toBe("Dashboard");
    expect(breadcrumbFor("/meetings")).toBe("Meetings");
    expect(breadcrumbFor("/chat")).toBe("Chat");
    expect(breadcrumbFor("/settings")).toBe("Settings");
  });

  it("nests meeting pages under Meetings", () => {
    expect(breadcrumbFor("/meetings/42")).toBe("Meetings / Meeting #42");
    expect(breadcrumbFor("/meetings/42/transcript")).toBe("Meetings / Meeting #42 / Transcript");
  });

  it("falls back to SaarAI", () => {
    expect(breadcrumbFor("/nowhere")).toBe("SaarAI");
  });
});
```

Create `frontend/src/components/layout/__tests__/Rail.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import Rail from "../Rail";

describe("Rail", () => {
  it("renders the four navigation links with accessible names", () => {
    renderWithProviders(<Rail />, { route: "/dashboard" });
    for (const name of ["Dashboard", "Meetings", "Chat", "Settings"]) {
      // One link in the desktop rail and one in the mobile tab bar.
      expect(screen.getAllByRole("link", { name })).toHaveLength(2);
    }
  });

  it("marks the current page", () => {
    renderWithProviders(<Rail />, { route: "/meetings" });
    const [meetings] = screen.getAllByRole("link", { name: "Meetings" });
    expect(meetings).toHaveAttribute("aria-current", "page");
  });

  it("exposes the theme toggle", () => {
    renderWithProviders(<Rail />, { route: "/dashboard" });
    expect(screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ }).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/__tests__/breadcrumb.test.ts src/components/layout/__tests__/Rail.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement breadcrumb.ts**

```ts
const TOP_LEVEL: Record<string, string> = {
  dashboard: "Dashboard",
  meetings: "Meetings",
  chat: "Chat",
  settings: "Settings",
};

/** Turns a pathname into the top bar breadcrumb text. */
export function breadcrumbFor(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const [root, id, sub] = parts;
  if (!root || !TOP_LEVEL[root]) return "SaarAI";
  const crumbs = [TOP_LEVEL[root]];
  if (root === "meetings" && id) {
    crumbs.push(`Meeting #${id}`);
    if (sub === "transcript") crumbs.push("Transcript");
  }
  return crumbs.join(" / ");
}
```

- [ ] **Step 4: Implement Rail.tsx**

```tsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../ui/BrandLogo";
import ThemeToggle from "./ThemeToggle";

type Item = { to: string; label: string; icon: JSX.Element };

const items: Item[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: "/meetings",
    label: "Meetings",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    to: "/chat",
    label: "Chat",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.38.138.75.43.992l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function NavItem({ item, tooltip }: { item: Item; tooltip: boolean }) {
  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      title={item.label}
      className={({ isActive }) =>
        [
          "group relative flex h-11 w-11 items-center justify-center rounded-control transition-colors",
          isActive ? "text-violet" : "text-ink-2 hover:bg-raised hover:text-ink",
          focusRing,
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-thread" />
          ) : null}
          {item.icon}
          {tooltip ? (
            <span
              role="presentation"
              className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-control border border-line bg-surface px-2 py-1 text-small text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={["flex h-8 w-8 items-center justify-center rounded-full bg-violet text-small text-white", focusRing].join(" ")}
      >
        {initial}
      </button>
      {open ? (
        <div role="menu" className="absolute bottom-0 left-full ml-2 w-56 rounded-panel border border-line bg-surface p-2">
          <p className="truncate px-2 py-1 text-small text-ink-2">{user?.email}</p>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className={["mt-1 w-full rounded-control px-2 py-1.5 text-left text-small text-ink hover:bg-raised", focusRing].join(" ")}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Rail() {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden h-screen w-14 shrink-0 flex-col items-center border-r border-line bg-surface py-3 md:flex">
        <div className="mb-4">
          <BrandLogo mode="mark" className="h-7 w-7" />
        </div>
        <nav aria-label="Primary" className="flex flex-col gap-1">
          {items.map((item) => (
            <NavItem key={item.to} item={item} tooltip />
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-line bg-surface md:hidden"
      >
        {items.map((item) => (
          <NavItem key={item.to} item={item} tooltip={false} />
        ))}
      </nav>
    </>
  );
}

export default Rail;
```

- [ ] **Step 5: Implement CornerMesh.tsx**

```tsx
export function CornerMesh() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 220"
      fill="none"
      className="pointer-events-none fixed -bottom-10 -right-10 z-0 h-80 w-80"
      style={{ opacity: "var(--mesh-opacity)" }}
    >
      <defs>
        <linearGradient id="corner-mesh" x1="0" x2="1">
          <stop stopColor="rgb(var(--cyan))" />
          <stop offset="0.6" stopColor="rgb(var(--violet))" />
          <stop offset="1" stopColor="rgb(var(--gold))" />
        </linearGradient>
      </defs>
      <g stroke="url(#corner-mesh)" strokeWidth="1">
        <path d="M30 40 L90 20 L150 45 L200 30 M30 40 L60 110 L90 20 M60 110 L150 45 L130 120 L200 30 M60 110 L40 180 L130 120 L170 190 L200 120 L130 120 M170 190 L200 30" />
      </g>
      <g fill="rgb(var(--cyan))"><circle cx="30" cy="40" r="3" /><circle cx="90" cy="20" r="3" /><circle cx="60" cy="110" r="3" /></g>
      <g fill="rgb(var(--violet))"><circle cx="150" cy="45" r="3" /><circle cx="130" cy="120" r="4" /><circle cx="40" cy="180" r="3" /></g>
      <g fill="rgb(var(--gold))"><circle cx="200" cy="30" r="3" /><circle cx="200" cy="120" r="5" /><circle cx="170" cy="190" r="3" /></g>
    </svg>
  );
}

export default CornerMesh;
```

- [ ] **Step 6: Rewrite TopBar.tsx**

```tsx
import { type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { meetingsApi } from "../../api";
import { breadcrumbFor } from "../../lib/breadcrumb";
import { isLiveState } from "../../lib/status";
import ThemeToggle from "./ThemeToggle";

const LIVE_POLL_MS = 30_000;

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await meetingsApi.botsStatus();
        if (!cancelled) setLiveCount(data.bots.filter((b) => isLiveState(b.state)).length);
      } catch {
        // The live count is a convenience; failures stay silent.
      }
    };
    void load();
    const id = window.setInterval(load, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/meetings?q=${encodeURIComponent(q)}` : "/meetings");
  };

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center gap-4 border-b border-line bg-ground/70 px-4 backdrop-blur-md sm:px-6">
      <p className="min-w-0 flex-1 truncate text-small text-ink-2 sm:flex-none">{breadcrumbFor(location.pathname)}</p>

      {/* Thread slot: filled by the meeting workspace phase. */}
      <div id="topbar-thread" className="hidden flex-1 justify-center sm:flex" />

      <form onSubmit={onSearch} role="search" className="hidden sm:block">
        <label htmlFor="topbar-search" className="sr-only">Search meetings</label>
        <input
          id="topbar-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search meetings"
          className="h-8 w-48 rounded-control border border-line bg-raised px-3 text-small text-ink outline-none placeholder:text-ink-2 focus:border-violet focus:ring-2 focus:ring-violet/25"
        />
      </form>

      {liveCount > 0 ? (
        <span className="flex items-center gap-2 text-small text-gold">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgb(var(--gold))]" />
          {liveCount} live
        </span>
      ) : null}

      {/* Theme toggle appears here only on mobile; the rail carries it on desktop. */}
      <ThemeToggle className="md:hidden" />
    </header>
  );
}

export default TopBar;
```

- [ ] **Step 7: Rewrite AppShell.tsx and delete Sidebar.tsx**

```tsx
import { Outlet } from "react-router-dom";
import CornerMesh from "../components/layout/CornerMesh";
import Navbar from "../components/layout/Navbar";
import Rail from "../components/layout/Rail";
import TopBar from "../components/layout/TopBar";
import LoadingThread from "../components/ui/LoadingThread";
import { useAuth } from "../context/AuthContext";

export function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingThread />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex h-screen overflow-hidden bg-ground bg-dotgrid">
        <Rail />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-20 pt-6 sm:px-8 sm:py-8 md:pb-8">
            <div className="mx-auto max-w-canvas">
              <Outlet />
            </div>
          </main>
        </div>
        <CornerMesh />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground bg-dotgrid">
      <Navbar />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
```

Delete `frontend/src/components/layout/Sidebar.tsx`.

Note: the public layout no longer pads or constrains `main`; Task 8 and Task 9 pages own their own width and padding so the hero and login can go edge to edge.

- [ ] **Step 8: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass. If typecheck complains about `JSX.Element` in `Rail.tsx`, change the `Item` type to `icon: React.ReactNode` and add `import { type ReactNode } from "react"`.

- [ ] **Step 9: Commit**

```bash
git add -A frontend/src/components/layout frontend/src/layouts frontend/src/lib
git commit -m "feat(frontend): replace sidebar with icon rail, working top bar, and corner mesh"
```

---

### Task 8: Public navbar and Home page

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`, `frontend/src/pages/Home.tsx`
- Test: `frontend/src/pages/__tests__/Home.test.tsx`

**Interfaces:**
- Consumes: `Thread size="large"`, `Button`, `BrandLogo`, `Card`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/__tests__/Home.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import Home from "../Home";

describe("Home", () => {
  it("renders the hero headline with the Devanagari word and both actions", () => {
    renderWithProviders(<Home />, { route: "/overview" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Every meeting, reduced to its सार");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows the demo meeting on a finished thread", () => {
    renderWithProviders(<Home />, { route: "/overview" });
    expect(screen.getByRole("img", { name: "Status: Essence ready" })).toBeInTheDocument();
    expect(screen.getByText("Q3 vendor review")).toBeInTheDocument();
  });

  it("lists the three steps", () => {
    renderWithProviders(<Home />, { route: "/overview" });
    for (const step of ["Send the bot", "Read both languages", "Get the essence"]) {
      expect(screen.getByRole("heading", { name: step })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/__tests__/Home.test.tsx`
Expected: FAIL on the headline text.

- [ ] **Step 3: Rewrite Navbar.tsx**

```tsx
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../ui/BrandLogo";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-control px-3 py-1.5 text-small transition-colors",
    isActive ? "text-ink" : "text-ink-2 hover:text-ink",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
  ].join(" ");

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-canvas items-center gap-3 px-4 sm:px-8">
        <Link to="/overview" className="flex items-center gap-2" aria-label="SaarAI home">
          <BrandLogo mode="mark" className="h-6 w-6" />
          <span className="text-h3" style={{ fontStretch: "115%" }}>SaarAI</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <button type="button" onClick={logout} className={linkClass({ isActive: false })}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/overview" className={linkClass}>Overview</NavLink>
              <NavLink to="/login" className={linkClass}>Sign in</NavLink>
              <Link
                to="/signup"
                className="ml-1 rounded-control bg-violet px-3 py-1.5 text-small text-white hover:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
```

- [ ] **Step 4: Rewrite Home.tsx**

```tsx
import { Link } from "react-router-dom";
import Thread from "../components/ui/Thread";

const primaryLink =
  "inline-flex items-center justify-center rounded-control bg-violet px-4 py-2 text-small text-white hover:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";
const secondaryLink =
  "inline-flex items-center justify-center rounded-control border border-violet px-4 py-2 text-small text-ink hover:bg-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";

const steps = [
  { title: "Send the bot", body: "Paste a meeting link. The bot joins, introduces itself, and records." },
  { title: "Read both languages", body: "Deepgram transcribes Hindi and English in one stream, with speakers named." },
  { title: "Get the essence", body: "Minutes, insights, and strategy arrive the moment the call ends." },
];

export function Home() {
  return (
    <div className="mx-auto max-w-canvas px-4 sm:px-8">
      <section className="grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <h1 className="text-display">
            Every meeting,
            <br />
            reduced to its{" "}
            <span lang="hi" className="text-thread" style={{ fontStretch: "100%", fontWeight: 600 }}>
              सार
            </span>
          </h1>
          <p className="mt-5 max-w-prose text-[17px] font-light leading-relaxed text-ink-2">
            SaarAI sends a bot into your Google Meet, Zoom, or Teams call, transcribes Hindi and English together, and hands back the decisions, owners, and next steps.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/signup" className={primaryLink}>Create account</Link>
            <Link to="/login" className={secondaryLink}>Sign in</Link>
            <span className="ml-1 text-small text-ink-2">Free while in preview</span>
          </div>
        </div>

        <div className="rounded-panel border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-body">Q3 vendor review</span>
            <span className="text-small text-ink-2">started 14:02</span>
          </div>
          <Thread state="ready" size="large" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-small text-ink-2">Transcript</h2>
              <p className="text-small font-normal leading-relaxed text-ink-2">
                <span className="text-cyan">Ravi</span> हाँ तो Q3 के लिए हम vendor change कर रहे हैं. Meena will handle the RFP by Friday.
                <br />
                <span className="text-cyan">Meena</span> ठीक है, but budget still needs Ankit's sign-off.
              </p>
            </div>
            <div>
              <h2 className="mb-2 text-small text-ink-2">Essence</h2>
              <ul className="space-y-1.5 text-small font-normal">
                {[
                  ["Change vendor for Q3", "decision"],
                  ["Meena sends RFP by Friday", "action"],
                  ["Budget waits on Ankit", "blocker"],
                ].map(([text, kind]) => (
                  <li key={text} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>
                      {text} <span className="text-ink-2">{kind}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div aria-hidden="true" className="mb-6 h-0.5 rounded-full bg-thread" />
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title}>
              <h2 className="text-h3">{step.title}</h2>
              <p className="mt-1.5 max-w-[32ch] text-body text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
```

- [ ] **Step 5: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx frontend/src/pages/Home.tsx frontend/src/pages/__tests__/Home.test.tsx
git commit -m "feat(frontend): redesign public navbar and Home hero"
```

---

### Task 9: Login, Signup, NotFound, and name on the auth user

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Signup.tsx`, `frontend/src/pages/NotFound.tsx`
- Test: `frontend/src/pages/__tests__/auth-pages.test.tsx`

**Interfaces:**
- Consumes: `FormField` with `error`, `Button`, `ErrorNotice`, `EmptyState`, `BrandLogo`, `CornerMesh` is NOT used here; the brand panel has its own inline mesh copy (see Step 4).
- Produces: `AuthUser = { email: string; name?: string }`, `signup(email, password, name?)`. The backend register endpoint accepts only email and password (`saar_ai/app/routers/auth.py` `RegisterRequest`), so `name` is stored only in the local auth record.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/__tests__/auth-pages.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/render";
import Login from "../Login";
import Signup from "../Signup";
import NotFound from "../NotFound";
import * as api from "../../api";

describe("Login", () => {
  it("shows the credential error copy when login fails", async () => {
    vi.spyOn(api.authApi, "login").mockRejectedValueOnce(new Error("Invalid credentials"));
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });
    await user.type(screen.getByLabelText("Work email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("That password doesn't match this email. Try again."),
    );
  });

  it("shows the network error copy with a retry when fetch fails", async () => {
    vi.spyOn(api.authApi, "login").mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });
    await user.type(screen.getByLabelText("Work email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach SaarAI. Check your connection and try again."),
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("has no social buttons or forgot-password link", () => {
    renderWithProviders(<Login />, { route: "/login" });
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
  });
});

describe("Signup", () => {
  it("stores the name locally after registering", async () => {
    vi.spyOn(api.authApi, "register").mockResolvedValueOnce({ api_key: "k", message: "ok" });
    const user = userEvent.setup();
    renderWithProviders(<Signup />, { route: "/signup" });
    await user.type(screen.getByLabelText("Full name"), "Priya");
    await user.type(screen.getByLabelText("Work email"), "p@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("saarai_auth_user") ?? "{}")).toEqual({ email: "p@b.com", name: "Priya" }),
    );
  });

  it("rejects a short password before calling the API", async () => {
    const register = vi.spyOn(api.authApi, "register");
    const user = userEvent.setup();
    renderWithProviders(<Signup />, { route: "/signup" });
    await user.type(screen.getByLabelText("Full name"), "Priya");
    await user.type(screen.getByLabelText("Work email"), "p@b.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});

describe("NotFound", () => {
  it("renders the empty state with a link to the dashboard", () => {
    renderWithProviders(<NotFound />, { route: "/nowhere" });
    expect(screen.getByRole("heading", { name: "There's nothing here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/pages/__tests__/auth-pages.test.tsx`
Expected: FAIL on labels and copy.

- [ ] **Step 3: Update AuthContext.tsx**

Change the `AuthUser` type and `signup`:
```tsx
type AuthUser = {
  email: string;
  name?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};
```
and
```tsx
  const signup = async (email: string, password: string, name?: string) => {
    const res = await authApi.register(email, password);
    setApiKey(res.api_key);
    const trimmed = name?.trim();
    writeUser(trimmed ? { email, name: trimmed } : { email });
  };
```
Everything else in the file stays as it is.

- [ ] **Step 4: Rewrite Login.tsx**

```tsx
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../components/ui/BrandLogo";
import Button from "../components/ui/Button";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";

export const NETWORK_ERROR = "Couldn't reach SaarAI. Check your connection and try again.";
export const CREDENTIAL_ERROR = "That password doesn't match this email. Try again.";

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

export function BrandPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative hidden flex-col justify-end overflow-hidden p-12 lg:flex">
      <svg aria-hidden="true" viewBox="0 0 220 220" fill="none" className="pointer-events-none absolute bottom-0 right-0 h-72 w-72" style={{ opacity: "var(--mesh-opacity)" }}>
        <defs>
          <linearGradient id="brand-mesh" x1="0" x2="1">
            <stop stopColor="rgb(var(--cyan))" />
            <stop offset="0.6" stopColor="rgb(var(--violet))" />
            <stop offset="1" stopColor="rgb(var(--gold))" />
          </linearGradient>
        </defs>
        <g stroke="url(#brand-mesh)" strokeWidth="1">
          <path d="M30 40 L90 20 L150 45 L200 30 M30 40 L60 110 L90 20 M60 110 L150 45 L130 120 L200 30 M60 110 L40 180 L130 120 L170 190 L200 120 L130 120 M170 190 L200 30" />
        </g>
        <g fill="rgb(var(--cyan))"><circle cx="30" cy="40" r="3" /><circle cx="90" cy="20" r="3" /><circle cx="60" cy="110" r="3" /></g>
        <g fill="rgb(var(--violet))"><circle cx="150" cy="45" r="3" /><circle cx="130" cy="120" r="4" /><circle cx="40" cy="180" r="3" /></g>
        <g fill="rgb(var(--gold))"><circle cx="200" cy="30" r="3" /><circle cx="200" cy="120" r="5" /><circle cx="170" cy="190" r="3" /></g>
      </svg>
      <div className="mb-auto">
        <BrandLogo mode="mark" className="h-8 w-8" />
      </div>
      <h2 className="text-display" style={{ fontSize: 34 }}>{title}</h2>
      <p className="mt-3 max-w-prose text-body font-light text-ink-2">{body}</p>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";
      navigate(target, { replace: true });
    } catch (err) {
      setError(isNetworkError(err) ? { message: NETWORK_ERROR, retry: true } : { message: CREDENTIAL_ERROR, retry: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-canvas lg:grid-cols-[1fr_420px]">
      <BrandPanel title="Welcome back." body="Your meetings, transcripts, and essence are where you left them." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-line bg-surface px-6 py-10 sm:px-9 lg:border-l">
        <h1 className="text-h2">Sign in</h1>
        <FormField label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <ErrorNotice message={error.message} onRetry={error.retry ? () => void submit() : undefined} /> : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Signing in" : "Sign in"}
        </Button>
        <p className="text-small text-ink-2">
          New to SaarAI?{" "}
          <Link to="/signup" className="text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
```

- [ ] **Step 5: Rewrite Signup.tsx**

```tsx
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";
import { BrandPanel, isNetworkError, NETWORK_ERROR } from "./Login";

const SHORT_PASSWORD = "Use at least 8 characters.";

export function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setPasswordError(SHORT_PASSWORD);
      return;
    }
    setPasswordError(undefined);
    setLoading(true);
    try {
      await signup(email, password, name);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        isNetworkError(err)
          ? { message: NETWORK_ERROR, retry: true }
          : { message: err instanceof Error && err.message ? err.message : "Couldn't create the account. Try again.", retry: false },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-canvas lg:grid-cols-[1fr_420px]">
      <BrandPanel title="Start with one meeting." body="Send a bot to your next call and read the essence when it ends." />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 border-line bg-surface px-6 py-10 sm:px-9 lg:border-l">
        <h1 className="text-h2">Create account</h1>
        <FormField label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <FormField label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={passwordError}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <ErrorNotice message={error.message} onRetry={error.retry ? () => void submit() : undefined} /> : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Creating account" : "Create account"}
        </Button>
        <p className="text-small text-ink-2">
          Already have an account?{" "}
          <Link to="/login" className="text-violet hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
```

- [ ] **Step 6: Rewrite NotFound.tsx**

```tsx
import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";

export function NotFound() {
  return (
    <div className="mx-auto max-w-canvas px-4 sm:px-8">
      <EmptyState
        devanagari="खाली"
        title="There's nothing here"
        body="The page you're looking for doesn't exist or moved."
        action={
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-control bg-violet px-4 py-2 text-small text-white hover:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground"
          >
            Go to Dashboard
          </Link>
        }
      />
    </div>
  );
}

export default NotFound;
```

- [ ] **Step 7: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass. Note for the short-password test: `noValidate` on the Signup form is required so the browser's own `minLength` validation does not block the submit event in jsdom.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/pages/Login.tsx frontend/src/pages/Signup.tsx frontend/src/pages/NotFound.tsx frontend/src/pages/__tests__/auth-pages.test.tsx
git commit -m "feat(frontend): redesign login, signup, and not-found pages"
```

---

### Task 10: Bring app pages onto the tokens and delete unreachable pages

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Meetings.tsx`, `frontend/src/pages/MeetingDetail.tsx`, `frontend/src/pages/Transcript.tsx`, `frontend/src/pages/Chat.tsx`, `frontend/src/pages/Settings.tsx`
- Delete: `frontend/src/pages/generate/` (directory), `frontend/src/pages/ApiRoutes.tsx`, `frontend/src/constants/backendRoutes.ts`
- Test: `frontend/src/pages/__tests__/app-pages.test.tsx`

**Interfaces:**
- Consumes: `Thread`, `botStateToThreadState`, `LoadingThread`, `ErrorNotice`, `EmptyState`, `ThemeToggle`, `Card`, `Button`, `FormField`, `Skeleton`.

This task is mechanical. It does not change layouts or behavior. The rules, applied to every file in the list:

1. Remove `import { motion ... } from "framer-motion"` and replace every `<motion.X ...>` with `<X>`; drop `initial`, `animate`, `exit`, `transition`, `whileHover` props. Remove `AnimatePresence` wrappers, keeping their children.
2. Replace color classes with tokens using this table. Apply it with search and replace, then read the file once to catch any hex not in the table.

| Old | New |
|---|---|
| `bg-[#f6f9fc]`, `bg-slate-50`, `bg-slate-100` | `bg-raised` |
| `bg-white`, `bg-white/70`, `bg-white/80` | `bg-surface` |
| `border-[#e3e8ee]`, `border-slate-200`, `border-white/60`, `border-slate-200/60` | `border-line` |
| `text-[#0a2540]`, `text-slate-900`, `text-slate-800` | `text-ink` |
| `text-[#425466]`, `text-[#697386]`, `text-[#8898aa]`, `text-slate-500`, `text-slate-600`, `text-slate-400` | `text-ink-2` |
| `bg-[#635bff]`, `bg-primary-600`, `bg-sky-600` | `bg-violet` |
| `text-primary-600`, `text-primary-500`, `text-[#635bff]` | `text-violet` |
| `hover:bg-[#f6f9fc]`, `hover:bg-slate-100`, `hover:bg-slate-50` | `hover:bg-raised` |
| `rounded-3xl`, `rounded-2xl`, `rounded-xl`, `rounded-lg` (on cards, panels, table wrappers) | `rounded-panel` |
| `rounded-md`, `rounded-lg` (on buttons, inputs, chips) | `rounded-control` |
| any `shadow-[...]`, `shadow-sm`, `shadow-md`, `stripe-shadow*`, `backdrop-blur-*` | remove |
| `text-[11px] font-semibold uppercase tracking-wider` (table headers) | `text-small text-ink-2` |
| `text-xs uppercase tracking-[0.2em]` (eyebrows) | delete the element |
| success/warning/danger banners: `bg-red-50 border-red-200 text-red-600`, `bg-[#fef2f2] ...`, `bg-[#ecfdf5] ...` | use `ErrorNotice` for errors; success banners become `text-small text-cyan` paragraphs |

3. Replace status pills with `Thread`. In `Dashboard.tsx`, `Meetings.tsx`, and `MeetingDetail.tsx`, delete the `stateLabels` map. Wherever a pill was rendered from `stateLabels[meeting.state]` or `state.color`, render:
```tsx
{(() => {
  const status = botStateToThreadState(meeting.state);
  return (
    <span className="inline-flex items-center gap-3">
      <Thread state={status.state} size="inline" label={`Status: ${status.label}`} />
      <span className="text-small text-ink-2">{status.label}</span>
    </span>
  );
})()}
```
(In `MeetingDetail.tsx` the variable is `meeting.state` as well; in the Dashboard "Active Bots" list it is `bot.state`.) Remove the `animate-ping` markup entirely. Keep `isCompleted = meeting.state === 9` checks; they gate actions and are behavior.
4. Replace `LoadingSpinner` (if any remain) with `LoadingThread`, error strings rendered in red boxes with `<ErrorNotice message={error} onRetry={reload} />` where a reload function exists, otherwise without `onRetry`.
5. Replace "no data" blocks with `EmptyState`:
   - Dashboard recent activity: `devanagari="खाली"`, title "No completed meetings yet", body "Send a bot to a meeting and it will show up here once the call ends."
   - Meetings, no meetings: `devanagari="खाली"`, title "No meetings yet", body "Send a bot to your next call to see it here.", action a `Link` to `/dashboard` styled as the primary button with text "Send bot".
   - Meetings, no filter match: `devanagari="खोज"`, title "No meetings match", body "Try a different name or clear the status filter."
   - MeetingDetail "Ready to analyze": `devanagari="सार"`, title "Ready to extract the essence", body "Generate minutes, insights, and strategy from this transcript.", action the existing Generate button with text "Generate essence".
   - MeetingDetail no transcript and Transcript page empty: `devanagari="मौन"`, title "No transcript available", body "The bot didn't capture any speech in this meeting."
6. In `Meetings.tsx`, initialise the search box from the URL so the top bar search works:
```tsx
import { useSearchParams } from "react-router-dom";
// inside the component, replace `useState("")` for the search term with:
const [searchParams] = useSearchParams();
const [search, setSearch] = useState(searchParams.get("q") ?? "");
```
(Use whatever the existing search state variable is called; keep its name.)
7. In `Settings.tsx`, inside the Profile tab card, after the timezone field add:
```tsx
<div className="mt-4 flex items-center gap-3">
  <span className="text-small text-ink-2">Theme</span>
  <ThemeToggle />
</div>
```
with `import ThemeToggle from "../components/layout/ThemeToggle";`. Rename the buttons to "Save changes" and "Cancel". Rename the tab pills to plain text tabs: active tab `text-ink border-b-2 border-violet`, inactive `text-ink-2`.
8. Button and label copy: "Send Bot" becomes "Send bot", "View & AI" becomes "Open essence", "Generate New Key" becomes "Generate new key", "Update" stays, "Log out" becomes "Sign out". Any remaining Title Case button text becomes sentence case.
9. Delete `frontend/src/pages/generate/`, `frontend/src/pages/ApiRoutes.tsx`, and `frontend/src/constants/backendRoutes.ts`. Run `grep -rn "backendRoutes\|pages/generate\|ApiRoutes" src` and expect no output.

- [ ] **Step 1: Write the failing smoke tests**

Create `frontend/src/pages/__tests__/app-pages.test.tsx`:
```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import * as api from "../../api";
import Dashboard from "../Dashboard";
import Meetings from "../Meetings";
import Settings from "../Settings";

const meeting = { id: 7, object_id: "bot_7", name: "Q3 vendor review", meeting_url: "https://meet.example/abc", state: 4, created_at: "2026-09-01T10:00:00Z" };

beforeEach(() => {
  window.localStorage.setItem("saarai_api_key", "k");
  window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
  vi.spyOn(api.meetingsApi, "list").mockResolvedValue({ count: 1, meetings: [meeting] });
  vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 1, bots: [meeting] });
});

describe("app pages under the new identity", () => {
  it("Meetings renders status as a thread, not a pill", async () => {
    renderWithProviders(<Meetings />, { route: "/meetings" });
    await waitFor(() => expect(screen.getByText("Q3 vendor review")).toBeInTheDocument());
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
    expect(document.querySelector(".animate-ping")).toBeNull();
  });

  it("Meetings reads the initial search from the URL", async () => {
    renderWithProviders(<Meetings />, { route: "/meetings?q=vendor" });
    await waitFor(() => expect(screen.getByDisplayValue("vendor")).toBeInTheDocument());
  });

  it("Dashboard renders live bots on a thread", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    await waitFor(() => expect(screen.getAllByRole("img", { name: "Status: Recording" }).length).toBeGreaterThan(0));
  });

  it("Settings exposes the theme toggle", () => {
    renderWithProviders(<Settings />, { route: "/settings" });
    expect(screen.getByRole("button", { name: /Switch to (dark|light) theme/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/pages/__tests__/app-pages.test.tsx`
Expected: FAIL (no thread role, no theme toggle).

- [ ] **Step 3: Apply rules 1 to 9 to each page**

Work file by file in this order: `Meetings.tsx`, `Dashboard.tsx`, `MeetingDetail.tsx`, `Transcript.tsx`, `Chat.tsx`, `Settings.tsx`. After each file run `npm run typecheck`. Then delete the unreachable files (rule 9).

- [ ] **Step 4: Verify nothing old remains**

Run from `frontend/`:
```bash
grep -rn "framer-motion" src ; grep -rn "primary-\|#635bff\|#0a2540\|#e3e8ee\|#f6f9fc\|#697386\|#425466\|slate-\|sky-600\|stripe-shadow\|animate-ping\|uppercase" src
```
Expected: no output. If a hex is still present because it is not in the table, map it to the nearest token by role (background, border, text) and continue.

- [ ] **Step 5: Run tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src
git commit -m "refactor(frontend): move app pages onto identity tokens and thread status; drop unreachable pages"
```

---

### Task 11: Verification in the browser and contrast check

**Files:**
- Create: `frontend/src/__tests__/contrast.test.ts`
- No production code changes expected. Fix anything the checks reveal in place and note it in the commit.

- [ ] **Step 1: Write the contrast test**

Create `frontend/src/__tests__/contrast.test.ts`:
```ts
import { describe, expect, it } from "vitest";

// Values copied from index.css. If a token changes there, update it here.
const themes = {
  light: { ground: "#EEF2FA", surface: "#FFFFFF", raised: "#F6F8FD", ink: "#161C3F", ink2: "#161C3F", ink2Alpha: 0.65, gold: "#A16207", cyan: "#0284C7", violet: "#6D28D9" },
  dark: { ground: "#0B0F2A", surface: "#12173A", raised: "#1A2050", ink: "#E9ECFA", ink2: "#E9ECFA", ink2Alpha: 0.65, gold: "#F2C14E", cyan: "#38BDF8", violet: "#8B5CF6" },
};

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function blend(fg: string, bg: string, alpha: number): [number, number, number] {
  const f = hex(fg); const b = hex(bg);
  return [0, 1, 2].map((i) => Math.round(f[i] * alpha + b[i] * (1 - alpha))) as [number, number, number];
}
function lum([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe.each(Object.entries(themes))("%s theme contrast", (_name, t) => {
  it("ink on ground, surface, and raised meets 4.5:1", () => {
    for (const bg of [t.ground, t.surface, t.raised]) {
      expect(ratio(hex(t.ink), hex(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("secondary ink on surface meets 4.5:1", () => {
    expect(ratio(blend(t.ink2, t.surface, t.ink2Alpha), hex(t.surface))).toBeGreaterThanOrEqual(4.5);
  });
  it("gold, cyan, and violet text on surface meet 3:1 for 13px medium and larger", () => {
    for (const fg of [t.gold, t.cyan, t.violet]) {
      expect(ratio(hex(fg), hex(t.surface))).toBeGreaterThanOrEqual(3);
    }
  });
});
```

- [ ] **Step 2: Run the contrast test**

Run: `npm test -- src/__tests__/contrast.test.ts`
Expected: PASS. If a pair fails, darken (light theme) or lighten (dark theme) that token in `index.css` by the smallest step that passes, update the spec's token table and this test, and note it in the commit message.

- [ ] **Step 3: Run the full suite, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 4: Visual review in the browser**

Start the backend if available, then from `frontend/` run `npm run dev`. Check each item in both themes (toggle from the rail) at 1280px and 375px widths:

- `/overview`: headline wraps cleanly, the Devanagari word shows the gradient, the demo thread draws in once, the three steps sit under the gradient line. Dot grid visible on the ground only.
- `/login` and `/signup`: brand panel hidden under 900px, form full width on mobile, error copy appears with a wrong password.
- `/dashboard`, `/meetings`, `/meetings/:id`: rail on desktop, bottom tab bar on mobile, active icon shows the gradient bar, breadcrumb reads correctly, search in the top bar navigates to Meetings with the term filled in, status renders as an inline thread with its label, corner mesh sits behind content.
- `/settings`: theme toggle switches both the app and persists after reload.
- Keyboard: tab through the rail and a form. Focus rings are visible in both themes.
- System setting "reduce motion" on: no thread draw-in, loading marker is static.

Record what you saw in the commit message for Step 5. Fix anything broken in place.

- [ ] **Step 5: Commit**

```bash
git add -A frontend
git commit -m "test(frontend): add contrast checks and complete identity foundation verification"
```

---

## Self-review notes

- Spec coverage: tokens (T2), theme (T3), rail/top bar/canvas/mesh/navbar (T7, T8), UI kit (T4, T5, T6), Home/Login/Signup/NotFound (T8, T9), app-page coherence and deletions (T10), env API base and CSS cleanup (T1, T2), accessibility and testing (every task, T11). The spec's "large Thread in the top bar for the current meeting" is wired as an empty slot in T7; filling it is the meeting workspace spec's job, as the spec states.
- The spec lists hex tokens; the implementation stores channel triplets so Tailwind's alpha modifier works. The hex values are preserved as comments in `index.css`.
- `Login.tsx` exports `BrandPanel`, `isNetworkError`, `NETWORK_ERROR` for `Signup.tsx`. Keep those exports; do not duplicate the panel.
