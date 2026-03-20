from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv
import os
import asyncio
import urllib.request
import json
from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Optional
from fastapi import APIRouter, Response
import csv
import io
import re
import google.generativeai as genai
# =====================
# LOAD ENV
# =====================
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# =====================
# GEMINI LLM SETUP
# =====================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("models/gemini-flash-latest")

else:
    model = None

# =====================
# FASTAPI APP
# =====================

def get_region_for_ip(ip: str) -> str:
    if not ip or ip.startswith("192.168.") or ip.startswith("10.") or ip == "127.0.0.1":
        return "Local"
    try:
        url = f"http://ip-api.com/json/{ip}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data.get("status") == "success":
                region = data.get("regionName", "Unknown")
                country = data.get("countryCode", "Unknown")
                return f"{region}, {country}"
    except Exception as e:
        print(f"Error getting region for {ip}: {e}")
    return "Unknown"

async def backfill_regions_bg():
    while True:
        try:
            # Check for empty regions first
            res = supabase.table("cloudguard_logs").select("id, srcaddr").filter("region", "is", "null").limit(50).execute()
            data = res.data or []
            if not data:
                res2 = supabase.table("cloudguard_logs").select("id, srcaddr").eq("region", "").limit(50).execute()
                data = res2.data or []
            
            for row in data:
                ip = row.get("srcaddr")
                if ip:
                    # Run synchronous urllib in a background thread to prevent blocking FastAPI event loop
                    region = await asyncio.to_thread(get_region_for_ip, ip)
                    supabase.table("cloudguard_logs").update({"region": region}).eq("id", row["id"]).execute()
                    await asyncio.sleep(1.5) # respect rate limit of 45/min
            
            # If no more rows, sleep longer
            if not data:
                await asyncio.sleep(60)
        except Exception as e:
            print("Error backfilling regions:", e)
            await asyncio.sleep(60)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(backfill_regions_bg())

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
# INTENT DETECTION
# =====================
def normalize(text: str) -> str:
    """Normalize text: lowercase, remove punctuation (except / and -), and collapse spaces"""
    text = text.lower()
    text = re.sub(r"[^\w\s/-]", "", text)  # Remove punctuation but preserve / and -
    text = re.sub(r'\s+', ' ', text)     # Collapse multiple spaces
    return text.strip()

def detect_intent(message: str) -> str:
    """Detect user intent from message using keyword grouping"""
    normalized = normalize(message)
    words = normalized.split()
    
    # Helper: check if any word starts with a keyword (handles plurals, variations)
    def has_keyword(words_list, keyword):
        return any(w.startswith(keyword) for w in words_list)
    
    # last_attack: requires "last" AND "attack"
    if has_keyword(words, 'last') and has_keyword(words, 'attack'):
        return "last_attack"
    
    # total_logs: requires "log" AND ("total" OR "count" OR "many")
    if has_keyword(words, 'log') and any(has_keyword(words, kw) for kw in ['total', 'count', 'many']):
        return "total_logs"
    
    # total_attacks: requires "attack" AND ("total" OR "count" OR "many")
    if has_keyword(words, 'attack') and any(has_keyword(words, kw) for kw in ['total', 'count', 'many']):
        return "total_attacks"
    
    return "unknown"

