"""
Quick smoke test for Phase 1 — runs without a server.
Tests the extraction service in mock mode.
Run: python test_phase1.py
"""

import asyncio
import os

os.environ["AI_MODE"] = "mock"  # Force mock mode for this test

from app.services.transcription import transcribe_audio, MOCK_TRANSCRIPT
from app.services.extraction import extract_grocery_items


async def run_tests():
    print("=" * 60)
    print("PHASE 1 SMOKE TEST — Smart Kitchen Assistant")
    print("=" * 60)

    # Test 1: Transcription mock
    print("\n[TEST 1] Transcription Service (mock mode)")
    transcript = await transcribe_audio(b"fake_audio_bytes", "test.mp3", "audio/mpeg")
    assert transcript == MOCK_TRANSCRIPT, "Mock transcript mismatch!"
    print(f"  ✅  Transcript returned ({len(transcript)} chars)")
    print(f"  Preview: '{transcript[:80]}...'")

    # Test 2: Extraction mock
    print("\n[TEST 2] Extraction Service (mock mode)")
    grocery_list, language = await extract_grocery_items(transcript)
    assert len(grocery_list) > 0, "Empty grocery list!"
    print(f"  ✅  Extracted {len(grocery_list)} items. Language: {language}")
    print()
    print("  {:<20} {}".format("ITEM", "QUANTITY"))
    print("  " + "-" * 35)
    for item in grocery_list:
        print(f"  {item.item:<20} {item.quantity}")

    print("\n" + "=" * 60)
    print("✅  All Phase 1 tests passed! Ready to start the server.")
    print("=" * 60)
    print()
    print("  Next step: cd backend && uvicorn app.main:app --reload")
    print("  Then open: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(run_tests())
