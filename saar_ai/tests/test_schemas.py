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
