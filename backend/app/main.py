from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import transcribe, pricing, inventory, recipes, whatsapp, kitchen, youtube
from app.database import init_db

load_dotenv()

app = FastAPI(title="Smart Kitchen Assistant API", version="0.1.0",
              docs_url="/docs", redoc_url="/redoc")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_event():
    init_db()

app.include_router(transcribe.router)
app.include_router(pricing.router)
app.include_router(inventory.router)
app.include_router(recipes.router)
app.include_router(whatsapp.router)
app.include_router(kitchen.router)
app.include_router(youtube.router)

@app.get("/", tags=["Root"])
async def root():
    return {"project": "Smart Kitchen Assistant", "docs": "/docs"}
