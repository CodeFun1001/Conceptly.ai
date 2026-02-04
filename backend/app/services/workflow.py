from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any, Optional
from langsmith import traceable
import os

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "learning-agent-groq"

class LearningState(TypedDict):
    checkpoint: Dict
    tutor_mode: str
    context: str
    explanation: str
    questions: List[Dict]
    validation_score: float
    context_validated: bool
    weak_areas: List[str]
    attempt_number: int
    workflow_complete: bool

@traceable(name="gather_context_node")
def gather_context_node(state: LearningState) -> LearningState:
    from app.services import context_gatherer
    
    print(f"Gathering context for: {state['checkpoint']['topic']}")
    print(f"Using tutor mode: {state['tutor_mode']}")
    
    context = context_gatherer.gather_context(
        state['checkpoint'],
        state['tutor_mode']
    )
    
    state['context'] = context
    state['context_validated'] = False
    
    print(f"Context gathered: {len(context)} characters")
    
    return state

@traceable(name="validate_context_node")
def validate_context_node(state: LearningState) -> LearningState:
    from app.services.context_gatherer import validate_context
    
    print(f"Validating context quality...")
    
    validation_result = validate_context(
        state['checkpoint'],
        state['context']
    )
    
    state['validation_score'] = validation_result['score']
    state['context_validated'] = validation_result['score'] >= 85
    
    print(f"Validation score: {validation_result['score']}/100")
    if state['context_validated']:
        print("✓ Context validation passed")
    else:
        print("⚠ Context validation failed, will retry")
    
    return state

@traceable(name="explain_node")
def explain_node(state: LearningState) -> LearningState:
    from app.services import explainer
    
    print(f"Creating explanation for checkpoint...")
    print(f"Using tutor mode: {state['tutor_mode']}")
    
    explanation = explainer.explain_checkpoint(
        state['checkpoint'],
        state['context'],
        state['tutor_mode']
    )
    
    state['explanation'] = explanation
    
    print(f"Explanation created: {len(explanation)} characters")
    
    return state

@traceable(name="generate_questions_node")
def generate_questions_node(state: LearningState) -> LearningState:
    from app.services import question_generator
    
    print(f"Generating assessment questions...")
    print(f"Using tutor mode: {state['tutor_mode']}")
    print(f"Attempt number: {state.get('attempt_number', 0)}")
    
    questions = question_generator.generate_questions(
        state['checkpoint'],
        state['context'],
        state['checkpoint'].get('level', 'intermediate'),
        state['tutor_mode'],
        state.get('weak_areas', []),
        state.get('attempt_number', 0)
    )
    
    state['questions'] = questions
    state['workflow_complete'] = True
    
    print(f"✓ Generated {len(questions)} questions")
    print("✓ Workflow execution completed successfully")
    
    return state

def should_retry_context(state: LearningState) -> str:
    if state.get('context_validated', False):
        return "proceed"
    
    
    if state.get('validation_score', 0) == 0:
        
        return "retry" if state.get('validation_score', 0) < 85 else "proceed"
    
    
    print("Using current context (retry limit reached or score acceptable)")
    state['context_validated'] = True
    return "proceed"

def create_workflow():
    workflow = StateGraph(LearningState)    
    
    workflow.add_node("gather_context", gather_context_node)
    workflow.add_node("validate_context", validate_context_node)
    workflow.add_node("explain", explain_node)
    workflow.add_node("generate_questions", generate_questions_node)
    
    workflow.set_entry_point("gather_context")
    
    workflow.add_edge("gather_context", "validate_context")
        
    workflow.add_conditional_edges(
        "validate_context",
        should_retry_context,
        {
            "retry": "gather_context",
            "proceed": "explain"
        }
    )
    
    workflow.add_edge("explain", "generate_questions")
    workflow.add_edge("generate_questions", END)
    
    return workflow.compile()

@traceable(name="run_checkpoint_workflow")
def run_checkpoint_workflow(
    checkpoint: Dict,
    tutor_mode: str,
    weak_areas: List[str] = None,
    attempt_number: int = 0
) -> LearningState:
    """
    Run the complete checkpoint learning workflow
    
    Args:
        checkpoint: Checkpoint data dict with id, topic, objectives, etc.
        tutor_mode: The tutor personality mode to use
        weak_areas: List of weak areas to focus on (for retries)
        attempt_number: Which attempt this is (0 for first attempt)
    
    Returns:
        Final workflow state with context, explanation, and questions
    """
    
    print("=" * 60)
    print(f"Starting checkpoint workflow")
    print(f"Topic: {checkpoint.get('topic')}")
    print(f"Tutor mode: {tutor_mode}")
    print(f"Attempt number: {attempt_number}")
    if weak_areas:
        print(f"Weak areas to focus on: {weak_areas}")
    print("=" * 60)
    
    workflow = create_workflow()
    
    
    initial_state: LearningState = {
        'checkpoint': checkpoint,
        'tutor_mode': tutor_mode,
        'context': '',
        'explanation': '',
        'questions': [],
        'validation_score': 0,
        'context_validated': False,
        'weak_areas': weak_areas or [],
        'attempt_number': attempt_number,
        'workflow_complete': False
    }
    
    try:
        result = workflow.invoke(initial_state)
        
        if result.get('workflow_complete'):
            print("=" * 60)
            print("✓ Workflow completed successfully")
            print(f"✓ Context length: {len(result.get('context', ''))} chars")
            print(f"✓ Explanation length: {len(result.get('explanation', ''))} chars")
            print(f"✓ Questions generated: {len(result.get('questions', []))}")
            print("=" * 60)
        else:
            print("⚠ Warning: Workflow may not have completed fully")
        
        return result
        
    except Exception as e:
        print(f"❌ Workflow execution error: {e}")
        import traceback
        traceback.print_exc()
        
        initial_state['workflow_complete'] = False
        return initial_state