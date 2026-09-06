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
