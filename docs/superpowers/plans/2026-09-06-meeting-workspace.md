# SaarAI Meeting Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the four meeting pages into a workspace where a finished meeting reads as a cited essence document with the transcript in a drawer, live meetings show a growing transcript, and the Dashboard becomes today's desk.

**Architecture:** The backend generators switch to LangChain structured output returning Pydantic `Minutes`, `Insights`, `Strategy` with utterance-index citations; outputs are stored as JSON with a `format` column, with an in-process per-bot lock and a status endpoint. The frontend gets a `useMeeting` hook that owns polling and generation, a set of essence components under `src/components/meeting/`, a transcript drawer keyed by URL, a `MeetingContext` feeding the top bar, and rewritten Dashboard and Meetings pages.

**Tech Stack:** Backend: FastAPI, SQLAlchemy Core (raw SQL), Pydantic v2, LangChain (`with_structured_output`), pytest + FastAPI `TestClient`. Frontend: React 18, TypeScript, Vite, Tailwind 3, react-router-dom 6.30, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-meeting-workspace-design.md`

## Global Constraints

- Backend commands run from `saar_ai/` with the repo's virtualenv: `../.venv/bin/python -m pytest` and `../.venv/bin/pip`. Frontend commands run from `frontend/`: `npm test`, `npm run typecheck` (`tsc -b`), `npm run build`. All must pass at the end of every task.
- Backend tests never touch Postgres: `SAARAI_SKIP_DB_INIT=1` skips table creation on import, `verify_api_key` is overridden to return project 1, and fetcher/store functions are monkeypatched.
- Utterance indices are positions in the transcript ordered by `timestamp_ms`; the backend numbers prompt lines `[i] Speaker: text` and the frontend derives `index` from array position. Nothing stores indices.
- Schema field names are exactly those in the spec: `Cited{text, refs}`, `Action{text, owner, due, refs}`, `Participation{name, share, note, refs}`, `Priority{action, owner, why, refs}`, `Risk{risk, likelihood, impact, mitigation, refs}`, `Sentiment{overall, note}`, `Minutes{summary, discussion, decisions, actions, notes}`, `Insights{participation, themes, patterns, concerns, sentiment, takeaways}`, `Strategy{priorities, followups, resources, risks, opportunities, agenda}`.
- Output types are the strings `mom`, `insights`, `strategy` everywhere (DB `output_type`, API keys, frontend `SectionKey`).
- Generator errors raise; they are never stored as text. A generate call while the bot's lock is held returns 409 `{"detail": "Generation already running"}`.
- Polling intervals: live detail and transcript 5000 ms; processing detail 5000 ms; generation status 3000 ms; Dashboard bots 10000 ms. All polling pauses when `document.visibilityState !== "visible"` and stops on unmount.
- Identity constraints from sub-project 1 still bind: tokens only (`ground`, `surface`, `raised`, `ink`, `ink-2`, `cyan`, `violet`, `gold`, `danger`, `line`), `rounded-panel`/`rounded-control`, type utilities `text-h1`..`text-small`, no framer-motion, no pills or status dots, no shadows except the Thread marker glow, sentence case, focus ring `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-{ground|surface}` matching the element's background, Devanagari only in EmptyState words.
- Copy is verbatim from this plan. Timestamps render as `m:ss` from `timestamp_ms`.
- Commit after every task with the message given. Never commit `node_modules`, `dist`, `.venv`, or `__pycache__`.

---

## File structure

Backend (all under `saar_ai/`):
- Create `app/schemas/__init__.py`, `app/schemas/essence.py` — Pydantic models and `clamp_refs`.
- Create `app/services/transcript_text.py` — `numbered_transcript(rows)`.
- Create `app/services/outputs_store.py` — `save_output`, `get_outputs`, `get_done_types`, `get_recent_with_teasers`.
- Create `app/services/generation_lock.py` — `acquire`, `release`, `is_running`.
- Modify `app/services/llm_config.py` (unchanged API), `mom_generator.py`, `insight_generator.py`, `strategy_generator.py` — structured output.
- Modify `app/routers/generate.py` — per-type, `all`, `status`.
- Modify `app/routers/meetings.py` — outputs with format, `recent`.
- Modify `app/db/init_saarai_tables.py` — `format` column.
- Modify `app/main.py` — skip init flag.
- Create `tests/conftest.py`, `tests/test_schemas.py`, `tests/test_transcript_text.py`, `tests/test_generators.py`, `tests/test_generate_router.py`, `tests/test_meetings_router.py`.
- Modify `requirements.txt` — `pytest`.

Frontend (all under `frontend/src/`):
- Modify `api.ts` — essence types, `generateApi`, `meetingsApi.recent`.
- Modify `lib/status.ts`, `components/ui/Thread.tsx` — full state map, `failed`.
- Create `components/ui/LinkButton.tsx`.
- Create `components/meeting/StatusThread.tsx`, `Citation.tsx`, `OwnerChip.tsx`, `ParticipantChips.tsx`, `SectionNav.tsx`, `MinutesSection.tsx`, `InsightsSection.tsx`, `StrategySection.tsx`, `LegacyMarkdown.tsx`, `TranscriptList.tsx`, `TranscriptDrawer.tsx`.
- Create `hooks/useMeeting.ts`, `hooks/usePolling.ts`.
- Create `context/MeetingContext.tsx`.
- Create `lib/time.ts` — `formatTimestamp(ms)`, `formatDuration(ms)`, `formatDate(iso)`.
- Modify `components/layout/TopBar.tsx`, `lib/breadcrumb.ts`, `layouts/AppShell.tsx`, `components/layout/CornerMesh.tsx`.
- Modify `pages/MeetingDetail.tsx` (rewrite), `pages/Dashboard.tsx` (rewrite), `pages/Meetings.tsx`, `pages/Home.tsx` (use LinkButton), `router/AppRouter.tsx`.
- Delete `pages/Transcript.tsx`.
- Tests beside each unit under `__tests__/`.

---

### Task 1: Backend test harness and essence schemas

**Files:**
- Create: `saar_ai/app/schemas/__init__.py` (empty), `saar_ai/app/schemas/essence.py`, `saar_ai/tests/__init__.py` (empty), `saar_ai/tests/conftest.py`, `saar_ai/tests/test_schemas.py`
- Modify: `saar_ai/requirements.txt`, `saar_ai/app/main.py`

**Interfaces:**
- Produces: models `Cited`, `Action`, `Participation`, `Priority`, `Risk`, `Sentiment`, `Minutes`, `Insights`, `Strategy`, and `clamp_refs(model: T, count: int) -> T` which returns a copy with every `refs` list filtered to `0 <= r < count`. `SAARAI_SKIP_DB_INIT=1` makes `app.main` importable without a database. `tests/conftest.py` provides a `client` fixture (FastAPI `TestClient` with `verify_api_key` overridden to return `1`).

- [ ] **Step 1: Install pytest**

Append to `saar_ai/requirements.txt`:
```
pytest
```
Run from `saar_ai/`: `../.venv/bin/pip install pytest`

- [ ] **Step 2: Make the app importable without a database**

In `saar_ai/app/main.py`, replace
```python
# Create SaarAI tables on startup
init_saarai_tables()
```
with
```python
import os

# Create SaarAI tables on startup. Tests set SAARAI_SKIP_DB_INIT=1.
if os.getenv("SAARAI_SKIP_DB_INIT") != "1":
    init_saarai_tables()
```
(Move the `import os` to the top of the file with the other imports.)

- [ ] **Step 3: Write the failing schema tests**

Create `saar_ai/tests/conftest.py`:
```python
import os

os.environ["SAARAI_SKIP_DB_INIT"] = "1"

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import verify_api_key
from app.main import app


@pytest.fixture
def client():
    app.dependency_overrides[verify_api_key] = lambda: 1
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

Create `saar_ai/tests/test_schemas.py`:
```python
from app.schemas.essence import Action, Cited, Minutes, Insights, Participation, Sentiment, Strategy, Risk, Priority, clamp_refs


def test_minutes_round_trips_json():
    m = Minutes(
        summary="Vendor change agreed.",
        discussion=[Cited(text="Delivery slipped three times", refs=[0])],
        decisions=[Cited(text="Change vendor for Q3", refs=[1])],
        actions=[Action(text="Send RFP", owner="Meena", due="Friday", refs=[2])],
        notes=[],
    )
    again = Minutes.model_validate_json(m.model_dump_json())
    assert again == m


def test_refs_default_to_empty():
    assert Cited(text="x").refs == []
    assert Action(text="x", owner=None, due=None).refs == []


def test_clamp_refs_drops_out_of_range_everywhere():
    m = Minutes(
        summary="s",
        discussion=[Cited(text="a", refs=[0, 5, -1])],
        decisions=[Cited(text="b", refs=[2])],
        actions=[Action(text="c", owner=None, due=None, refs=[3, 99])],
        notes=[],
    )
    clamped = clamp_refs(m, count=4)
    assert clamped.discussion[0].refs == [0]
    assert clamped.decisions[0].refs == [2]
    assert clamped.actions[0].refs == [3]
    assert m.discussion[0].refs == [0, 5, -1]  # original untouched


def test_clamp_refs_handles_nested_models_in_insights_and_strategy():
    i = Insights(
        participation=[Participation(name="Ravi", share=0.5, note="led", refs=[7])],
        themes=[], patterns=[], concerns=[],
        sentiment=Sentiment(overall="neutral", note="calm"),
        takeaways=[Cited(text="t", refs=[1])],
    )
    s = Strategy(
        priorities=[Priority(action="a", owner=None, why="w", refs=[9])],
        followups=[], resources=[],
        risks=[Risk(risk="r", likelihood="low", impact="high", mitigation="m", refs=[0, 4])],
        opportunities=[], agenda=[],
    )
    assert clamp_refs(i, 2).participation[0].refs == []
    assert clamp_refs(i, 2).takeaways[0].refs == [1]
    assert clamp_refs(s, 4).priorities[0].refs == []
    assert clamp_refs(s, 4).risks[0].refs == [0]


def test_share_and_levels_are_validated():
    import pytest
    with pytest.raises(ValueError):
        Participation(name="x", share=1.5, note="", refs=[])
    with pytest.raises(ValueError):
        Risk(risk="r", likelihood="huge", impact="low", mitigation="m", refs=[])
```

- [ ] **Step 4: Run the tests to verify they fail**

Run from `saar_ai/`: `../.venv/bin/python -m pytest tests/test_schemas.py -q`
Expected: FAIL, `ModuleNotFoundError: app.schemas`.

- [ ] **Step 5: Implement the schemas**

Create `saar_ai/app/schemas/essence.py`:
```python
"""Structured essence returned by the generators and the API.

Every list item carries `refs`, the indices of the transcript utterances that
support it. Indices are positions in the transcript ordered by timestamp_ms.
"""
from typing import Any, Literal, TypeVar

from pydantic import BaseModel, Field

Level = Literal["low", "medium", "high"]


class Cited(BaseModel):
    text: str
    refs: list[int] = Field(default_factory=list)


class Action(BaseModel):
    text: str
    owner: str | None = None
    due: str | None = None
    refs: list[int] = Field(default_factory=list)


class Participation(BaseModel):
    name: str
    share: float = Field(ge=0, le=1)
    note: str
    refs: list[int] = Field(default_factory=list)


class Priority(BaseModel):
    action: str
    owner: str | None = None
    why: str
    refs: list[int] = Field(default_factory=list)


class Risk(BaseModel):
    risk: str
    likelihood: Level
    impact: Level
    mitigation: str
    refs: list[int] = Field(default_factory=list)


class Sentiment(BaseModel):
    overall: Literal["positive", "neutral", "tense"]
    note: str


class Minutes(BaseModel):
    summary: str
    discussion: list[Cited] = Field(default_factory=list)
    decisions: list[Cited] = Field(default_factory=list)
    actions: list[Action] = Field(default_factory=list)
    notes: list[Cited] = Field(default_factory=list)


class Insights(BaseModel):
    participation: list[Participation] = Field(default_factory=list)
    themes: list[Cited] = Field(default_factory=list)
    patterns: list[Cited] = Field(default_factory=list)
    concerns: list[Cited] = Field(default_factory=list)
    sentiment: Sentiment
    takeaways: list[Cited] = Field(default_factory=list)


class Strategy(BaseModel):
    priorities: list[Priority] = Field(default_factory=list)
    followups: list[Cited] = Field(default_factory=list)
    resources: list[Cited] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    opportunities: list[Cited] = Field(default_factory=list)
    agenda: list[Cited] = Field(default_factory=list)


M = TypeVar("M", bound=BaseModel)


def _clamp(value: Any, count: int) -> Any:
    if isinstance(value, dict):
        out = {}
        for key, inner in value.items():
            if key == "refs" and isinstance(inner, list):
                out[key] = [r for r in inner if isinstance(r, int) and 0 <= r < count]
            else:
                out[key] = _clamp(inner, count)
        return out
    if isinstance(value, list):
        return [_clamp(item, count) for item in value]
    return value


def clamp_refs(model: M, count: int) -> M:
    """Return a copy of `model` with every `refs` list limited to valid utterance indices."""
    data = _clamp(model.model_dump(), count)
    return type(model).model_validate(data)
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `../.venv/bin/python -m pytest tests -q`
Expected: 5 passed.

- [ ] **Step 7: Commit**

```bash
git add saar_ai/requirements.txt saar_ai/app/main.py saar_ai/app/schemas saar_ai/tests/__init__.py saar_ai/tests/conftest.py saar_ai/tests/test_schemas.py
git commit -m "feat(api): add essence schemas, ref clamping, and a pytest harness"
```

---

### Task 2: Numbered transcript and structured generators

**Files:**
- Create: `saar_ai/app/services/transcript_text.py`, `saar_ai/tests/test_transcript_text.py`, `saar_ai/tests/test_generators.py`
- Modify: `saar_ai/app/services/mom_generator.py`, `saar_ai/app/services/insight_generator.py`, `saar_ai/app/services/strategy_generator.py`

**Interfaces:**
- Consumes: schemas and `clamp_refs` from Task 1; `get_llm(temperature)` from `llm_config.py`.
- Produces: `numbered_transcript(rows: list[Mapping]) -> str`; `generate_mom(utterances, participants, llm=None) -> Minutes`; `generate_insight(utterances, participants, llm=None) -> Insights`; `generate_strategy(utterances, participants, llm=None) -> Strategy`. `utterances` is the list of row mappings from `get_transcript` (`speaker`, `timestamp_ms`, `duration_ms`, `text`). `llm` is an optional object with `with_structured_output(Model)` returning an object with `invoke(messages)`; tests pass a fake, production uses `get_llm`.

- [ ] **Step 1: Write the failing tests**

Create `saar_ai/tests/test_transcript_text.py`:
```python
from app.services.transcript_text import numbered_transcript


def test_numbers_lines_from_zero_in_given_order():
    rows = [
        {"speaker": "Ravi", "text": "Hello", "timestamp_ms": 0, "duration_ms": 10},
        {"speaker": "Meena", "text": "ठीक है", "timestamp_ms": 500, "duration_ms": 10},
    ]
    assert numbered_transcript(rows) == "[0] Ravi: Hello\n[1] Meena: ठीक है"


