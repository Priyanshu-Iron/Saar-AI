import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def get_llm(temperature: float = 0.7):
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    
    if provider == "openai":
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=temperature
        )
    elif provider == "google":
        return ChatGoogleGenerativeAI(
            model=os.getenv("GOOGLE_MODEL", "gemini-1.5-flash"),
            temperature=temperature
        )
    else:
        return ChatOpenAI(model="gpt-4o-mini", temperature=temperature)