import os
import time
from dotenv import load_dotenv
from pathlib import Path
from langchain_groq import ChatGroq

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
load_dotenv()

GROQ_KEYS = [
    os.getenv("GROQ_API_KEY"),
    os.getenv("GROQ_API_KEY2"),
    os.getenv("GROQ_API_KEY3"),
    os.getenv("GROQ_API_KEY4"),
]

GROQ_KEYS = [k for k in GROQ_KEYS if k]

if not GROQ_KEYS:
    raise ValueError("No GROQ API keys found in environment")

class MultiKeyLLM:
    def __init__(self, model="llama-3.3-70b-versatile", temperature=0):
        self.model = model
        self.temperature = temperature
        self.key_index = 0
        self.llm = self._create_llm(self.key_index)

    def _create_llm(self, index):
        return ChatGroq(
            model=self.model,
            temperature=self.temperature,
            api_key=GROQ_KEYS[index]
        )

    def _switch_key(self):
        self.key_index = (self.key_index + 1) % len(GROQ_KEYS)
        self.llm = self._create_llm(self.key_index)

    def invoke(self, messages):
        retries = len(GROQ_KEYS)

        for _ in range(retries):
            try:
                return self.llm.invoke(messages)
            except Exception as e:
                error_msg = str(e).lower()
                if "rate limit" in error_msg or "quota" in error_msg or "429" in error_msg:
                    self._switch_key()
                    time.sleep(1)
                else:
                    raise e

        raise Exception("All API keys exhausted")

def get_llm(temperature=0):
    return MultiKeyLLM(temperature=temperature)