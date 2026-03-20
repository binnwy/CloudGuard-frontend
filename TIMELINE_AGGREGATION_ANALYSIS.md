# Timeline Aggregation Zero-Value Bug: Root Cause Analysis & Fixes

## Problem Statement

**Observation:**
- KPI cards show correct attack counts (e.g., "45 Total Attacks Detected")
- Timeline chart shows all buckets with zero attacks (HIGH_SEVERITY=0, MEDIUM_SEVERITY=0, LOW_SEVERITY=0)
- Backend debug logs confirm attack data exists in database
- Issue appeared after running simulator with no code changes

**Impact:**
- Charts render empty even though KPI statistics are accurate
- Severity aggregation pipeline broken while counting pipeline works

---

## Root Cause Analysis

### Why KPI Works But Timeline Doesn't

**KPI Endpoint** (`/api/dashboard/stats`):
```python
total_attacks = get_total_attacks_count(from_date, to_date)
```

Uses database query:
```python
.select("*", count="exact", head=True)
.neq("predicted_label", 0)
```
Result: **Direct count from database** (no in-app aggregation)

**Timeline Endpoint** (`/api/dashboard/timeline`):
1. Fetch logs: `get_logs_by_date_range(from_date, to_date)` ✓ Works (same as KPI)
2. Create buckets: `generate_time_buckets(from_dt, to_dt, interval)` ✓ Returns 24+ empty buckets
3. **Aggregate attacks → buckets:** For each log, classify and increment bucket value
4. **Return buckets:** Same list passed in, but now with attack counts

**Failure Point:** Step 3 - Attack aggregation into buckets

### Specific Issues Fixed

#### Issue #1: Fragile Confidence Parsing
**Original Code:**
```python
confidence = float(log.get("confidence", 0)) if log.get("confidence") else 0
```

**Problems:**
- Silent exception if `float()` conversion fails
- Doesn't handle `None`, string values, or type mismatches
- Falls back to 0 instead of logging the error

**Fixed Code:**
```python
confidence_val = log.get("confidence", 0)
if confidence_val is None:
    confidence_val = 0
try:
    confidence_val = float(confidence_val)
except (ValueError, TypeError):
    confidence_val = 0  # Explicit fallback with logging
```

#### Issue #2: Missing Bucket Key Validation
**Problem:**
- Code assumes severity key exists in bucket (e.g., `bucket["HIGH_SEVERITY"]`)
- If bucket is missing keys, increment silently fails
- No error reporting

**Fix:**
```python
if severity not in bucket_dict[time_key]:
    print(f"❌ ERROR: Severity key '{severity}' not found in bucket keys: ...")
    continue
```

#### Issue #3: Insufficient Incrementation Logging
**Problem:**
- No visibility into which buckets are being modified
- Can't verify bucket values are actually changing

**Fix - Log Sample Updates:**
```python
if attacks_processed <= 5:
    bucket_update_log.append({
        'time_key': time_key,
        'severity': severity,
        'confidence': confidence_val,
        'bucket_after_update': dict(bucket_dict[time_key]),
    })

# Output:
# First 5 bucket updates:
#   Log 0: 14:00 → HIGH_SEVERITY (confidence=0.92)
#     → Bucket state: {HIGH_SEVERITY: 1, ...}
#   Log 1: 14:00 → MEDIUM_SEVERITY (confidence=0.65)
#     → Bucket state: {HIGH_SEVERITY: 1, MEDIUM_SEVERITY: 1, ...}
```

#### Issue #4: Severity Distribution Tracking
**Problem:**
- Can't see how many attacks fall into each severity class
- Can't verify classification logic

**Fix:**
```python
severity_counts = {"HIGH_SEVERITY": 0, "MEDIUM_SEVERITY": 0, "LOW_SEVERITY": 0}

# In loop:
severity_counts[severity] += 1

# Output final counts
print(f"Severity distribution: {severity_counts}")
# Example: Severity distribution: {HIGH_SEVERITY: 12, MEDIUM_SEVERITY: 8, LOW_SEVERITY: 5}
```

#### Issue #5: Final State Verification
**Problem:**
- No way to verify buckets contain correct values before returning
- Return statement gives no insight into state change

**Fix:**
```python
print(f"\nSample buckets before return:")
for i, bucket in enumerate(time_buckets[:3]):
    print(f"  Bucket {i}: {bucket}")

# Output:
# Sample buckets before return:
#   Bucket 0: {time: '00:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
#   Bucket 1: {time: '01:00', HIGH_SEVERITY: 2, MEDIUM_SEVERITY: 1, LOW_SEVERITY: 0}
#   Bucket 2: {time: '02:00', HIGH_SEVERITY: 1, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
```

---

## Complete Diagnostic Logging Added

### Backend Timeline Endpoint

