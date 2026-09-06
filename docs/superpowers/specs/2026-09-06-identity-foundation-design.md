# SaarAI identity foundation

Date: 2026-09-06
Status: approved in brainstorming, awaiting spec review
Scope: sub-project 1 of 3 in the SaarAI frontend redesign

## Context

SaarAI turns meeting recordings into minutes, insights, and strategy for teams that speak Hindi and English. The current frontend (`frontend/`, React 18, Vite, Tailwind 3, framer-motion) mixes two palettes (a blue Tailwind `primary` scale and hardcoded Stripe-style violet tokens), uses Inter everywhere, and has an empty top bar. The public Home page is a single glass card.

The whole app is being redesigned in three sub-projects:

1. Identity foundation (this spec): tokens, type, theme toggle, app shell, UI kit, public pages.
2. Meeting workspace: Dashboard, Meetings, Meeting detail, Transcript.
3. Chat and Settings: depends on backend decisions for chat and settings persistence.

Decisions made during brainstorming:

- The logo is fixed. The palette derives from its cyan, violet, and gold gradient.
- Devanagari is present but quiet: hero headline, empty states, 404. All labels and controls are English.
- Light and dark themes, both first-class, with a user toggle.
- Direction B "Signal mesh": the logo's network taken literally.
- Shell: 56px icon rail with a wide canvas.
- Status is shown as a position on a gradient thread, never as a pill.

## Design principles

- **Thread over badge.** Every state a meeting can be in is a position on its thread: bot joined, recording, transcribing, essence ready. No pills, no status dots.
- **Gradient is scarce.** The cyan to violet to gold gradient appears only in the thread and the logo mark. Never as a card wash, button background, or text effect outside the hero headline's Devanagari word.
- **Dot grid on the ground only.** The grid never appears on a surface.
- **Radius encodes hierarchy.** 12px for panels and cards, 6px for controls, round for thread markers and avatars.
- **One motion moment per page.** The thread draws in once on load. No per-element fade-ups.
- **Copy states the action.** Buttons name what happens. Errors say what went wrong and what to do. Sentence case everywhere. No uppercase labels, no middle-dot meta strings, no arrows in button text.

## Tokens

### Color

CSS custom properties on `:root`, switched by `[data-theme="dark"]` and `[data-theme="light"]`.

| Token | Dark | Light | Meaning |
|---|---|---|---|
| `--ground` | `#0B0F2A` | `#EEF2FA` | page background, carries the dot grid |
| `--surface` | `#12173A` | `#FFFFFF` | panels and cards |
| `--raised` | `#1A2050` | `#F6F8FD` | inputs, hover, table header |
| `--ink` | `#E9ECFA` | `#161C3F` | primary text |
| `--ink-2` | `rgba(233,236,250,.65)` | `rgba(22,28,63,.65)` | secondary text |
| `--cyan` | `#38BDF8` | `#0284C7` | speech, transcript, completed steps |
| `--violet` | `#8B5CF6` | `#6D28D9` | the AI working, active nav, focus ring |
| `--gold` | `#F2C14E` | `#A16207` | live now, essence, warnings |
| `--danger` | `#F0566B` | `#C81E3C` | errors only |
| `--line` | `rgba(139,92,246,.28)` | `rgba(109,40,217,.22)` | hairlines and borders |
| `--grid` | `rgba(120,140,255,.22)` | `rgba(40,60,160,.16)` | dot grid |
| `--thread` | `linear-gradient(90deg, var(--cyan), var(--violet), var(--gold))` | same | the thread and the logo mark |

Tailwind's config maps these to color names (`bg-ground`, `text-ink`, `border-line`, and so on) using the `<alpha-value>` form where opacity is needed. The old `primary` scale and all Stripe variables are deleted. Any class in the codebase that referenced them is updated in the same change.

