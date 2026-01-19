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
    """Get recent logs for chatbot - not date-scoped"""
    response = (
        supabase
        .table("cloudguard_logs")
        .select("id, srcaddr, region, attack_type, action, confidence, created_at, predicted_label")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []

def get_logs_by_date_range(from_date: str, to_date: str):
    """Get all logs in a date range (ISO 8601 UTC format)
    
    CRITICAL: Both from_date and to_date must be in UTC to match Supabase created_at field
    which stores timestamps in UTC (e.g., "2026-01-15T14:55:57.799066+00:00")
    
    Args:
        from_date: ISO 8601 UTC string, e.g., "2025-09-19T00:00:00Z"
        to_date: ISO 8601 UTC string, e.g., "2025-09-26T23:59:59Z"
    
    Returns:
        List of log dictionaries
    """
    response = (
        supabase
        .table("cloudguard_logs")
        .select("id, srcaddr, region, attack_type, action, confidence, created_at, predicted_label")
        .gte("created_at", from_date)
        .lte("created_at", to_date)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data or []

def get_total_logs_count(from_date: str, to_date: str) -> int:
    """Count all logs in date range (no semantic filters)
    
    CRITICAL: Date parameters must be in UTC ISO 8601 format to match Supabase 
    created_at field which stores UTC timestamps
    """
    res = (
        supabase
        .table("cloudguard_logs")
        .select("*", count="exact", head=True)
        .gte("created_at", from_date)
        .lte("created_at", to_date)
        .execute()
    )
    return res.count or 0

def get_total_attacks_count(from_date: str, to_date: str) -> int:
    """Count attacks (predicted_label != 0) in date range
    
    CRITICAL: Date parameters must be in UTC ISO 8601 format to match Supabase 
    created_at field which stores UTC timestamps
    """
    res = (
        supabase
        .table("cloudguard_logs")
        .select("*", count="exact", head=True)
        .gte("created_at", from_date)
        .lte("created_at", to_date)
        .neq("predicted_label", 0)
        .execute()
    )
    return res.count or 0

def get_all_logs(limit=1000):
    """Get recent logs for detail view - not date-scoped"""
    response = (
        supabase
        .table("cloudguard_logs")
        .select("id, srcaddr, region, attack_type, action, confidence, created_at, predicted_label")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []

# =====================
# CHATBOT (UNCHANGED)
# =====================
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    logs = get_recent_logs()
    if not logs:
        return ChatResponse(answer="❌ Unable to fetch data from Supabase.")

    for log in logs:
        if log["attack_type"] != "Benign":
            return ChatResponse(answer=f"Last attack from {log['srcaddr']}")

    return ChatResponse(answer="No recent attacks detected.")

# =====================
# DASHBOARD STATS
# =====================
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(from_date: str, to_date: str):
    """
    Dashboard KPIs:
    - Total Logs      → COUNT(*) with date filter only
    - Total Attacks   → COUNT(*) with date + predicted_label != 0
    - Attack %        → (total_attacks / total_logs) * 100
    - Most Common Attack Type → derived ONLY from attack rows
    
    Args:
        from_date: ISO 8601 UTC string, e.g., "2025-09-19T00:00:00Z"
        to_date: ISO 8601 UTC string, e.g., "2025-09-26T23:59:59Z"
    """
    try:
        total_logs = get_total_logs_count(from_date, to_date)
        total_attacks = get_total_attacks_count(from_date, to_date)
        attack_percentage = round((total_attacks / total_logs) * 100, 2) if total_logs > 0 else 0

        # Get most common attack type from attacks only
        attack_rows = (
            supabase
            .table("cloudguard_logs")
            .select("attack_type")
            .gte("created_at", from_date)
            .lte("created_at", to_date)
            .neq("predicted_label", 0)
            .execute()
        ).data or []

        attack_type_counts = defaultdict(int)
        for row in attack_rows:
            if row.get("attack_type"):
                attack_type_counts[row["attack_type"]] += 1

        most_common_attack_type = (
            max(attack_type_counts.items(), key=lambda x: x[1])[0]
            if attack_type_counts else "None"
        )

        return {
            "total_logs": total_logs,
            "total_attacks": total_attacks,
            "attack_percentage": attack_percentage,
            "most_common_attack_type": most_common_attack_type,
            "total_attacks_change": 0
        }
    except Exception as e:
        print(f"[ERROR] get_dashboard_stats: {e}")
        import traceback
        traceback.print_exc()
        return {
            "total_logs": 0,
            "total_attacks": 0,
            "attack_percentage": 0,
            "most_common_attack_type": "None",
            "total_attacks_change": 0
        }

# =====================
# THREAT SOURCES
# =====================
@app.get("/api/dashboard/threat-sources")
async def get_threat_sources(from_date: str, to_date: str):
    """Top malicious source IPs grouped by attack frequency.
    
    PROCESSING LOGIC:
    1. Fetch all logs filtered by from_date and to_date (date range only)
    2. Filter to ONLY attack logs (predicted_label != 0)
    3. Group by srcaddr and count attacks per IP
    4. Skip entries with null or empty srcaddr (not "Unknown" placeholder)
    5. Sort by attack count descending
    6. Return top 5 IPs with fixed color assignments
    
    OUTPUT FORMAT:
    [
        {"name": "192.168.1.100", "threats": 42, "color": "#ef4444"},
        {"name": "10.0.0.50", "threats": 38, "color": "#f59e0b"},
        ...
    ]
    
    IMPORTANT:
    - predicted_label != 0 determines if a log is an attack
    - Does NOT infer attacks from attack_type column
    - Colors assigned by index after sorting (fixed order, not based on IP)
    - Returns empty list [] if no attacks found
    
    Args:
        from_date: ISO 8601 UTC string, e.g., "2025-09-19T00:00:00Z"
        to_date: ISO 8601 UTC string, e.g., "2025-09-26T23:59:59Z"
    """
    try:
        # STEP 1: Fetch all logs in the date range
        logs = get_logs_by_date_range(from_date, to_date)
        
        # STEP 2: Filter to ONLY attack logs (predicted_label != 0)
        # Safely cast predicted_label to int with fallback
        attacks = []
        for log in logs:
            try:
                predicted_label = int(log.get("predicted_label", 0))
            except (ValueError, TypeError):
                predicted_label = 0
            
            if predicted_label != 0:
                attacks.append(log)
        
        # Return empty list if no attacks found
        if not attacks:
            return []
        
        # STEP 3-4: Group by srcaddr and count, skip null/empty
        source_counts = defaultdict(int)
        for log in attacks:
            srcaddr = log.get("srcaddr", "").strip()
            # CRITICAL: Skip null or empty srcaddr entries
            if not srcaddr:
                continue
            source_counts[srcaddr] += 1
        
        # Return empty list if no valid srcaddr entries
        if not source_counts:
            return []
        
        # STEP 5: Sort by attack count descending
        sorted_sources = sorted(source_counts.items(), key=lambda x: x[1], reverse=True)
        
        # STEP 6: Return top 5 with color assignments
        colors = ['#ef4444', '#f59e0b', '#60a5fa', '#10b981', '#a855f7']
        
        return [
            {"name": name, "threats": count, "color": colors[i]}
            for i, (name, count) in enumerate(sorted_sources[:5])
        ]
    except Exception as e:
        print(f"[ERROR] get_threat_sources: {e}")
        import traceback
        traceback.print_exc()
        return []

# =====================
# TIMELINE HELPER
# =====================
def generate_time_buckets(from_dt: datetime, to_dt: datetime, interval: str = "hour"):
    """Generate complete time buckets for a date range with all severity keys initialized.
    
    Creates a list of time buckets covering the entire range from from_dt to to_dt,
    even for buckets with no attack data. Each bucket is pre-initialized with
    HIGH_SEVERITY, MEDIUM_SEVERITY, and LOW_SEVERITY all set to 0.
    
    Args:
        from_dt (datetime): Start datetime in UTC
        to_dt (datetime): End datetime in UTC
        interval (str): "hour" for hourly buckets or "day" for daily buckets
    
    Returns:
        list: List of dicts with structure:
        [
            {
                "time": "HH:00" (for hour) or "MM/DD" (for day),
                "HIGH_SEVERITY": 0,
                "MEDIUM_SEVERITY": 0,
                "LOW_SEVERITY": 0
            },
            ...
        ]
    
    Example:
        from_dt = datetime(2026, 1, 15, 14, 0, 0)  # Jan 15 14:00 UTC
        to_dt = datetime(2026, 1, 15, 16, 30, 0)   # Jan 15 16:30 UTC
        interval = "hour"
        
        Returns: [
            {"time": "14:00", "HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0},
            {"time": "15:00", "HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0},
            {"time": "16:00", "HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0},
        ]
    """
    buckets = []
    current = from_dt
    
    if interval == "hour":
        # Generate hourly buckets
        while current <= to_dt:
            time_key = current.strftime("%H:00")
            buckets.append({
                "time": time_key,
                "HIGH_SEVERITY": 0,
                "MEDIUM_SEVERITY": 0,
                "LOW_SEVERITY": 0
            })
            # Move to next hour
            current = current + timedelta(hours=1)
    
    elif interval == "day":
        # Generate daily buckets
        while current <= to_dt:
            time_key = current.strftime("%m/%d")
            buckets.append({
                "time": time_key,
                "HIGH_SEVERITY": 0,
                "MEDIUM_SEVERITY": 0,
                "LOW_SEVERITY": 0
            })
            # Move to next day (midnight)
            current = current + timedelta(days=1)
    
    return buckets

# =====================
# TIMELINE
# =====================
@app.get("/api/dashboard/timeline")
async def get_timeline_data(from_date: str, to_date: str, interval: str = "hour"):
    """Attack timeline grouped by time interval with severity classification.
    
    SEVERITY CLASSIFICATION RULES (based on confidence score):
    - HIGH_SEVERITY: confidence >= 0.80 (high confidence attacks)
    - MEDIUM_SEVERITY: 0.50 <= confidence < 0.80 (moderate confidence)
    - LOW_SEVERITY: confidence < 0.50 (lower confidence)
    
    PROCESSING RULES:
    - Generates ALL time buckets in the range (even with zero attacks)
    - Only processes attack logs (predicted_label != 0)
    - Ignores benign traffic (predicted_label == 0)
    - Severity determined ONLY by confidence column, not attack_type
    - Each time bucket initialized with all three severity keys = 0
    - Suitable for multi-line time series chart rendering
    
    Args:
        from_date: ISO 8601 UTC string, e.g., "2025-09-19T00:00:00Z"
        to_date: ISO 8601 UTC string, e.g., "2025-09-26T23:59:59Z"
        interval: "hour" or "day" (determines time bucket grouping)
    
    Returns:
        List of time buckets with severity counts, chronologically sorted:
        [
            {
                "time": "14:00",
                "HIGH_SEVERITY": 5,
                "MEDIUM_SEVERITY": 3,
                "LOW_SEVERITY": 1
            },
            ...
        ]
    """
    try:
        # STEP 1: Parse from_date and to_date as UTC datetimes
        # Supabase returns ISO 8601 UTC strings: "2026-01-15T14:55:57.799066+00:00"
        from_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        to_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        
        # STEP 2: Generate full time buckets for the entire range
        # This includes ALL buckets even if no attacks occurred
        time_buckets = generate_time_buckets(from_dt, to_dt, interval)
        
        # STEP 3: Create a dictionary mapping time keys to bucket objects
        # This enables O(1) lookup when incrementing severity counters
        bucket_dict = {bucket["time"]: bucket for bucket in time_buckets}
        
        # STEP 4: Fetch all logs in the date range
        logs = get_logs_by_date_range(from_date, to_date)
        
        # STEP 5-6: Iterate over logs and classify by severity
        for log in logs:
            # CRITICAL: Only process attack logs (predicted_label != 0)
            # Ignore benign traffic (predicted_label == 0)
            if int(log.get("predicted_label", 0)) == 0:
                continue
            
            created_at_str = log.get("created_at", "")
            if not created_at_str:
                continue
            
            try:
                # Parse log timestamp
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            except:
                continue
            
            # Generate time key matching bucket format
            if interval == "day":
                time_key = created_at.strftime("%m/%d")
            else:
                time_key = created_at.strftime("%H:00")
            
            # Skip if this log falls outside the expected bucket range
            # (defensive check in case of data inconsistencies)
            if time_key not in bucket_dict:
                continue
            
            # Classify severity STRICTLY by confidence column
            # confidence is a double precision float from 0.0 to 1.0
            confidence = float(log.get("confidence", 0)) if log.get("confidence") else 0
            
            if confidence >= 0.80:
                severity = "HIGH_SEVERITY"
            elif confidence >= 0.50:
                severity = "MEDIUM_SEVERITY"
            else:
                severity = "LOW_SEVERITY"
            
            # Increment the severity counter for this time bucket
            bucket_dict[time_key][severity] += 1
        
        # STEP 7: Return ALL buckets (including zero-filled ones)
        # Time buckets are already in chronological order from generate_time_buckets()
        return time_buckets
    except Exception as e:
        print(f"[ERROR] get_timeline_data: {e}")
        import traceback
        traceback.print_exc()
        return []

# =====================
# CHART DATA
# =====================
@app.get("/api/dashboard/stats/chart-data")
async def get_stats_chart_data(from_date: str, to_date: str):
    """Mini chart data for stat cards (7 segments)
    
    Args:
        from_date: ISO 8601 string, e.g., "2025-09-19T00:00:00Z"
        to_date: ISO 8601 string, e.g., "2025-09-26T23:59:59Z"
    """
    try:
        logs = get_logs_by_date_range(from_date, to_date)
        
        if not logs:
            return {
                "total_attacks": [0] * 7,
                "active_threats": [0] * 7,
                "active_alerts": [0] * 7,
                "uptime": [100] * 7
            }
        
        # Split into 7 segments
        segment_size = max(1, len(logs) // 7)
        
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
            
            # Count attacks: predicted_label != 0
            attacks = [l for l in segment if int(l.get("predicted_label", 0)) != 0]
            attack_count = len(attacks)
            total_attacks_data.append(attack_count)
            
            # Threat percentage
            threats_pct = (attack_count / len(segment) * 100) if segment else 0
            active_threats_data.append(round(threats_pct))
            
            # High confidence alerts
            high_conf = [l for l in attacks if float(l.get("confidence", 0)) > 0.7]
            alerts_pct = (len(high_conf) / len(segment) * 100) if segment else 0
            active_alerts_data.append(round(alerts_pct))
            
            # Uptime percentage (benign traffic)
            benign_count = len(segment) - attack_count
            uptime_pct = (benign_count / len(segment) * 100) if segment else 100
            uptime_data.append(round(uptime_pct))
        
        return {
            "total_attacks": total_attacks_data,
            "active_threats": active_threats_data,
            "active_alerts": active_alerts_data,
            "uptime": uptime_data
        }
    except Exception as e:
        print(f"[ERROR] get_stats_chart_data: {e}")
        return {
            "total_attacks": [0] * 7,
            "active_threats": [0] * 7,
            "active_alerts": [0] * 7,
            "uptime": [100] * 7
        }

# =====================
# DETAIL LOGS
# =====================
@app.get("/api/detail/logs")
async def get_detail_logs(limit: int = 100, offset: int = 0):
    logs = get_all_logs(limit=limit + offset)
    return {
        "logs": logs[offset:offset + limit],
        "total": len(logs),
        "limit": limit,
        "offset": offset
    }
