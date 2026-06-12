"""
Transcription service
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
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac",
    ".webm": "audio/webm", ".opus": "audio/ogg", ".oga": "audio/ogg",
}


async def transcribe_audio(file_bytes: bytes, filename: str, content_type: str) -> str:
    ai_mode = os.getenv("AI_MODE", "mock").lower()

    if ai_mode == "mock":
        return MOCK_TRANSCRIPT
    if ai_mode == "groq":
        return await _transcribe_groq(file_bytes, filename)
    if ai_mode == "gemini":
        return await _transcribe_gemini(file_bytes, filename, content_type)
    if ai_mode == "openai":
        return await _transcribe_openai(file_bytes, filename)

    raise EnvironmentError(f"Unknown AI_MODE: '{ai_mode}'. Use 'mock', 'groq', 'gemini', or 'openai'.")


async def _transcribe_groq(file_bytes: bytes, filename: str) -> str:
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY is not set in your .env file.")

    client = Groq(api_key=api_key)

    suffix = Path(filename).suffix.lower() or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=(filename, f),
                response_format="text",
                # No language= parameter — let Whisper auto-detect
                prompt=(
                    "This is a grocery shopping voice note. The speaker freely mixes "
                    "Bengali, Hindi, English, and sometimes Nepali in the same sentence. "
                    "Transcribe exactly as spoken — do not translate. "
                    "Common grocery words used: "
                    "aloo/alu=potato, peyaj/pyaz=onion, dudh=milk, chini/cheeni=sugar, "
                    "dim/anda=eggs, tel=oil, begun/baingan=brinjal, roshun/lahsun=garlic, "
                    "ada/adrak=ginger, dhone pata/dhaniya=coriander, tomato, maach/machli=fish, "
                    "murgi/chicken=chicken, dal=lentils, chawal/chal=rice, atta=flour, "
                    "noon/namak=salt, lonka/mirch=chilli, sorshe tel=mustard oil. "
                    "Quantity words: ek=1, do/dui=2, teen=3, kilo, gram, litre, "
                    "dozen, packet, bottle, pao=250g, aadha=half, ektu=a little."
                ),
            )
        return response
    finally:
        os.unlink(tmp_path)


async def _transcribe_gemini(file_bytes: bytes, filename: str, content_type: str) -> str:
    import base64
    from google import genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set in your .env file.")

    mime = content_type
    if mime in ("application/octet-stream", "", None):
        ext = Path(filename).suffix.lower()
        mime = MIME_MAP.get(ext, "audio/mpeg")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=mime),
            "Transcribe this WhatsApp voice note exactly as spoken (Bengali/Hindi/English mix).",
        ],
    )
    return response.text.strip()


async def _transcribe_openai(file_bytes: bytes, filename: str) -> str:
    from openai import AsyncOpenAI

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY is not set in your .env file.")

    client = AsyncOpenAI(api_key=api_key)
    suffix = Path(filename).suffix or ".mp3"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            response = await client.audio.transcriptions.create(
                model="whisper-1", file=f, language=None, response_format="text"
            )
        return response
    finally:
        os.unlink(tmp_path)