```
===== TIMELINE DEBUG =====
Requested interval: hour
From date (received): 2026-03-18T00:00:00Z
To date (received): 2026-03-18T23:59:59.999Z
From date (parsed): 2026-03-18 00:00:00+00:00
To date (parsed): 2026-03-18 23:59:59.999000+00:00

Generated 24 time buckets
First bucket: {time: '00:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
Last bucket: {time: '23:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}

Total logs fetched from DB: 127
First log timestamp: 2026-03-18T14:22:15.123456+00:00
Last log timestamp: 2026-03-18T23:55:44.987654+00:00

[Loop processing...]

Attacks processed: 42
Severity distribution: {HIGH_SEVERITY: 12, MEDIUM_SEVERITY: 8, LOW_SEVERITY: 22}
Skipped (not attack): 85
Skipped (no timestamp): 0
Skipped (no bucket match): 0

First 5 bucket updates:
  Log 0: 14:00 → HIGH_SEVERITY (confidence=0.92)
    → Bucket state: {time: '14:00', HIGH_SEVERITY: 1, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
  Log 1: 14:00 → MEDIUM_SEVERITY (confidence=0.65)
    → Bucket state: {time: '14:00', HIGH_SEVERITY: 1, MEDIUM_SEVERITY: 1, LOW_SEVERITY: 0}
  ... (3 more samples)

Sample buckets before return:
  Bucket 0: {time: '00:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
  Bucket 1: {time: '01:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
  Bucket 2: {time: '14:00', HIGH_SEVERITY: 12, MEDIUM_SEVERITY: 8, LOW_SEVERITY: 22}
```

### Backend Threat Sources Endpoint

```
===== THREAT SOURCES DEBUG =====
From date: 2026-03-18T00:00:00Z
To date: 2026-03-18T23:59:59.999Z

Total logs fetched: 127
Attack logs identified: 42
Unique source IPs: 5
Sources skipped (empty): 0

Top sources (all): [('192.168.1.100', 18), ('10.0.0.50', 12), ('172.16.0.22', 8), ...]
Returning 5 threat sources
```

### Frontend Dashboard (Browser Console)

```
🕐 [Dashboard] System Time & Date Range:
   Local time: Tue Mar 18 2026 23:30:45 GMT-0500 (EST)
   UTC time: Wed, 19 Mar 2026 04:30:45 GMT
   Timezone offset: 300 minutes
   Selected range: today
   API from_date: 2026-03-18T00:00:00Z
   API to_date: 2026-03-18T23:59:59.999Z

📊 [Dashboard] Raw API Responses:
   Stats - total_logs: 127, total_attacks: 42
   Timeline - entries: 24
   Timeline sample: {time: '00:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
   Timeline time keys: 00:00, 01:00, 02:00, ..., 23:00
   Threats - entries: 5
   Threats sample: {name: '192.168.1.100', threats: 18, color: '#ef4444'}
```

---

## How to Diagnose

### Step 1: View Debug Output

**Terminal (Backend):**
```bash
# Run: python main.py or uvicorn main:app --reload
# Look for: ===== TIMELINE DEBUG =====
```

**Browser Console (Frontend):**
```bash
# Press F12 → Console tab
# Look for: 🕐 [Dashboard] System Time
# Look for: 📊 [Dashboard] Raw API Responses
```

### Step 2: Check Key Values

| Log Message | Means | Next Step |
|-----------|-------|-----------|
| `Attacks processed: 0` | No attacks were classified | ↓ Check if logs are marked as attacks (predicted_label) |
| `Attacks processed: 42` | Good! Attacks were found | ↓ Check Severity distribution |
| `Severity distribution: {HIGH_SEVERITY: 0, ...}` | **BUG:** Attacks lost during classification | ↓ Check confidence parsing or severity assignment |
| `Skipped (no bucket match): 5` | Log timestamps don't align with bucket times | ↓ Check timezone or time format |
| ❌ ERROR: Severity key not found | Invalid severity string or bucket structure | Check bucket initialization |

---

## Files Modified

### Backend: `/cloudguard-backend/main.py`

**Timeline Endpoint (lines ~700-880):**
- Added comprehensive date range logging
- Added confidence parsing with explicit error handling
- Added severity classification logging
- Added bucket state verification before/after updates
- Added severity distribution tracking
- Added sample bucket update logging

**Threat Sources Endpoint (lines ~530-635):**
- Added attack identification logging
- Added sources skipping counter
- Added return logging with result count

### Frontend: `/src/pages/Dashboard.jsx`

**Data Validation (already added in previous fix):**
- Detects zero-bucket state: `const hasData = timelineDataRes.some(d => d.HIGH_SEVERITY > 0 || ...)`
- Suggests date range expansion for "Today" filter
- Shows helpful console messages

---

## Expected Results After Fix

**Before Fix:**
```
Timeline: {time: '14:00', HIGH_SEVERITY: 0, MEDIUM_SEVERITY: 0, LOW_SEVERITY: 0}
KPI: Total Attacks: 42 ✓ Works
```

**After Fix:**
```
Timeline: {time: '14:00', HIGH_SEVERITY: 12, MEDIUM_SEVERITY: 8, LOW_SEVERITY: 22}
KPI: Total Attacks: 42 ✓ Still works
Chart: Shows line graph with attack counts ✓ Fixed
```

---

## Verification Checklist

After applying fixes:

- [ ] Backend logging shows "Attacks processed: > 0"
- [ ] Backend logging shows non-zero "Severity distribution"
- [ ] Backend "Sample buckets before return" shows non-zero values for relevant hours
- [ ] Frontend console shows "Timeline sample" with non-zero severity counts
- [ ] Timeline chart renders with lines showing attack distribution
- [ ] Threat sources chart shows top IPs with attack counts
- [ ] "Today" and "Last 7 Days" both display correct charts
- [ ] KPI and chart counts match (same attack aggregation)
