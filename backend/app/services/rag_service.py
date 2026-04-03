from __future__ import annotations

import json
import re
import hashlib
from typing import Dict, List, Optional, Tuple

try:
    from langchain_community.vectorstores import FAISS
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    _FAISS_OK = True
except ImportError:
    _FAISS_OK = False
    print("WARNING: faiss/sentence-transformers not installed — keyword fallback active.")

_embeddings_model = None
_session_stores: Dict[int, Dict] = {}
_kw_stores: Dict[int, Dict[str, List[str]]] = {}

def _get_embeddings():
    global _embeddings_model
    if _embeddings_model is None and _FAISS_OK:
        _embeddings_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings_model

def _split_text(text: str, chunk_size: int = 400, overlap: int = 60) -> List[str]:
    if not text or not text.strip():
        return []
    if _FAISS_OK:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size, chunk_overlap=overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        return splitter.split_text(text.strip())
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks, buf = [], ""
    for s in sentences:
        if len(buf) + len(s) < chunk_size:
            buf += s + " "
        else:
            if buf:
                chunks.append(buf.strip())
            buf = s + " "
    if buf:
        chunks.append(buf.strip())
    return chunks

def _build_faiss_from_texts(texts: List[str]):
    if not _FAISS_OK or not texts:
        return None
    try:
        return FAISS.from_texts(texts, _get_embeddings())
    except Exception as e:
        print(f"FAISS build error: {e}")
        return None

def _faiss_search(store, query: str, k: int) -> List[str]:
    if store is None:
        return []
    try:
        return [d.page_content for d in store.similarity_search(query, k=k)]
    except Exception:
        return []

def _kw_search(chunks: List[str], query: str, k: int) -> List[str]:
    q_words = set(query.lower().split())
    scored = sorted(
        [(len(q_words & set(c.lower().split())), c) for c in chunks],
        key=lambda x: -x[0],
    )
    return [c for _, c in scored[:k] if _ > 0]

def _store_in_session(session_id: int, store_name: str, texts: List[str]) -> None:
    _session_stores.setdefault(session_id, {"has_notes": False})
    _kw_stores.setdefault(session_id, {})
    faiss = _build_faiss_from_texts(texts)
    _session_stores[session_id][store_name] = faiss
    if faiss is None:
        _kw_stores[session_id][store_name] = texts  # keyword fallback


def _search_store(session_id: int, store_name: str, query: str, k: int = 4) -> List[str]:
    faiss = _session_stores.get(session_id, {}).get(store_name)
    if faiss is not None:
        return _faiss_search(faiss, query, k)
    kw = _kw_stores.get(session_id, {}).get(store_name, [])
    return _kw_search(kw, query, k) if kw else []

def _knowledge_key(topic: str, objectives: List[str]) -> str:
    raw = topic + "|" + "|".join(sorted(objectives[:5]))
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _generate_seed_knowledge(
    topic: str, objectives: List[str], key_concepts: List[str]
) -> str:
    from app.llm import get_llm
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = get_llm(temperature=0)
    obj_text = "\n".join(f"- {o}" for o in objectives[:8]) or "- Core understanding"
    kc_text  = ", ".join(key_concepts[:10]) or topic

    resp = llm.invoke([
        SystemMessage(content=(
            "You are an expert knowledge base creator. "
            "Write a thorough educational reference document (1000-1500 words) "
            "covering the given topic with clear headings, definitions, and examples."
        )),
        HumanMessage(content=(
            f"Topic: {topic}\n\nObjectives:\n{obj_text}\n\n"
            f"Key Concepts: {kc_text}\n\nWrite the reference document:"
        )),
    ])
    return resp.content