def detect_date_range(message: str) -> tuple:
    """Detect date range from message keywords or date formats.
    
    Returns:
        (from_date: str, to_date: str, label: str) all in ISO 8601 UTC format ending with 'Z'
    """
    normalized = normalize(message)
    now = datetime.utcnow()
    
    # Helper: parse date string in DD-MM-YYYY or DD/MM/YYYY format
    def parse_date(date_str: str):
        """Parse date and return datetime object or None"""
        try:
            # Try DD-MM-YYYY
            if "-" in date_str:
                return datetime.strptime(date_str, "%d-%m-%Y")
            # Try DD/MM/YYYY
            elif "/" in date_str:
                return datetime.strptime(date_str, "%d/%m/%Y")
        except (ValueError, AttributeError):
            pass
        return None
    
    # Priority 1: Check for range (from-to)
    range_match = re.search(r'from\s+([\d\-/]+)\s+to\s+([\d\-/]+)', normalized)
    if range_match:
        from_str, to_str = range_match.groups()
        from_dt = parse_date(from_str)
        to_dt = parse_date(to_str)
        if from_dt and to_dt:
            from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=0)
            label = f"from {from_str} to {to_str}"
            return (from_dt.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                    to_dt.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                    label)
    
    # Priority 2: Check for single date (DD-MM-YYYY or DD/MM/YYYY)
    date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', normalized)
    if date_match:
        date_str = date_match.group(1)
        parsed_date = parse_date(date_str)
        if parsed_date:
            from_dt = parsed_date.replace(hour=0, minute=0, second=0, microsecond=0)
            to_dt = parsed_date.replace(hour=23, minute=59, second=59, microsecond=0)
            label = f"on {date_str}"
            return (from_dt.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                    to_dt.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                    label)
    
    # Priority 3: Today
    if "today" in normalized:
        from_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        to_date = now
        label = "today"
        return (from_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                to_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                label)
    
    # Priority 4: Yesterday
    if "yesterday" in normalized:
        yesterday = now - timedelta(days=1)
        from_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        to_date = yesterday.replace(hour=23, minute=59, second=59, microsecond=0)
        label = "yesterday"
        return (from_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                to_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                label)
    
    # Priority 5: Last 7 days (also handles "7 days")
    if "last 7" in normalized or "7 days" in normalized:
        from_date = now - timedelta(days=7)
        to_date = now
        label = "last 7 days"
        return (from_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                to_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
                label)
    
    # Priority 6: Default: last 30 days
    from_date = now - timedelta(days=30)
    to_date = now
    label = "in the last 30 days"
    return (from_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
            to_date.strftime('%Y-%m-%dT%H:%M:%SZ'), 
            label)

# =====================
# LLM HELPER
# =====================
def call_llm_gemini(message: str) -> str:
    """Call Google Gemini LLM for general cybersecurity questions.
    Only used for unknown intents. Does not generate statistics.
    """
    if not model:
        return "The AI assistant is temporarily unavailable. Please try again shortly."
    
    try:
        system_prompt = (
            """You are a cybersecurity SOC assistant.

            Provide concise, professional explanations suitable for a security dashboard.
            Limit responses to 3-4 sentences.
            Do not use markdown headings, numbered lists, or bullet lists.
            Use bold formatting only for important technical terms.
            Do not mention that you are an AI model.
            Do not generate statistics or system metrics."""
        )
        response = model.generate_content(
            f"{system_prompt}\n\nUser question: {message}",
            generation_config={
            "temperature": 0.4}
)

        if response and response.text:
            return response.text
        return "The AI assistant could not generate a response. Please try again."
    except Exception as e:
        print(f"[ERROR] LLM call failed: {e}")
        return "The AI assistant is temporarily unavailable. Please try again shortly."

