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
