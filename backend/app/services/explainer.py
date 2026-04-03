from typing import Dict, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm import get_llm

llm = get_llm(temperature=0)

def explain_checkpoint(
    checkpoint: Dict,
    context: str,
    tutor_mode: str = "supportive_buddy",
    session_id: Optional[int] = None,
) -> str:
    tutor_personalities = {
        "chill_friend":    "Teach in a casual, friendly way with relatable examples.",
        "strict_mentor":   "Provide structured, detailed explanations with precision.",
        "supportive_buddy":"Explain warmly with encouragement and clear examples.",
        "exam_mode":       "Focus on exam-relevant points with concise clarity.",
    }
    personality = tutor_personalities.get(tutor_mode, tutor_personalities["supportive_buddy"])

    topic        = checkpoint.get("topic", "")
    objectives   = checkpoint.get("objectives", [])
    key_concepts = checkpoint.get("key_concepts", [])

    augmented_context = context

    try:
        from app.services.rag_service import build_rag_context, ensure_session_knowledge
        if session_id:
            ensure_session_knowledge(session_id, topic, objectives, key_concepts)
            query = topic + " " + " ".join(key_concepts[:5])
            augmented_context = build_rag_context(
                base_context=context,
                query=query,
                session_id=session_id,
                topic=topic,
                objectives=objectives,
                key_concepts=key_concepts,
                max_extra_chars=1500,
            )
            print(f"explainer: Agentic RAG applied for session {session_id}")
    except Exception as e:
        print(f"explainer RAG error (non-fatal): {e}")

    system_msg = SystemMessage(
        content=f"You are an educational content creator. {personality}"
    )

    objectives_text = "\n".join(f"  - {obj}" for obj in objectives)

    human_msg = HumanMessage(content=f"""
TOPIC: {topic}
LEVEL: {checkpoint.get("level", "intermediate")}

OBJECTIVES:
{objectives_text}

CONTENT:
{augmented_context[:3000]}

Create a clear, engaging explanation (600-1200 words) that teaches this topic effectively.
Use examples, analogies, and memory aids where appropriate.
""")

    response = llm.invoke([system_msg, human_msg])
    return response.content