def test_empty_transcript_is_empty_string():
    assert numbered_transcript([]) == ""
```

Create `saar_ai/tests/test_generators.py`:
```python
from app.schemas.essence import Cited, Insights, Minutes, Sentiment, Strategy
from app.services.insight_generator import generate_insight
from app.services.mom_generator import generate_mom
from app.services.strategy_generator import generate_strategy


class FakeStructured:
    def __init__(self, result):
        self.result = result
        self.messages = None

    def invoke(self, messages):
        self.messages = messages
        return self.result


class FakeLLM:
    def __init__(self, result):
        self.structured = FakeStructured(result)
        self.model = None

    def with_structured_output(self, model):
        self.model = model
        return self.structured


ROWS = [
    {"speaker": "Ravi", "text": "We change vendor", "timestamp_ms": 0, "duration_ms": 1},
    {"speaker": "Meena", "text": "I will send the RFP", "timestamp_ms": 1000, "duration_ms": 1},
]
PEOPLE = [{"full_name": "Ravi", "is_host": True}, {"full_name": "Meena", "is_host": False}]


def test_mom_uses_structured_output_and_clamps_refs():
    fake = FakeLLM(Minutes(summary="s", decisions=[Cited(text="Change vendor", refs=[0, 9])]))
    result = generate_mom(ROWS, PEOPLE, llm=fake)
    assert fake.model is Minutes
    assert result.decisions[0].refs == [0]
    prompt_text = "".join(m.content for m in fake.structured.messages)
    assert "[0] Ravi: We change vendor" in prompt_text
    assert "Ravi (Host)" in prompt_text


def test_insight_and_strategy_return_models():
    ins = FakeLLM(Insights(sentiment=Sentiment(overall="neutral", note="n"), takeaways=[Cited(text="t", refs=[1])]))
    assert generate_insight(ROWS, PEOPLE, llm=ins).takeaways[0].refs == [1]
    stra = FakeLLM(Strategy(followups=[Cited(text="f", refs=[5])]))
    assert generate_strategy(ROWS, PEOPLE, llm=stra).followups[0].refs == []


def test_generator_errors_propagate():
    class Boom(FakeStructured):
        def invoke(self, messages):
            raise RuntimeError("provider down")

    fake = FakeLLM(None)
    fake.structured = Boom(None)
    import pytest
    with pytest.raises(RuntimeError):
        generate_mom(ROWS, PEOPLE, llm=fake)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `../.venv/bin/python -m pytest tests/test_transcript_text.py tests/test_generators.py -q`
Expected: FAIL (`transcript_text` missing; generators have the old signature).

- [ ] **Step 3: Implement transcript_text.py**

```python
from collections.abc import Mapping


def numbered_transcript(rows: list[Mapping]) -> str:
    """One line per utterance, numbered from 0 in the given (timestamp) order."""
    return "\n".join(f"[{i}] {row['speaker']}: {row['text']}" for i, row in enumerate(rows))


def participant_line(participants: list[Mapping]) -> str:
    return ", ".join(
        f"{p['full_name']}{' (Host)' if p.get('is_host') else ''}" for p in participants
    )
```

- [ ] **Step 4: Rewrite mom_generator.py**

```python
from langchain_core.prompts import ChatPromptTemplate

from app.schemas.essence import Minutes, clamp_refs
from .llm_config import get_llm
from .transcript_text import numbered_transcript, participant_line

MOM_PROMPT = ChatPromptTemplate.from_template("""
You are an expert meeting analyst. Produce the Minutes of Meeting for the transcript below.

## Participants
{participants}

## Transcript
Each line is numbered. Use the numbers as `refs` on every item you produce: the indices of the lines that support it. Cite the most specific lines, usually one to three. Leave `refs` empty only when nothing in the transcript supports the item directly.

{transcript}

## What to produce
- summary: two to three sentences on what the meeting was about and what changed.
- discussion: the main topics discussed, one item each, who raised it if clear.
- decisions: what was agreed, one item each, who agreed it if clear.
- actions: concrete tasks with the owner's name exactly as it appears in the participant list, and the deadline if one was said. Owner and due are null when not stated.
- notes: anything else worth keeping.

Write in clear, professional English. Keep Hindi phrases only when they are names or terms that lose meaning in translation.
""")


def generate_mom(utterances: list, participants: list, llm=None) -> Minutes:
    """Generate structured Minutes with utterance citations."""
    llm = llm or get_llm(temperature=0.5)
    structured = llm.with_structured_output(Minutes)
    messages = MOM_PROMPT.format_messages(
        participants=participant_line(participants),
        transcript=numbered_transcript(utterances),
    )
    result = structured.invoke(messages)
    return clamp_refs(result, len(utterances))
```

- [ ] **Step 5: Rewrite insight_generator.py**

```python
from langchain_core.prompts import ChatPromptTemplate

from app.schemas.essence import Insights, clamp_refs
from .llm_config import get_llm
from .transcript_text import numbered_transcript, participant_line

INSIGHT_PROMPT = ChatPromptTemplate.from_template("""
You are an expert meeting analyst. Analyse the dynamics of the meeting below.

## Participants
{participants}

## Transcript
Each line is numbered. Use the numbers as `refs` on every item: the indices of the lines that support it. Leave `refs` empty only when nothing supports the item directly.

{transcript}

## What to produce
- participation: one entry per participant who spoke, with `share` as their fraction of the {utterance_count} lines (all shares sum to about 1) and a short note on their role in the conversation.
- themes: the recurring topics.
- patterns: how the conversation flowed: who drove it, interruptions, agreement or pushback.
- concerns: worries, blockers, or risks that were raised.
- sentiment: overall as positive, neutral, or tense, with a one-sentence note.
- takeaways: the three to five things a reader must know.

Write in clear, professional English.
""")


def generate_insight(utterances: list, participants: list, llm=None) -> Insights:
    """Generate structured Insights with utterance citations."""
    llm = llm or get_llm(temperature=0.6)
    structured = llm.with_structured_output(Insights)
    messages = INSIGHT_PROMPT.format_messages(
        participants=participant_line(participants),
        transcript=numbered_transcript(utterances),
        utterance_count=len(utterances),
    )
    result = structured.invoke(messages)
    return clamp_refs(result, len(utterances))
```

- [ ] **Step 6: Rewrite strategy_generator.py**

```python
from langchain_core.prompts import ChatPromptTemplate

from app.schemas.essence import Strategy, clamp_refs
from .llm_config import get_llm
from .transcript_text import numbered_transcript, participant_line

STRATEGY_PROMPT = ChatPromptTemplate.from_template("""
You are a strategy advisor. Turn the meeting below into recommendations the team can act on.

## Participants
{participants}

## Transcript
Each line is numbered. Use the numbers as `refs` on every item: the indices of the lines that support it. Leave `refs` empty only when the recommendation is your inference rather than something said.

{transcript}

## What to produce
- priorities: the three to five most important actions, each with the owner's name from the participant list (or null) and why it matters.
- followups: what should happen after this meeting.
- resources: people, budget, or tools the plan needs.
- risks: each with likelihood and impact as low, medium, or high, and a mitigation.
- opportunities: openings the discussion revealed.
- agenda: suggested items for the next meeting.

Write in clear, professional English.
""")


def generate_strategy(utterances: list, participants: list, llm=None) -> Strategy:
    """Generate structured Strategy with utterance citations."""
    llm = llm or get_llm(temperature=0.7)
    structured = llm.with_structured_output(Strategy)
    messages = STRATEGY_PROMPT.format_messages(
        participants=participant_line(participants),
        transcript=numbered_transcript(utterances),
    )
    result = structured.invoke(messages)
    return clamp_refs(result, len(utterances))
```

- [ ] **Step 7: Run the tests**

Run: `../.venv/bin/python -m pytest tests -q`
Expected: all pass. The generate router still imports the old names and the app still starts because the function names are unchanged; the router is rewritten in Task 3.

- [ ] **Step 8: Commit**

```bash
git add saar_ai/app/services/transcript_text.py saar_ai/app/services/mom_generator.py saar_ai/app/services/insight_generator.py saar_ai/app/services/strategy_generator.py saar_ai/tests/test_transcript_text.py saar_ai/tests/test_generators.py
git commit -m "feat(api): generators return structured essence with utterance citations"
```

---

### Task 3: Outputs store, generation lock, and the generate router

**Files:**
- Create: `saar_ai/app/services/outputs_store.py`, `saar_ai/app/services/generation_lock.py`, `saar_ai/tests/test_generate_router.py`
- Modify: `saar_ai/app/db/init_saarai_tables.py`, `saar_ai/app/routers/generate.py`, `saar_ai/app/routers/meetings.py` (outputs endpoint only)

**Interfaces:**
- Consumes: generators from Task 2; `verify_bot_access`, `get_transcript`, `get_participants` from `meeting_fetcher.py`.
- Produces:
  - `outputs_store.save_output(bot_id, project_id, output_type, content: str, fmt: str) -> None`
  - `outputs_store.get_outputs(bot_id, project_id) -> dict[str, dict]` where each value is `{"format", "content" (parsed dict for json, str for markdown), "created_at": str}`
  - `outputs_store.get_done_types(bot_id, project_id) -> list[str]` (json rows only, in order mom, insights, strategy)
  - `generation_lock.acquire(bot_id) -> bool`, `release(bot_id)`, `is_running(bot_id) -> bool`
  - Endpoints: `POST /generate/{mom|insights|strategy}/{bot_id}` → `{bot_id, type, format: "json", content: object}`; `POST /generate/all/{bot_id}` → `{bot_id, done: [...], failed: {type: message}}` (200 if any done, 502 if none); `GET /generate/status/{bot_id}` → `{running, done}`; 409 on lock; `GET /meetings/{bot_id}/outputs` → `{bot_id, has_outputs, outputs: {type: {format, content, created_at}}}` with `has_outputs` true only when a json row exists.

- [ ] **Step 1: Write the failing router tests**

Create `saar_ai/tests/test_generate_router.py`:
```python
import pytest

from app.routers import generate as gen
from app.routers import meetings as meet
from app.schemas.essence import Cited, Insights, Minutes, Sentiment, Strategy
from app.services import generation_lock

ROWS = [{"speaker": "Ravi", "text": "We change vendor", "timestamp_ms": 0, "duration_ms": 1}]
PEOPLE = [{"full_name": "Ravi", "is_host": True}]


class Store:
    """In-memory stand-in for outputs_store."""

    def __init__(self):
        self.rows = {}

    def save_output(self, bot_id, project_id, output_type, content, fmt):
        self.rows[(bot_id, project_id, output_type)] = {"format": fmt, "content": content, "created_at": "2026-09-06"}

    def get_outputs(self, bot_id, project_id):
        import json
        out = {}
        for (b, p, t), row in self.rows.items():
            if b == bot_id and p == project_id:
                content = json.loads(row["content"]) if row["format"] == "json" else row["content"]
                out[t] = {"format": row["format"], "content": content, "created_at": row["created_at"]}
        return out

    def get_done_types(self, bot_id, project_id):
        return [t for t in ("mom", "insights", "strategy") if (bot_id, project_id, t) in self.rows and self.rows[(bot_id, project_id, t)]["format"] == "json"]


@pytest.fixture
def store(monkeypatch):
    s = Store()
    for module in (gen, meet):
        monkeypatch.setattr(module, "verify_bot_access", lambda bot_id, project_id: bot_id != 404)
        monkeypatch.setattr(module, "get_outputs", s.get_outputs, raising=False)
    monkeypatch.setattr(gen, "get_transcript", lambda bot_id: ROWS)
    monkeypatch.setattr(gen, "get_participants", lambda bot_id: PEOPLE)
    monkeypatch.setattr(gen, "save_output", s.save_output)
    monkeypatch.setattr(gen, "get_done_types", s.get_done_types)
    monkeypatch.setattr(gen, "generate_mom", lambda u, p: Minutes(summary="s", decisions=[Cited(text="d", refs=[0])]))
    monkeypatch.setattr(gen, "generate_insight", lambda u, p: Insights(sentiment=Sentiment(overall="neutral", note="n")))
    monkeypatch.setattr(gen, "generate_strategy", lambda u, p: Strategy())
    generation_lock._running.clear()
    return s


def test_per_type_endpoint_returns_structured_content(client, store):
    r = client.post("/generate/mom/7")
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "mom" and body["format"] == "json"
    assert body["content"]["decisions"][0]["refs"] == [0]
    assert store.rows[(7, 1, "mom")]["format"] == "json"


def test_all_saves_each_section_and_reports_failures(client, store, monkeypatch):
    def boom(u, p):
        raise RuntimeError("provider down")
    monkeypatch.setattr(gen, "generate_strategy", boom)
    r = client.post("/generate/all/7")
    assert r.status_code == 200
    assert r.json()["done"] == ["mom", "insights"]
    assert r.json()["failed"] == {"strategy": "provider down"}
    assert (7, 1, "mom") in store.rows and (7, 1, "strategy") not in store.rows


def test_all_returns_502_when_everything_fails(client, store, monkeypatch):
    def boom(u, p):
        raise RuntimeError("down")
    for name in ("generate_mom", "generate_insight", "generate_strategy"):
        monkeypatch.setattr(gen, name, boom)
    assert client.post("/generate/all/7").status_code == 502


def test_lock_returns_409_and_clears_after_failure(client, store, monkeypatch):
    assert generation_lock.acquire(7)
    assert client.post("/generate/mom/7").status_code == 409
    assert client.get("/generate/status/7").json()["running"] is True
    generation_lock.release(7)

    def boom(u, p):
        raise RuntimeError("down")
    monkeypatch.setattr(gen, "generate_mom", boom)
    assert client.post("/generate/mom/7").status_code == 502
    assert generation_lock.is_running(7) is False


def test_status_lists_done_json_sections(client, store):
    client.post("/generate/mom/7")
    body = client.get("/generate/status/7").json()
    assert body == {"running": False, "done": ["mom"]}


def test_outputs_endpoint_reports_both_formats(client, store):
    store.save_output(7, 1, "insights", "### old markdown", "markdown")
    client.post("/generate/mom/7")
    body = client.get("/meetings/7/outputs").json()
    assert body["has_outputs"] is True
    assert body["outputs"]["mom"]["format"] == "json"
    assert body["outputs"]["mom"]["content"]["summary"] == "s"
    assert body["outputs"]["insights"] == {"format": "markdown", "content": "### old markdown", "created_at": "2026-09-06"}


def test_outputs_has_outputs_false_with_only_markdown(client, store):
    store.save_output(7, 1, "mom", "### old", "markdown")
    assert client.get("/meetings/7/outputs").json()["has_outputs"] is False


def test_unknown_bot_is_404(client, store):
    assert client.post("/generate/mom/404").status_code == 404
    assert client.get("/generate/status/404").status_code == 404
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `../.venv/bin/python -m pytest tests/test_generate_router.py -q`
Expected: FAIL (`generation_lock` missing, attributes not found).

- [ ] **Step 3: Add the format column**

In `saar_ai/app/db/init_saarai_tables.py`, after the `CREATE TABLE IF NOT EXISTS ...` execute and before `conn.commit()`, add:
```python
            conn.execute(text("""
                ALTER TABLE saarai_outputs
                ADD COLUMN IF NOT EXISTS format VARCHAR(10) NOT NULL DEFAULT 'markdown'
            """))
