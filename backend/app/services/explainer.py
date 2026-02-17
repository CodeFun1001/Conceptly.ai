from typing import Dict
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)

def explain_checkpoint(
    checkpoint: Dict,
    context: str,
    tutor_mode: str = "supportive_buddy"
) -> str:
    
    tutor_personalities = {
        "chill_friend": "Teach in a casual, friendly way with relatable examples.",
        "strict_mentor": "Provide structured, detailed explanations with precision.",
        "supportive_buddy": "Explain warmly with encouragement and clear examples.",
        "exam_mode": "Focus on exam-relevant points with concise clarity."
    }
    
    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )
    
    system_msg = SystemMessage(
        content=f"You are an educational content creator. {personality}"
    )
    
    objectives_text = "\n".join(
        f"  • {obj}" for obj in checkpoint.get('objectives', [])
    )
    
    human_msg = HumanMessage(content=f"""
TOPIC: {checkpoint.get('topic')}
LEVEL: {checkpoint.get('level', 'intermediate')}

OBJECTIVES:
{objectives_text}

CONTENT:
{context[:3000]}

Create a clear, engaging explanation (600-1200 words) that teaches this topic effectively.
Use examples, analogies, and memory aids where appropriate.
Make it comprehensive so students can truly understand the material.
""")
    
    response = llm.invoke([system_msg, human_msg])
    
    return response.content