from typing import Dict, List
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import os
import re
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.5,
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

def apply_feynman_teaching(
    checkpoint: Dict,
    weak_areas: List[str],
    attempt: int,
    tutor_mode: str = "supportive_buddy"
) -> str:
    
    print(f"Applying Feynman technique for checkpoint")
    print(f"Weak areas: {weak_areas}")
    print(f"Attempt: {attempt + 1}")
    print(f"Tutor mode: {tutor_mode}")
    
    teaching_approaches = [
        "everyday analogies and real-world examples",
        "step-by-step breakdown with visual descriptions",
        "storytelling and narrative explanation",
        "question-answer format with guided reasoning",
        "comparison with familiar concepts and metaphors"
    ]
    
    current_approach = teaching_approaches[attempt % len(teaching_approaches)]
    
    tutor_personalities = {
        "chill_friend": "Explain like talking to a friend over coffee, using casual language and relatable examples. Use clean formatting.",
        "strict_mentor": "Provide a rigorous, systematic explanation with precise terminology and thorough coverage. Use organized structure.",
        "supportive_buddy": "Give an encouraging, patient explanation that builds confidence step by step. Use friendly formatting.",
        "exam_mode": "Focus on essential points needed for exams with clear, memorizable explanations. Use concise structure."
    }
    
    personality = tutor_personalities.get(
        tutor_mode,
        tutor_personalities["supportive_buddy"]
    )
    
    system_msg = SystemMessage(content=f"""You are a Feynman Technique expert. {personality}

Your goal: Help student understand difficult concepts by:
1. First explaining PREREQUISITE concepts needed to understand the weak areas
2. Then teaching the weak areas using {current_approach}
3. Building from basics to advanced understanding
4. Using simple language and concrete examples

Make complex ideas crystal clear.

CRITICAL FORMATTING RULES:
- Use ### for section headers (not asterisks)
- Use bullet points with • symbol (not asterisks)
- Use **bold** only for key terms
- Write in clear paragraphs
- NO excessive markdown formatting
- Make content clean and readable""")
    
    weak_text = "\n".join(f"  {i+1}. {area}" for i, area in enumerate(weak_areas))
    
    objectives_text = "\n".join(
        f"  - {obj}" for obj in checkpoint.get('objectives', [])
    )
    
    human_msg = HumanMessage(content=f"""Re-teach using {current_approach}:

TOPIC: {checkpoint.get('topic')}
LEVEL: {checkpoint.get('level', 'intermediate')}

OBJECTIVES:
{objectives_text}

AREAS STUDENT STRUGGLED WITH:
{weak_text}

ATTEMPT: {attempt + 1}
TEACHING APPROACH: {current_approach}

INSTRUCTIONS:
1. Start by identifying and explaining PREREQUISITE concepts needed to understand these weak areas
2. Explain each prerequisite concept simply with examples
3. Then re-teach each weak area using {current_approach}
4. Connect prerequisites to weak areas explicitly
5. Use simple language, avoid jargon
6. Include concrete examples and analogies
7. Build understanding step-by-step

FORMATTING:
- Use ### for headers
- Use • for bullet points
- Write in clear paragraphs
- NO asterisks for formatting
- Keep it clean and readable

Create a comprehensive re-explanation (500-800 words) that ensures understanding.""")
    
    try:
        response = llm.invoke([system_msg, human_msg])
        
        # Clean the formatting
        explanation = clean_markdown_formatting(response.content)
        
        print(f"Feynman explanation generated: {len(explanation)} characters")
        print(f"Teaching approach used: {current_approach}")
        
        return explanation
        
    except Exception as e:
        print(f"Feynman teaching error: {e}")
        import traceback
        traceback.print_exc()
        
        fallback = f"""### Understanding {checkpoint.get('topic')} Better

We'll focus on these areas where you struggled:
{weak_text}

Let me break this down step by step using {current_approach}.

### Building the Foundation

First, let's understand the basics you need to know before tackling these concepts.

The core idea behind {checkpoint.get('topic')} involves understanding the fundamental principles that connect all these concepts together.

### Breaking Down Each Area

Now let's look at each area where you had difficulty and explain it more clearly.

Remember: Understanding takes time. Let's go through this together, one step at a time. Don't hesitate to review this explanation multiple times."""
        
        return fallback