"""
Google Sheets Service Module
Handles all Google Sheets operations for data storage
"""
import gspread
from google.oauth2.service_account import Credentials
import json
import os
import time
from typing import List, Dict, Any, Optional
from functools import wraps

# Google Sheets Configuration
SPREADSHEET_ID = "1TkSgekL4LxhRl8U0q972Z21tiiP5PNyYIrQBB8C5144"

# Support both local file and Secret Manager (for Cloud Run)
def get_service_account_credentials():
    """Get service account credentials from file or Secret Manager"""
    # Check for Secret Manager environment variable (Cloud Run sets this)
    # When secret is mounted, Cloud Run sets GOOGLE_SERVICE_JSON env var with the file path
    secret_path = os.environ.get("GOOGLE_SERVICE_JSON")
    if secret_path and os.path.exists(secret_path):
        with open(secret_path, 'r') as f:
            return json.loads(f.read())
    
    # Also check common Cloud Run secret mount locations
    cloud_run_secret_paths = [
        "/secrets/google-service-json",  # Cloud Run secret mount path (primary)
        "/app/google_service.json",
        "/secrets/google_service.json",
    ]
    
    for secret_path in cloud_run_secret_paths:
        if os.path.exists(secret_path):
            with open(secret_path, 'r') as f:
                return json.loads(f.read())
    
    # Fallback to local file
    service_account_file = os.environ.get("SERVICE_ACCOUNT_FILE", "google_service.json")
    if os.path.exists(service_account_file):
        with open(service_account_file, 'r') as f:
            return json.loads(f.read())
    
    raise FileNotFoundError(
        f"Service account credentials not found. "
        f"Tried: GOOGLE_SERVICE_JSON env var, {cloud_run_secret_paths}, and {service_account_file}"
    )

SERVICE_ACCOUNT_FILE = "google_service.json"  # Keep for backward compatibility

# Sheet names (tabs in the spreadsheet)
SHEET_USERS = "Users"
SHEET_CLIENTS = "Clients"
SHEET_DISPENSERS = "Dispensers"
SHEET_SCHEDULES = "Schedules"
SHEET_REFILL_LOGS = "RefillLogs"
SHEET_TECHNICIAN_ASSIGNMENTS = "TechnicianAssignments"
SHEET_CLIENT_MACHINES = "ClientMachines"
SHEET_SCHEDULE_TIME_RANGES = "ScheduleTimeRanges"
SHEET_SCHEDULE_INTERVALS = "ScheduleIntervals"

# Cache for the Google Sheets client
_gsheets_client = None
_spreadsheet = None
_worksheet_cache = {}  # Cache worksheets to reduce API calls

# In-memory data cache to avoid unnecessary API calls
_data_cache = {
    "users": None,
    "clients": None,
    "dispensers": None,
    "schedules": None,
    "schedule_time_ranges": None,
    "schedule_intervals": None,
    "refill_logs": None,
    "technician_assignments": None,
    "client_machines": None,
}

# Cache invalidation functions
def invalidate_cache(cache_key: str = None):
    """Invalidate data cache - if cache_key is None, invalidate all"""
    global _data_cache
    if cache_key:
        _data_cache[cache_key] = None
    else:
        # Invalidate all
        for key in _data_cache:
            _data_cache[key] = None


