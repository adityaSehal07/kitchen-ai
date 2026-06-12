"""
WhatsApp Webhook Router
Receives incoming WhatsApp messages from Twilio.
When a voice note is received:
1. Downloads the audio file
2. Transcribes it via Groq Whisper
3. Extracts grocery items via Llama
4. Stores the result in the database
5. Sends a WhatsApp reply with the extracted list
"""

import os
import httpx
from fastapi import APIRouter, Request, Form
from fastapi.responses import PlainTextResponse
from twilio.rest import Client as TwilioClient
from twilio.twiml.messaging_response import MessagingResponse

from app.services.transcription import transcribe_audio
from app.services.extraction import extract_grocery_items
from app.services.pricing import simulate_price_comparison
from app.database import get_connection
from datetime import datetime

router = APIRouter(prefix="/api/v1/webhook", tags=["WhatsApp Webhook"])


def save_pending_order(grocery_list: list, price_result) -> int:
    """Save a pending order to DB so the frontend can pick it up."""
    import json
    conn = get_connection()
    cursor = conn.cursor()

    # Create pending_orders table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_orders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            grocery_list TEXT NOT NULL,
            price_result TEXT NOT NULL,
            status      TEXT DEFAULT 'pending',
            created_at  TEXT NOT NULL
        )
    """)

    grocery_data = json.dumps([{"item": g.item, "quantity": g.quantity} for g in grocery_list])
    price_data = json.dumps({
        "comparison": [
            {
                "item": r.item, "blinkit": r.blinkit,
                "zepto": r.zepto, "instamart": r.instamart,
                "cheapest": r.cheapest, "savings": r.savings
            } for r in price_result.comparison
        ],
        "cart_totals": {
            "blinkit": price_result.cart_totals.blinkit,
            "zepto": price_result.cart_totals.zepto,
            "instamart": price_result.cart_totals.instamart,
        },
        "recommended_platform": price_result.recommended_platform,
        "total_savings": price_result.total_savings,
    })

    cursor.execute("""
        INSERT INTO pending_orders (grocery_list, price_result, status, created_at)
        VALUES (?, ?, 'pending', ?)
    """, (grocery_data, price_data, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    order_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return order_id


def send_whatsapp_reply(to: str, message: str):
    """Send a WhatsApp message back to the sender via Twilio."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

    if not account_sid or not auth_token:
        print("⚠️ Twilio credentials not set — skipping WhatsApp reply")
        return

    client = TwilioClient(account_sid, auth_token)
    client.messages.create(body=message, from_=from_number, to=to)


