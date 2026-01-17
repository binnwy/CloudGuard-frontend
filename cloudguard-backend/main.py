from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
import os

# =====================
# LOAD ENV
# =====================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# =====================
# FASTAPI APP
# =====================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# MODELS
# =====================
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str

# =====================
# DATABASE ACCESS
# =====================
def get_recent_logs(limit=100):
    try:
        response = (
            supabase
            .table("cloudguard_logs")
            .select("srcaddr, region, attack_type, action,confidence, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data
    except Exception as e:
        print("DB ERROR:", e)
        return []

# =====================
# VERIFY DB CONNECTION
# =====================
@app.get("/test-db")
def test_db():
    data = get_recent_logs(limit=1)
    return {"rows": data}

# =====================
# CHATBOT
# =====================
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    user_msg = req.message.lower()
    logs = get_recent_logs()

    if not logs:
        return ChatResponse(answer="❌ Unable to fetch data from Supabase.")

    # =====================
    # LAST ATTACK LOGIC
    # =====================
    if "last" in user_msg and "attack" in user_msg:
        for log in logs:
            if log["attack_type"] != "Benign":
                reply = (
                    f"🚨 **LATEST ATTACK DETECTED**\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"🛑 Attack Type: **{log['attack_type']}**\n"
                    f"📡 Source IP: `{log['srcaddr']}`\n"
                    f"🌍 Region: {log['region']}\n"
                    f"🛡️ Action: **{log['action']}**\n"
                    f"🕒 Time: {log['created_at']}"
                )
                return ChatResponse(answer=reply)

        return ChatResponse(
            answer="✅ No attacks found. All recent traffic is benign."
        )

    # =====================
    # RECENT ACTIVITY
    # =====================
    reply = "📊 **Recent Network Activity**\n\n"

    for log in logs[:5]:
        is_attack = log["attack_type"] != "Benign"
        icon = "🔴" if is_attack else "🟢"
        label = "ATTACK" if is_attack else "BENIGN"

        reply += (
            f"{icon} **{label}** — {log['attack_type']}\n"
            f"   └ 📡 {log['srcaddr']} ({log['region']})\n"
            f"   └ 🛡️ {log['action']}\n\n"
        )

    reply += "💬 *Try asking:* `What was the last attack?`"
    return ChatResponse(answer=reply)
