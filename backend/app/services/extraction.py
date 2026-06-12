"""
Extraction service: transcript → structured grocery list.
AI_MODE: "mock" | "groq" | "gemini" | "openai"
"""

import os
import json
from typing import List
from app.models.grocery import GroceryItem

MOCK_GROCERY_LIST = [
    GroceryItem(item="potato",           quantity="2 kg"),
    GroceryItem(item="onion",            quantity="1 kg"),
    GroceryItem(item="tomato",           quantity="500 g"),
    GroceryItem(item="milk",             quantity="1 litre"),
    GroceryItem(item="eggs",             quantity="1 dozen"),
    GroceryItem(item="mustard oil",      quantity="1 bottle"),
    GroceryItem(item="coriander leaves", quantity="1 bunch"),
    GroceryItem(item="sugar",            quantity="500 g"),
    GroceryItem(item="ginger",           quantity="1 small piece"),
    GroceryItem(item="garlic",           quantity="1 whole head"),
]

PROMPT = """You are a grocery extraction assistant.

Read this transcript (Bengali/Hindi/English mix) and extract every grocery item.
Rules:
- Translate all names to English (aloo→potato, peyaj→onion, dudh→milk, chini→sugar, dim→eggs)
- Normalize quantities (ek kilo→1 kg, aadha kilo→500 g, ek dozen→1 dozen, ek litre→1 litre)
- If no quantity mentioned, use "as needed"
- Deduplicate items

Return ONLY a valid JSON array, no markdown, no explanation:
[{"item": "potato", "quantity": "2 kg"}, ...]

Transcript:
"""


async def extract_grocery_items(transcript: str) -> tuple[List[GroceryItem], str]:
    ai_mode = os.getenv("AI_MODE", "mock").lower()

    if ai_mode == "mock":
        return MOCK_GROCERY_LIST, "Bengali/Hindi/English mix (mock)"
    if ai_mode == "groq":
        return await _extract_groq(transcript)
    if ai_mode == "gemini":
        return await _extract_gemini(transcript)
    if ai_mode == "openai":
        return await _extract_openai(transcript)

    raise EnvironmentError(f"Unknown AI_MODE: '{ai_mode}'.")


async def _extract_groq(transcript: str) -> tuple[List[GroceryItem], str]:
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY is not set in your .env file.")

    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Free, very capable
        messages=[
            {"role": "user", "content": PROMPT + transcript}
        ],
        temperature=0.1,
        max_tokens=1024,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    grocery_list = [GroceryItem(**entry) for entry in json.loads(raw)]
    return grocery_list, "Auto-detected (Groq)"


async def _extract_gemini(transcript: str) -> tuple[List[GroceryItem], str]:
    from google import genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set in your .env file.")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=PROMPT + transcript,
    )
    raw = response.text.strip().replace("```json", "").replace("```", "").strip()
    grocery_list = [GroceryItem(**entry) for entry in json.loads(raw)]
    return grocery_list, "Auto-detected (Gemini)"


async def _extract_openai(transcript: str) -> tuple[List[GroceryItem], str]:
    from openai import AsyncOpenAI

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY is not set in your .env file.")

    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "user", "content": PROMPT + transcript}
        ],
        temperature=0.1, max_tokens=1024,
    )
    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    items_data = parsed if isinstance(parsed, list) else next(
        (v for v in parsed.values() if isinstance(v, list)), []
    )
    grocery_list = [GroceryItem(**entry) for entry in items_data]
    return grocery_list, "Auto-detected (OpenAI)"