```

- [ ] **Step 4: Implement generation_lock.py**

```python
"""In-process guard so one bot is not generated twice at the same time.

Per process only: a cost guard for the single-worker development server,
not a correctness guarantee across workers.
"""
import threading

_running: set[int] = set()
_mutex = threading.Lock()


def acquire(bot_id: int) -> bool:
    with _mutex:
        if bot_id in _running:
            return False
        _running.add(bot_id)
        return True


def release(bot_id: int) -> None:
    with _mutex:
        _running.discard(bot_id)


def is_running(bot_id: int) -> bool:
    with _mutex:
        return bot_id in _running
```

- [ ] **Step 5: Implement outputs_store.py**

```python
import json

from sqlalchemy import text

from app.db.connection import SessionLocal

SECTION_ORDER = ("mom", "insights", "strategy")


def save_output(bot_id: int, project_id: int, output_type: str, content: str, fmt: str) -> None:
    db = SessionLocal()
    try:
        db.execute(
            text("""
                INSERT INTO saarai_outputs (bot_id, project_id, output_type, content, format)
                VALUES (:bot_id, :project_id, :output_type, :content, :fmt)
                ON CONFLICT (bot_id, project_id, output_type)
                DO UPDATE SET content = :content, format = :fmt, created_at = NOW()
            """),
            {"bot_id": bot_id, "project_id": project_id, "output_type": output_type, "content": content, "fmt": fmt},
        )
        db.commit()
    finally:
        db.close()


def get_outputs(bot_id: int, project_id: int) -> dict[str, dict]:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("""
                SELECT output_type, content, format, created_at
                FROM saarai_outputs
                WHERE bot_id = :bot_id AND project_id = :project_id
            """),
            {"bot_id": bot_id, "project_id": project_id},
        ).mappings().all()
    finally:
        db.close()
    out = {}
    for row in rows:
        content = json.loads(row["content"]) if row["format"] == "json" else row["content"]
        out[row["output_type"]] = {"format": row["format"], "content": content, "created_at": str(row["created_at"])}
    return out


def get_done_types(bot_id: int, project_id: int) -> list[str]:
    outputs = get_outputs(bot_id, project_id)
    return [t for t in SECTION_ORDER if t in outputs and outputs[t]["format"] == "json"]
```

- [ ] **Step 6: Rewrite generate.py**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import verify_api_key
from app.schemas.essence import Insights, Minutes, Strategy
from app.services import generation_lock
from app.services.insight_generator import generate_insight
from app.services.meeting_fetcher import get_participants, get_transcript, verify_bot_access
from app.services.mom_generator import generate_mom
from app.services.outputs_store import get_done_types, save_output
from app.services.strategy_generator import generate_strategy

router = APIRouter(prefix="/generate", tags=["AI Generation"])

SECTIONS = ("mom", "insights", "strategy")


def _generator(output_type: str):
    return {"mom": generate_mom, "insights": generate_insight, "strategy": generate_strategy}[output_type]


def _inputs(bot_id: int, project_id: int):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    utterances = [dict(u) for u in get_transcript(bot_id)]
    if not utterances:
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    participants = [dict(p) for p in get_participants(bot_id)]
    return utterances, participants


def _run_one(bot_id: int, project_id: int, output_type: str, utterances, participants):
    """Run one generator and save it. Raises on failure."""
    # Late lookup so tests can monkeypatch the module attributes.
    generator = {"mom": generate_mom, "insights": generate_insight, "strategy": generate_strategy}[output_type]
    result = generator(utterances, participants)
    save_output(bot_id, project_id, output_type, result.model_dump_json(), "json")
    return result


def _lock_or_409(bot_id: int):
    if not generation_lock.acquire(bot_id):
        raise HTTPException(status_code=409, detail="Generation already running")


def _generate_single(bot_id: int, project_id: int, output_type: str):
    utterances, participants = _inputs(bot_id, project_id)
    _lock_or_409(bot_id)
    try:
        result = _run_one(bot_id, project_id, output_type, utterances, participants)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not generate {output_type}: {exc}") from exc
    finally:
        generation_lock.release(bot_id)
    return {"bot_id": bot_id, "type": output_type, "format": "json", "content": result.model_dump()}


@router.post("/mom/{bot_id}")
def generate_meeting_mom(bot_id: int, project_id: int = Depends(verify_api_key)):
    return _generate_single(bot_id, project_id, "mom")


@router.post("/insights/{bot_id}")
def generate_meeting_insights(bot_id: int, project_id: int = Depends(verify_api_key)):
    return _generate_single(bot_id, project_id, "insights")


@router.post("/strategy/{bot_id}")
def generate_meeting_strategy(bot_id: int, project_id: int = Depends(verify_api_key)):
    return _generate_single(bot_id, project_id, "strategy")


@router.post("/all/{bot_id}")
def generate_all(bot_id: int, project_id: int = Depends(verify_api_key)):
    """Run all three generators, saving after each, and report what succeeded."""
    utterances, participants = _inputs(bot_id, project_id)
    _lock_or_409(bot_id)
    done: list[str] = []
    failed: dict[str, str] = {}
    try:
        for output_type in SECTIONS:
            try:
                _run_one(bot_id, project_id, output_type, utterances, participants)
                done.append(output_type)
            except Exception as exc:  # one section failing must not stop the others
                failed[output_type] = str(exc)
    finally:
        generation_lock.release(bot_id)
    if not done:
        raise HTTPException(status_code=502, detail={"failed": failed})
    return {"bot_id": bot_id, "done": done, "failed": failed}


@router.get("/status/{bot_id}")
def generation_status(bot_id: int, project_id: int = Depends(verify_api_key)):
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"running": generation_lock.is_running(bot_id), "done": get_done_types(bot_id, project_id)}
```

Remove the now-unused `_generator` helper if you copied it; `_run_one` does the lookup. The module must import `generate_mom`, `generate_insight`, `generate_strategy`, `save_output`, `get_done_types`, `get_transcript`, `get_participants`, `verify_bot_access` as module-level names so the tests' `monkeypatch.setattr(gen, ...)` works.

- [ ] **Step 7: Update the outputs endpoint in meetings.py**

Add `from app.services.outputs_store import get_outputs` to the imports, and replace the body of `meeting_outputs` with:
```python
    if not verify_bot_access(bot_id, project_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    outputs = get_outputs(bot_id, project_id)
    return {
        "bot_id": bot_id,
        "has_outputs": any(o["format"] == "json" for o in outputs.values()),
        "outputs": outputs,
    }
```
Remove the `SessionLocal` and `sa_text` imports from `meetings.py` if nothing else uses them (check `POST /meetings` first; keep them if it does).

- [ ] **Step 8: Run the tests**

Run: `../.venv/bin/python -m pytest tests -q`
Expected: all pass.

- [ ] **Step 9: Smoke the real server once**

With Postgres up (`cd attendee && docker compose -f dev.docker-compose.yaml up -d postgres redis`), run from `saar_ai/`: `../.venv/bin/uvicorn app.main:app --port 8001` briefly and confirm `GET /docs` is 200 and the startup log shows no error (the `ALTER TABLE` runs on the real table). Stop it.

- [ ] **Step 10: Commit**

```bash
git add saar_ai/app/services/outputs_store.py saar_ai/app/services/generation_lock.py saar_ai/app/routers/generate.py saar_ai/app/routers/meetings.py saar_ai/app/db/init_saarai_tables.py saar_ai/tests/test_generate_router.py
git commit -m "feat(api): store structured essence with format, add generation lock and status"
```

---

### Task 4: Recent meetings endpoint with teasers

**Files:**
- Modify: `saar_ai/app/services/outputs_store.py`, `saar_ai/app/routers/meetings.py`
- Test: `saar_ai/tests/test_meetings_router.py`

**Interfaces:**
- Produces: `outputs_store.get_recent_with_teasers(project_id, limit) -> list[dict]` each `{"meeting": {id, object_id, name, meeting_url, state, created_at}, "teaser": str | None}`; `GET /meetings/recent?limit=5` → `{count, meetings: [...]}`. Teaser is the first decision's text from a json Minutes row, else the summary, else null. The route must be registered before `/{bot_id}`.

- [ ] **Step 1: Write the failing test**

Create `saar_ai/tests/test_meetings_router.py`:
```python
from app.routers import meetings as meet


def test_recent_returns_teasers(client, monkeypatch):
    rows = [
        {"meeting": {"id": 3, "object_id": "b3", "name": "Q3 vendor review", "meeting_url": "u", "state": 9, "created_at": "2026-09-02"}, "teaser": "Change vendor for Q3"},
        {"meeting": {"id": 2, "object_id": "b2", "name": "Hiring sync", "meeting_url": "u", "state": 9, "created_at": "2026-09-01"}, "teaser": None},
    ]
    monkeypatch.setattr(meet, "get_recent_with_teasers", lambda project_id, limit: rows[:limit])
    body = client.get("/meetings/recent?limit=1").json()
    assert body["count"] == 1
    assert body["meetings"][0]["teaser"] == "Change vendor for Q3"


def test_recent_limit_is_bounded(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(meet, "get_recent_with_teasers", lambda project_id, limit: seen.setdefault("limit", limit) and [])
    client.get("/meetings/recent?limit=500")
    assert seen["limit"] == 20
```

Also add a pure test for the teaser rule to the same file:
```python
from app.services.outputs_store import teaser_from_minutes


def test_teaser_prefers_first_decision_then_summary():
    assert teaser_from_minutes({"summary": "S", "decisions": [{"text": "D", "refs": []}]}) == "D"
    assert teaser_from_minutes({"summary": "S", "decisions": []}) == "S"
    assert teaser_from_minutes(None) is None
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `../.venv/bin/python -m pytest tests/test_meetings_router.py -q`
Expected: FAIL (`get_recent_with_teasers` and `teaser_from_minutes` missing; `/meetings/recent` resolves to `/{bot_id}` and 422s).

- [ ] **Step 3: Add the store function**

Append to `outputs_store.py`:
```python
def teaser_from_minutes(minutes: dict | None) -> str | None:
    if not minutes:
        return None
    decisions = minutes.get("decisions") or []
    if decisions and decisions[0].get("text"):
        return decisions[0]["text"]
    return minutes.get("summary") or None


def get_recent_with_teasers(project_id: int, limit: int) -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.execute(
            text("""
                SELECT b.id, b.object_id, b.name, b.meeting_url, b.state, b.created_at,
                       o.content AS mom_content
                FROM bots_bot b
                LEFT JOIN saarai_outputs o
                  ON o.bot_id = b.id AND o.project_id = b.project_id
                 AND o.output_type = 'mom' AND o.format = 'json'
                WHERE b.state = 9 AND b.project_id = :project_id
                ORDER BY b.created_at DESC
                LIMIT :limit
            """),
            {"project_id": project_id, "limit": limit},
        ).mappings().all()
    finally:
        db.close()
    result = []
    for row in rows:
        minutes = json.loads(row["mom_content"]) if row["mom_content"] else None
        meeting = {k: row[k] for k in ("id", "object_id", "name", "meeting_url", "state", "created_at")}
        result.append({"meeting": meeting, "teaser": teaser_from_minutes(minutes)})
    return result
```

- [ ] **Step 4: Add the route**

In `meetings.py`, import `get_recent_with_teasers` from `app.services.outputs_store`, and add this route **above** `@router.get("/{bot_id}")` (FastAPI matches in declaration order):
```python
# --- Recent finished meetings with a one-line teaser (Dashboard) ---
@router.get("/recent")
def recent_meetings(limit: int = 5, project_id: int = Depends(verify_api_key)):
    limit = max(1, min(limit, 20))
    meetings = get_recent_with_teasers(project_id, limit)
    return {"count": len(meetings), "meetings": meetings}
```

- [ ] **Step 5: Run the tests**

Run: `../.venv/bin/python -m pytest tests -q`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add saar_ai/app/services/outputs_store.py saar_ai/app/routers/meetings.py saar_ai/tests/test_meetings_router.py
git commit -m "feat(api): recent meetings endpoint with essence teasers"
```

---

### Task 5: Frontend types, status map, Thread failed state, LinkButton, StatusThread, time helpers

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/lib/status.ts`, `frontend/src/components/ui/Thread.tsx`, `frontend/src/lib/__tests__/status.test.ts`, `frontend/src/components/ui/__tests__/Thread.test.tsx`, `frontend/src/pages/Home.tsx`
- Create: `frontend/src/components/ui/LinkButton.tsx`, `frontend/src/components/meeting/StatusThread.tsx`, `frontend/src/lib/time.ts`, `frontend/src/lib/__tests__/time.test.ts`, `frontend/src/components/ui/__tests__/LinkButton.test.tsx`

**Interfaces:**
- Produces (api.ts): types `Cited`, `Action`, `Participation`, `Priority`, `Level`, `Risk`, `Sentiment`, `Minutes`, `Insights`, `Strategy`, `SectionKey = "mom" | "insights" | "strategy"`, `Output`, `OutputsResponse`, `GenerateStatus`, `RecentMeeting`; `Meeting.transcription_state?: number`; `meetingsApi.outputs` typed as `OutputsResponse`; `meetingsApi.recent(limit?: number)`; `generateApi.mom/insights/strategy(botId)`, `generateApi.all(botId)` → `{bot_id, done: SectionKey[], failed: Partial<Record<SectionKey, string>>}`, `generateApi.status(botId)` → `GenerateStatus`.
- Produces (status): `ThreadState` gains `"failed"`; full map per spec; `isLiveState` covers 3, 4, 13, 14, 15, 16; `isFinishedState(state) = state === 9 || state === 10`.
- Produces (ui): `<LinkButton to variant="primary"|"secondary" className?>` rendering a react-router `Link` with Button's classes; `<StatusThread state label size? className?>` rendering Thread plus an `aria-hidden` visible label; `formatTimestamp(ms) => "m:ss"`, `formatDuration(ms) => "42 min"` (or "1 h 05 min" over an hour), `formatDate(iso) => "Tue 2 Sep"`.

- [ ] **Step 1: Write the failing tests**

Replace `frontend/src/lib/__tests__/status.test.ts` with:
```ts
import { describe, expect, it } from "vitest";
import { botStateToThreadState, isFinishedState, isLiveState } from "../status";

describe("botStateToThreadState", () => {
  it.each([
    [1, "joined", "Ready to join"], [2, "joined", "Joining"], [8, "joined", "In waiting room"], [11, "joined", "Scheduled"], [12, "joined", "Staged"],
    [3, "recording", "In meeting"], [4, "recording", "Recording"], [13, "recording", "Recording paused"],
    [14, "recording", "Joining breakout room"], [15, "recording", "Leaving breakout room"], [16, "recording", "Recording permission denied"],
    [5, "transcribing", "Leaving"], [6, "transcribing", "Transcribing"],
    [9, "ready", "Essence ready"], [10, "ready", "Deleted"],
    [7, "failed", "Failed"],
  ])("maps %i", (code, state, label) => {
    expect(botStateToThreadState(code as number)).toEqual({ state, label });
  });

  it("maps unknown codes to joined Unavailable", () => {
    expect(botStateToThreadState(42)).toEqual({ state: "joined", label: "Unavailable" });
  });
});

describe("helpers", () => {
  it("isLiveState covers in-call states", () => {
    for (const s of [3, 4, 13, 14, 15, 16]) expect(isLiveState(s)).toBe(true);
    for (const s of [1, 2, 5, 6, 7, 9]) expect(isLiveState(s)).toBe(false);
  });
  it("isFinishedState", () => {
    expect(isFinishedState(9)).toBe(true);
    expect(isFinishedState(10)).toBe(true);
    expect(isFinishedState(4)).toBe(false);
  });
});
```

Append to `frontend/src/components/ui/__tests__/Thread.test.tsx` inside the `describe("Thread")` block:
```tsx
  it("renders failed with a danger marker at the recording position and a Failed label", () => {
    render(<Thread state="failed" size="large" />);
    expect(document.querySelectorAll('[data-marker="failed"]').length).toBe(1);
    expect(markers("done")).toBe(1);
    expect(markers("todo")).toBe(2);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Failed" })).toBeInTheDocument();
  });
```

Create `frontend/src/lib/__tests__/time.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatDuration, formatTimestamp } from "../time";

describe("time", () => {
  it("formats timestamps as m:ss", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65_000)).toBe("1:05");
    expect(formatTimestamp(724_500)).toBe("12:04");
  });
  it("formats durations", () => {
    expect(formatDuration(42 * 60_000)).toBe("42 min");
    expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
    expect(formatDuration(20_000)).toBe("1 min");
  });
  it("formats dates as weekday day month", () => {
    expect(formatDate("2026-09-02T10:00:00Z")).toMatch(/^\w{3} 2 Sep$/);
  });
});
```

Create `frontend/src/components/ui/__tests__/LinkButton.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import LinkButton from "../LinkButton";
import StatusThread from "../../meeting/StatusThread";