# =====================
# CHATBOT
# =====================
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        intent = detect_intent(req.message)
        from_date, to_date, date_label = detect_date_range(req.message)
        
        if intent == "last_attack":
            # Return info about the most recent attack in the database (ignore date range)
            response = (
                supabase
                .table("cloudguard_logs")
                .select("id, srcaddr, region, attack_type, action, confidence, created_at, predicted_label")
                .neq("predicted_label", 0)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            logs = response.data or []
            if not logs:
                return ChatResponse(answer="No attacks have been recorded in the system yet.")
            log = logs[0]
            # Extract fields
            timestamp_str = log["created_at"]
            if timestamp_str.endswith('Z'):
                timestamp_str = timestamp_str.replace('Z', '+00:00')
            try:
                attack_time = datetime.fromisoformat(timestamp_str)
                formatted_time = attack_time.strftime("%d-%m-%Y %H:%M:%S")
            except Exception:
                formatted_time = timestamp_str
            attack_type = log.get("attack_type", "Unknown")
            srcaddr = log.get("srcaddr", "Unknown")
            return ChatResponse(
                answer=(
                    f"The most recent attack occurred on {formatted_time} UTC. "
                    f"It was an {attack_type} attempt from IP address {srcaddr}."
                )
            )
        
        elif intent == "total_logs":
            total_logs = get_total_logs_count(from_date, to_date)
            # Professional response formatting
            if total_logs == 0:
                return ChatResponse(answer="No traffic logs were recorded during the selected time period.")
            # Use label for formatting
            if date_label == "today":
                return ChatResponse(answer=f"A total of {total_logs} traffic logs have been recorded today.")
            elif date_label == "yesterday":
                return ChatResponse(answer=f"A total of {total_logs} traffic logs were recorded yesterday.")
            elif date_label.startswith("on "):
                return ChatResponse(answer=f"A total of {total_logs} traffic logs were recorded on {date_label[3:]}.")
            elif date_label.startswith("from "):
                return ChatResponse(answer=f"A total of {total_logs} traffic logs were recorded {date_label}.")
            elif date_label == "in the last 30 days":
                return ChatResponse(answer=f"A total of {total_logs} traffic logs were recorded in the last 30 days.")
            else:
                return ChatResponse(answer=f"A total of {total_logs} traffic logs were recorded during the selected time period.")

        elif intent == "total_attacks":
            total_logs = get_total_logs_count(from_date, to_date)
            if total_logs == 0:
                return ChatResponse(answer="No traffic data was recorded during the selected time period, so no attacks were detected.")
            total_attacks = get_total_attacks_count(from_date, to_date)
            if total_attacks == 0:
                return ChatResponse(answer="Traffic was recorded during the selected period, but no malicious activity was detected.")
            # Use label for formatting
            if date_label == "today":
                return ChatResponse(answer=f"{total_attacks} security attacks have been detected today.")
            elif date_label == "yesterday":
                return ChatResponse(answer=f"{total_attacks} security attacks were detected yesterday.")
            elif date_label.startswith("on "):
                return ChatResponse(answer=f"{total_attacks} security attacks were detected on {date_label[3:]}.")
            elif date_label.startswith("from "):
                return ChatResponse(answer=f"{total_attacks} security attacks were detected {date_label}.")
            elif date_label == "in the last 30 days":
                return ChatResponse(answer=f"{total_attacks} security attacks were detected in the last 30 days.")
            else:
                return ChatResponse(answer=f"{total_attacks} security attacks were detected during the selected time period.")
        
        else:
            # Unknown intent - use LLM
            llm_answer = call_llm_gemini(req.message)
            return ChatResponse(answer=llm_answer)
    
    except Exception as e:
        print(f"[ERROR] chat endpoint: {e}")
        return ChatResponse(answer="Unable to retrieve data for the selected date.")
#csv download api

router = APIRouter()

@router.get("/api/dashboard/export-csv")
def export_csv(from_date: str, to_date: str, columns: Optional[str] = None):
    response = (
        supabase
        .table("cloudguard_logs")
        .select("*")
        .gte("created_at", from_date)
        .lte("created_at", to_date)
        .order("created_at", desc=False)
        .execute()
    )
    rows = response.data or []

    if not rows:
        return Response(
            content="No data available for the selected date range.",
            media_type="text/plain"
        )

    # Parse selected columns from query parameter
    selected_cols = []
    if columns:
        selected_cols = [col.strip() for col in columns.split(',') if col.strip()]
    
    # If no columns specified or invalid, use all columns from first row
    if not selected_cols:
        selected_cols = list(rows[0].keys())
    else:
        # Filter to only include columns that exist in the data
        available_cols = set(rows[0].keys())
        selected_cols = [col for col in selected_cols if col in available_cols]
    
    # If no valid columns remain, use all
    if not selected_cols:
        selected_cols = list(rows[0].keys())

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=selected_cols)
    writer.writeheader()
    
    # Write rows with only selected columns
    for row in rows:
        filtered_row = {col: row.get(col, '') for col in selected_cols}
        writer.writerow(filtered_row)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=cloudguard_logs.csv"
        },
    )
app.include_router(router)