@router.post("/whatsapp", response_class=PlainTextResponse)
async def whatsapp_webhook(
    request: Request,
    From: str = Form(default=""),
    NumMedia: str = Form(default="0"),
    MediaUrl0: str = Form(default=""),
    MediaContentType0: str = Form(default=""),
    Body: str = Form(default=""),
):
    """
    Twilio calls this endpoint when a WhatsApp message is received.
    Handles both voice notes (audio) and text messages.
    """

    print(f"📱 WhatsApp message from {From}")
    print(f"   Media: {NumMedia}, Type: {MediaContentType0}")
    print(f"   Body: {Body}")

    resp = MessagingResponse()

    # ── Handle voice note (audio file) ──────────────────────────────────────
    if int(NumMedia) > 0 and MediaContentType0.startswith("audio/"):
        try:
            # Send acknowledgment immediately
            send_whatsapp_reply(
                From,
                "🎙️ Voice note received! Processing your grocery list... Please wait."
            )

            # Download audio from Twilio
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")

            async with httpx.AsyncClient(follow_redirects=True) as client:
                audio_response = await client.get(
                MediaUrl0,
                auth=(account_sid, auth_token),
                timeout=30.0,
                headers={"User-Agent": "Mozilla/5.0"},
        )
            print(f"   Audio download status: {audio_response.status_code}, size: {len(audio_response.content)} bytes")
            raw_bytes = audio_response.content

            try:
                import io
                from pydub import AudioSegment
                audio = AudioSegment.from_file(io.BytesIO(raw_bytes), format="ogg", codec="opus")
                mp3_buffer = io.BytesIO()
                audio.export(mp3_buffer, format="mp3")
                file_bytes = mp3_buffer.getvalue()
            except Exception as conv_error:
                print(f"   Conversion error: {conv_error}, trying raw bytes...")
                file_bytes = raw_bytes

            filename = "whatsapp_voice.mp3"

            # Transcribe
            transcript = await transcribe_audio(file_bytes, filename, MediaContentType0)
            print(f"   Transcript: {transcript[:100]}...")

            # Extract grocery items
            grocery_list, detected_language = await extract_grocery_items(transcript)

            # Compare prices
            price_result = simulate_price_comparison(grocery_list)

            # Save to DB for frontend to pick up
            order_id = save_pending_order(grocery_list, price_result)

            # Build reply message
            items_text = "\n".join(
                [f"  • {g.item} — {g.quantity}" for g in grocery_list]
            )
            platform = price_result.recommended_platform.upper()
            total = price_result.cart_totals.__dict__[price_result.recommended_platform]
            savings = price_result.total_savings

            reply = (
                f"✅ *Grocery List Ready!*\n\n"
                f"{items_text}\n\n"
                f"💰 *Best Price: {platform}*\n"
                f"   Total: ₹{total:.0f} (saves ₹{savings:.0f})\n\n"
                f"📱 Open the KitchenAI app to confirm purchase!\n"
                f"Order ID: #{order_id}"
            )

            send_whatsapp_reply(From, reply)

        except Exception as e:
            print(f"❌ Error processing voice note: {e}")
            send_whatsapp_reply(
                From,
                "❌ Sorry, couldn't process the voice note. Please try again!"
            )

    # ── Handle text message ──────────────────────────────────────────────────
    elif Body.strip():
        body_lower = Body.strip().lower()

        if any(word in body_lower for word in ["hi", "hello", "hey"]):
            send_whatsapp_reply(
                From,
                "👋 *KitchenAI Assistant*\n\nSend me a voice note listing the groceries needed and I'll:\n✅ Extract the items\n💰 Find the best price\n📦 Update the inventory\n\nJust record and send!"
            )
        else:
            send_whatsapp_reply(
                From,
                "🎙️ Please send a *voice note* with the grocery list!"
            )

    return PlainTextResponse("OK")


@router.get("/pending-order")
async def get_pending_order():
    """
    Frontend polls this to check if a new order came in via WhatsApp.
    Returns the latest pending order if any.
    """
    import json
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT * FROM pending_orders
            WHERE status = 'pending'
            ORDER BY created_at DESC LIMIT 1
        """)
        row = cursor.fetchone()
        conn.close()

        if not row:
            return {"order": None}

        return {
            "order": {
                "id": row["id"],
                "grocery_list": json.loads(row["grocery_list"]),
                "price_result": json.loads(row["price_result"]),
                "created_at": row["created_at"],
            }
        }
    except Exception:
        conn.close()
        return {"order": None}


@router.post("/confirm-purchase/{order_id}")
async def confirm_purchase(order_id: int):
    """
    Called when sister taps 'I bought this' in the app.
    Marks order as confirmed and adds items to inventory.
    """
    import json
    from app.services.inventory import add_item

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM pending_orders WHERE id = ?", (order_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return {"success": False, "message": "Order not found"}

    grocery_list = json.loads(row["grocery_list"])

    # Add all items to inventory
    for item in grocery_list:
        add_item(item["item"], item["quantity"])

    # Mark order as confirmed
    cursor.execute(
        "UPDATE pending_orders SET status = 'confirmed' WHERE id = ?",
        (order_id,)
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"✅ {len(grocery_list)} items added to inventory!",
        "items_added": len(grocery_list),
    }
