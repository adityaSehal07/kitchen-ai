"""
Transcription service with enhanced multilingual support.
AI_MODE: "mock" | "groq" | "gemini" | "openai"
"""

import os
import tempfile
from pathlib import Path

MOCK_TRANSCRIPT = (
    "Didi, aloo chahiye do kilo, peyaj ek kilo. "
    "Tomato nao aadha kilo. Dudh bhi lena, ek litre. "
    "Eggs ek dozen. Aar mustard oil, ek bottle. "
    "Coriander leaves ekta bunch. Chini aadha kilo. "
    "Ginger ek piece, choto. Garlic ek pura."
)

MIME_MAP = {
    ".mp3":"audio/mpeg", ".wav":"audio/wav", ".ogg":"audio/ogg",
    ".m4a":"audio/mp4", ".aac":"audio/aac", ".flac":"audio/flac",
    ".webm":"audio/webm", ".opus":"audio/ogg",
}

WHISPER_PROMPT = (
    "Grocery voice note in Bengali/Hindi/English mix. Transcribe exactly as spoken. "
    "Words: aloo=potato, peyaj=onion, dudh=milk, chini=sugar, dim/anda=eggs, "
    "tel=oil, begun=brinjal, roshun=garlic, ada=ginger, dhone pata=coriander, "
    "maach=fish, murgi=chicken, dal=lentils, chawal=rice, atta=flour, "
    "noon=salt, lonka=chilli, sorshe tel=mustard oil, ghee, paneer, dahi=curd. "
    "Quantities: ek=1, do=2, kilo, gram, litre, dozen, packet, bottle, "
    "pao=250g, aadha=half, ektu=little."
)


async def transcribe_audio(file_bytes: bytes, filename: str, content_type: str) -> str:
    ai_mode = os.getenv("AI_MODE", "mock").lower()
    if ai_mode == "mock":    return MOCK_TRANSCRIPT
    if ai_mode == "groq":    return await _transcribe_groq(file_bytes, filename)
    if ai_mode == "gemini":  return await _transcribe_gemini(file_bytes, filename, content_type)
    if ai_mode == "openai":  return await _transcribe_openai(file_bytes, filename)
    raise EnvironmentError(f"Unknown AI_MODE: '{ai_mode}'.")


async def _transcribe_groq(file_bytes: bytes, filename: str) -> str:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY is not set.")

    client = Groq(api_key=api_key)
    suffix = Path(filename).suffix.lower() or ".mp3"

    # Map to formats Groq Whisper supports directly — no pydub needed
    format_map = {
        ".webm": ".webm", ".ogg": ".ogg", ".m4a": ".m4a",
        ".aac": ".m4a", ".mp3": ".mp3", ".wav": ".wav",
        ".flac": ".flac", ".opus": ".ogg", ".mp4": ".mp4",
    }
    send_suffix = format_map.get(suffix, ".mp3")

    with tempfile.NamedTemporaryFile(suffix=send_suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=(f"audio{send_suffix}", f),
                response_format="verbose_json",
                prompt=WHISPER_PROMPT,
            )
        transcript = response.text if hasattr(response, 'text') else str(response)
        detected = getattr(response, 'language', 'unknown')
        print(f"   Detected language: {detected}")
        return transcript
    finally:
        os.unlink(tmp_path)


async def _transcribe_gemini(file_bytes: bytes, filename: str, content_type: str) -> str:
    import base64
    from google import genai
    from google.genai import types
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set.")
    mime = content_type
    if mime in ("application/octet-stream", "", None):
        ext = Path(filename).suffix.lower()
        mime = MIME_MAP.get(ext, "audio/mpeg")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime),
            f"Transcribe this voice note exactly as spoken. {WHISPER_PROMPT}",
        ],
    )
    return response.text.strip()


async def _transcribe_openai(file_bytes: bytes, filename: str) -> str:
    from openai import AsyncOpenAI
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY is not set.")
    client = AsyncOpenAI(api_key=api_key)
    suffix = Path(filename).suffix or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            response = await client.audio.transcriptions.create(
                model="whisper-1", file=f, language=None,
                response_format="text", prompt=WHISPER_PROMPT,
            )
        return response
    finally:
        os.unlink(tmp_path)
