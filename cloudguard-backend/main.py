from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

# --- DATABASE CONFIGURATION ---
DB_CONFIG = {
    "dbname": "cloudguard",
    "user": "postgres",
    "password": "1234567",  # <--- REMEMBER TO UPDATE THIS!
    "host": "localhost",
    "port": "5432"
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str

def get_recent_logs(limit=5):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT source_ip, attack_type, action_taken, detected_at, geo_location, classification 
            FROM vpc_logs 
            ORDER BY detected_at DESC 
            LIMIT %s;
        """
        cur.execute(query, (limit,))
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        return []

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    user_msg = req.message.lower()
    
    # 1. Fetch data
    logs = get_recent_logs(limit=10) # Get top 10 for analysis

    if not logs:
        return ChatResponse(answer="❌ Error: Cannot reach the database.")

    # 2. LOGIC: Answer specific questions

    # CASE A: "What is the LAST attack?"
    if "last" in user_msg and "attack" in user_msg:
        latest = logs[0]
        # Aesthetic Card Format
        reply = (
            f"🚨 **LATEST THREAT DETECTED**\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🛑 Type: **{latest['attack_type']}**\n"
            f"🌍 Location: {latest['geo_location']}\n"
            f"📡 Source IP: {latest['source_ip']}\n"
            f"🛡️ Action Taken: **{latest['action_taken']}**"
        )
        return ChatResponse(answer=reply)

    # CASE B: "Show me the logs" (Default)
    else:
        reply = "📊 **Recent Network Activity**\n\n"
        for log in logs[:4]: # Show top 4
            # Choose icon based on action
            icon = "🔴" if log['action_taken'] == 'BLOCKED' else "🟢"
            
            reply += (
                f"{icon} **{log['attack_type']}**\n"
                f"   └ 📡 {log['source_ip']} ({log['geo_location']})\n"
                f"   └ 🛡️ Status: {log['action_taken']}\n\n"
            )
        reply += "💬 *Try asking: 'What was the last attack?'*"
        return ChatResponse(answer=reply)