Contrast requirement: `--ink` on `--ground`, `--surface`, and `--raised`, and `--ink-2` on `--surface`, must each meet WCAG AA (4.5:1) in both themes. Gold and cyan are used for text only at 13px or larger with weight 500 or more, and the light-mode values were darkened for that reason.

### Type

One family: Anek Devanagari, loaded from Google Fonts as a variable font with the weight axis (100 to 800) and width axis (75 to 125). Fallback stack: `"Anek Devanagari", "Noto Sans Devanagari", system-ui, sans-serif`. The font link moves from `index.css` into `index.html` so it loads before the stylesheet.

| Role | Size | Line height | Weight | Width | Class |
|---|---|---|---|---|---|
| display | 48px | 1.0 | 700 | 125% | `text-display` |
| h1 | 28px | 1.15 | 600 | 110% | `text-h1` |
| h2 | 22px | 1.2 | 600 | 110% | `text-h2` |
| h3 | 18px | 1.3 | 600 | 110% | `text-h3` |
| body | 15px | 1.5 | 400 | 100% | `text-body` |
| small | 13px | 1.4 | 500 | 100% | `text-small` |

Width is applied with `font-stretch`. Body measure is capped at 70 characters with `max-w-prose` overridden to `70ch`. Display drops to 36px under 640px.

### Spacing and radius

Tailwind's default spacing scale. Radius tokens: `rounded-panel` 12px, `rounded-control` 6px, `rounded-full` for markers. No shadows anywhere; depth comes from surface levels and hairlines.

## Theme

`ThemeContext` in `src/context/ThemeContext.tsx`:

- State: `"light" | "dark"`, exposed with `setTheme` and `toggleTheme`.
- Persisted in `localStorage` under `saarai_theme`. If absent, the initial value is the system preference via `prefers-color-scheme`.
- Applies `data-theme` to `document.documentElement` on change.
- An inline script in `index.html` reads the same key and sets `data-theme` before React mounts, so there is no flash of the wrong theme.
- `color-scheme` is set to match so native controls and scrollbars follow.

The toggle appears at the bottom of the rail and in Settings. Both call `toggleTheme`.

## App shell

`src/layouts/AppShell.tsx` keeps its auth branch: authenticated users get the rail layout, public visitors get the public navbar layout. The per-route framer-motion wrapper is removed. `LoadingSpinner` during auth resolution is replaced by the loading thread.

### Rail (`src/components/layout/Rail.tsx`, replaces `Sidebar.tsx`)

- 56px wide, full height, `--surface` background, `--line` hairline on the right.
- Top: the inline SVG logo mark (see BrandLogo).
- Nav: four icon buttons for Dashboard, Meetings, Chat, Settings. Each has an `aria-label` and a tooltip on hover and focus. The active item's icon is filled with `--thread`; inactive icons use `--ink-2`.
- Bottom: theme toggle button, then the user avatar (email initial on `--violet`). Clicking the avatar opens a small menu with the email and "Sign out".
- Under 768px, the rail becomes a bottom tab bar with the same four items. The avatar and theme toggle move into the top bar's right side on mobile. The current overlay drawer is removed.

### Top bar (`src/components/layout/TopBar.tsx`)

- 52px, sticky, `--ground` at 70% with `backdrop-filter: blur(6px)`, `--line` hairline below.
- Left: breadcrumb for the current route. Meetings list shows "Meetings". Meeting detail shows "Meetings / {name}".
- Center: when the route is inside a meeting, the large Thread for that meeting. This phase only wires the slot; the meeting workspace spec fills it.
- Right: search input (placeholder "Search meetings", navigates to Meetings with the query), live-bot count rendered as a small gold marker with "N live" text, hidden when zero.

### Canvas

- Fills the remaining space, `max-w-[1280px]`, `px-8 py-8`, `--ground` with the dot grid.
- The corner mesh is a single inline SVG rendered once in AppShell, `position: fixed`, bottom right, 320px, `pointer-events: none`, opacity 0.45 in dark and 0.22 in light, `aria-hidden`. It does not re-render on route change.

