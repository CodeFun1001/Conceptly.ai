from typing import Dict, List, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm import get_llm

llm = get_llm(temperature=0.5)

def apply_feynman_teaching(
    checkpoint: Dict,
    weak_areas: List[str],
    attempt: int,
    tutor_mode: str = "supportive_buddy",
    session_id: Optional[int] = None,
) -> str:
    print(f"Applying Feynman technique | attempt={attempt + 1} | mode={tutor_mode}")
    print(f"Weak areas: {weak_areas}")

    teaching_approaches = [
        "everyday analogies and real-world examples",
        "step-by-step breakdown with visual descriptions",
        "storytelling and narrative explanation",
        "question-answer format with guided reasoning",
        "comparison with familiar concepts and metaphors",
    ]
    current_approach = teaching_approaches[attempt % len(teaching_approaches)]

    tutor_personalities = {
        "chill_friend":    "Explain like talking to a friend over coffee, using casual language.",
        "strict_mentor":   "Provide a rigorous, systematic explanation with precise terminology.",
        "supportive_buddy":"Give an encouraging, patient explanation that builds confidence.",
        "exam_mode":       "Focus on essential points for exams with clear, memorizable explanations.",
    }
    personality = tutor_personalities.get(tutor_mode, tutor_personalities["supportive_buddy"])

    topic        = checkpoint.get("topic", "")
    objectives   = checkpoint.get("objectives", [])
    key_concepts = checkpoint.get("key_concepts", [])
    rag_context = ""
    try:
        from app.services.rag_service import build_rag_context, ensure_session_knowledge
        if session_id:
            ensure_session_knowledge(session_id, topic, objectives, key_concepts)
            weak_query = topic + " " + " ".join(weak_areas[:3])
            rag_context = build_rag_context(
                base_context="",
                query=weak_query,
                session_id=session_id,
                topic=topic,
                objectives=objectives,
                key_concepts=key_concepts,
                max_extra_chars=1200,
            )
            print(f"feynman: Agentic RAG applied for session {session_id}")
    except Exception as e:
        print(f"feynman RAG error (non-fatal): {e}")

    system_msg = SystemMessage(content=f"""You are a Feynman Technique expert. {personality}

Your goal: Help the student understand difficult concepts by:
1. Explaining PREREQUISITE concepts needed to understand the weak areas
2. Teaching the weak areas using {current_approach}
3. Building from basics to advanced understanding
4. Using simple language and concrete examples

Make complex ideas crystal clear.""")

    weak_text      = "\n".join(f"  {i+1}. {area}" for i, area in enumerate(weak_areas))
    objectives_text = "\n".join(f"  - {obj}" for obj in objectives)
    rag_section    = f"\n\nADDITIONAL CONTEXT:\n{rag_context}" if rag_context.strip() else ""

    human_msg = HumanMessage(content=f"""Re-teach using {current_approach}:

TOPIC: {topic}
LEVEL: {checkpoint.get("level", "intermediate")}

OBJECTIVES:
{objectives_text}

AREAS STUDENT STRUGGLED WITH:
{weak_text}

ATTEMPT: {attempt + 1}
TEACHING APPROACH: {current_approach}
{rag_section}

INSTRUCTIONS:
1. Start by identifying and explaining PREREQUISITE concepts for the weak areas
2. Explain each prerequisite simply with examples
3. Re-teach each weak area using {current_approach}
4. Connect prerequisites to weak areas explicitly
5. Use simple language, avoid jargon
6. Include concrete examples and analogies

Create a comprehensive re-explanation (500-800 words).""")

    try:
        response = llm.invoke([system_msg, human_msg])
        print(f"Feynman explanation: {len(response.content)} chars | approach: {current_approach}")
        return response.content

    except Exception as e:
        print(f"Feynman teaching error: {e}")
        fallback = f"""Let me help you understand {topic} better.

We'll focus on these areas where you struggled:
{weak_text}

Let me break this down step by step using {current_approach}.

First, let's understand the basics you need before tackling these concepts.

The core idea behind {topic} is...

Now let's look at each area where you had difficulty and explain it more clearly.

Remember: Understanding takes time. Let's go through this together, one step at a time."""
        return fallback