def rate_limit_retry(max_retries=3, delay=2, backoff=2):
    """Decorator to retry API calls with exponential backoff on rate limit errors"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            current_delay = delay
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except gspread.exceptions.APIError as e:
                    # Check if it's a rate limit error (429)
                    is_rate_limit = False
                    if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
                        is_rate_limit = e.response.status_code == 429
                    elif '429' in str(e) or 'Quota exceeded' in str(e):
                        is_rate_limit = True
                    
                    if is_rate_limit:
                        retries += 1
                        if retries < max_retries:
                            print(f"Rate limit hit, waiting {current_delay} seconds before retry... (attempt {retries}/{max_retries})")
                            time.sleep(current_delay)
                            current_delay *= backoff
                        else:
                            raise Exception(f"Rate limit exceeded after {max_retries} retries. Please wait a few minutes and try again.")
                    else:
                        raise
                except Exception as e:
                    # Re-raise non-API errors
                    raise
            return None
        return wrapper
    return decorator


def get_gsheets_client():
    """Get or create Google Sheets client"""
    global _gsheets_client
    if _gsheets_client is None:
        scope = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
        # Support both Secret Manager (Cloud Run) and local file
        service_account_data = get_service_account_credentials()
        creds = Credentials.from_service_account_info(
            service_account_data, scopes=scope
        )
        _gsheets_client = gspread.authorize(creds)
    return _gsheets_client


def get_spreadsheet():
    """Get or open the spreadsheet"""
    global _spreadsheet
    if _spreadsheet is None:
        client = get_gsheets_client()
        _spreadsheet = client.open_by_key(SPREADSHEET_ID)
    return _spreadsheet


@rate_limit_retry(max_retries=3, delay=2)
def get_or_create_worksheet(sheet_name: str, headers: List[str]) -> gspread.Worksheet:
    """Get existing worksheet or create it with headers"""
    # Check cache first (skip API call if cached)
    if sheet_name in _worksheet_cache:
        return _worksheet_cache[sheet_name]
    
    spreadsheet = get_spreadsheet()
    try:
        worksheet = spreadsheet.worksheet(sheet_name)
        # Check if headers exist, if not add them
        if worksheet.row_count > 0:
            existing_headers = worksheet.row_values(1)
            if not existing_headers:
                # No headers, add them
                worksheet.insert_row(headers, 1)
                time.sleep(0.3)  # Small delay after write operation
        else:
            # Empty worksheet, add headers
            worksheet.append_row(headers)
            time.sleep(0.3)
        # Cache the worksheet
        _worksheet_cache[sheet_name] = worksheet
    except gspread.exceptions.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=50)
        worksheet.append_row(headers)
        # Cache the worksheet
        _worksheet_cache[sheet_name] = worksheet
        time.sleep(1)  # Longer delay after creating worksheet
    return worksheet


def dict_list_to_sheets(data: List[Dict[str, Any]], headers: List[str]) -> List[List[Any]]:
    """Convert list of dicts to list of lists for Google Sheets"""
    rows = []
    for item in data:
        row = []
        for header in headers:
            value = item.get(header, "")
            # Handle None values
            if value is None:
                value = ""
            # Handle list/dict values (convert to JSON string)
            elif isinstance(value, (dict, list)):
                value = json.dumps(value)
            else:
                value = str(value)
            row.append(value)
        rows.append(row)
    return rows


def clear_worksheet_cache():
    """Clear the worksheet cache - useful when worksheets might have changed"""
    global _worksheet_cache
    _worksheet_cache.clear()


def clear_data_cache():
    """Clear all data cache - useful for forcing refresh"""
    invalidate_cache()


def sheets_to_dict_list(worksheet: gspread.Worksheet, headers: List[str]) -> List[Dict[str, Any]]:
    """Convert Google Sheets rows to list of dicts"""
    if worksheet.row_count == 0:
        return []
    
    all_rows = worksheet.get_all_values()
    if not all_rows:
        return []
    
    # First row should be headers, skip if it matches
    start_row = 0
    if all_rows[0] == headers:
        start_row = 1
    
    data = []
    for row in all_rows[start_row:]:
        # Check if row has any non-empty values (strip whitespace to check)
        if not any(str(cell).strip() for cell in row if cell):
            continue
        item = {}
        for i, header in enumerate(headers):
            value = row[i] if i < len(row) else ""
            # Always convert to string first and strip whitespace for username, password, and technician usernames
            if header in ["username", "password", "technician_username", "assigned_by"]:
                value = str(value).strip() if value else ""
                # Keep as string, don't convert to None even if empty
                item[header] = value
                continue
            
            # Convert to string and strip for other fields too
            if value:
                value = str(value).strip()
            else:
                value = ""
            
            # Keep status and task_type as strings (don't convert to None)
            if header in ["status", "task_type"]:
                item[header] = value if value else ""
                continue
            
            # Try to parse JSON if it looks like JSON (for lists, dicts, etc.)
            if value and (value.startswith("{") or value.startswith("[")):
                try:
                    value = json.loads(value)
                except (json.JSONDecodeError, ValueError):
                    pass
            # Try to convert to number (but NOT for password/username fields - keep them as strings)
            elif value:
                try:
                    if "." in value:
                        value = float(value)
                    else:
                        value = int(value)
                except (ValueError, TypeError):
                    pass
            # Empty string becomes None for optional fields (but not for username/password/status/task_type)
            if value == "":
                value = None
            item[header] = value
        data.append(item)
    return data


# Users Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_users(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load users from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["users"] is not None:
        return _data_cache["users"]
    
    headers = ["username", "password", "role"]
    worksheet = get_or_create_worksheet(SHEET_USERS, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["users"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_users(users: List[Dict[str, Any]]):
    """Save users to Google Sheets using batch update for efficiency"""
    headers = ["username", "password", "role"]
    worksheet = get_or_create_worksheet(SHEET_USERS, headers)
    
    # Prepare all rows including header
    all_rows = [headers]
    if users:
        rows = dict_list_to_sheets(users, headers)
        if rows:
            all_rows.extend(rows)
    
    # Use batch_update for efficiency (faster than clear + append)
    worksheet.clear()
    if all_rows:
        worksheet.update('A1', all_rows, value_input_option='RAW')
    
    # Update cache immediately (don't wait for API)
    _data_cache["users"] = users


# Clients Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_clients(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load clients from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["clients"] is not None:
        return _data_cache["clients"]
    
    headers = ["id", "name", "contact_person", "email", "phone", "address"]
    worksheet = get_or_create_worksheet(SHEET_CLIENTS, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["clients"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_clients(clients: List[Dict[str, Any]]):
    """Save clients to Google Sheets using batch update for efficiency"""
    headers = ["id", "name", "contact_person", "email", "phone", "address"]
    worksheet = get_or_create_worksheet(SHEET_CLIENTS, headers)
    
    # Prepare all rows including header
    all_rows = [headers]
    if clients:
        rows = dict_list_to_sheets(clients, headers)
        if rows:
            all_rows.extend(rows)
    
    # Use batch_update for efficiency (faster than clear + append)
    worksheet.clear()
    if all_rows:
        worksheet.update('A1', all_rows, value_input_option='RAW')
    
    # Update cache immediately (don't wait for API)
    _data_cache["clients"] = clients


# Dispensers Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_dispensers(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load dispensers from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["dispensers"] is not None:
        return _data_cache["dispensers"]
    
    headers = [
        "id", "name", "sku", "location", "client_id", "current_schedule_id",
        "refill_capacity_ml", "current_level_ml", "last_refill_date",
        "installation_date", "ml_per_hour", "unique_code", "status"
    ]
    worksheet = get_or_create_worksheet(SHEET_DISPENSERS, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["dispensers"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_dispensers(dispensers: List[Dict[str, Any]]):
    """Save dispensers to Google Sheets using batch update for efficiency"""
    headers = [
        "id", "name", "sku", "location", "client_id", "current_schedule_id",
        "refill_capacity_ml", "current_level_ml", "last_refill_date",
        "installation_date", "ml_per_hour", "unique_code", "status"
    ]
    worksheet = get_or_create_worksheet(SHEET_DISPENSERS, headers)
    
    # Prepare all rows including header
    all_rows = [headers]
    if dispensers:
        rows = dict_list_to_sheets(dispensers, headers)
        if rows:
            all_rows.extend(rows)
    
    # Use batch_update for efficiency (faster than clear + append)
    worksheet.clear()
    if all_rows:
        worksheet.update('A1', all_rows, value_input_option='RAW')
    
    # Update cache immediately (don't wait for API)
    _data_cache["dispensers"] = dispensers


# Schedules Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def _load_schedules_raw() -> List[Dict[str, Any]]:
    """Load schedules from Google Sheets without merging time_ranges/intervals (internal use)"""
    headers = [
        "id", "name", "type", "duration_minutes", "daily_cycles", "ml_per_hour", "days_of_week"
    ]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULES, headers)
    return sheets_to_dict_list(worksheet, headers)


@rate_limit_retry(max_retries=3, delay=2)
def load_schedules(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load schedules from Google Sheets and merge with time_ranges and intervals (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["schedules"] is not None:
        return _data_cache["schedules"]
    
    schedules = _load_schedules_raw()
    time.sleep(0.5)  # Delay between read operations
    
    # Load time_ranges and intervals separately and merge (use cached if available)
    time_ranges = load_schedule_time_ranges(force_refresh=force_refresh)
    time.sleep(0.5)
    intervals = load_schedule_intervals(force_refresh=force_refresh)
    
    # Group by schedule_id
    time_ranges_by_schedule = {}
    for tr in time_ranges:
        schedule_id = tr.get("schedule_id")
        if schedule_id:
            if schedule_id not in time_ranges_by_schedule:
                time_ranges_by_schedule[schedule_id] = []
            time_ranges_by_schedule[schedule_id].append({
                "start_time": tr.get("start_time"),
                "end_time": tr.get("end_time"),
                "spray_seconds": tr.get("spray_seconds"),
                "pause_seconds": tr.get("pause_seconds")
            })
    
    intervals_by_schedule = {}
    for interval in intervals:
        schedule_id = interval.get("schedule_id")
        if schedule_id:
            if schedule_id not in intervals_by_schedule:
                intervals_by_schedule[schedule_id] = []
            intervals_by_schedule[schedule_id].append({
                "spray_seconds": interval.get("spray_seconds"),
                "pause_seconds": interval.get("pause_seconds")
            })
    
    # Merge into schedules
    for schedule in schedules:
        schedule_id = schedule.get("id")
        if schedule_id in time_ranges_by_schedule:
            schedule["time_ranges"] = time_ranges_by_schedule[schedule_id]
        if schedule_id in intervals_by_schedule:
            schedule["intervals"] = intervals_by_schedule[schedule_id]
    
    return schedules


@rate_limit_retry(max_retries=3, delay=2)
def save_schedule(schedule: Dict[str, Any]):
    """Save a schedule and its time_ranges/intervals to Google Sheets"""
    # Extract schedule data (without time_ranges and intervals)
    schedule_id = schedule.get("id")
    if not schedule_id:
        raise ValueError("Schedule must have an id")
    
    # Load all schedules (raw, without merging)
    schedules = _load_schedules_raw()
    time.sleep(0.5)  # Delay after read operation
    
    # Update or add schedule
    schedule_dict = {k: v for k, v in schedule.items() if k not in ["time_ranges", "intervals"]}
    
    schedule_found = False
    for i, s in enumerate(schedules):
        if s.get("id") == schedule_id:
            schedules[i] = schedule_dict
            schedule_found = True
            break
    
    if not schedule_found:
        schedules.append(schedule_dict)
    
    # Save schedules
    headers = ["id", "name", "type", "duration_minutes", "daily_cycles", "ml_per_hour", "days_of_week"]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULES, headers)
    worksheet.clear()
    time.sleep(0.3)
    worksheet.append_row(headers)
    if schedules:
        rows = dict_list_to_sheets(schedules, headers)
        if rows:
            worksheet.append_rows(rows)
            time.sleep(0.3)
    
    # Handle time_ranges (force refresh to get latest)
    time_ranges = load_schedule_time_ranges(force_refresh=True)
    time.sleep(0.5)
    time_ranges = [tr for tr in time_ranges if tr.get("schedule_id") != schedule_id]
    
    schedule_time_ranges = schedule.get("time_ranges")
    if schedule_time_ranges:
        for tr in schedule_time_ranges:
            time_ranges.append({
                "schedule_id": schedule_id,
                "start_time": tr.get("start_time"),
                "end_time": tr.get("end_time"),
                "spray_seconds": tr.get("spray_seconds"),
                "pause_seconds": tr.get("pause_seconds")
            })
    
    save_schedule_time_ranges(time_ranges)
    
    # Handle intervals (force refresh to get latest)
    intervals = load_schedule_intervals(force_refresh=True)
    time.sleep(0.5)
    intervals = [i for i in intervals if i.get("schedule_id") != schedule_id]
    
    schedule_intervals = schedule.get("intervals")
    if schedule_intervals:
        for interval in schedule_intervals:
            intervals.append({
                "schedule_id": schedule_id,
                "spray_seconds": interval.get("spray_seconds"),
                "pause_seconds": interval.get("pause_seconds")
            })
    
    save_schedule_intervals(intervals)
    
    # Invalidate schedules cache since we modified it
    invalidate_cache("schedules")
    
    # Return full schedule
    result = schedule_dict.copy()
    if schedule_time_ranges:
        result["time_ranges"] = schedule_time_ranges
    if schedule_intervals:
        result["intervals"] = schedule_intervals
    return result


def delete_schedule(schedule_id: str):
    """Delete a schedule and its time_ranges/intervals"""
    schedules = _load_schedules_raw()
    schedules = [s for s in schedules if s.get("id") != schedule_id]
    
    headers = ["id", "name", "type", "duration_minutes", "daily_cycles", "ml_per_hour", "days_of_week"]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULES, headers)
    worksheet.clear()
    worksheet.append_row(headers)
    if schedules:
        rows = dict_list_to_sheets(schedules, headers)
        if rows:
            worksheet.append_rows(rows)
    
    # Delete time_ranges
    time_ranges = load_schedule_time_ranges()
    time_ranges = [tr for tr in time_ranges if tr.get("schedule_id") != schedule_id]
    save_schedule_time_ranges(time_ranges)
    
    # Delete intervals
    intervals = load_schedule_intervals()
    intervals = [i for i in intervals if i.get("schedule_id") != schedule_id]
    save_schedule_intervals(intervals)


# Schedule Time Ranges Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_schedule_time_ranges(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load schedule time ranges from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["schedule_time_ranges"] is not None:
        return _data_cache["schedule_time_ranges"]
    
    headers = ["schedule_id", "start_time", "end_time", "spray_seconds", "pause_seconds"]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULE_TIME_RANGES, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["schedule_time_ranges"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_schedule_time_ranges(time_ranges: List[Dict[str, Any]]):
    """Save schedule time ranges to Google Sheets"""
    headers = ["schedule_id", "start_time", "end_time", "spray_seconds", "pause_seconds"]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULE_TIME_RANGES, headers)
    worksheet.clear()
    time.sleep(0.3)
    worksheet.append_row(headers)
    if time_ranges:
        rows = dict_list_to_sheets(time_ranges, headers)
        if rows:
            worksheet.append_rows(rows)
            time.sleep(0.3)
    # Update cache and invalidate schedules cache (since schedules depend on time_ranges)
    _data_cache["schedule_time_ranges"] = time_ranges
    invalidate_cache("schedules")


# Schedule Intervals Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_schedule_intervals(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load schedule intervals from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["schedule_intervals"] is not None:
        return _data_cache["schedule_intervals"]
    
    headers = ["schedule_id", "spray_seconds", "pause_seconds"]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULE_INTERVALS, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["schedule_intervals"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_schedule_intervals(intervals: List[Dict[str, Any]]):
    """Save schedule intervals to Google Sheets"""
    headers = ["schedule_id", "spray_seconds", "pause_seconds"]
    worksheet = get_or_create_worksheet(SHEET_SCHEDULE_INTERVALS, headers)
    worksheet.clear()
    time.sleep(0.3)
    worksheet.append_row(headers)
    if intervals:
        rows = dict_list_to_sheets(intervals, headers)
        if rows:
            worksheet.append_rows(rows)
            time.sleep(0.3)
    # Update cache and invalidate schedules cache (since schedules depend on intervals)
    _data_cache["schedule_intervals"] = intervals
    invalidate_cache("schedules")


# Refill Logs Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_refill_logs(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load refill logs from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["refill_logs"] is not None:
        return _data_cache["refill_logs"]
    
    headers = [
        "id", "dispenser_id", "technician_username", "refill_amount_ml",
        "level_before_refill", "current_ml_refill", "fragrance_code",
        "client_id", "machine_unique_code", "location", "installation_date",
        "number_of_refills_done", "timestamp", "notes"
    ]
    worksheet = get_or_create_worksheet(SHEET_REFILL_LOGS, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["refill_logs"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_refill_logs(refill_logs: List[Dict[str, Any]]):
    """Save refill logs to Google Sheets using batch update for efficiency"""
    headers = [
        "id", "dispenser_id", "technician_username", "refill_amount_ml",
        "level_before_refill", "current_ml_refill", "fragrance_code",
        "client_id", "machine_unique_code", "location", "installation_date",
        "number_of_refills_done", "timestamp", "notes"
    ]
    worksheet = get_or_create_worksheet(SHEET_REFILL_LOGS, headers)
    
    # Prepare all rows including header
    all_rows = [headers]
    if refill_logs:
        rows = dict_list_to_sheets(refill_logs, headers)
        if rows:
            all_rows.extend(rows)
    
    # Use batch_update for efficiency (faster than clear + append)
    worksheet.clear()
    if all_rows:
        worksheet.update('A1', all_rows, value_input_option='RAW')
    
    # Update cache immediately (don't wait for API)
    _data_cache["refill_logs"] = refill_logs


# Technician Assignments Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_technician_assignments(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load technician assignments from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["technician_assignments"] is not None:
        return _data_cache["technician_assignments"]
    
    headers = [
        "id", "dispenser_id", "technician_username", "assigned_by",
        "assigned_date", "visit_date", "status", "task_type", "notes", "completed_date"
    ]
    worksheet = get_or_create_worksheet(SHEET_TECHNICIAN_ASSIGNMENTS, headers)
    data = sheets_to_dict_list(worksheet, headers)
    _data_cache["technician_assignments"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_technician_assignments(assignments: List[Dict[str, Any]]):
    """Save technician assignments to Google Sheets using batch update for efficiency"""
    headers = [
        "id", "dispenser_id", "technician_username", "assigned_by",
        "assigned_date", "visit_date", "status", "task_type", "notes", "completed_date"
    ]
    worksheet = get_or_create_worksheet(SHEET_TECHNICIAN_ASSIGNMENTS, headers)
    
    # Prepare all rows including header
    all_rows = [headers]
    if assignments:
        rows = dict_list_to_sheets(assignments, headers)
        if rows:
            all_rows.extend(rows)
    
    # Use batch_update for efficiency (faster than clear + append)
    worksheet.clear()
    if all_rows:
        worksheet.update('A1', all_rows, value_input_option='RAW')
    
    # Update cache immediately (don't wait for API)
    _data_cache["technician_assignments"] = assignments


# Client Machines Sheet Operations
@rate_limit_retry(max_retries=3, delay=2)
def load_client_machines(force_refresh: bool = False) -> Dict[str, Any]:
    """Load client machines from Google Sheets (cached in memory)"""
    global _data_cache
    if not force_refresh and _data_cache["client_machines"] is not None:
        return _data_cache["client_machines"]
    
    headers = [
        "id", "name", "sku", "location", "client_id", "current_schedule_id",
        "refill_capacity_ml", "current_level_ml", "last_refill_date",
        "installation_date", "ml_per_hour", "unique_code", "status"
    ]
    worksheet = get_or_create_worksheet(SHEET_CLIENT_MACHINES, headers)
    client_machines = sheets_to_dict_list(worksheet, headers)
    data = {"client_machines": client_machines}
    _data_cache["client_machines"] = data
    return data


@rate_limit_retry(max_retries=3, delay=2)
def save_client_machines(data: Dict[str, Any]):
    """Save client machines to Google Sheets using batch update for efficiency"""
    headers = [
        "id", "name", "sku", "location", "client_id", "current_schedule_id",
        "refill_capacity_ml", "current_level_ml", "last_refill_date",
        "installation_date", "ml_per_hour", "unique_code", "status"
    ]
    client_machines = data.get("client_machines", [])
    worksheet = get_or_create_worksheet(SHEET_CLIENT_MACHINES, headers)
    
    # Prepare all rows including header
    all_rows = [headers]
    if client_machines:
        rows = dict_list_to_sheets(client_machines, headers)
        if rows:
            all_rows.extend(rows)
    
    # Use batch_update for efficiency (faster than clear + append)
    worksheet.clear()
    if all_rows:
        worksheet.update('A1', all_rows, value_input_option='RAW')
    
    # Update cache immediately (don't wait for API)
    _data_cache["client_machines"] = data