### Public navbar (`src/components/layout/Navbar.tsx`)

- 56px, logo mark plus "SaarAI" wordmark in `text-h3` at 115% width, links "Overview" and "Sign in", and a small primary button "Create account". When authenticated: "Dashboard" and "Sign out".

## UI kit (`src/components/ui/`)

Existing files keep their names and current props so pages compile while they are restyled. New files are marked.

- **Thread** (new, `Thread.tsx`). Props: `state: "joined" | "recording" | "transcribing" | "ready"`, `size: "inline" | "card" | "large"`, optional `label` for the accessible name. Renders the gradient line with four marker positions. Markers before the current state are filled cyan, the current one is gold with a glow, later ones are hollow violet. `large` adds step labels beneath. `inline` is a 64px line for table cells. Respects `prefers-reduced-motion`: the draw-in animation is skipped.
- **LoadingThread** (new, `LoadingThread.tsx`). A 48px thread segment whose marker sweeps back and forth. Replaces `LoadingSpinner`; the old file is deleted and its imports updated.
- **EmptyState** (new, `EmptyState.tsx`). Props: `devanagari`, `title`, `body`, optional `action` node. Devanagari word in `text-display` at 100% width using `--thread` as text fill, English title in `text-h2`, one body line, one action.
- **Button**. Variants `primary` (solid `--violet`, white text), `secondary` (`--line` border at full violet, `--ink` text), `ghost` (text only), `danger` (solid `--danger`). Gold is never a button color. `fullWidth` stays. Focus: 3px `--violet` ring at 25% alpha plus a 1px solid ring.
- **Card**. `--surface`, `--line` hairline, `rounded-panel`, no shadow. Slots: `title`, `subtitle`, `footer`, `noPadding`. The hover shadow is removed.
- **FormField**. Label in `text-small` `--ink-2`, input on `--raised` with `--line` border, `rounded-control`, focus ring as Button. Hint and error text below; error uses `--danger`.
- **Skeleton**. `--raised` block with a slow opacity pulse, `rounded-control`.
- **PageHeader**. Title in `text-h1`, subtitle in `text-body` `--ink-2`, action slot right-aligned.
- **BrandLogo**. Two modes. `wordmark` renders the existing PNG at a given height for public pages. `mark` renders an inline SVG: a rounded square filled with `--thread`, used in the rail and navbar. The `scale-[2.9] object-cover` crop is removed.
- **ErrorNotice** (new, `ErrorNotice.tsx`). A sentence in `text-body` with a 3px `--danger` left border on `--raised`, optional retry action. Used for API errors on every page.

## Public pages

### Home (`src/pages/Home.tsx`)

- Hero: two columns on desktop, stacked under 900px.
  - Left: headline "Every meeting, reduced to its सार" in `text-display`, with the Devanagari word at 100% width and `--thread` as text fill. One paragraph in 17px weight 300 explaining that the bot joins Google Meet, Zoom, or Teams, transcribes Hindi and English together, and returns decisions, owners, and next steps. Buttons: primary "Create account", secondary "Sign in", small note "Free while in preview".
  - Right: a static demo Card showing a meeting named "Q3 vendor review" with a `large` Thread at "ready", a two-column body of transcript (speaker names in `--cyan`) and essence (gold-dot list with decision, action, blocker). Content is hardcoded sample text in Hindi and English.
- How it works: a full-width `--thread` line, then three columns with `text-h3` heading and one sentence each: "Send the bot", "Read both languages", "Get the essence". No stats row, no feature grid, no numbered markers.
- Motion: the demo Thread draws in once on mount. Nothing else animates.

### Login (`src/pages/Login.tsx`)

- Two columns: brand panel left (hidden under 900px), form right at 420px on `--surface` with a `--line` left border.
- Brand panel: logo mark top left, mesh SVG bottom right at theme opacity, "Welcome back." in `text-display` at 34px, one line "Your meetings, transcripts, and essence are where you left them."
- Form: "Sign in" in `text-h2`, fields "Work email" and "Password", primary button "Sign in" that reads "Signing in" while pending, footer "New to SaarAI? Create an account".
- Error copy: wrong credentials show "That password doesn't match this email. Try again." Network failure shows "Couldn't reach SaarAI. Check your connection and try again." with a retry.
- Removed: social buttons, "Forgot password" link.
- Behavior unchanged: redirect to `location.state.from` or `/dashboard`.

### Signup (`src/pages/Signup.tsx`)

- Mirrors Login. Brand panel copy: "Start with one meeting." and "Send a bot to your next call and read the essence when it ends."
- Form: "Create account", fields "Full name", "Work email", "Password" with hint "At least 8 characters", primary button "Create account", footer "Already have an account? Sign in".
- Full name is captured in the form; if the backend registration call does not accept it, it is dropped client-side and noted in the plan. Validation stays client-side as today.

### Not found (`src/pages/NotFound.tsx`)

- EmptyState with Devanagari "खाली", title "There's nothing here", body "The page you're looking for doesn't exist or moved.", action "Go to Dashboard".

## App pages during this phase

Dashboard, Meetings, Meeting detail, Transcript, Chat, and Settings are not redesigned here. Each gets only the changes needed to compile and look coherent under the new shell:

- Old color classes and hex values mapped to the new tokens.
- Status pills replaced by `Thread size="inline"` using a shared `botStateToThreadState` helper in `src/lib/status.ts` that maps the backend bot state codes to the four thread states. State 9 (ended, outputs available) maps to `ready`. Unknown or failed states map to `joined` with the label "Unavailable" and are addressed in the workspace spec.
- `LoadingSpinner` imports replaced by `LoadingThread`, inline error strings replaced by `ErrorNotice`.
- framer-motion wrappers removed. The dependency stays installed until the workspace spec decides its fate.
- Settings gains the theme toggle in its Profile tab.

Deleted as unreachable: `src/pages/generate/*`, `src/pages/ApiRoutes.tsx`, `src/constants/backendRoutes.ts` if nothing else imports it.

## Configuration cleanup in scope

- `API_BASE` in `src/api.ts` reads `import.meta.env.VITE_API_BASE` with the current `http://localhost:8001` as the fallback. A `.env.example` documents it.
- `index.css` keeps only the Tailwind directives, token definitions, base body styles, the dot grid utility, and the scrollbar styling recolored to the tokens. The `stripe-shadow` utilities are deleted.

## Accessibility

- Every interactive element shows the violet focus ring on keyboard focus.
- Rail icons and the theme toggle have `aria-label`s. The Thread has `role="img"` with an accessible name like "Status: transcribing".
- Contrast pairs listed under Tokens are verified in both themes before the phase is called done.
- `prefers-reduced-motion` disables the thread draw-in and the loading sweep becomes a static marker.
- Touch targets in the bottom tab bar are at least 44px.

## Testing

Vitest and React Testing Library are added to the frontend with a `test` script.

- `Thread`: renders four markers, fills the right ones for each state, exposes the accessible name.
- `ThemeContext`: defaults to system preference when storage is empty, persists changes, sets `data-theme`.
- `EmptyState` and `ErrorNotice`: render props and action.
- `botStateToThreadState`: maps known codes and falls back for unknown ones.
- Smoke render of Home, Login, Signup, and NotFound inside a router in both themes with no console errors.

`npm run typecheck` and `npm run build` pass at every step. Visual review is done by running the app and checking each public page and the shell in both themes at 1280px and 375px widths.

## Out of scope

- Redesign of Dashboard, Meetings, Meeting detail, Transcript (sub-project 2).
- Chat backend and Settings persistence (sub-project 3).
- Any backend or API change.
- Password reset and social sign-in.