def _build_knowledge_store(
    session_id: int, topic: str, objectives: List[str], key_concepts: List[str]
) -> None:
    stores  = _session_stores.setdefault(session_id, {"has_notes": False})
    new_key = _knowledge_key(topic, objectives)

    if stores.get("knowledge") is not None and stores.get("knowledge_key") == new_key:
        return  # already cached — zero LLM calls

    print(f"RAG: building knowledge store | session={session_id} | topic='{topic}'")
    try:
        seed   = _generate_seed_knowledge(topic, objectives, key_concepts)
        chunks = _split_text(seed, chunk_size=350, overlap=50)
        _store_in_session(session_id, "knowledge", chunks)
        stores["knowledge_key"] = new_key
        print(f"RAG: knowledge store ready — {len(chunks)} chunks")
    except Exception as e:
        print(f"RAG: knowledge store build failed (non-fatal): {e}")


def _build_curriculum_store(session_id: int, checkpoints: List[Dict]) -> None:
    stores = _session_stores.setdefault(session_id, {"has_notes": False})
    if stores.get("curriculum") is not None:
        return  # already built

    texts = [
        f"Checkpoint: {cp.get('topic','')}\n"
        f"Objectives: {' | '.join(cp.get('objectives',[]))}\n"
        f"Concepts: {', '.join(cp.get('key_concepts',[]))}"
        for cp in checkpoints
    ]
    if not texts:
        return
    chunks = []
    for t in texts:
        chunks.extend(_split_text(t, chunk_size=300, overlap=40))
    _store_in_session(session_id, "curriculum", chunks)
    print(f"RAG: curriculum store ready — {len(chunks)} chunks | session={session_id}")

class ReasoningAgent:
    MAX_ITERATIONS = 2

    def __init__(self, session_id: int):
        self.sid = session_id

    def _decompose(self, query: str, topic: str) -> List[str]:
        from app.llm import get_llm
        from langchain_core.messages import HumanMessage, SystemMessage
        try:
            resp = get_llm(temperature=0).invoke([
                SystemMessage(content=(
                    "Decompose the query into 3 specific sub-queries. "
                    "Return ONLY a JSON array of strings."
                )),
                HumanMessage(content=f"Topic: {topic}\nQuery: {query}"),
            ])
            subs = json.loads(re.sub(r"```json|```", "", resp.content).strip())
            if isinstance(subs, list) and subs:
                return [str(s) for s in subs[:4]]
        except Exception as e:
            print(f"RAG decompose skip: {e}")
        return [query, topic, f"{topic} key concepts"]

    def _retrieve(self, sub_queries: List[str]) -> Dict[str, List[str]]:
        res: Dict[str, List[str]] = {"notes": [], "knowledge": [], "curriculum": []}
        for sq in sub_queries:
            for store in res:
                res[store].extend(_search_store(self.sid, store, sq, k=3))
        # dedup
        for k in res:
            seen, uniq = set(), []
            for c in res[k]:
                if c not in seen:
                    seen.add(c); uniq.append(c)
            res[k] = uniq
        return res

    def _check_coverage(
        self, query: str, chunks: Dict[str, List[str]], objectives: List[str]
    ) -> Tuple[bool, List[str]]:
        all_text = "\n".join(
            chunks["notes"][:3] + chunks["knowledge"][:4] + chunks["curriculum"][:2]
        )[:2500]
        if not all_text.strip():
            return False, objectives[:2]
        from app.llm import get_llm
        from langchain_core.messages import HumanMessage, SystemMessage
        try:
            resp = get_llm(temperature=0).invoke([
                SystemMessage(content=(
                    "Coverage validator. "
                    'Return ONLY JSON: {"sufficient": true/false, "missing": []}'
                )),
                HumanMessage(content=(
                    f"Query: {query}\nObjectives:\n"
                    + "\n".join(f"- {o}" for o in objectives[:5])
                    + f"\n\nContext:\n{all_text}"
                )),
            ])
            data = json.loads(re.sub(r"```json|```", "", resp.content).strip())
            return bool(data.get("sufficient", True)), data.get("missing", [])
        except Exception:
            return True, []

    def retrieve(
        self, query: str, topic: str, objectives: List[str], max_chars: int = 2500
    ) -> str:
        subs = self._decompose(query, topic)
        all_chunks: Dict[str, List[str]] = {"notes": [], "knowledge": [], "curriculum": []}

        for i in range(self.MAX_ITERATIONS):
            new = self._retrieve(subs)
            for k in all_chunks:
                for c in new[k]:
                    if c not in all_chunks[k]:
                        all_chunks[k].append(c)
            sufficient, missing = self._check_coverage(query, all_chunks, objectives)
            if sufficient or not missing:
                break
            subs = [f"{topic}: {m}" for m in missing[:3]]

        parts = []
        if all_chunks["notes"]:
            parts.append("From your uploaded notes:\n" + "\n\n".join(all_chunks["notes"][:4]))
        if all_chunks["knowledge"]:
            parts.append("Topic knowledge:\n" + "\n\n".join(all_chunks["knowledge"][:5]))
        if all_chunks["curriculum"]:
            parts.append("Curriculum:\n" + "\n\n".join(all_chunks["curriculum"][:2]))

        return "\n\n---\n\n".join(parts)[:max_chars]