# =====================
# DASHBOARD STATS
# =====================
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(from_date: str, to_date: str):
    logs = get_logs_by_date_range(from_date, to_date)

    print("\n===== DASHBOARD STATS DEBUG =====")
    print(f"Date range: {from_date} to {to_date}")
    print(f"Total rows fetched from DB: {len(logs)}")

    attack_count = 0
    for log in logs:
        try:
            predicted_label = int(log.get("predicted_label", 0))
        except:
            predicted_label = 0

        if predicted_label != 0:
            attack_count += 1

    print(f"Rows treated as ATTACKS: {attack_count}")

    if logs:
        print("First log:", {
            "created_at": logs[0].get("created_at"),
            "predicted_label": logs[0].get("predicted_label"),
            "attack_type": logs[0].get("attack_type"),
            "confidence": logs[0].get("confidence"),
            "srcaddr": logs[0].get("srcaddr"),
        })
        print("Last log:", {
            "created_at": logs[-1].get("created_at"),
            "predicted_label": logs[-1].get("predicted_label"),
        })
    else:
        print("⚠️ No logs found in database for this date range!")
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
        # DEBUG: Log incoming date range
        print("\n===== THREAT SOURCES DEBUG =====")
        print(f"From date: {from_date}")
        print(f"To date: {to_date}")
        
        # STEP 1: Fetch all logs in the date range
        logs = get_logs_by_date_range(from_date, to_date)
        print(f"Total logs fetched: {len(logs)}")
        
        # STEP 2: Filter to ONLY attack logs (predicted_label != 0)
        # Safely cast predicted_label to int with fallback
        attacks = []
        for log in logs:
            predicted_label_val = log.get("predicted_label", 0)
            try:
                predicted_label_val = int(predicted_label_val)
            except (ValueError, TypeError):
                predicted_label_val = 0
            
            if predicted_label_val != 0:
                attacks.append(log)
        
        print(f"Attack logs identified: {len(attacks)}")
        
        # Return empty list if no attacks found
        if not attacks:
            print("No attacks found - returning empty list")
            return []
        
        # STEP 3-4: Group by srcaddr and count, skip null/empty
        source_counts = defaultdict(int)
        source_regions = {}
        sources_skipped = 0
        
        for log in attacks:
            srcaddr = log.get("srcaddr", "").strip()
            # CRITICAL: Skip null or empty srcaddr entries
            if not srcaddr:
                sources_skipped += 1
                continue
            source_counts[srcaddr] += 1
            if srcaddr not in source_regions:
                region = log.get("region")
                source_regions[srcaddr] = region if region else "Unknown"
        
        print(f"Unique source IPs: {len(source_counts)}")
        print(f"Sources skipped (empty): {sources_skipped}")
        
        # Return empty list if no valid srcaddr entries
        if not source_counts:
            print("No valid source addresses - returning empty list")
            return []
        
        # STEP 5: Sort by attack count descending
        sorted_sources = sorted(source_counts.items(), key=lambda x: x[1], reverse=True)
        
        print(f"Top sources (all): {sorted_sources}")
        
        # STEP 6: Return top 5 with color assignments
        colors = ['#ef4444', '#f59e0b', '#60a5fa', '#10b981', '#a855f7']
        
        result = [
            {"name": f"{name} ({source_regions.get(name, 'Unknown')})", "threats": count, "color": colors[i]}
            for i, (name, count) in enumerate(sorted_sources[:5])
        ]
        
        print(f"Returning {len(result)} threat sources")
        return result
        
    except Exception as e:
        print(f"[ERROR] get_threat_sources: {e}")
        import traceback
        traceback.print_exc()
        return []

