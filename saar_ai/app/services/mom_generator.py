from langchain_core.prompts import ChatPromptTemplate
from .llm_config import get_llm

MOM_PROMPT = ChatPromptTemplate.from_template("""
You are an expert meeting analyst. Generate a comprehensive Minutes of Meeting (MOM) from the following transcript.

## Meeting Information
**Participants:** {participants}

## Transcript
{transcript}

---

## Instructions
Create a well-structured MOM in the following format:

### 📋 Meeting Summary
A 2-3 sentence executive summary of what the meeting was about.

### 👥 Attendees
List all participants and their roles if apparent.

### 📌 Key Discussion Points
- Bullet points of main topics discussed
- Include who raised each point if relevant

### ✅ Decisions Made
- List any decisions that were agreed upon
- Note who made or approved each decision

### 🎯 Action Items
| Action | Owner | Deadline |
|--------|-------|----------|
| Specific task | Person responsible | If mentioned |

### 📝 Additional Notes
Any other relevant observations or context.

---

Generate the MOM in clear, professional English. Be concise but thorough.
""")


def generate_mom(transcript: str, participants: list) -> str:
    """
    Generate Minutes of Meeting from transcript and participant list.
    
    Args:
        transcript: Full meeting transcript with speaker labels
        participants: List of participant dicts with 'full_name', 'is_host', etc.
    
    Returns:
        Formatted MOM as markdown string
    """
    # Format participants list
    participant_str = ", ".join([
        f"{p['full_name']}{'(Host)' if p.get('is_host') else ''}" 
        for p in participants
    ])
    
    llm = get_llm(temperature=0.5)  # Lower temp for more consistent output
    chain = MOM_PROMPT | llm
    
    try:
        response = chain.invoke({
            "participants": participant_str,
            "transcript": transcript
        })
        return response.content
    except Exception as e:
        return f"Error generating MOM: {str(e)}"