def ensure_session_knowledge(
    session_id: int,
    topic: str,
    objectives: List[str],
    key_concepts: List[str],
    checkpoints: Optional[List[Dict]] = None,
) -> None:
    _session_stores.setdefault(session_id, {"has_notes": False})
    _build_knowledge_store(session_id, topic, objectives, key_concepts)
    if checkpoints:
        _build_curriculum_store(session_id, checkpoints)


def initialise_session_rag(session_id: int, user_notes: Optional[str]) -> bool:
    _session_stores.setdefault(session_id, {"has_notes": False})
    if user_notes and user_notes.strip():
        store_embeddings(session_id, user_notes)
    return True  # always True — RAG is always on


def is_rag_active(session_id: Optional[int]) -> bool:
    return bool(session_id and session_id in _session_stores)


def store_embeddings(session_id: int, notes: str) -> bool:
    if not notes or not notes.strip():
        return False
    chunks = _split_text(notes, chunk_size=400, overlap=60)
    if not chunks:
        return False
    _session_stores.setdefault(session_id, {"has_notes": False})
    _store_in_session(session_id, "notes", chunks)
    _session_stores[session_id]["has_notes"] = True
    print(f"RAG: notes store — {len(chunks)} chunks | session={session_id}")
    return True


def clear_session_embeddings(session_id: int) -> None:
    _session_stores.pop(session_id, None)
    _kw_stores.pop(session_id, None)
    print(f"RAG: cleared session {session_id}")


def build_rag_context(
    base_context: str,
    query: str,
    session_id: Optional[int],
    topic: str = "",
    objectives: Optional[List[str]] = None,
    key_concepts: Optional[List[str]] = None,
    max_extra_chars: int = 2000,
) -> str:
    if not session_id:
        return base_context

    stores = _session_stores.get(session_id, {})
    if stores.get("knowledge") is None and topic:
        _build_knowledge_store(session_id, topic, objectives or [], key_concepts or [])

    agent     = ReasoningAgent(session_id)
    retrieved = agent.retrieve(
        query=query,
        topic=topic or query,
        objectives=objectives or [],
        max_chars=max_extra_chars,
    )

    if not retrieved.strip():
        return base_context

    augmented = (
        base_context
        + "\n\n---\n**Agentic RAG — Retrieved Knowledge:**\n"
        + retrieved
    )
    print(f"RAG: augmented +{len(retrieved)} chars")
    return augmented


def get_relevant_chunks(query: str, session_id: int, k: int = 3) -> List[str]:
    chunks: List[str] = []
    for store in ("notes", "knowledge", "curriculum"):
        if len(chunks) >= k:
            break
        chunks.extend(_search_store(session_id, store, query, k=k - len(chunks)))
    return chunks[:k]


def create_embeddings(notes: str) -> Optional[List[str]]:
    if not notes or not notes.strip():
        return None
    return _split_text(notes)