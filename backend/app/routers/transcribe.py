"""
Router: /api/v1/transcribe
Accepts a multipart audio file upload, runs it through the
transcription → extraction pipeline, returns structured grocery JSON.
"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.models.grocery import TranscriptionResult, ErrorResponse
from app.services.transcription import transcribe_audio
from app.services.extraction import extract_grocery_items

router = APIRouter(prefix="/api/v1", tags=["Voice Pipeline"])

MAX_FILE_SIZE_MB = 25  # Whisper's limit is 25 MB


@router.post(
    "/transcribe",
    response_model=TranscriptionResult,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request (wrong file type, too large)"},
        500: {"model": ErrorResponse, "description": "Internal server / AI API error"},
    },
    summary="Upload an audio voice note and get a structured grocery list",
    description=(
        "Accepts a WhatsApp-style voice note (MP3, OGG, WAV, M4A, etc.). "
        "Returns the raw transcript and a structured JSON list of grocery items "
        "with English names and quantities. Set `AI_MODE=mock` in .env to test "
        "without any API keys."
    ),
)
async def transcribe_voice_note(
    audio_file: UploadFile = File(
        ...,
        description="Audio file of the voice note (MP3, OGG, WAV, M4A, WEBM supported)",
    )
):
    # --- Validate content type ---
    content_type = audio_file.content_type or ""
    is_likely_audio = (
        content_type.startswith("audio/")
        or content_type == "application/octet-stream"
    )
    if not is_likely_audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Please upload an audio file.",
        )

    # --- Read file bytes ---
    file_bytes = await audio_file.read()

    # --- Validate file size ---
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed is {MAX_FILE_SIZE_MB} MB.",
        )

    # --- Step 1: Transcribe audio → text ---
    try:
        transcript = await transcribe_audio(
            file_bytes=file_bytes,
            filename=audio_file.filename or "voice_note.mp3",
            content_type=content_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except EnvironmentError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}",
        )

    # --- Step 2: Extract grocery items from transcript ---
    try:
        grocery_list, detected_language = await extract_grocery_items(transcript)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except EnvironmentError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}",
        )

    return TranscriptionResult(
        transcript=transcript,
        detected_language=detected_language,
        grocery_list=grocery_list,
        item_count=len(grocery_list),
    )


@router.get(
    "/health",
    summary="Health check",
    description="Returns the current AI mode and service status.",
)
async def health_check():
    return {
        "status": "ok",
        "ai_mode": os.getenv("AI_MODE", "mock"),
        "message": "Smart Kitchen Assistant API is running.",
    }
