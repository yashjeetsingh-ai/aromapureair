"""
Supabase Service Module
Replaces Google Sheets service with Supabase client
"""

import os
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from a .env file (if present)
load_dotenv()

# Supabase configuration (from environment variables)
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Using service_role key for backend operations (bypasses RLS)
# # This must NEVER be hardcoded in the source code.
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Supabase configuration missing. Please set SUPABASE_URL and "
        "SUPABASE_SERVICE_ROLE_KEY in your environment or .env file."
    )

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================================
# USERS OPERATIONS
# ============================================================================

def load_users(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load users from Supabase"""
    response = supabase.table("users").select("*").execute()
    return response.data if response.data else []


def save_users(users: List[Dict[str, Any]]):
    """Save users to Supabase"""
    if not users:
        return
    
    # Upsert all users
    supabase.table("users").upsert(users, on_conflict="username").execute()


def delete_user(username: str):
    """Delete a user from Supabase"""
    try:
        result = supabase.table("users").delete().eq("username", username).execute()
        return result
    except Exception as e:
        print(f"Error deleting user {username}: {e}")
        raise


# ============================================================================
# CLIENTS OPERATIONS
# ============================================================================

def load_clients(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load clients from Supabase"""
    response = supabase.table("clients").select("*").execute()
    return response.data if response.data else []


def save_clients(clients: List[Dict[str, Any]]):
    """Save clients to Supabase"""
    if not clients:
        return
    
    supabase.table("clients").upsert(clients, on_conflict="id").execute()


def delete_client(client_id: str):
    """Delete a client from Supabase"""
    try:
        result = supabase.table("clients").delete().eq("id", client_id).execute()
        return result
    except Exception as e:
        print(f"Error deleting client {client_id}: {e}")
        raise


# ============================================================================
# MACHINE TEMPLATES OPERATIONS
# ============================================================================

def load_machine_templates(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load machine templates from Supabase"""
    response = supabase.table("machine_templates").select("*").execute()
    return response.data if response.data else []


def save_machine_templates(templates: List[Dict[str, Any]]):
    """Save machine templates to Supabase"""
    if not templates:
        return
    
    supabase.table("machine_templates").upsert(templates, on_conflict="id").execute()


def delete_machine_template(template_id: str):
    """Delete a machine template from Supabase"""
    try:
        result = supabase.table("machine_templates").delete().eq("id", template_id).execute()
        return result
    except Exception as e:
        print(f"Error deleting machine template {template_id}: {e}")
        raise


# ============================================================================
# MACHINE INSTANCES OPERATIONS
# ============================================================================

def load_machine_instances(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load machine instances from Supabase"""
    response = supabase.table("machine_instances").select("*").eq("status", "installed").execute()
    return response.data if response.data else []


def save_machine_instances(instances: List[Dict[str, Any]]):
    """Save machine instances to Supabase"""
    if not instances:
        return
    
    supabase.table("machine_instances").upsert(instances, on_conflict="id").execute()


def delete_machine_instance(instance_id: str):
    """Delete a machine instance from Supabase"""
    try:
        result = supabase.table("machine_instances").delete().eq("id", instance_id).execute()
        return result
    except Exception as e:
        print(f"Error deleting machine instance {instance_id}: {e}")
        raise


# ============================================================================
# SCHEDULES OPERATIONS
# ============================================================================

def load_schedules(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load schedules from Supabase with time_ranges and intervals"""
    schedules_response = supabase.table("schedules").select("*").execute()
    schedules = schedules_response.data if schedules_response.data else []
    
    # Load time ranges and intervals for each schedule
    for schedule in schedules:
        schedule_id = schedule.get("id")
        
        # Load time ranges
        try:
            time_ranges_response = supabase.table("schedule_time_ranges").select("*").eq("schedule_id", schedule_id).execute()
            time_ranges_data = time_ranges_response.data if time_ranges_response.data else []
            schedule["time_ranges"] = time_ranges_data
        except Exception as e:
            schedule["time_ranges"] = []
        
        # Load intervals
        try:
            intervals_response = supabase.table("schedule_intervals").select("*").eq("schedule_id", schedule_id).execute()
            intervals_data = intervals_response.data if intervals_response.data else []
            schedule["intervals"] = intervals_data
        except Exception as e:
            schedule["intervals"] = []
    
    return schedules


def save_schedule(schedule: Dict[str, Any]):
    """Save a schedule and its time_ranges/intervals to Supabase"""
    schedule_id = schedule.get("id")
    if not schedule_id:
        raise ValueError("Schedule must have an id")
    
    # Extract schedule data (without time_ranges and intervals)
    schedule_data = {
        "id": schedule_id,
        "name": schedule.get("name"),
        "type": schedule.get("type"),
        "duration_minutes": schedule.get("duration_minutes"),
        "daily_cycles": schedule.get("daily_cycles"),
        "ml_per_hour": schedule.get("ml_per_hour"),
        "days_of_week": schedule.get("days_of_week")
    }
    
    # Upsert schedule
    supabase.table("schedules").upsert(schedule_data, on_conflict="id").execute()
    
    # Handle time_ranges
    if schedule.get("time_ranges"):
        # Delete existing time ranges
        supabase.table("schedule_time_ranges").delete().eq("schedule_id", schedule_id).execute()
        
        # Insert new time ranges
        time_ranges_data = []
        for tr in schedule.get("time_ranges", []):
            time_ranges_data.append({
                "schedule_id": schedule_id,
                "start_time": tr.get("start_time"),
                "end_time": tr.get("end_time"),
                "spray_seconds": tr.get("spray_seconds"),
                "pause_seconds": tr.get("pause_seconds")
            })
        
        if time_ranges_data:
            supabase.table("schedule_time_ranges").insert(time_ranges_data).execute()
    
    # Handle intervals
    if schedule.get("intervals"):
        # Delete existing intervals
        supabase.table("schedule_intervals").delete().eq("schedule_id", schedule_id).execute()
        
        # Insert new intervals
        intervals_data = []
        for interval in schedule.get("intervals", []):
            intervals_data.append({
                "schedule_id": schedule_id,
                "spray_seconds": interval.get("spray_seconds"),
                "pause_seconds": interval.get("pause_seconds")
            })
        
        if intervals_data:
            supabase.table("schedule_intervals").insert(intervals_data).execute()
    
    return schedule


def load_schedule_time_ranges(schedule_id: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load time ranges for a schedule (helper function for compatibility)"""
    response = supabase.table("schedule_time_ranges").select("*").eq("schedule_id", schedule_id).execute()
    return response.data if response.data else []


def save_schedule_time_ranges(schedule_id: str, time_ranges: List[Dict[str, Any]]):
    """Save time ranges for a schedule (helper function for compatibility)"""
    # Delete existing
    supabase.table("schedule_time_ranges").delete().eq("schedule_id", schedule_id).execute()
    
    # Insert new
    if time_ranges:
        time_ranges_data = []
        for tr in time_ranges:
            time_ranges_data.append({
                "schedule_id": schedule_id,
                "start_time": tr.get("start_time"),
                "end_time": tr.get("end_time"),
                "spray_seconds": tr.get("spray_seconds"),
                "pause_seconds": tr.get("pause_seconds")
            })
        supabase.table("schedule_time_ranges").insert(time_ranges_data).execute()


def load_schedule_intervals(schedule_id: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load intervals for a schedule (helper function for compatibility)"""
    response = supabase.table("schedule_intervals").select("*").eq("schedule_id", schedule_id).execute()
    return response.data if response.data else []


def save_schedule_intervals(schedule_id: str, intervals: List[Dict[str, Any]]):
    """Save intervals for a schedule (helper function for compatibility)"""
    # Delete existing
    supabase.table("schedule_intervals").delete().eq("schedule_id", schedule_id).execute()
    
    # Insert new
    if intervals:
        intervals_data = []
        for interval in intervals:
            intervals_data.append({
                "schedule_id": schedule_id,
                "spray_seconds": interval.get("spray_seconds"),
                "pause_seconds": interval.get("pause_seconds")
            })
        supabase.table("schedule_intervals").insert(intervals_data).execute()


def delete_schedule(schedule_id: str):
    """Delete a schedule and its time_ranges/intervals from Supabase"""
    # Delete time ranges (cascade)
    supabase.table("schedule_time_ranges").delete().eq("schedule_id", schedule_id).execute()
    
    # Delete intervals (cascade)
    supabase.table("schedule_intervals").delete().eq("schedule_id", schedule_id).execute()
    
    # Delete schedule
    supabase.table("schedules").delete().eq("id", schedule_id).execute()


# ============================================================================
# REFILL LOGS OPERATIONS
# ============================================================================

def load_refill_logs(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load refill logs from Supabase"""
    response = supabase.table("refill_logs").select("*").order("timestamp", desc=True).execute()
    return response.data if response.data else []


def save_refill_logs(refill_logs: List[Dict[str, Any]]):
    """Save refill logs to Supabase"""
    if not refill_logs:
        return
    
    supabase.table("refill_logs").upsert(refill_logs, on_conflict="id").execute()


def delete_refill_logs_by_dispenser(dispenser_id: str):
    """Delete all refill logs for a specific dispenser"""
    try:
        result = supabase.table("refill_logs").delete().eq("dispenser_id", dispenser_id).execute()
        return result
    except Exception as e:
        print(f"Error deleting refill logs for dispenser {dispenser_id}: {e}")
        # Don't raise - refill logs deletion failure shouldn't prevent machine deletion
        pass


# ============================================================================
# TECHNICIAN ASSIGNMENTS OPERATIONS
# ============================================================================

def load_technician_assignments(force_refresh: bool = False, technician: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load technician assignments from Supabase"""
    query = supabase.table("technician_assignments").select("*")
    
    if technician:
        query = query.eq("technician_username", technician)
    if status:
        query = query.eq("status", status)
    
    response = query.order("assigned_date", desc=True).execute()
    return response.data if response.data else []


def save_technician_assignments(assignments: List[Dict[str, Any]]):
    """Save technician assignments to Supabase"""
    if not assignments:
        return
    
    supabase.table("technician_assignments").upsert(assignments, on_conflict="id").execute()


def delete_technician_assignment(assignment_id: str):
    """Delete a technician assignment from Supabase"""
    supabase.table("technician_assignments").delete().eq("id", assignment_id).execute()


# ============================================================================
# CLIENT MACHINES OPERATIONS (Legacy - for backward compatibility)
# ============================================================================

def load_client_machines(force_refresh: bool = False) -> Dict[str, Any]:
    """Load assigned machines (status='assigned') from Supabase"""
    response = supabase.table("machine_instances").select("*").eq("status", "assigned").execute()
    assigned_machines = response.data if response.data else []
    
    return {"client_machines": assigned_machines}


def save_client_machines(data: Dict[str, Any]):
    """Save assigned machines to Supabase"""
    assigned_machines = data.get("client_machines", [])
    if not assigned_machines:
        return
    
    supabase.table("machine_instances").upsert(assigned_machines, on_conflict="id").execute()


# ============================================================================
# LEGACY DISPENSERS OPERATIONS (Backward Compatibility)
# ============================================================================

def load_dispensers(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Load all dispensers - merges templates + instances (legacy function for backward compatibility)"""
    templates = load_machine_templates(force_refresh)
    instances = load_machine_instances(force_refresh)
    client_machines_data = load_client_machines(force_refresh)
    assigned_machines = client_machines_data.get("client_machines", [])
    
    # Convert templates to dispenser format
    template_dispensers = []
    for template in templates:
        template_dispensers.append({
            "id": template.get("id"),
            "name": template.get("name"),
            "sku": template.get("sku"),
            "location": "",
            "client_id": None,
            "current_schedule_id": None,
            "refill_capacity_ml": template.get("refill_capacity_ml"),
            "current_level_ml": 0,
            "last_refill_date": None,
            "installation_date": None,
            "fragrance_code": None,
            "ml_per_hour": template.get("ml_per_hour"),
            "unique_code": template.get("sku"),
            "status": None
        })
    
    # Merge all
    return template_dispensers + instances + assigned_machines


def save_dispensers(dispensers: List[Dict[str, Any]]):
    """Save dispensers - routes to templates or instances based on data (legacy function for backward compatibility)"""
    # This function is not typically used, but if needed, it would route to appropriate save functions
    # For now, it's a no-op as the new endpoints handle saving directly
    pass


# ============================================================================
# CACHE MANAGEMENT (for compatibility with gsheets_service)
# ============================================================================

def clear_data_cache():
    """Clear cache - no-op for Supabase (data is always fresh)"""
    pass


def invalidate_cache(cache_key: str = None):
    """Invalidate cache - no-op for Supabase"""
    pass

