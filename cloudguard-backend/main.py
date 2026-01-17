from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Optional

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
            .select("srcaddr, region, attack_type, action, confidence, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data
    except Exception as e:
        print("DB ERROR:", e)
        return []

def get_logs_by_time_range(hours=24):
    """Get logs from the last N hours"""
    try:
        # Calculate cutoff time
        cutoff_time = (datetime.utcnow() - timedelta(hours=hours))
        # Format for Supabase (ISO format)
        cutoff_time_str = cutoff_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        print(f"Fetching logs since: {cutoff_time_str}")
        
        response = (
            supabase
            .table("cloudguard_logs")
            .select("srcaddr, region, attack_type, action, confidence, created_at")
            .gte("created_at", cutoff_time_str)
            .order("created_at", desc=False)
            .execute()
        )
        
        print(f"Found {len(response.data) if response.data else 0} logs in last {hours} hours")
        return response.data if response.data else []
    except Exception as e:
        print(f"DB ERROR in get_logs_by_time_range: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_all_logs(limit=1000):
    """Get all logs for detailed view"""
    try:
        response = (
            supabase
            .table("cloudguard_logs")
            .select("srcaddr, region, attack_type, action, confidence, created_at")
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

# =====================
# DASHBOARD API ENDPOINTS
# =====================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics: total attacks, active threats, alerts, uptime"""
    try:
        logs = get_recent_logs(limit=1000)
        
        if not logs:
            return {
                "total_attacks": 0,
                "active_threats": 0,
                "active_alerts": 0,
                "uptime": 100,
                "total_attacks_change": 0,
                "active_threats_change": 0,
                "active_alerts_change": 0,
                "uptime_change": 0
            }
        
        # Calculate stats
        total_logs = len(logs)
        attacks = [log for log in logs if log.get("attack_type", "").lower() != "benign"]
        total_attacks = len(attacks)
        
        # Active threats (percentage of attacks in last 24h)
        recent_logs_24h = get_logs_by_time_range(24)
        recent_attacks = [log for log in recent_logs_24h if log.get("attack_type", "").lower() != "benign"]
        active_threats_pct = (len(recent_attacks) / len(recent_logs_24h) * 100) if recent_logs_24h else 0
        
        # Active alerts (high confidence attacks)
        high_confidence_attacks = [log for log in attacks if log.get("confidence", 0) > 0.7]
        active_alerts_pct = (len(high_confidence_attacks) / total_logs * 100) if total_logs else 0
        
        # Uptime (percentage of benign traffic)
        benign_count = total_logs - total_attacks
        uptime_pct = (benign_count / total_logs * 100) if total_logs else 100
        
        # Calculate changes (simplified - compare first half vs second half of logs)
        mid_point = len(logs) // 2
        first_half = logs[:mid_point] if mid_point > 0 else []
        second_half = logs[mid_point:] if mid_point > 0 else logs
        
        first_half_attacks = len([log for log in first_half if log.get("attack_type", "").lower() != "benign"])
        second_half_attacks = len([log for log in second_half if log.get("attack_type", "").lower() != "benign"])
        
        total_attacks_change = ((second_half_attacks - first_half_attacks) / first_half_attacks * 100) if first_half_attacks > 0 else 0
        
        return {
            "total_attacks": total_attacks,
            "active_threats": round(active_threats_pct, 1),
            "active_alerts": round(active_alerts_pct, 1),
            "uptime": round(uptime_pct, 1),
            "total_attacks_change": round(total_attacks_change, 1),
            "active_threats_change": 0,  # Can be calculated similarly
            "active_alerts_change": 0,    # Can be calculated similarly
            "uptime_change": 0           # Can be calculated similarly
        }
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return {
            "total_attacks": 0,
            "active_threats": 0,
            "active_alerts": 0,
            "uptime": 100,
            "total_attacks_change": 0,
            "active_threats_change": 0,
            "active_alerts_change": 0,
            "uptime_change": 0
        }

@app.get("/api/dashboard/timeline")
async def get_timeline_data(hours: int = 24, interval: str = "hour"):
    """Get attack timeline data grouped by time interval and severity
    
    Args:
        hours: Number of hours to look back (default: 24)
        interval: Grouping interval - "hour" or "day" (default: "hour")
    """
    try:
        logs_data = get_logs_by_time_range(hours)
        
        # If no logs in time range, try to get recent logs anyway (last 100)
        if not logs_data:
            print(f"No logs found in last {hours} hours, trying recent logs")
            logs_data = get_recent_logs(limit=100)
        
        if not logs_data:
            print("No logs found at all")
            # Return empty timeline based on interval
            if interval == "day":
                num_days = (hours // 24) if hours >= 24 else 1
                result = []
                for i in range(num_days):
                    date = (datetime.utcnow() - timedelta(days=num_days - 1 - i))
                    result.append({
                        "time": date.strftime("%m/%d"),
                        "HIGH_SEVERITY": 0,
                        "MEDIUM_SEVERITY": 0,
                        "LOW_SEVERITY": 0
                    })
                return result
            else:
                # Hour interval
                num_hours = min(hours, 24) if hours <= 24 else 24
                result = []
                for i in range(num_hours):
                    hour = (datetime.utcnow() - timedelta(hours=num_hours - 1 - i))
                    result.append({
                        "time": hour.strftime("%H:00"),
                        "HIGH_SEVERITY": 0,
                        "MEDIUM_SEVERITY": 0,
                        "LOW_SEVERITY": 0
                    })
                return result
        
        print(f"Processing {len(logs_data)} logs for timeline (interval: {interval}, hours: {hours})")
        
        # Group by time interval and severity
        timeline_dict = defaultdict(lambda: {"HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0})
        
        for log in logs_data:
            try:
                # Handle different date formats
                created_at_str = log.get("created_at", "")
                if not created_at_str:
                    continue
                
                # Try parsing different date formats
                try:
                    # Try ISO format first
                    if "T" in created_at_str:
                        created_at_str = created_at_str.replace("Z", "+00:00")
                    created_at = datetime.fromisoformat(created_at_str)
                except:
                    # Try parsing as standard datetime string
                    try:
                        created_at = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S")
                    except:
                        # Try with timezone
                        created_at = datetime.strptime(created_at_str.split("+")[0].split("Z")[0], "%Y-%m-%dT%H:%M:%S")
                
                # Group by interval
                if interval == "day":
                    time_key = created_at.strftime("%m/%d")
                else:
                    # Hour interval
                    time_key = created_at.strftime("%H:00")
                
                attack_type = log.get("attack_type", "Benign") or "Benign"
                confidence = log.get("confidence", 0)
                
                # Handle confidence as string or number
                if isinstance(confidence, str):
                    try:
                        confidence = float(confidence)
                    except:
                        confidence = 0
                elif confidence is None:
                    confidence = 0
                else:
                    confidence = float(confidence)
                
                # Only process non-benign attacks
                if attack_type.lower() != "benign":
                    if confidence >= 0.8:
                        severity = "HIGH_SEVERITY"
                    elif confidence >= 0.5:
                        severity = "MEDIUM_SEVERITY"
                    else:
                        severity = "LOW_SEVERITY"
                    
                    timeline_dict[time_key][severity] += 1
            except Exception as e:
                print(f"Error processing log entry: {e}, log: {log}")
                continue
        
        print(f"Timeline dict has {len(timeline_dict)} time periods with data")
        
        # Convert to list format and fill missing periods
        if interval == "day":
            num_days = (hours // 24) if hours >= 24 else 1
            result = []
            for i in range(num_days):
                date = (datetime.utcnow() - timedelta(days=num_days - 1 - i))
                date_key = date.strftime("%m/%d")
                data = timeline_dict.get(date_key, {"HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0})
                result.append({
                    "time": date_key,
                    **data
                })
        else:
            # Hour interval - show up to 24 hours
            num_hours = min(hours, 24) if hours <= 24 else 24
            result = []
            for i in range(num_hours):
                hour = (datetime.utcnow() - timedelta(hours=num_hours - 1 - i))
                hour_key = hour.strftime("%H:00")
                data = timeline_dict.get(hour_key, {"HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0})
                result.append({
                    "time": hour_key,
                    **data
                })
        
        print(f"Returning timeline with {len(result)} time periods")
        return result
    except Exception as e:
        print(f"Error getting timeline data: {e}")
        import traceback
        traceback.print_exc()
        # Return empty timeline
        if interval == "day":
            num_days = (hours // 24) if hours >= 24 else 1
            return [{"time": (datetime.utcnow() - timedelta(days=num_days - 1 - i)).strftime("%m/%d"), "HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0} for i in range(num_days)]
        else:
            num_hours = min(hours, 24) if hours <= 24 else 24
            return [{"time": (datetime.utcnow() - timedelta(hours=num_hours - 1 - i)).strftime("%H:00"), "HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0} for i in range(num_hours)]

@app.get("/api/dashboard/threat-sources")
async def get_threat_sources():
    """Get top threat sources by count"""
    try:
        logs = get_recent_logs(limit=1000)
        attacks = [log for log in logs if log.get("attack_type", "").lower() != "benign"]
        
        if not attacks:
            return []
        
        # Count by source (srcaddr or attack_type)
        source_counts = defaultdict(int)
        source_types = {}
        
        for log in attacks:
            src = log.get("srcaddr", "Unknown")
            attack_type = log.get("attack_type", "Unknown")
            
            # Use srcaddr if available, otherwise use attack_type
            key = src if src and src != "Unknown" else attack_type
            source_counts[key] += 1
            source_types[key] = attack_type
        
        # Sort by count and get top 5
        sorted_sources = sorted(source_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Assign colors
        colors = ['#ef4444', '#f59e0b', '#60a5fa', '#10b981', '#a855f7']
        
        result = []
        for idx, (name, count) in enumerate(sorted_sources):
            result.append({
                "name": name,
                "threats": count,
                "color": colors[idx % len(colors)]
            })
        
        return result
    except Exception as e:
        print(f"Error getting threat sources: {e}")
        return []

@app.get("/api/dashboard/stats/chart-data")
async def get_stats_chart_data():
    """Get mini chart data for stat cards (last 7 data points)"""
    try:
        logs = get_recent_logs(limit=1000)
        
        if not logs:
            return {
                "total_attacks": [0] * 7,
                "active_threats": [0] * 7,
                "active_alerts": [0] * 7,
                "uptime": [100] * 7
            }
        
        # Split logs into 7 segments
        segment_size = len(logs) // 7
        if segment_size == 0:
            segment_size = 1
        
        total_attacks_data = []
        active_threats_data = []
        active_alerts_data = []
        uptime_data = []
        
        for i in range(7):
            start_idx = i * segment_size
            end_idx = (i + 1) * segment_size if i < 6 else len(logs)
            segment = logs[start_idx:end_idx]
            
            if not segment:
                total_attacks_data.append(0)
                active_threats_data.append(0)
                active_alerts_data.append(0)
                uptime_data.append(100)
                continue
            
            attacks = [log for log in segment if log.get("attack_type", "").lower() != "benign"]
            total_attacks_data.append(len(attacks))
            
            threats_pct = (len(attacks) / len(segment) * 100) if segment else 0
            active_threats_data.append(round(threats_pct))
            
            high_conf = [log for log in attacks if log.get("confidence", 0) > 0.7]
            alerts_pct = (len(high_conf) / len(segment) * 100) if segment else 0
            active_alerts_data.append(round(alerts_pct))
            
            benign_count = len(segment) - len(attacks)
            uptime_pct = (benign_count / len(segment) * 100) if segment else 100
            uptime_data.append(round(uptime_pct))
        
        return {
            "total_attacks": total_attacks_data,
            "active_threats": active_threats_data,
            "active_alerts": active_alerts_data,
            "uptime": uptime_data
        }
    except Exception as e:
        print(f"Error getting chart data: {e}")
        return {
            "total_attacks": [0] * 7,
            "active_threats": [0] * 7,
            "active_alerts": [0] * 7,
            "uptime": [100] * 7
        }

@app.get("/api/detail/logs")
async def get_detail_logs(limit: int = 100, offset: int = 0):
    """Get detailed logs for the detail page"""
    try:
        logs = get_all_logs(limit=limit + offset)
        paginated_logs = logs[offset:offset + limit]
        
        return {
            "logs": paginated_logs,
            "total": len(logs),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        print(f"Error getting detail logs: {e}")
        return {
            "logs": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }
