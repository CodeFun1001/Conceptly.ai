from typing import Dict
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import os
import re
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)

def clean_markdown_formatting(text: str) -> str:
    if not text:
        return ""
    
    text = re.sub(r'\*\*\*([^\*]+)\*\*\*', r'### \1', text)
    text = re.sub(r'\*\*([^\*]+)\*\*', r'**\1**', text)
    
    text = re.sub(r'^\*+\s*(.+?)\s*\*+$', r'### \1', text, flags=re.MULTILINE)
    
    text = re.sub(r'\*{3,}', '**', text)
    
    text = re.sub(r'^\s*[\*-]\s+', '• ', text, flags=re.MULTILINE)
    
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    text = re.sub(r'^\*\s*', '', text, flags=re.MULTILINE)
    
    return text.strip()

def explain_checkpoint(
    checkpoint: Dict,
    context: str,
    tutor_mode: str = "supportive_buddy"
) -> str:
    
    tutor_personalities = {
        "chill_friend": "Teach in a casual, friendly way with relatable examples. Use clean, readable formatting.",
        "strict_mentor": "Provide structured, detailed explanations with precision. Use clear section headers.",
        "supportive_buddy": "Explain warmly with encouragement and clear examples. Use friendly formatting.",
        "exam_mode": "Focus on exam-relevant points with concise clarity. Use organized bullet points."
    }
    
    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )
    
    system_msg = SystemMessage(
        content=f"""You are an educational content creator. {personality}

CRITICAL FORMATTING RULES:
1. Use ### for section headers (not asterisks)
2. Use bullet points with • symbol (not asterisks)
3. Use **bold** only for emphasis (single words/phrases, not entire lines)
4. Write in clear paragraphs with proper spacing
5. Avoid excessive markdown formatting
6. Make content readable and clean
7. NO asterisks for headers or sections"""
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

FORMATTING REQUIREMENTS:
- Start with a brief introduction
- Use ### for main section headers
- Use bullet points (•) for lists
- Write in clear paragraphs
- Use examples and analogies
- NO asterisks for headers or formatting
- Make it comprehensive and easy to read

The explanation should be clean, professional, and easy to read without excessive markdown symbols.
""")
    
    response = llm.invoke([system_msg, human_msg])
    cleaned_explanation = clean_markdown_formatting(response.content)
    
    return cleaned_explanation