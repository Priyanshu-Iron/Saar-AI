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
