from langchain_core.prompts import ChatPromptTemplate
from .llm_config import get_llm

STRATEGY_PROMPT = ChatPromptTemplate.from_template("""
You are a strategic advisor and business consultant. Based on the following meeting transcript, provide actionable recommendations and strategic next steps.

## Meeting Information
**Participants:** {participants}

## Transcript
{transcript}

---

## Instructions
Provide strategic recommendations in the following format:

### 🎯 Priority Actions (Do This Week)
Immediate actions that should be taken within the next 7 days:
1. **Action**: [Specific task] — **Owner**: [Suggested person] — **Why**: [Brief reason]
2. ...

### 📅 Follow-up Recommendations
- Suggested follow-up meetings with proposed agenda
- Check-ins needed with specific people
- Milestones to track

### 👥 Resource & Team Recommendations
- Any additional resources needed
- Team structure or responsibility suggestions
- Skills or expertise gaps identified

### ⚠️ Risk Mitigation
| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Identified risk | High/Medium/Low | High/Medium/Low | How to address it |

### 🚀 Strategic Opportunities
- Opportunities mentioned or implied in the discussion
- Quick wins that can be achieved
- Long-term strategic considerations

### 📋 Suggested Next Meeting Agenda
If a follow-up is needed, propose a focused agenda:
1. ...
2. ...
3. ...

---

Be specific and actionable. Recommendations should be practical and based on the actual discussion content.
""")


def generate_strategy(transcript: str, participants: list) -> str:
    """
    Generate strategic recommendations from meeting transcript.
    
    Args:
        transcript: Full meeting transcript with speaker labels
        participants: List of participant dicts
    
    Returns:
        Formatted strategy recommendations as markdown string
    """
    participant_str = ", ".join([
        f"{p['full_name']}{'(Host)' if p.get('is_host') else ''}" 
        for p in participants
    ])
    
    llm = get_llm(temperature=0.7)  # Slightly higher for creative recommendations
    chain = STRATEGY_PROMPT | llm
    
    try:
        response = chain.invoke({
            "participants": participant_str,
            "transcript": transcript
        })
        return response.content
    except Exception as e:
        return f"Error generating strategy: {str(e)}"