# =====================
# ALL LOCATIONS / MAP DATA
# =====================
@app.get("/api/dashboard/locations")
async def get_locations(from_date: str, to_date: str):
    """Aggregate traffic by location (region) including both benign and attack counts.
    Provides coordinates for map rendering.
    """
    try:
        logs = get_logs_by_date_range(from_date, to_date)
        
        # Mapping of country codes to approx [longitude, latitude]
        COUNTRY_LON_LAT = {
            "US": [-97.0, 38.0], "California": [-119.4, 36.7], "New York": [-74.0, 40.7], "Texas": [-99.9, 31.9], "Virginia": [-78.6, 37.4], "Ohio": [-82.9, 40.4], "Oregon": [-120.5, 43.8],
            "CN": [105.0, 35.0], "Beijing": [116.4, 39.9],
            "RU": [105.3, 61.5], "Moscow": [37.6, 55.7],
            "BR": [-51.9, -14.2], "São Paulo": [-46.6, -23.5],
            "IN": [79.0, 20.6], "Maharashtra": [75.7, 19.7],
            "GB": [-3.4, 55.3], "England": [-1.1, 52.3], "London": [-0.1, 51.5],
            "DE": [10.4, 51.1], "Hesse": [9.0, 50.6], "Bavaria": [11.4, 48.7],
            "FR": [2.2, 46.2], "Île-de-France": [2.3, 48.8], "Provence-Alpes-Côte d'Azur": [6.0, 43.9],
            "JP": [138.2, 36.2], "Tokyo": [139.6, 35.6],
            "KR": [127.7, 35.9], "Seoul": [126.9, 37.5],
            "ZA": [22.9, -30.5],
            "AU": [133.7, -25.2], "New South Wales": [151.2, -33.8],
            "CA": [-106.3, 56.1], "Quebec": [-71.2, 46.8], "Ontario": [-79.4, 43.6],
            "IT": [12.5, 41.8],
            "ES": [-3.7, 40.4], "Madrid": [-3.7, 40.4],
            "NL": [5.2, 52.1], "North Holland": [4.9, 52.3],
            "SG": [103.8, 1.3],
            "TW": [120.9, 23.6],
            "UA": [31.1, 48.3],
            "IR": [53.6, 32.4],
            "TR": [35.2, 38.9], "Istanbul": [28.9, 41.0],
            "HK": [114.1, 22.3], "Kwai Tsing District": [114.1, 22.3],
            "Unknown": [0.0, 0.0]
        }
        
        location_data = {}
        for log in logs:
            region_str = log.get("region", "Unknown")
            # Handle empty strings that slip through
            if not region_str or region_str == "ap-south-1" or "ap south 1" in region_str.lower():
                continue
            
            parts = region_str.split(", ")
            country = parts[-1] if len(parts) > 1 else parts[0]
            
            try:
                pred = int(log.get("predicted_label", 0))
            except:
                pred = 0
            is_attack = pred != 0
            
            if region_str not in location_data:
                # Prioritize full region_str mapping if exists, else fallback to country part
                coords = COUNTRY_LON_LAT.get(region_str, COUNTRY_LON_LAT.get(country, [0.0, 0.0]))
                location_data[region_str] = {
                    "name": region_str, # Use region_str instead of 'country' to properly label on map
                    "region": region_str,
                    "benign": 0,
                    "attack": 0,
                    "coordinates": coords
                }
                
            if is_attack:
                location_data[region_str]["attack"] += 1
            else:
                location_data[region_str]["benign"] += 1
                
        # Filter out anything with zero points? No, keep all to show insights
        result = list(location_data.values())
        result.sort(key=lambda x: x["benign"] + x["attack"], reverse=True)
        return result
        
    except Exception as e:
        print(f"[ERROR] get_locations: {e}")
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
        # DEBUG: Log the incoming date range
        print("\n===== TIMELINE DEBUG =====")
        print(f"Requested interval: {interval}")
        print(f"From date (received): {from_date}")
        print(f"To date (received): {to_date}")
        
        # STEP 1: Parse from_date and to_date as UTC datetimes
        # Supabase returns ISO 8601 UTC strings: "2026-01-15T14:55:57.799066+00:00"
        from_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        to_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        
        print(f"From date (parsed): {from_dt}")
        print(f"To date (parsed): {to_dt}")
        
        # STEP 2: Generate full time buckets for the entire range
        # This includes ALL buckets even if no attacks occurred
        time_buckets = generate_time_buckets(from_dt, to_dt, interval)
        print(f"Generated {len(time_buckets)} time buckets")
        if time_buckets:
            print(f"First bucket: {time_buckets[0]}")
            print(f"Last bucket: {time_buckets[-1]}")
        
        # STEP 3: Create a dictionary mapping time keys to bucket objects
        # This enables O(1) lookup when incrementing severity counters
        bucket_dict = {bucket["time"]: bucket for bucket in time_buckets}
        
        # STEP 4: Fetch all logs in the date range
        logs = get_logs_by_date_range(from_date, to_date)
        print(f"Total logs fetched from DB: {len(logs)}")
        
        if logs:
            print(f"First log timestamp: {logs[0].get('created_at')}")
            print(f"Last log timestamp: {logs[-1].get('created_at')}")
        
        # STEP 5-6: Iterate over logs and classify by severity
        attacks_processed = 0
        attacks_skipped_not_attack = 0
        attacks_skipped_no_timestamp = 0
        attacks_skipped_no_bucket = 0
        
        # Track severity distribution
        severity_counts = {"HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0}
        bucket_update_log = []
        
        for i, log in enumerate(logs):
            # CRITICAL: Only process attack logs (predicted_label != 0)
            # Ignore benign traffic (predicted_label == 0)
            predicted_label_val = log.get("predicted_label", 0)
            try:
                predicted_label_val = int(predicted_label_val)
            except (ValueError, TypeError):
                predicted_label_val = 0
            
            if predicted_label_val == 0:
                attacks_skipped_not_attack += 1
                continue
            
            created_at_str = log.get("created_at", "")
            if not created_at_str:
                attacks_skipped_no_timestamp += 1
                continue
            
            try:
                # Parse log timestamp
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            except Exception as parse_err:
                print(f"Failed to parse timestamp '{created_at_str}': {parse_err}")
                attacks_skipped_no_timestamp += 1
                continue
            
            # Generate time key matching bucket format
            if interval == "day":
                time_key = created_at.strftime("%m/%d")
            else:
                time_key = created_at.strftime("%H:00")
            
            # Skip if this log falls outside the expected bucket range
            # (defensive check in case of data inconsistencies)
            if time_key not in bucket_dict:
                print(f"⚠️ Time key '{time_key}' not in buckets for log at {created_at}")
                attacks_skipped_no_bucket += 1
                continue
            
            # Classify severity STRICTLY by confidence column
            # confidence is a double precision float from 0.0 to 1.0
            confidence_val = log.get("confidence", 0)
            
            # Handle various confidence formats (string, float, int, None)
            if confidence_val is None:
                confidence_val = 0
            try:
                confidence_val = float(confidence_val)
            except (ValueError, TypeError):
                confidence_val = 0
            
            # Classify severity and normalize to uppercase
            if confidence_val >= 0.80:
                severity = "HIGH_SEVERITY"
            elif confidence_val >= 0.50:
                severity = "MEDIUM_SEVERITY"
            else:
                severity = "LOW_SEVERITY"
            
            # Verify severity key exists in bucket
            if severity not in bucket_dict[time_key]:
                print(f"❌ ERROR: Severity key '{severity}' not found in bucket keys: {list(bucket_dict[time_key].keys())}")
                continue
            
            # Increment the severity counter for this time bucket
            bucket_dict[time_key][severity] += 1
            severity_counts[severity] += 1
            attacks_processed += 1
            
            # Log first few updates to verify buckets are being modified
            if attacks_processed <= 5:
                bucket_update_log.append({
                    'log_index': i,
                    'time_key': time_key,
                    'severity': severity,
                    'confidence': confidence_val,
                    'bucket_after_update': dict(bucket_dict[time_key]),
                })
        
        print(f"\nAttacks processed: {attacks_processed}")
        print(f"Severity distribution: {severity_counts}")
        print(f"Skipped (not attack): {attacks_skipped_not_attack}")
        print(f"Skipped (no timestamp): {attacks_skipped_no_timestamp}")
        print(f"Skipped (no bucket match): {attacks_skipped_no_bucket}")
        
        # Show first few bucket updates to verify increments
        if bucket_update_log:
            print(f"\nFirst {len(bucket_update_log)} bucket updates:")
            for update in bucket_update_log:
                print(f"  Log {update['log_index']}: {update['time_key']} → {update['severity']} (confidence={update['confidence']:.2f})")
                print(f"    → Bucket state: {update['bucket_after_update']}")
        
        # CRITICAL: Show final state of some buckets before returning
        print(f"\nSample buckets before return:")
        for i, bucket in enumerate(time_buckets[:3]):  # Show first 3 buckets
            print(f"  Bucket {i}: {bucket}")
        
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
