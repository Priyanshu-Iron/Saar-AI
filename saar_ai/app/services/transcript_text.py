from collections.abc import Mapping


def numbered_transcript(rows: list[Mapping]) -> str:
    """One line per utterance, numbered from 0 in the given (timestamp) order."""
    return "\n".join(f"[{i}] {row['speaker']}: {row['text']}" for i, row in enumerate(rows))


def participant_line(participants: list[Mapping]) -> str:
    return ", ".join(
        f"{p['full_name']}{' (Host)' if p.get('is_host') else ''}" for p in participants
    )
