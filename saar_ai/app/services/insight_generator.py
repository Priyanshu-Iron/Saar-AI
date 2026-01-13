from langchain_core.prompts import ChatPromptTemplate
from .llm_config import get_llm

INSIGHT_PROMPT = ChatPromptTemplate.from_template("""
You are an expert meeting analyst specializing in communication patterns and team dynamics. Analyze the following meeting transcript and provide deep insights.

## Meeting Information
**Participants:** {participants}
**Total Utterances:** {utterance_count}

## Transcript
{transcript}

---

## Instructions
Provide a comprehensive analysis in the following format:

### 📊 Participation Analysis
- Who dominated the conversation (speaking time/frequency)
- Who was relatively quiet
- Overall participation balance

### 🎯 Key Themes Detected
- Main topics discussed (with frequency/importance)
- Recurring themes or concerns
- Technical vs non-technical discussion ratio

### 💬 Communication Patterns
- Collaborative vs directive tone
- Question frequency (who asked, who answered)
- Any interruptions or overlaps noted

### ⚠️ Concerns & Blockers
- Any issues or blockers mentioned
- Unresolved questions
- Potential risks discussed

### 😊 Sentiment Overview
- Overall meeting tone (positive/neutral/negative)
- Any tension or disagreements
- Team morale indicators

### 💡 Key Takeaways
- Top 3-5 most important points from this meeting
- What requires immediate attention

---

Be analytical and objective. Support observations with specific examples from the transcript when possible.
""")


def generate_insight(transcript: str, participants: list, utterance_count: int = 0) -> str:
    """
    Generate meeting insights from transcript.
    
    Args:
        transcript: Full meeting transcript with speaker labels
        participants: List of participant dicts
        utterance_count: Number of utterances in the meeting
    
    Returns:
        Formatted insights as markdown string
    """
    participant_str = ", ".join([
        f"{p['full_name']}{'(Host)' if p.get('is_host') else ''}" 
        for p in participants
    ])
    
    llm = get_llm(temperature=0.6)
    chain = INSIGHT_PROMPT | llm
    
    try:
        response = chain.invoke({
            "participants": participant_str,
            "transcript": transcript,
            "utterance_count": utterance_count
        })
        return response.content
    except Exception as e:
        return f"Error generating insights: {str(e)}"