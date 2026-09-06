from app.services.transcript_text import numbered_transcript


def test_numbers_lines_from_zero_in_given_order():
    rows = [
        {"speaker": "Ravi", "text": "Hello", "timestamp_ms": 0, "duration_ms": 10},
        {"speaker": "Meena", "text": "ठीक है", "timestamp_ms": 500, "duration_ms": 10},
    ]
    assert numbered_transcript(rows) == "[0] Ravi: Hello\n[1] Meena: ठीक है"


def test_empty_transcript_is_empty_string():
    assert numbered_transcript([]) == ""
