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

# Rich multilingual prompt for Whisper — covers all common Indian language grocery words
WHISPER_PROMPT = (
    "This is a grocery shopping voice note. The speaker freely mixes Bengali, Hindi, "
    "English, Nepali, Bhojpuri, Odia, or Marathi in the same sentence. "
    "Transcribe EXACTLY as spoken — preserve original words, do not translate. "
    "Common words used: "
    "aloo/alu=potato, peyaj/pyaz/kanda=onion, dudh=milk, chini/cheeni/sakkar=sugar, "
    "dim/anda/egg=eggs, tel/oil=oil, begun/baingan/brinjal=eggplant, "
    "roshun/lahsun/garlic, ada/adrak/ginger, dhone pata/dhaniya=coriander, "
    "tomato, maach/machhli/fish, murgi/murga/chicken, mangsho/gosht/meat, "
    "dal/daal=lentils, chawal/chal/bhat=rice, atta/maida=flour, "
    "noon/namak/salt, lonka/mirch=chilli, sorshe tel=mustard oil, "
    "nariyal tel=coconut oil, ghee, maakhan/butter, paneer, dahi/curd, "
    "sabzi=vegetables, mewa/dry fruits, biscuit, bread, ডাল, আলু, পেঁয়াজ. "
    "Quantity words: ek/ekta/one, do/dui/dono/two, teen/tin/three, "
    "char/chaar/four, paanch/five, "
    "kilo/kg, gram, litre/liter, dozen/darjan, packet/pata, bottle/botal, "
    "pao/quarter=250g, aadha/aadda/ardha=half, "
    "ektu/thoda/thodi=a little, beshi/jyada=more, "
    "choto/chhota=small, boro/bada=big."
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

    # Try ogg/opus conversion first
    try:
        import io
        from pydub import AudioSegment
        if suffix in (".ogg", ".opus", ".webm"):
            audio = AudioSegment.from_file(io.BytesIO(file_bytes), format=suffix.lstrip("."), codec="opus")
        else:
            audio = AudioSegment.from_file(io.BytesIO(file_bytes))
        mp3_buf = io.BytesIO()
        audio.export(mp3_buf, format="mp3")
        file_bytes = mp3_buf.getvalue()
        suffix = ".mp3"
    except Exception as e:
        print(f"Audio conversion skipped: {e}")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3",  # Use full model for better multilingual accuracy
                file=(filename, f),
                response_format="verbose_json",  # Get language detection too
                prompt=WHISPER_PROMPT,
            )
        # verbose_json returns object with .text and .language
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
        tmp.write(file_bytes); tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            response = await client.audio.transcriptions.create(
                model="whisper-1", file=f, language=None,
                response_format="text", prompt=WHISPER_PROMPT,
            )
        return response
    finally:
        os.unlink(tmp_path)
