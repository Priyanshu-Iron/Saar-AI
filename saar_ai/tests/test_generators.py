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
