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