describe("LinkButton", () => {
  it("renders a link styled as a button", () => {
    renderWithProviders(<LinkButton to="/dashboard">Send bot</LinkButton>);
    const link = screen.getByRole("link", { name: "Send bot" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link.className).toContain("bg-violet");
  });
  it("secondary variant uses the violet hairline", () => {
    renderWithProviders(<LinkButton to="/x" variant="secondary">All meetings</LinkButton>);
    expect(screen.getByRole("link").className).toContain("border-violet");
  });
});

describe("StatusThread", () => {
  it("exposes one accessible name and hides the visible label", () => {
    renderWithProviders(<StatusThread state="recording" label="Recording" />);
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
    expect(screen.getByText("Recording")).toHaveAttribute("aria-hidden", "true");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `frontend/`: `npm test -- src/lib src/components/ui`
Expected: FAIL on the new cases.

- [ ] **Step 3: Extend api.ts**

Replace the `outputs` entry in `meetingsApi`, add `recent`, replace `generateApi`, and add the types. Insert after the `Utterance` type:
```ts
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
```
Add `transcription_state?: number;` to `Meeting`. In `meetingsApi`, change `outputs` to `apiFetch<OutputsResponse>(...)` and add:
```ts
    recent: (limit = 5) =>
        apiFetch<{ count: number; meetings: RecentMeeting[] }>(`/meetings/recent?limit=${limit}`),
```
Replace `generateApi` with:
```ts
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
```

- [ ] **Step 4: Rewrite status.ts**

```ts
import type { ThreadState } from "../components/ui/Thread";

export type ThreadStatus = { state: ThreadState; label: string };

const MAP: Record<number, ThreadStatus> = {
  1: { state: "joined", label: "Ready to join" },
  2: { state: "joined", label: "Joining" },
  8: { state: "joined", label: "In waiting room" },
  11: { state: "joined", label: "Scheduled" },
  12: { state: "joined", label: "Staged" },
  3: { state: "recording", label: "In meeting" },
  4: { state: "recording", label: "Recording" },
  13: { state: "recording", label: "Recording paused" },
  14: { state: "recording", label: "Joining breakout room" },
  15: { state: "recording", label: "Leaving breakout room" },
  16: { state: "recording", label: "Recording permission denied" },
  5: { state: "transcribing", label: "Leaving" },
  6: { state: "transcribing", label: "Transcribing" },
  9: { state: "ready", label: "Essence ready" },
  10: { state: "ready", label: "Deleted" },
  7: { state: "failed", label: "Failed" },
};

const UNAVAILABLE: ThreadStatus = { state: "joined", label: "Unavailable" };

/** Maps the backend bot state code to a position on the meeting thread. */
export function botStateToThreadState(state: number): ThreadStatus {
  return MAP[state] ?? UNAVAILABLE;
}

/** Bot states that mean a bot is currently inside a call. */
export function isLiveState(state: number): boolean {
  return [3, 4, 13, 14, 15, 16].includes(state);
}

/** Bot states after which no more transcript will arrive. */
export function isFinishedState(state: number): boolean {
  return state === 9 || state === 10;
}
```

- [ ] **Step 5: Add the failed state to Thread.tsx**

Change the type and the rendering:
```tsx
export type ThreadState = "joined" | "recording" | "transcribing" | "ready" | "failed";
```
Add a `failed` marker class:
```tsx
const markerClass: Record<"done" | "now" | "todo" | "failed", string> = {
  done: "bg-cyan border-cyan",
  now: "bg-gold border-gold shadow-[0_0_10px_rgb(var(--gold))]",
  todo: "bg-surface border-violet",
  failed: "bg-danger border-danger",
};
```
In the component body, replace the `current`/`stepLabel` lines with:
```tsx
  const failed = state === "failed";
  const current = failed ? 1 : THREAD_STEPS.findIndex((step) => step.state === state);
  const stepLabel = failed ? "Failed" : THREAD_STEPS[current]?.label ?? "Unavailable";
```
and the `kind` computation with:
```tsx
          const kind = index < current ? "done" : index === current ? (failed ? "failed" : "now") : "todo";
```
and the large-size labels with:
```tsx
          {THREAD_STEPS.map((step, index) => (
            <span key={step.state} className={failed && index === 1 ? "text-danger" : undefined}>
              {failed && index === 1 ? "Failed" : step.label}
            </span>
          ))}
```

- [ ] **Step 6: Create time.ts**

```ts
export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
```

- [ ] **Step 7: Create LinkButton.tsx and StatusThread.tsx**

`frontend/src/components/ui/LinkButton.tsx`:
```tsx
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary";

const base =
  "inline-flex items-center justify-center rounded-control px-4 py-2 text-small transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";

export const linkButtonClasses: Record<Variant, string> = {
  primary: `${base} bg-violet text-white hover:bg-violet/90`,
  secondary: `${base} border border-violet text-ink hover:bg-violet/10`,
};

type LinkButtonProps = LinkProps & { variant?: Variant };

export function LinkButton({ variant = "primary", className = "", children, ...props }: LinkButtonProps) {
  return (
    <Link className={[linkButtonClasses[variant], className].join(" ")} {...props}>
      {children}
    </Link>
  );
}

export default LinkButton;
```

`frontend/src/components/meeting/StatusThread.tsx`:
```tsx
import Thread, { type ThreadState } from "../ui/Thread";

type StatusThreadProps = {
  state: ThreadState;
  label: string;
  size?: "inline" | "card";
  className?: string;
};

/** A Thread with its visible label; the label is decorative because the Thread carries the accessible name. */
export function StatusThread({ state, label, size = "inline", className = "" }: StatusThreadProps) {
  return (
    <span className={["inline-flex items-center gap-3", className].join(" ")}>
      <Thread state={state} size={size} label={`Status: ${label}`} className={size === "card" ? "max-w-[240px]" : ""} />
      <span aria-hidden="true" className="text-small text-ink-2">{label}</span>
    </span>
  );
}

export default StatusThread;
```

- [ ] **Step 8: Use LinkButton on Home**

In `frontend/src/pages/Home.tsx`, delete the `primaryLink` and `secondaryLink` constants, import `LinkButton`, and replace the two hero links with `<LinkButton to="/signup">Create account</LinkButton>` and `<LinkButton to="/login" variant="secondary">Sign in</LinkButton>`. The Home test still expects links named "Create account" and "Sign in".

- [ ] **Step 9: Run everything**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass. Dashboard and Meetings still compile (they keep their own constants until Tasks 10 and 11).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/api.ts frontend/src/lib/status.ts frontend/src/lib/time.ts frontend/src/lib/__tests__ frontend/src/components/ui/Thread.tsx frontend/src/components/ui/LinkButton.tsx frontend/src/components/ui/__tests__ frontend/src/components/meeting/StatusThread.tsx frontend/src/pages/Home.tsx
git commit -m "feat(frontend): essence types, full bot state map, failed thread state, LinkButton, StatusThread"
```

---

### Task 6: `usePolling` and `useMeeting`

**Files:**
- Create: `frontend/src/hooks/usePolling.ts`, `frontend/src/hooks/useMeeting.ts`, `frontend/src/hooks/__tests__/useMeeting.test.tsx`

**Interfaces:**
- Consumes: `meetingsApi.detail/transcript/outputs`, `generateApi.all/status/mom/insights/strategy`, `ApiError`, `botStateToThreadState`, `isFinishedState`.
- Produces:
```ts
type Phase = "loading" | "live" | "processing" | "generating" | "ready" | "failed" | "notfound";
type SectionStatus = "empty" | "generating" | "ready" | "legacy" | "error";
type SectionState = { status: SectionStatus; data?: Minutes | Insights | Strategy; markdown?: string; createdAt?: string; error?: string };
type IndexedUtterance = Utterance & { index: number };
type MeetingView = { meeting: Meeting | null; participants: Participant[]; utterances: IndexedUtterance[]; essence: Record<SectionKey, SectionState>; phase: Phase; error: string | null; regenerate: (section: SectionKey) => Promise<void>; retry: () => void };
function useMeeting(botId: number): MeetingView
function usePolling(fn: () => Promise<void> | void, intervalMs: number | null): void   // runs fn immediately and every intervalMs while intervalMs is not null and the document is visible
```

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/hooks/__tests__/useMeeting.test.tsx`:
```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import { useMeeting } from "../useMeeting";

const meeting = (state: number) => ({ meeting: { id: 7, object_id: "b", name: "Q3", meeting_url: "u", state, created_at: "2026-09-02T10:00:00Z" }, participants: [] });
const transcript = (n: number) => ({ bot_id: 7, utterance_count: n, transcript: Array.from({ length: n }, (_, i) => ({ speaker: "Ravi", timestamp_ms: i * 1000, duration_ms: 500, text: `line ${i}` })) });
const minutes = { summary: "s", discussion: [], decisions: [{ text: "d", refs: [0] }], actions: [], notes: [] };
const jsonOutputs = (keys: api.SectionKey[]) => ({
  bot_id: 7, has_outputs: keys.length > 0,
  outputs: Object.fromEntries(keys.map((k) => [k, { format: "json", content: minutes, created_at: "x" }])),
}) as api.OutputsResponse;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

async function flush() { await act(async () => { await Promise.resolve(); }); }

describe("useMeeting", () => {
  it("polls transcript while live, then generates when the meeting ends", async () => {
    const detail = vi.spyOn(api.meetingsApi, "detail").mockResolvedValueOnce(meeting(4)).mockResolvedValue(meeting(9));
    const tr = vi.spyOn(api.meetingsApi, "transcript").mockResolvedValueOnce(transcript(1)).mockResolvedValue(transcript(2));
    const outputs = vi.spyOn(api.meetingsApi, "outputs").mockResolvedValueOnce(jsonOutputs([])).mockResolvedValue(jsonOutputs(["mom", "insights", "strategy"]));
    const all = vi.spyOn(api.generateApi, "all").mockResolvedValue({ bot_id: 7, done: ["mom", "insights", "strategy"], failed: {} });
    vi.spyOn(api.generateApi, "status").mockResolvedValueOnce({ running: true, done: ["mom"] }).mockResolvedValue({ running: false, done: ["mom", "insights", "strategy"] });

    const { result } = renderHook(() => useMeeting(7));
    await flush(); await flush();
    expect(result.current.phase).toBe("live");
    expect(result.current.utterances).toHaveLength(1);
    expect(result.current.utterances[0].index).toBe(0);

    await act(async () => { vi.advanceTimersByTime(5000); }); await flush(); await flush();
    expect(detail).toHaveBeenCalledTimes(2);
    expect(tr).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.phase).toBe("generating"));
    expect(all).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(3000); }); await flush(); await flush();
    await act(async () => { vi.advanceTimersByTime(3000); }); await flush(); await flush();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.essence.mom.status).toBe("ready");
    expect(outputs).toHaveBeenCalled();
  });

  it("is ready immediately when json outputs exist and does not generate", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(3));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs(["mom", "insights", "strategy"]));
    const all = vi.spyOn(api.generateApi, "all");
    const { result } = renderHook(() => useMeeting(7));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(all).not.toHaveBeenCalled();
    expect(result.current.essence.strategy.status).toBe("ready");
  });

  it("marks markdown outputs as legacy and still generates missing sections", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue({ bot_id: 7, has_outputs: false, outputs: { mom: { format: "markdown", content: "### old", created_at: "x" } } });
    vi.spyOn(api.generateApi, "all").mockResolvedValue({ bot_id: 7, done: [], failed: {} });
    vi.spyOn(api.generateApi, "status").mockResolvedValue({ running: false, done: [] });
    const { result } = renderHook(() => useMeeting(7));
    await waitFor(() => expect(result.current.phase).not.toBe("loading"));
    await act(async () => { vi.advanceTimersByTime(3000); }); await flush(); await flush();
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.essence.mom.status).toBe("legacy");
    expect(result.current.essence.mom.markdown).toBe("### old");
    expect(result.current.essence.insights.status).toBe("error");
  });

  it("treats a 409 from generate as already running", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs([]));
    vi.spyOn(api.generateApi, "all").mockRejectedValue(new api.ApiError(409, "Generation already running"));
    vi.spyOn(api.generateApi, "status").mockResolvedValue({ running: true, done: [] });
    const { result } = renderHook(() => useMeeting(7));
    await waitFor(() => expect(result.current.phase).toBe("generating"));
    expect(result.current.error).toBeNull();
  });

  it("reports failed bots and not-found meetings", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(7));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(0));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs([]));
    const { result } = renderHook(() => useMeeting(7));
    await waitFor(() => expect(result.current.phase).toBe("failed"));

    vi.spyOn(api.meetingsApi, "detail").mockRejectedValue(new api.ApiError(404, "Meeting not found"));
    const { result: r2 } = renderHook(() => useMeeting(8));
    await waitFor(() => expect(r2.current.phase).toBe("notfound"));
  });

  it("regenerate marks the section generating then ready", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(meeting(9));
    vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue(transcript(1));
    vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(jsonOutputs(["mom", "insights", "strategy"]));
    const mom = vi.spyOn(api.generateApi, "mom").mockResolvedValue({ bot_id: 7, type: "mom", format: "json", content: minutes });
    const { result } = renderHook(() => useMeeting(7));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    await act(async () => { await result.current.regenerate("mom"); });
    expect(mom).toHaveBeenCalledWith(7);
    expect(result.current.essence.mom.status).toBe("ready");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/hooks`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement usePolling.ts**

```ts
import { useEffect, useRef } from "react";

/**
 * Runs `fn` now and every `intervalMs` while `intervalMs` is a number and the
 * document is visible. Pass null to stop. Overlapping runs are skipped.
 */
export function usePolling(fn: () => Promise<void> | void, intervalMs: number | null): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (intervalMs === null) return;
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        await fnRef.current();
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
```

- [ ] **Step 4: Implement useMeeting.ts**

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError, generateApi, meetingsApi, SECTION_KEYS,
  type Insights, type Meeting, type Minutes, type OutputsResponse, type Participant, type SectionKey, type Strategy, type Utterance,
} from "../api";
import { botStateToThreadState, isFinishedState } from "../lib/status";
import { usePolling } from "./usePolling";

export type Phase = "loading" | "live" | "processing" | "generating" | "ready" | "failed" | "notfound";
export type SectionStatus = "empty" | "generating" | "ready" | "legacy" | "error";
export type SectionState = {
  status: SectionStatus;
  data?: Minutes | Insights | Strategy;
  markdown?: string;
  createdAt?: string;
  error?: string;
};
export type IndexedUtterance = Utterance & { index: number };
export type MeetingView = {
  meeting: Meeting | null;
  participants: Participant[];
  utterances: IndexedUtterance[];
  essence: Record<SectionKey, SectionState>;
  phase: Phase;
  error: string | null;
  regenerate: (section: SectionKey) => Promise<void>;
  retry: () => void;
};

const LIVE_MS = 5000;
const STATUS_MS = 3000;

const emptyEssence = (): Record<SectionKey, SectionState> => ({ mom: { status: "empty" }, insights: { status: "empty" }, strategy: { status: "empty" } });

function essenceFrom(res: OutputsResponse, previous: Record<SectionKey, SectionState>, generating: boolean): Record<SectionKey, SectionState> {
  const next = { ...previous };
  for (const key of SECTION_KEYS) {
    const out = res.outputs[key];
    if (out?.format === "json") next[key] = { status: "ready", data: out.content, createdAt: out.created_at };
    else if (out?.format === "markdown") next[key] = { status: "legacy", markdown: out.content, createdAt: out.created_at };
    else if (generating) next[key] = { status: "generating" };
    else if (previous[key].status === "generating") next[key] = { status: "error", error: "Could not generate this section." };
    else next[key] = previous[key].status === "error" ? previous[key] : { status: "empty" };
  }
  return next;
}

function phaseFor(state: number): Exclude<Phase, "loading" | "notfound" | "generating"> {
  const thread = botStateToThreadState(state).state;
  if (thread === "failed") return "failed";
  if (thread === "ready") return "ready";
  if (thread === "transcribing") return "processing";
  return "live";
}

export function useMeeting(botId: number): MeetingView {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [utterances, setUtterances] = useState<IndexedUtterance[]>([]);
  const [essence, setEssence] = useState(emptyEssence);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const startedGeneration = useRef(false);

  const loadTranscript = useCallback(async () => {
    const res = await meetingsApi.transcript(botId);
    setUtterances(res.transcript.map((u, index) => ({ ...u, index })));
  }, [botId]);

  const loadOutputs = useCallback(async (generating: boolean) => {
    const res = await meetingsApi.outputs(botId);
    setEssence((prev) => essenceFrom(res, prev, generating));
    return res;
  }, [botId]);

  const loadDetail = useCallback(async () => {
    try {
      const res = await meetingsApi.detail(botId);
      setMeeting(res.meeting);
      setParticipants(res.participants);
      return res.meeting;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setPhase("notfound");
      else setError(err instanceof Error ? err.message : "Couldn't load this meeting.");
      return null;
    }
  }, [botId]);

  // Initial load and phase decision.
  useEffect(() => {
    let cancelled = false;
    startedGeneration.current = false;
    setPhase("loading");
    setError(null);
    (async () => {
      const m = await loadDetail();
      if (!m || cancelled) return;
      await loadTranscript().catch(() => undefined);
      const next = phaseFor(m.state);
      if (next === "ready") {
        const res = await loadOutputs(false);
        if (cancelled) return;
        const hasJson = SECTION_KEYS.some((k) => res.outputs[k]?.format === "json");
        if (hasJson) { setPhase("ready"); return; }
        // Nothing structured yet: generate once and poll status.
        startedGeneration.current = true;
        setEssence((prev) => essenceFrom(res, prev, true));
        setPhase("generating");
        generateApi.all(botId).catch((err) => {
          if (err instanceof ApiError && err.status === 409) return; // already running elsewhere
          if (!cancelled) setError(err instanceof Error ? err.message : "Generation failed.");
        });
      } else {
        setPhase(next);
      }
    })();
    return () => { cancelled = true; };
  }, [botId, reloadKey, loadDetail, loadTranscript, loadOutputs]);

  // Live and processing: poll detail (and transcript when live) until finished.
  const livePolling = phase === "live" || phase === "processing";
  usePolling(async () => {
    const m = await loadDetail();
    if (!m) return;
    if (phase === "live") await loadTranscript().catch(() => undefined);
    const next = phaseFor(m.state);
    if (next === "failed") setPhase("failed");
    else if (isFinishedState(m.state)) setReloadKey((k) => k + 1); // re-run the initial load, which decides ready vs generating
    else if (next !== phase) setPhase(next);
  }, livePolling ? LIVE_MS : null);

  // Generating: poll status until the lock clears.
  usePolling(async () => {
    const status = await generateApi.status(botId);
    await loadOutputs(status.running);
    if (!status.running) {
      await loadTranscript().catch(() => undefined);
      setPhase("ready");
    }
  }, phase === "generating" ? STATUS_MS : null);

  const regenerate = useCallback(async (section: SectionKey) => {
    setEssence((prev) => ({ ...prev, [section]: { status: "generating" } }));
    try {
      const res = await generateApi[section](botId);
      setEssence((prev) => ({ ...prev, [section]: { status: "ready", data: res.content, createdAt: new Date().toISOString() } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not generate this section.";
      setEssence((prev) => ({ ...prev, [section]: { status: "error", error: message } }));
    }
  }, [botId]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { meeting, participants, utterances, essence, phase, error, regenerate, retry };
}

export default useMeeting;
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/hooks`
Expected: all pass. If a timing assertion is flaky under fake timers, add one more `await flush()` after the `advanceTimersByTime` in that test rather than changing the hook.

- [ ] **Step 6: Typecheck, build, commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add frontend/src/hooks
git commit -m "feat(frontend): useMeeting owns live polling, generation, and essence state"
```

---

### Task 7: Essence components

**Files:**
- Create: `frontend/src/components/meeting/Citation.tsx`, `OwnerChip.tsx`, `ParticipantChips.tsx`, `SectionNav.tsx`, `CitedList.tsx`, `MinutesSection.tsx`, `InsightsSection.tsx`, `StrategySection.tsx`, `LegacyMarkdown.tsx`, `SectionFrame.tsx`, `frontend/src/components/meeting/__tests__/sections.test.tsx`

**Interfaces:**
- Consumes: essence types from `api.ts`, `SectionState` and `IndexedUtterance` from `hooks/useMeeting.ts`, `formatTimestamp` from `lib/time.ts`.
- Produces:
  - `<Citation refs utterances onCite />`: renders nothing when `refs` is empty; otherwise a button named `Show source at m:ss` (timestamp of the first ref's utterance) showing "+N" when more refs exist; click calls `onCite(firstRef)`.
  - `<OwnerChip name />`: initial avatar plus name; "Unassigned" in `text-ink-2` when name is null.
  - `<ParticipantChips participants />`: chips with the host first, in gold, suffixed " · host".
  - `<CitedList title items utterances onCite marker? ordered? />`: heading plus list; renders nothing for an empty list.
  - `<SectionNav onRegenerate regenerating />`: sticky bar with anchor links `#mom`, `#insights`, `#strategy` and a Regenerate menu ("Regenerate minutes" etc., disabled while that section is generating). Exports `SECTION_TITLES`.
  - `<SectionFrame id title state onRetry children />`: heading and, by `state.status`: `generating` → three Skeleton lines; `error` → ErrorNotice with retry; `legacy` → `<LegacyMarkdown markdown onRegenerate />`; `ready` → children; `empty` → nothing.
  - `<MinutesSection data utterances onCite />`, `<InsightsSection ... />`, `<StrategySection ... />`.
  - `<LegacyMarkdown markdown onRegenerate />`: the existing ReactMarkdown block from `MeetingDetail.tsx` (class string moved verbatim) under the notice "Generated before citations were available." and a secondary Button "Regenerate for citations".

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/meeting/__tests__/sections.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Citation from "../Citation";
import MinutesSection from "../MinutesSection";
import InsightsSection from "../InsightsSection";
import StrategySection from "../StrategySection";
import SectionFrame from "../SectionFrame";
import type { IndexedUtterance } from "../../../hooks/useMeeting";

const utterances: IndexedUtterance[] = [
  { index: 0, speaker: "Ravi", timestamp_ms: 724_000, duration_ms: 1000, text: "We change vendor" },
  { index: 1, speaker: "Meena", timestamp_ms: 760_000, duration_ms: 1000, text: "I will send the RFP" },
];

describe("Citation", () => {
  it("renders nothing without refs", () => {
    const { container } = render(<Citation refs={[]} utterances={utterances} onCite={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("names the first ref's timestamp and counts the rest", async () => {
    const onCite = vi.fn();
    render(<Citation refs={[1, 0]} utterances={utterances} onCite={onCite} />);
    const button = screen.getByRole("button", { name: "Show source at 12:40" });
    expect(button).toHaveTextContent("+1");
    await userEvent.setup().click(button);
    expect(onCite).toHaveBeenCalledWith(1);
  });
});

describe("MinutesSection", () => {
  it("renders summary, decisions, and the actions table with owners", () => {
    render(
      <MinutesSection
        utterances={utterances}
        onCite={() => {}}
        data={{
          summary: "Vendor change agreed.",
          discussion: [{ text: "Delivery slipped", refs: [0] }],
          decisions: [{ text: "Change vendor for Q3", refs: [0] }],
          actions: [{ text: "Send RFP", owner: "Meena", due: "Friday", refs: [1] }, { text: "Confirm budget", owner: null, due: null, refs: [] }],
          notes: [],
        }}
      />,
    );
    expect(screen.getByText("Vendor change agreed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decisions" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByText("Meena")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Show source/ })).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
  });
});

describe("InsightsSection", () => {
  it("renders participation bars with percentages and the sentiment word", () => {
    render(
      <InsightsSection
        utterances={utterances}
        onCite={() => {}}
        data={{
          participation: [{ name: "Ravi", share: 0.6, note: "Led the discussion", refs: [0] }],
          themes: [{ text: "Vendor reliability", refs: [] }],
          patterns: [], concerns: [],
          sentiment: { overall: "tense", note: "Frustration about delays." },
          takeaways: [{ text: "Switch vendor", refs: [0] }],
        }}
      />,
    );
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("tense")).toHaveClass("text-gold");
    expect(screen.getByRole("heading", { name: "Takeaways" })).toBeInTheDocument();
  });
});

describe("StrategySection", () => {
  it("renders priorities and the risks table", () => {
    render(
      <StrategySection
        utterances={utterances}
        onCite={() => {}}
        data={{
          priorities: [{ action: "Sign the new vendor", owner: "Ravi", why: "Delays cost revenue", refs: [0] }],
          followups: [], resources: [],
          risks: [{ risk: "Budget not approved", likelihood: "medium", impact: "high", mitigation: "Escalate to Ankit", refs: [1] }],
          opportunities: [], agenda: [],
        }}
      />,
    );
    expect(screen.getByRole("list", { name: "Priorities" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Likelihood" })).toBeInTheDocument();
    expect(screen.getByText("Escalate to Ankit")).toBeInTheDocument();
  });
});

describe("SectionFrame", () => {
  it("shows skeletons while generating and an error with retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SectionFrame id="mom" title="Minutes" state={{ status: "generating" }} onRetry={onRetry}>x</SectionFrame>);
    expect(screen.getByRole("heading", { name: "Minutes" })).toBeInTheDocument();
    expect(screen.queryByText("x")).not.toBeInTheDocument();
    rerender(<SectionFrame id="mom" title="Minutes" state={{ status: "error", error: "Provider down" }} onRetry={onRetry}>x</SectionFrame>);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
  it("renders legacy markdown with a regenerate button", () => {
    render(<SectionFrame id="mom" title="Minutes" state={{ status: "legacy", markdown: "### Old heading" }} onRetry={() => {}}>x</SectionFrame>);
    expect(screen.getByText("Generated before citations were available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate for citations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Old heading" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `frontend/`: `npm test -- src/components/meeting`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement Citation.tsx, OwnerChip.tsx, ParticipantChips.tsx**

`Citation.tsx`:
```tsx
import type { IndexedUtterance } from "../../hooks/useMeeting";
import { formatTimestamp } from "../../lib/time";

type CitationProps = { refs: number[]; utterances: IndexedUtterance[]; onCite: (index: number) => void };

export function Citation({ refs, utterances, onCite }: CitationProps) {
  if (refs.length === 0) return null;
  const first = refs[0];
  const utterance = utterances[first];
  const stamp = utterance ? formatTimestamp(utterance.timestamp_ms) : `#${first}`;
  const more = refs.length - 1;
  return (
    <button
      type="button"
      onClick={() => onCite(first)}
      aria-label={`Show source at ${stamp}`}
      className="ml-2 inline-flex items-center gap-1 rounded-control border border-cyan/40 px-1.5 py-0.5 text-[11px] leading-none text-cyan hover:bg-cyan/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span>{stamp}</span>
      {more > 0 ? <span className="text-ink-2">+{more}</span> : null}
    </button>
  );
}

export default Citation;
```

`OwnerChip.tsx`:
```tsx
type OwnerChipProps = { name: string | null };

export function OwnerChip({ name }: OwnerChipProps) {
  if (!name) return <span className="text-small text-ink-2">Unassigned</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-small">
      <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-violet text-[10px] font-semibold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
      {name}
    </span>
  );
}

export default OwnerChip;
```

`ParticipantChips.tsx`:
```tsx
import type { Participant } from "../../api";

export function ParticipantChips({ participants }: { participants: Participant[] }) {
  const ordered = [...participants].sort((a, b) => Number(b.is_host) - Number(a.is_host));
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Participants">
      {ordered.map((p) => (
        <li
          key={p.id}
          className={["rounded-full border px-2 py-0.5 text-small", p.is_host ? "border-gold text-gold" : "border-line text-ink-2"].join(" ")}
        >
          {p.full_name}{p.is_host ? " · host" : ""}
        </li>
      ))}
    </ul>
  );
}

export default ParticipantChips;
```

- [ ] **Step 4: Implement SectionFrame.tsx and LegacyMarkdown.tsx**

`SectionFrame.tsx`:
```tsx
import { type ReactNode } from "react";
import ErrorNotice from "../ui/ErrorNotice";
import Skeleton from "../ui/Skeleton";
import LegacyMarkdown from "./LegacyMarkdown";
import type { SectionState } from "../../hooks/useMeeting";

type SectionFrameProps = { id: string; title: string; state: SectionState; onRetry: () => void; children: ReactNode };

export function SectionFrame({ id, title, state, onRetry, children }: SectionFrameProps) {
  if (state.status === "empty") return null;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 py-6 first:pt-0">
      <h2 id={`${id}-heading`} className="text-h2">{title}</h2>
      {state.status === "generating" ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
        </div>
      ) : state.status === "error" ? (
        <ErrorNotice className="mt-4" message={state.error ?? "Could not generate this section."} onRetry={onRetry} />
      ) : state.status === "legacy" ? (
        <LegacyMarkdown markdown={state.markdown ?? ""} onRegenerate={onRetry} />
      ) : (
        <div className="mt-4 space-y-6">{children}</div>
      )}
    </section>
  );
}

export default SectionFrame;
```

`LegacyMarkdown.tsx`: move the `ReactMarkdown` element and its long `[&_h1]:...` class string out of the current `MeetingDetail.tsx` (the block near line 360) into this file, unchanged, and wrap it:
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "../ui/Button";

// Paste the existing markdown class string from MeetingDetail.tsx here, verbatim.
const markdownClass = "";

export function LegacyMarkdown({ markdown, onRegenerate }: { markdown: string; onRegenerate: () => void }) {
  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-raised px-4 py-2 text-small text-ink-2">
        <span>Generated before citations were available.</span>
        <Button variant="secondary" onClick={onRegenerate}>Regenerate for citations</Button>
      </div>
      <div className={markdownClass}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export default LegacyMarkdown;
```

- [ ] **Step 5: Implement CitedList.tsx and the three sections**

`CitedList.tsx`:
```tsx
import type { Cited } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";

type CitedListProps = { title: string; items: Cited[]; utterances: IndexedUtterance[]; onCite: (i: number) => void; marker?: "gold" | "plain"; ordered?: boolean };

export function CitedList({ title, items, utterances, onCite, marker = "plain", ordered = false }: CitedListProps) {
  if (items.length === 0) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="text-h3">{title}</h3>
      <List aria-label={title} className={["mt-2 space-y-2 text-body", ordered ? "list-decimal pl-5" : ""].join(" ")}>
        {items.map((item, i) => (
          <li key={i} className={marker === "gold" ? "relative pl-4 before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-gold" : ""}>
            {item.text}
            <Citation refs={item.refs} utterances={utterances} onCite={onCite} />
          </li>
        ))}
      </List>
    </div>
  );
}
export default CitedList;
```

`MinutesSection.tsx`:
```tsx
import type { Minutes } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";
import CitedList from "./CitedList";
import OwnerChip from "./OwnerChip";

type Props = { data: Minutes; utterances: IndexedUtterance[]; onCite: (i: number) => void };

const th = "px-3 py-2 text-left font-medium";

export function MinutesSection({ data, utterances, onCite }: Props) {
  return (
    <>
      <p className="max-w-prose text-body">{data.summary}</p>
      <CitedList title="Decisions" items={data.decisions} utterances={utterances} onCite={onCite} marker="gold" />
      {data.actions.length > 0 ? (
        <div>
          <h3 className="text-h3">Action items</h3>
          <div className="mt-2 overflow-x-auto rounded-panel border border-line">
            <table className="w-full text-small">
              <thead className="bg-raised text-ink-2">
                <tr>
                  <th scope="col" className={th}>Action</th>
                  <th scope="col" className={th}>Owner</th>
                  <th scope="col" className={th}>Due</th>
                  <th scope="col" className={th}><span className="sr-only">Source</span></th>
                </tr>
              </thead>
              <tbody>
                {data.actions.map((a, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 text-body">{a.text}</td>
                    <td className="px-3 py-2"><OwnerChip name={a.owner} /></td>
                    <td className="px-3 py-2 text-ink-2">{a.due ?? "No date"}</td>
                    <td className="px-3 py-2"><Citation refs={a.refs} utterances={utterances} onCite={onCite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <CitedList title="Discussion" items={data.discussion} utterances={utterances} onCite={onCite} />
      <CitedList title="Notes" items={data.notes} utterances={utterances} onCite={onCite} />
    </>
  );
}
export default MinutesSection;
```

`InsightsSection.tsx`:
```tsx
import type { Insights } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";
import CitedList from "./CitedList";

type Props = { data: Insights; utterances: IndexedUtterance[]; onCite: (i: number) => void };

const sentimentClass = { positive: "text-cyan", neutral: "text-ink-2", tense: "text-gold" } as const;

export function InsightsSection({ data, utterances, onCite }: Props) {
  return (
    <>
      {data.participation.length > 0 ? (
        <div>
          <h3 className="text-h3">Participation</h3>
          <ul className="mt-2 space-y-3" aria-label="Participation">
            {data.participation.map((p) => {
              const pct = Math.round(p.share * 100);
              return (
                <li key={p.name} className="grid grid-cols-[120px_1fr_44px] items-center gap-x-3 gap-y-1 text-small">
                  <span className="truncate">{p.name}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <span className="block h-full rounded-full bg-thread" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-right text-ink-2">{pct}%</span>
                  <span className="col-span-3 text-ink-2">{p.note}<Citation refs={p.refs} utterances={utterances} onCite={onCite} /></span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <CitedList title="Themes" items={data.themes} utterances={utterances} onCite={onCite} />
      <CitedList title="Patterns" items={data.patterns} utterances={utterances} onCite={onCite} />
      <CitedList title="Concerns" items={data.concerns} utterances={utterances} onCite={onCite} />
      <div>
        <h3 className="text-h3">Sentiment</h3>
        <p className="mt-2 text-body">
          <span className={["font-semibold", sentimentClass[data.sentiment.overall]].join(" ")}>{data.sentiment.overall}</span>
          <span className="text-ink-2">. {data.sentiment.note}</span>
        </p>
      </div>
      <CitedList title="Takeaways" items={data.takeaways} utterances={utterances} onCite={onCite} marker="gold" />
    </>
  );
}
export default InsightsSection;
```

`StrategySection.tsx`:
```tsx
import type { Strategy } from "../../api";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import Citation from "./Citation";
import CitedList from "./CitedList";
import OwnerChip from "./OwnerChip";

type Props = { data: Strategy; utterances: IndexedUtterance[]; onCite: (i: number) => void };

const th = "px-3 py-2 text-left font-medium";

export function StrategySection({ data, utterances, onCite }: Props) {
  return (
    <>
      {data.priorities.length > 0 ? (
        <div>
          <h3 className="text-h3">Priorities</h3>
          <ol aria-label="Priorities" className="mt-2 list-decimal space-y-3 pl-5 text-body">
            {data.priorities.map((p, i) => (
              <li key={i}>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{p.action}</span>
                  <OwnerChip name={p.owner} />
                  <Citation refs={p.refs} utterances={utterances} onCite={onCite} />
                </div>
                <p className="text-small text-ink-2">{p.why}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {data.risks.length > 0 ? (
        <div>
          <h3 className="text-h3">Risks</h3>
          <div className="mt-2 overflow-x-auto rounded-panel border border-line">
            <table className="w-full text-small">
              <thead className="bg-raised text-ink-2">
                <tr>
                  <th scope="col" className={th}>Risk</th>
                  <th scope="col" className={th}>Likelihood</th>
                  <th scope="col" className={th}>Impact</th>
                  <th scope="col" className={th}>Mitigation</th>
                  <th scope="col" className={th}><span className="sr-only">Source</span></th>
                </tr>
              </thead>
              <tbody>
                {data.risks.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 text-body">{r.risk}</td>
                    <td className="px-3 py-2">{r.likelihood}</td>
                    <td className="px-3 py-2">{r.impact}</td>
                    <td className="px-3 py-2">{r.mitigation}</td>
                    <td className="px-3 py-2"><Citation refs={r.refs} utterances={utterances} onCite={onCite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <CitedList title="Follow-ups" items={data.followups} utterances={utterances} onCite={onCite} />
      <CitedList title="Resources" items={data.resources} utterances={utterances} onCite={onCite} />
      <CitedList title="Opportunities" items={data.opportunities} utterances={utterances} onCite={onCite} />
      <CitedList title="Next meeting agenda" items={data.agenda} utterances={utterances} onCite={onCite} ordered />
    </>
  );
}
export default StrategySection;
```

- [ ] **Step 6: Implement SectionNav.tsx**

```tsx
import { useState } from "react";
import type { SectionKey } from "../../api";

export const SECTION_TITLES: Record<SectionKey, string> = { mom: "Minutes", insights: "Insights", strategy: "Strategy" };

type SectionNavProps = { onRegenerate: (section: SectionKey) => void; regenerating: Partial<Record<SectionKey, boolean>> };

const link = "rounded-control px-2 py-1 text-small text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ground";

export function SectionNav({ onRegenerate, regenerating }: SectionNavProps) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(SECTION_TITLES) as SectionKey[];
  return (
    <nav aria-label="Essence sections" className="sticky top-[52px] z-10 -mx-2 mb-2 flex items-center gap-1 border-b border-line bg-ground/80 px-2 py-2 backdrop-blur-md">
      {keys.map((key) => (
        <a key={key} href={`#${key}`} className={link}>{SECTION_TITLES[key]}</a>
      ))}
      <div className="relative ml-auto">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className={link}>Regenerate</button>
        {open ? (
          <div role="menu" className="absolute right-0 top-full mt-1 w-56 rounded-panel border border-line bg-surface p-1">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={Boolean(regenerating[key])}
                onClick={() => { setOpen(false); onRegenerate(key); }}
                className="block w-full rounded-control px-3 py-1.5 text-left text-small text-ink hover:bg-raised disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Regenerate {SECTION_TITLES[key].toLowerCase()}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
export default SectionNav;
```

- [ ] **Step 7: Run the tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass. `MeetingDetail.tsx` keeps its own markdown block until Task 9 replaces the page; both copies of the class string coexist briefly.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/meeting
git commit -m "feat(frontend): essence components with citations, owner chips, and section frames"
```

---

### Task 8: Transcript drawer

**Files:**
- Create: `frontend/src/components/meeting/TranscriptList.tsx`, `frontend/src/components/meeting/TranscriptDrawer.tsx`, `frontend/src/components/meeting/__tests__/transcript.test.tsx`

**Interfaces:**
- Consumes: `IndexedUtterance`, `formatTimestamp`, `EmptyState`.
- Produces:
  - `<TranscriptList utterances focusIndex? follow? />`: groups consecutive utterances by speaker; each utterance is an `li` with `id="utt-{index}"`, timestamp in the gutter, and `aria-current="true"` plus a gold highlight when `index === focusIndex`. With `follow` true it keeps its container scrolled to the bottom as utterances arrive unless the user scrolled up, in which case a "Jump to latest" button appears.
  - `<TranscriptDrawer open onClose utterances focusIndex live />`: desktop `aside` (`aria-label="Transcript"`, 360px, docked right) and, below `lg`, a fixed full-screen panel with `role="dialog"` `aria-modal="true"`; focus moves to the close button on open, Escape closes, Tab cycles inside. Header "Transcript" with "N lines", a find input labelled "Find in transcript" filtering by case-insensitive substring, a close button named "Close transcript". Scrolls `#utt-{focusIndex}` into view (block center) when `focusIndex` changes while open. Shows the `मौन` EmptyState "No transcript yet" when there are no utterances.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/meeting/__tests__/transcript.test.tsx`:
```tsx
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TranscriptDrawer from "../TranscriptDrawer";
import TranscriptList from "../TranscriptList";
import type { IndexedUtterance } from "../../../hooks/useMeeting";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const utterances: IndexedUtterance[] = [
  { index: 0, speaker: "Ravi", timestamp_ms: 0, duration_ms: 1000, text: "Delivery slipped again" },
  { index: 1, speaker: "Ravi", timestamp_ms: 4000, duration_ms: 1000, text: "So we change vendor" },
  { index: 2, speaker: "Meena", timestamp_ms: 9000, duration_ms: 1000, text: "ठीक है, budget needs sign-off" },
];

describe("TranscriptList", () => {
  it("groups consecutive speaker lines and marks the focused one current", () => {
    render(<TranscriptList utterances={utterances} focusIndex={1} />);
    expect(screen.getAllByText("Ravi")).toHaveLength(1);
    expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
    expect(document.getElementById("utt-0")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("0:09")).toBeInTheDocument();
  });
});

// The drawer renders a desktop aside and a mobile dialog; CSS hides one per
// breakpoint, but jsdom has no CSS, so both are present and queries take [0].
describe("TranscriptDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<TranscriptDrawer open={false} onClose={() => {}} utterances={utterances} focusIndex={null} live={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count, filters by find, and closes on Escape and the button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TranscriptDrawer open onClose={onClose} utterances={utterances} focusIndex={null} live={false} />);
    expect(screen.getAllByText("3 lines")[0]).toBeInTheDocument();
    await user.type(screen.getAllByLabelText("Find in transcript")[0], "budget");
    expect(screen.getAllByText(/budget needs sign-off/)[0]).toBeInTheDocument();
    expect(screen.queryAllByText("Delivery slipped again")).toHaveLength(1); // only the unfiltered mobile copy remains
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getAllByRole("button", { name: "Close transcript" })[0]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("scrolls the focused utterance into view", () => {
    const spy = Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    render(<TranscriptDrawer open onClose={() => {}} utterances={utterances} focusIndex={2} live={false} />);
    expect(spy).toHaveBeenCalled();
    expect(document.getElementById("utt-2")).toHaveAttribute("aria-current", "true");
  });

  it("shows the empty word when there is no transcript", () => {
    render(<TranscriptDrawer open onClose={() => {}} utterances={[]} focusIndex={null} live={false} />);
    expect(screen.getAllByRole("heading", { name: "No transcript yet" })[0]).toBeInTheDocument();
  });
});
```
Note on the filter assertion: because both variants share one `query` state, typing into the desktop input filters both lists; if your implementation shares state, change that expectation to `toHaveLength(0)`. Either is acceptable; keep the test truthful to the implementation and say which in the report.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/meeting/__tests__/transcript.test.tsx`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement TranscriptList.tsx**

```tsx
import { useEffect, useRef, useState } from "react";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import { formatTimestamp } from "../../lib/time";

type Group = { speaker: string; items: IndexedUtterance[] };

function group(utterances: IndexedUtterance[]): Group[] {
  const groups: Group[] = [];
  for (const u of utterances) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === u.speaker) last.items.push(u);
    else groups.push({ speaker: u.speaker, items: [u] });
  }
  return groups;
}

type TranscriptListProps = { utterances: IndexedUtterance[]; focusIndex?: number | null; follow?: boolean };

export function TranscriptList({ utterances, focusIndex = null, follow = false }: TranscriptListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(true); // true until the user scrolls up
  const lastCount = useRef(utterances.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!follow || !el) return;
    if (utterances.length !== lastCount.current) {
      lastCount.current = utterances.length;
      if (stuck) el.scrollTop = el.scrollHeight;
    }
  }, [utterances.length, follow, stuck]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  const jump = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setStuck(true);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} onScroll={onScroll} className="h-full overflow-y-auto pr-1">
        {group(utterances).map((g, gi) => (
          <div key={gi} className="mb-4">
            <p className="mb-1 text-small text-cyan">{g.speaker}</p>
            <ul className="space-y-1">
              {g.items.map((u) => {
                const current = u.index === focusIndex;
                return (
                  <li
                    key={u.index}
                    id={`utt-${u.index}`}
                    aria-current={current ? "true" : undefined}
                    className={[
                      "grid grid-cols-[44px_1fr] gap-2 rounded-control px-1 py-0.5 text-body motion-safe:transition-colors motion-safe:duration-1000",
                      current ? "bg-gold/15 ring-1 ring-gold/50" : "",
                    ].join(" ")}
                  >
                    <span className="pt-0.5 text-[11px] text-ink-2">{formatTimestamp(u.timestamp_ms)}</span>
                    <span>{u.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {follow && !stuck ? (
        <button
          type="button"
          onClick={jump}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-control bg-violet px-3 py-1 text-small text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
export default TranscriptList;
```

- [ ] **Step 4: Implement TranscriptDrawer.tsx**

```tsx
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { IndexedUtterance } from "../../hooks/useMeeting";
import EmptyState from "../ui/EmptyState";
import TranscriptList from "./TranscriptList";

type TranscriptDrawerProps = {
  open: boolean;
  onClose: () => void;
  utterances: IndexedUtterance[];
  focusIndex: number | null;
  live: boolean;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function TranscriptDrawer({ open, onClose, utterances, focusIndex, live }: TranscriptDrawerProps) {
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // Scroll the cited utterance into view whenever it changes while open.
  useEffect(() => {
    if (!open || focusIndex === null) return;
    document.getElementById(`utt-${focusIndex}`)?.scrollIntoView({ block: "center" });
  }, [open, focusIndex]);

  // Move focus to the close button on open (matters for the mobile dialog).
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const visible = query.trim()
    ? utterances.filter((u) => u.text.toLowerCase().includes(query.trim().toLowerCase()))
    : utterances;

  const panel = (
    <div ref={panelRef} onKeyDown={onKeyDown} className="flex h-full flex-col bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-h3">Transcript</h2>
        <span className="text-small text-ink-2">{utterances.length} lines</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close transcript" className={["rounded-control p-1 text-ink-2 hover:text-ink", focusRing].join(" ")}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <label htmlFor={`${headingId}-find`} className="sr-only">Find in transcript</label>
      <input
        id={`${headingId}-find`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in transcript"
        className={["mb-3 h-8 w-full rounded-control border border-line bg-raised px-3 text-small text-ink placeholder:text-ink-2 focus-visible:border-violet", focusRing].join(" ")}
      />
      {utterances.length === 0 ? (
        <EmptyState devanagari="मौन" title="No transcript yet" body={live ? "Lines appear here as people speak." : "The bot didn't capture any speech in this meeting."} className="py-6" />
      ) : (
        <TranscriptList utterances={visible} focusIndex={focusIndex} follow={live && !query} />
      )}
    </div>
  );

  return (
    <>
      <aside aria-label="Transcript" className="hidden h-[calc(100vh-52px)] w-[360px] shrink-0 border-l border-line lg:sticky lg:top-[52px] lg:block">
        {panel}
      </aside>
      <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="fixed inset-0 z-40 lg:hidden">
        {panel}
      </div>
    </>
  );
}
export default TranscriptDrawer;
```
The two copies share the `query` state (one `useState` in the drawer), so typing filters both; use the `toHaveLength(0)` variant of the filter assertion. Duplicate `id` attributes for `utt-N` and the find input across the two copies are a known cost; `getElementById` returns the first (desktop) copy, which is the one tests assert on. Task 9 does not depend on the mobile copy's ids.

- [ ] **Step 5: Run the tests, typecheck, build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/meeting
git commit -m "feat(frontend): transcript drawer with find, live follow, and citation focus"
```

---

### Task 9: Meeting page assembly, MeetingContext, top bar thread, redirect

**Files:**
- Create: `frontend/src/context/MeetingContext.tsx`, `frontend/src/context/__tests__/MeetingContext.test.tsx`, `frontend/src/pages/__tests__/MeetingDetail.test.tsx`
- Modify: `frontend/src/pages/MeetingDetail.tsx` (rewrite), `frontend/src/components/layout/TopBar.tsx`, `frontend/src/lib/breadcrumb.ts`, `frontend/src/lib/__tests__/breadcrumb.test.ts`, `frontend/src/layouts/AppShell.tsx`, `frontend/src/router/AppRouter.tsx`, `frontend/src/test/render.tsx`
- Delete: `frontend/src/pages/Transcript.tsx`

**Interfaces:**
- Consumes: `useMeeting`, everything in `components/meeting/`, `LinkButton`, `Thread`, `formatDate`, `formatDuration`, `botStateToThreadState`.
- Produces: `MeetingProvider`, `useMeetingContext(): { current: MeetingSummary | null; setCurrent(s: MeetingSummary | null): void }` with `MeetingSummary = { name: string; thread: ThreadState; label: string }`; `breadcrumbFor(pathname, meetingName?)`; route `meetings/:botId/transcript` redirects to `/meetings/:botId?transcript=open`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/context/__tests__/MeetingContext.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MeetingProvider, useMeetingContext } from "../MeetingContext";

describe("MeetingContext", () => {
  it("stores and clears the current meeting summary", () => {
    const { result } = renderHook(() => useMeetingContext(), { wrapper: MeetingProvider });
    expect(result.current.current).toBeNull();
    act(() => result.current.setCurrent({ name: "Q3", thread: "recording", label: "Recording" }));
    expect(result.current.current?.name).toBe("Q3");
    act(() => result.current.setCurrent(null));
    expect(result.current.current).toBeNull();
  });
});
```

In `frontend/src/lib/__tests__/breadcrumb.test.ts`, replace the meeting-page expectations with:
```ts
    expect(breadcrumbFor("/meetings/42")).toBe("Meetings / Meeting #42");
    expect(breadcrumbFor("/meetings/42", "Q3 vendor review")).toBe("Meetings / Q3 vendor review");
    expect(breadcrumbFor("/meetings/42/transcript", "Q3")).toBe("Meetings / Q3 / Transcript");
```

Create `frontend/src/pages/__tests__/MeetingDetail.test.tsx`:
```tsx
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import * as api from "../../api";
import MeetingDetail from "../MeetingDetail";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });

const minutes: api.Minutes = { summary: "Vendor change agreed.", discussion: [], decisions: [{ text: "Change vendor for Q3", refs: [1] }], actions: [], notes: [] };
const outputs: api.OutputsResponse = { bot_id: 7, has_outputs: true, outputs: {
  mom: { format: "json", content: minutes, created_at: "x" },
  insights: { format: "json", content: { participation: [], themes: [], patterns: [], concerns: [], sentiment: { overall: "neutral", note: "n" }, takeaways: [] }, created_at: "x" },
  strategy: { format: "json", content: { priorities: [], followups: [], resources: [], risks: [], opportunities: [], agenda: [] }, created_at: "x" },
} };
const detailOf = (state: number, name = "Q3 vendor review") => ({
  meeting: { id: 7, object_id: "b", name, meeting_url: "u", state, created_at: "2026-09-02T10:00:00Z" },
  participants: [{ id: 1, full_name: "Ravi", email: null, is_host: true }, { id: 2, full_name: "Meena", email: null, is_host: false }],
});

beforeEach(() => {
  window.localStorage.setItem("saarai_api_key", "k");
  window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email: "p@b.com" }));
  vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(9));
  vi.spyOn(api.meetingsApi, "transcript").mockResolvedValue({ bot_id: 7, utterance_count: 2, transcript: [
    { speaker: "Ravi", timestamp_ms: 0, duration_ms: 1000, text: "Delivery slipped" },
    { speaker: "Ravi", timestamp_ms: 724_000, duration_ms: 1000, text: "So we change vendor" },
  ] });
  vi.spyOn(api.meetingsApi, "outputs").mockResolvedValue(outputs);
  vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 0, bots: [] });
});

function renderPage(route = "/meetings/7") {
  return renderWithProviders(
    <Routes>
      <Route path="/meetings/:botId" element={<MeetingDetail />} />
    </Routes>,
    { route },
  );
}

describe("MeetingDetail", () => {
  it("renders the header, thread, and essence for a ready meeting", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Q3 vendor review" })).toBeInTheDocument();
    expect(screen.getByText("Ravi · host")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Essence ready" })).toBeInTheDocument();
    expect(await screen.findByText("Vendor change agreed.")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("opens the transcript drawer on a citation and marks the utterance current", async () => {
    renderPage();
    const cite = await screen.findByRole("button", { name: "Show source at 12:04" });
    await userEvent.setup().click(cite);
    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
    expect(document.getElementById("utt-1")).toHaveAttribute("aria-current", "true");
  });

  it("opens the drawer from the URL", async () => {
    renderPage("/meetings/7?transcript=open");
    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
  });

  it("shows the waiting state for a live meeting with the drawer open", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(4, "Live one"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Essence arrives when the call ends" })).toBeInTheDocument();
    expect(await screen.findByRole("complementary", { name: "Transcript" })).toBeInTheDocument();
  });

  it("shows the failed state", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockResolvedValue(detailOf(7, "Broken"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("The bot could not complete this meeting");
    expect(screen.getByRole("img", { name: "Status: Failed" })).toBeInTheDocument();
  });

  it("shows not found", async () => {
    vi.spyOn(api.meetingsApi, "detail").mockRejectedValue(new api.ApiError(404, "Meeting not found"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Meeting not found" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/pages/__tests__/MeetingDetail.test.tsx src/context src/lib/__tests__/breadcrumb.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement MeetingContext.tsx and wire the providers**

```tsx
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";
import type { ThreadState } from "../components/ui/Thread";

export type MeetingSummary = { name: string; thread: ThreadState; label: string };

type MeetingContextValue = { current: MeetingSummary | null; setCurrent: (s: MeetingSummary | null) => void };

const MeetingContext = createContext<MeetingContextValue>({ current: null, setCurrent: () => undefined });

export function MeetingProvider({ children }: PropsWithChildren) {
  const [current, setCurrent] = useState<MeetingSummary | null>(null);
  const value = useMemo(() => ({ current, setCurrent }), [current]);
  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

export function useMeetingContext() {
  return useContext(MeetingContext);
}
```

In `AppShell.tsx`, wrap the authenticated branch's outer `<div className="flex h-screen ...">` in `<MeetingProvider>`. In `src/test/render.tsx`, add `<MeetingProvider>` inside `<AuthProvider>` around the `MemoryRouter`.

- [ ] **Step 4: Update breadcrumb.ts and TopBar.tsx**

`breadcrumb.ts`: signature `breadcrumbFor(pathname: string, meetingName?: string)`; push `meetingName ?? \`Meeting #${id}\``.

`TopBar.tsx`: import `useMeetingContext` and `Thread`; add `const { current } = useMeetingContext();`; breadcrumb becomes `breadcrumbFor(location.pathname, current?.name)`; replace the empty slot with:
```tsx
      <div id="topbar-thread" className="hidden flex-1 justify-center sm:flex">
        {current ? <Thread state={current.thread} size="card" label={`Status: ${current.label}`} className="max-w-[360px]" /> : null}
      </div>
```

- [ ] **Step 5: Rewrite MeetingDetail.tsx**

```tsx
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { SECTION_KEYS, type Insights, type Minutes, type SectionKey, type Strategy } from "../api";
import InsightsSection from "../components/meeting/InsightsSection";
import MinutesSection from "../components/meeting/MinutesSection";
import ParticipantChips from "../components/meeting/ParticipantChips";
import SectionFrame from "../components/meeting/SectionFrame";
import SectionNav, { SECTION_TITLES } from "../components/meeting/SectionNav";
import StrategySection from "../components/meeting/StrategySection";
import TranscriptDrawer from "../components/meeting/TranscriptDrawer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ErrorNotice from "../components/ui/ErrorNotice";
import LinkButton from "../components/ui/LinkButton";
import LoadingThread from "../components/ui/LoadingThread";
import Thread from "../components/ui/Thread";
import { useMeetingContext } from "../context/MeetingContext";
import { useMeeting } from "../hooks/useMeeting";
import { botStateToThreadState } from "../lib/status";
import { formatDate, formatDuration } from "../lib/time";

const PHASE_BODY: Record<string, string> = {
  live: "The bot is in the call and the transcript is growing beside you.",
  processing: "The call has ended and the recording is being transcribed.",
};

export function MeetingDetail() {
  const { botId } = useParams<{ botId: string }>();
  const id = Number(botId);
  const { meeting, participants, utterances, essence, phase, error, regenerate, retry } = useMeeting(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const { setCurrent } = useMeetingContext();

  const drawerOpen = searchParams.get("transcript") === "open";
  const setDrawer = useCallback((open: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (open) next.set("transcript", "open"); else next.delete("transcript");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Live meetings open the drawer by default.
  useEffect(() => {
    if (phase === "live") setDrawer(true);
  }, [phase, setDrawer]);

  // Publish name and thread to the top bar; clear on unmount.
  const status = meeting ? botStateToThreadState(meeting.state) : null;
  const name = meeting?.name;
  const threadState = status?.state;
  const threadLabel = status?.label;
  useEffect(() => {
    if (name && threadState && threadLabel) setCurrent({ name, thread: threadState, label: threadLabel });
    return () => setCurrent(null);
  }, [name, threadState, threadLabel, setCurrent]);

  const onCite = (index: number) => {
    setFocusIndex(index);
    setDrawer(true);
  };

  if (phase === "loading") return <LoadingThread />;
  if (phase === "notfound") {
    return (
      <EmptyState devanagari="खाली" title="Meeting not found" body="It may have been deleted, or the link is wrong." action={<LinkButton to="/meetings">All meetings</LinkButton>} />
    );
  }
  if (!meeting || !status) return <ErrorNotice message={error ?? "Couldn't load this meeting."} onRetry={retry} />;

  const last = utterances[utterances.length - 1];
  const duration = last ? formatDuration(last.timestamp_ms + last.duration_ms) : null;
  const regenerating = Object.fromEntries(SECTION_KEYS.map((k) => [k, essence[k].status === "generating"])) as Record<SectionKey, boolean>;
  const showEssence = phase === "generating" || phase === "ready";

  return (
    <div className="flex items-start gap-8">
      <div className="min-w-0 flex-1">
        <header className="mb-6">
          <h1 className="text-h1">{meeting.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-ink-2">
            <span>{formatDate(meeting.created_at)}</span>
            {duration ? <span>{duration}</span> : null}
            <ParticipantChips participants={participants} />
          </div>
          <Thread state={status.state} size="large" label={`Status: ${status.label}`} className="mt-4 max-w-[640px]" />
          {!drawerOpen ? (
            <Button variant="ghost" className="mt-3" onClick={() => setDrawer(true)}>Show transcript</Button>
          ) : null}
        </header>

        {error ? <ErrorNotice className="mb-4" message={error} onRetry={retry} /> : null}

        {phase === "failed" ? (
          <ErrorNotice message="The bot could not complete this meeting. Any transcript it captured is still available." />
        ) : showEssence ? (
          <div className="max-w-[720px]">
            <SectionNav onRegenerate={(k) => void regenerate(k)} regenerating={regenerating} />
            <SectionFrame id="mom" title={SECTION_TITLES.mom} state={essence.mom} onRetry={() => void regenerate("mom")}>
              {essence.mom.data ? <MinutesSection data={essence.mom.data as Minutes} utterances={utterances} onCite={onCite} /> : null}
            </SectionFrame>
            <SectionFrame id="insights" title={SECTION_TITLES.insights} state={essence.insights} onRetry={() => void regenerate("insights")}>
              {essence.insights.data ? <InsightsSection data={essence.insights.data as Insights} utterances={utterances} onCite={onCite} /> : null}
            </SectionFrame>
            <SectionFrame id="strategy" title={SECTION_TITLES.strategy} state={essence.strategy} onRetry={() => void regenerate("strategy")}>
              {essence.strategy.data ? <StrategySection data={essence.strategy.data as Strategy} utterances={utterances} onCite={onCite} /> : null}
            </SectionFrame>
          </div>
        ) : (
          <EmptyState devanagari="प्रतीक्षा" title="Essence arrives when the call ends" body={PHASE_BODY[phase] ?? ""} />
        )}
      </div>

      <TranscriptDrawer open={drawerOpen} onClose={() => setDrawer(false)} utterances={utterances} focusIndex={focusIndex} live={phase === "live"} />
    </div>
  );
}

export default MeetingDetail;
```

- [ ] **Step 6: Route changes and deletion**

In `AppRouter.tsx`: remove the `Transcript` import; add a small redirect component in the same file:
```tsx
function TranscriptRedirect() {
  const { botId } = useParams();
  return <Navigate to={`/meetings/${botId}?transcript=open`} replace />;
}
```
(import `Navigate` and `useParams` from react-router-dom) and change the route to `{ path: "meetings/:botId/transcript", element: <TranscriptRedirect /> }`. Delete `frontend/src/pages/Transcript.tsx`.

- [ ] **Step 7: Run everything**

Run: `npm test && npm run typecheck && npm run build`
Expected: all pass, no dangling import of `Transcript`.

- [ ] **Step 8: Commit**

```bash
git add -A frontend/src
git commit -m "feat(frontend): meeting workspace page with essence document, drawer, and top bar thread"
```

---

### Task 10: Dashboard as today's desk

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (rewrite), `frontend/src/pages/__tests__/app-pages.test.tsx` (Dashboard cases)

**Interfaces:**
- Consumes: `meetingsApi.botsStatus/create/recent`, `usePolling`, `StatusThread`, `LinkButton`, `isLiveState`, `botStateToThreadState`, `formatDate`, `formatDuration`.

- [ ] **Step 1: Replace the Dashboard tests**

In `frontend/src/pages/__tests__/app-pages.test.tsx`, replace the existing Dashboard test with:
```tsx
  it("Dashboard shows live bots on threads and recent meetings with teasers", async () => {
    vi.spyOn(api.meetingsApi, "recent").mockResolvedValue({ count: 2, meetings: [
      { meeting: { ...meeting, id: 9, name: "Hiring sync", state: 9 }, teaser: "Hire two engineers" },
      { meeting: { ...meeting, id: 10, name: "Board prep", state: 9 }, teaser: null },
    ] });
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    expect(await screen.findByRole("heading", { name: "Live now" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: Recording" })).toBeInTheDocument();
    expect(await screen.findByText("Hire two engineers")).toBeInTheDocument();
    expect(screen.getByText("Essence pending")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hiring sync/ })).toHaveAttribute("href", "/meetings/9");
    expect(screen.queryByText("Total meetings")).not.toBeInTheDocument();
  });

  it("Dashboard hides Live now when nothing is live", async () => {
    vi.spyOn(api.meetingsApi, "botsStatus").mockResolvedValue({ count: 0, bots: [] });
    vi.spyOn(api.meetingsApi, "recent").mockResolvedValue({ count: 0, meetings: [] });
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    expect(await screen.findByRole("heading", { name: "Recent" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Live now" })).not.toBeInTheDocument();
  });
```
(The `meeting` fixture in that file has `state: 4`, which is live.)

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- src/pages/__tests__/app-pages.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite Dashboard.tsx**

```tsx
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { meetingsApi, type Meeting, type RecentMeeting } from "../api";
import StatusThread from "../components/meeting/StatusThread";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ErrorNotice from "../components/ui/ErrorNotice";
import FormField from "../components/ui/FormField";
import LinkButton from "../components/ui/LinkButton";
import PageHeader from "../components/ui/PageHeader";
import Skeleton from "../components/ui/Skeleton";
import { usePolling } from "../hooks/usePolling";
import { botStateToThreadState, isLiveState } from "../lib/status";
import { formatDate, formatDuration } from "../lib/time";

const BOTS_MS = 10_000;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const rowLink = "flex items-center gap-4 rounded-control px-3 py-2 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function Dashboard() {
  const [bots, setBots] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<RecentMeeting[] | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("SaarAI Bot");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadBots = useCallback(async () => {
    try {
      const data = await meetingsApi.botsStatus();
      setBots(data.bots);
    } catch {
      // Live rows are a convenience; a failed poll keeps the last known state.
    }
  }, []);
  usePolling(loadBots, BOTS_MS);

  const loadRecent = useCallback(async () => {
    try {
      const data = await meetingsApi.recent(5);
      setRecent(data.meetings);
      setRecentError(null);
    } catch (err) {
      setRecentError(err instanceof Error ? err.message : "Couldn't load recent meetings.");
      setRecent([]);
    }
  }, []);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const sendBot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!meetingUrl.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await meetingsApi.create(meetingUrl.trim(), botName.trim() || "SaarAI Bot");
      setMeetingUrl("");
      await loadBots();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send the bot.");
    } finally {
      setSending(false);
    }
  };

  const live = bots.filter((b) => isLiveState(b.state));

  return (
    <div className="space-y-8">
      <PageHeader title={greeting()} subtitle={formatDate(new Date().toISOString())} />

      <Card title="Send a bot" subtitle="Paste a Google Meet, Zoom, or Teams link.">
        <form onSubmit={sendBot} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <FormField label="Meeting URL" type="url" placeholder="https://meet.google.com/abc-defg-hij" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} required />
          <FormField label="Bot name" value={botName} onChange={(e) => setBotName(e.target.value)} />
          <Button type="submit" disabled={sending}>{sending ? "Sending" : "Send bot"}</Button>
        </form>
        {sendError ? <ErrorNotice className="mt-4" message={sendError} /> : null}
      </Card>

      {live.length > 0 ? (
        <Card title="Live now" noPadding>
          <ul className="px-3 pb-3">
            {live.map((b) => {
              const s = botStateToThreadState(b.state);
              return (
                <li key={b.id}>
                  <Link to={`/meetings/${b.id}`} className={rowLink}>
                    <span className="min-w-0 flex-1 truncate text-body">{b.name}</span>
                    <StatusThread state={s.state} label={s.label} size="card" />
                    <span className="text-small text-ink-2">{formatDuration(Date.now() - new Date(b.created_at).getTime())}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card title="Recent" noPadding>
        {recent === null ? (
          <div className="space-y-2 px-6 pb-6"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : recentError ? (
          <div className="px-6 pb-6"><ErrorNotice message={recentError} onRetry={() => void loadRecent()} /></div>
        ) : recent.length === 0 ? (
          <p className="px-6 pb-6 text-body text-ink-2">Finished meetings and their first decision will appear here.</p>
        ) : (
          <ul className="px-3 pb-3">
            {recent.map(({ meeting, teaser }) => (
              <li key={meeting.id}>
                <Link to={`/meetings/${meeting.id}`} className={rowLink}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">{meeting.name}</span>
                    <span className={["block truncate text-small", teaser ? "text-ink-2" : "text-gold"].join(" ")}>{teaser ?? "Essence pending"}</span>
                  </span>
                  <span className="text-small text-ink-2">{formatDate(meeting.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-6 py-3">
          <LinkButton to="/meetings" variant="secondary">All meetings</LinkButton>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
```

- [ ] **Step 4: Run everything and commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/__tests__/app-pages.test.tsx
git commit -m "feat(frontend): dashboard becomes today's desk with live threads and recent teasers"
```

---

### Task 11: Meetings list rows, live-first sort, errors

**Files:**
- Modify: `frontend/src/pages/Meetings.tsx`, `frontend/src/pages/__tests__/app-pages.test.tsx` (Meetings cases)

- [ ] **Step 1: Add the failing tests**

In `app-pages.test.tsx` add (import `userEvent` from `@testing-library/user-event` if missing):
```tsx
  it("Meetings rows link to the workspace and live meetings sort first", async () => {
    vi.spyOn(api.meetingsApi, "list").mockResolvedValue({ count: 2, meetings: [
      { ...meeting, id: 1, name: "Old finished", state: 9, created_at: "2026-09-05T10:00:00Z" },
      { ...meeting, id: 2, name: "Happening now", state: 4, created_at: "2026-09-01T10:00:00Z" },
    ] });
    renderWithProviders(<Meetings />, { route: "/meetings" });
    const links = await screen.findAllByRole("link", { name: /Old finished|Happening now/ });
    expect(links[0]).toHaveAttribute("href", "/meetings/2");
    expect(links[1]).toHaveAttribute("href", "/meetings/1");
    expect(screen.queryByRole("link", { name: "Details" })).not.toBeInTheDocument();
  });

  it("Meetings shows an error with retry when the list fails", async () => {
    vi.spyOn(api.meetingsApi, "list").mockRejectedValueOnce(new api.ApiError(503, "Service unavailable")).mockResolvedValue({ count: 0, meetings: [] });
    renderWithProviders(<Meetings />, { route: "/meetings" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "No meetings yet" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- src/pages/__tests__/app-pages.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Change Meetings.tsx**

Keep search, status filter, sort, pagination, both empty states, and the `?q=` sync. Make these edits:

1. Delete `PRIMARY_LINK` and `SECONDARY_LINK`; import `LinkButton`, `ErrorNotice`, `StatusThread`, `isLiveState`, and `useCallback`. The "no meetings" empty state action becomes `<LinkButton to="/dashboard">Send bot</LinkButton>`.
2. `const FILTER_STATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];` with option labels from `botStateToThreadState(code).label`.
3. Loading with errors:
```tsx
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.list();
      setMeetings(data.meetings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load meetings.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
```
   Render `<ErrorNotice message={error} onRetry={() => void load()} />` instead of the table when `error` is set and `loading` is false.
4. After sorting, put live meetings first: `const ordered = [...sorted.filter((m) => isLiveState(m.state)), ...sorted.filter((m) => !isLiveState(m.state))];` and paginate `ordered`.
5. Rows: `<tr className="relative border-b border-line last:border-0 hover:bg-raised">`; the name cell becomes
```tsx
  <td className="px-5 py-3.5">
    <Link to={`/meetings/${meeting.id}`} className="font-medium text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
      {meeting.name}
    </Link>
  </td>
```
   Remove the Actions column (header and cells) and the `isCompleted` gate; the status cell becomes `<StatusThread state={status.state} label={status.label} />` where `const status = botStateToThreadState(meeting.state)`.

- [ ] **Step 4: Run everything and commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add frontend/src/pages/Meetings.tsx frontend/src/pages/__tests__/app-pages.test.tsx
git commit -m "feat(frontend): meetings rows open the workspace, live first, errors shown"
```

---

### Task 12: Mobile mesh, leftovers, and end-to-end verification

**Files:**
- Modify: `frontend/src/components/layout/CornerMesh.tsx`, `frontend/src/index.css`, `README.md`

- [ ] **Step 1: Dim the mesh on small screens**

In `index.css` under `@layer utilities`, add:
```css
  .mesh-opacity { opacity: var(--mesh-opacity); }
  @media (max-width: 767px) {
    .mesh-opacity { opacity: 0.25; }
  }
```
In `CornerMesh.tsx`, remove the inline `style` and set `className="pointer-events-none fixed -bottom-10 -right-10 z-0 h-52 w-52 md:h-80 md:w-80 mesh-opacity"`.

- [ ] **Step 2: Confirm nothing old remains**

Run from `frontend/`:
```bash
grep -rn "PRIMARY_LINK\|SECONDARY_LINK\|pages/Transcript\|Meeting #" src | grep -v __tests__ | grep -v breadcrumb.ts
```
Expected: no output.

- [ ] **Step 3: Full suites**

Run from `saar_ai/`: `../.venv/bin/python -m pytest tests -q`, and from `frontend/`: `npm test && npm run typecheck && npm run build`.
Expected: all pass.

- [ ] **Step 4: End-to-end with a real meeting**

With Postgres and Attendee running, the API on 8001, and `npm run dev` on 5173:
1. Dashboard: send a bot to a test call. The meeting appears under Live now on its thread within 10 seconds.
2. Open it. Live phase: thread at Recording, drawer open, lines appearing as people speak, "Jump to latest" after scrolling up.
3. End the call. The thread moves to Transcribing, then the page switches to generating: three section headings with skeletons, filling in as each finishes.
4. Read the essence: decisions with citations, the action table, participation bars. Click a citation: the drawer scrolls and the line highlights.
5. Regenerate one section from the menu. Only that section shows skeletons.
6. Open an old meeting with markdown outputs: the legacy notice shows, and "Regenerate for citations" replaces it with structured content.
7. Both themes at 1280px and 375px: the drawer is a sheet on the phone, Escape closes it, the tab bar stays reachable.
Record what you saw in the commit message. Fix anything broken in place.

- [ ] **Step 5: Tick the roadmap**

In `README.md`, move the "Meeting workspace" item from Next to Shipped with this wording: `- [x] **Meeting workspace.** A finished meeting reads as a cited essence document; every decision, action, and risk links back to the transcript line it came from. Live meetings show the transcript as it grows.`

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src README.md
git commit -m "feat(frontend): dim corner mesh on phones; verify meeting workspace end to end"
```

---

## Self-review notes

- Spec coverage: schemas and clamping (T1), numbering and generators (T2), storage, lock, status, outputs format (T3), recent endpoint (T4), types, status map, failed Thread, LinkButton, StatusThread, time helpers (T5), `useMeeting` phases and polling (T6), essence components and citations (T7), drawer with find, live follow, focus, dialog semantics (T8), page assembly, MeetingContext, top bar thread and breadcrumb, redirect (T9), Dashboard (T10), Meetings (T11), mesh and verification (T12).
- Spec deviation: the recent teaser falls back to the Minutes summary when there are no decisions, so a meeting with structured output never reads "Essence pending".
- Known cost accepted in T8: the drawer renders both the desktop aside and the mobile dialog and hides one with CSS, so utterance ids are duplicated in the DOM; `getElementById` and `scrollIntoView` target the first (desktop) copy. If this proves a problem in the end-to-end check, switch to a `matchMedia("(min-width: 1024px)")` hook rendering only one variant.
- Type consistency: `SectionKey` and `SECTION_KEYS` come from `api.ts`; `SectionState`, `IndexedUtterance`, `Phase` from `hooks/useMeeting.ts`; `SECTION_TITLES` from `SectionNav.tsx`; `MeetingSummary` from `context/MeetingContext.tsx`. Backend names monkeypatched by tests are module attributes of the routers: `verify_bot_access`, `get_transcript`, `get_participants`, `save_output`, `get_done_types`, `generate_mom`, `generate_insight`, `generate_strategy` in `generate.py`; `verify_bot_access`, `get_outputs`, `get_recent_with_teasers` in `meetings.py`.
