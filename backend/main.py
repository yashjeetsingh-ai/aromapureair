from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import os
from enum import Enum

app = FastAPI(title="Perfume Dispenser Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage files
DATA_FILE = "data.json"
CLIENT_MACHINES_FILE = "client_machines.json"

class UserRole(str, Enum):
    TECHNICIAN = "technician"
    ADMIN = "admin"
    DEVELOPER = "developer"

class ScheduleType(str, Enum):
    FIXED = "fixed"
    CUSTOM = "custom"

# Pydantic models
class User(BaseModel):
    username: str
    password: str
    role: UserRole

class LoginRequest(BaseModel):
    username: str
    password: str

class TimeInterval(BaseModel):
    spray_seconds: int
    pause_seconds: int

class TimeRange(BaseModel):
    start_time: str  # Format: "HH:MM"
    end_time: str    # Format: "HH:MM"
    spray_seconds: int
    pause_seconds: int

class Schedule(BaseModel):
    id: Optional[str] = None
    name: str
    type: ScheduleType
    intervals: Optional[List[TimeInterval]] = None  # List of spray/pause cycles (for old format)
    time_ranges: Optional[List[TimeRange]] = None  # Time-based schedule with ranges
    duration_minutes: Optional[int] = None  # Total duration of one cycle (for old format)
    daily_cycles: Optional[int] = None  # How many times per day (for old format)
    ml_per_hour: Optional[float] = None  # ML dispense rate per hour (alternative calculation method)

class Client(BaseModel):
    id: Optional[str] = None
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Dispenser(BaseModel):
    id: str
    name: str
    sku: str
    location: str
    client_id: Optional[str] = None
    current_schedule_id: Optional[str] = None
    refill_capacity_ml: float
    current_level_ml: float
    last_refill_date: Optional[str] = None
    ml_per_hour: float  # Machine-specific ML dispense rate per hour (required)
    unique_code: str  # Unique code for each machine installation (required)
    status: Optional[str] = None  # Status of the machine (e.g., 'assigned', 'installed', etc.)

class RefillLog(BaseModel):
    id: str
    dispenser_id: str
    technician_username: str
    refill_amount_ml: float
    timestamp: str
    notes: Optional[str] = None

# Data storage functions
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {
        "users": [],
        "schedules": [],
        "dispensers": [],
        "refill_logs": [],
        "clients": []
    }

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

# Client machines storage functions (for machines with status 'assigned')
def load_client_machines():
    if os.path.exists(CLIENT_MACHINES_FILE):
        with open(CLIENT_MACHINES_FILE, "r") as f:
            return json.load(f)
    return {
        "client_machines": []
    }

def save_client_machines(data):
    with open(CLIENT_MACHINES_FILE, "w") as f:
        json.dump(data, f, indent=2)

def init_default_data():
    data = load_data()
    
    # Initialize default users if empty
    if not data.get("users"):
        data["users"] = [
            {"username": "tech1", "password": "tech123", "role": "technician"},
            {"username": "admin1", "password": "admin123", "role": "admin"},
            {"username": "dev1", "password": "dev123", "role": "developer"}
        ]
    
    # Initialize default fixed schedules if empty
    if not data.get("schedules"):
        data["schedules"] = [
            {
                "id": "universal_schedule",
                "name": "Universal Schedule",
                "type": "fixed",
                "time_ranges": [
                    {
                        "start_time": "00:00",
                        "end_time": "06:00",
                        "spray_seconds": 20,
                        "pause_seconds": 40
                    },
                    {
                        "start_time": "06:00",
                        "end_time": "12:00",
                        "spray_seconds": 30,
                        "pause_seconds": 30
                    },
                    {
                        "start_time": "12:00",
                        "end_time": "15:00",
                        "spray_seconds": 50,
                        "pause_seconds": 20
                    },
                    {
                        "start_time": "15:00",
                        "end_time": "23:55",
                        "spray_seconds": 100,
                        "pause_seconds": 10
                    }
                ]
            },
            {
                "id": "fixed_1",
                "name": "Morning Schedule",
                "type": "fixed",
                "intervals": [{"spray_seconds": 5, "pause_seconds": 55}],
                "duration_minutes": 60,
                "daily_cycles": 4
            },
            {
                "id": "fixed_2",
                "name": "Afternoon Schedule",
                "type": "fixed",
                "intervals": [{"spray_seconds": 10, "pause_seconds": 50}],
                "duration_minutes": 60,
                "daily_cycles": 4
            },
            {
                "id": "fixed_3",
                "name": "Evening Schedule",
                "type": "fixed",
                "intervals": [{"spray_seconds": 15, "pause_seconds": 45}],
                "duration_minutes": 60,
                "daily_cycles": 4
            },
            {
                "id": "fixed_4",
                "name": "Night Schedule",
                "type": "fixed",
                "intervals": [{"spray_seconds": 20, "pause_seconds": 40}],
                "duration_minutes": 60,
                "daily_cycles": 4
            }
        ]
    
    # Initialize default clients if empty
    if not data.get("clients"):
        data["clients"] = [
            {
                "id": "client_1",
                "name": "Corporate Office Building",
                "contact_person": "John Smith",
                "email": "john@corporate.com",
                "phone": "+1-555-0101",
                "address": "123 Business St, City, State 12345"
            },
            {
                "id": "client_2",
                "name": "Luxury Hotel",
                "contact_person": "Jane Doe",
                "email": "jane@hotel.com",
                "phone": "+1-555-0102",
                "address": "456 Luxury Ave, City, State 12345"
            }
        ]
    
    # Initialize default dispensers if empty
    if not data.get("dispensers"):
        data["dispensers"] = [
            {
                "id": "disp_1",
                "name": "Lobby Dispenser",
                "sku": "AROMA-DISP-001",
                "location": "Main Lobby, Floor 1",
                "client_id": "client_1",
                "current_schedule_id": "fixed_1",
                "refill_capacity_ml": 500.0,
                "current_level_ml": 450.0,
                "last_refill_date": None,
                "ml_per_hour": None
            },
            {
                "id": "disp_2",
                "name": "Office Dispenser",
                "sku": "AROMA-DISP-002",
                "location": "Office Floor 2, Room 201",
                "client_id": "client_1",
                "current_schedule_id": "fixed_2",
                "refill_capacity_ml": 500.0,
                "current_level_ml": 300.0,
                "last_refill_date": None,
                "ml_per_hour": None
            }
        ]
    
    save_data(data)
    return data

# Initialize data on startup
init_default_data()

# Authentication
def authenticate_user(username: str, password: str):
    data = load_data()
    for user in data["users"]:
        if user["username"] == username and user["password"] == password:
            return user
    return None

# API Endpoints

@app.post("/api/login")
async def login(credentials: LoginRequest):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"username": user["username"], "role": user["role"]}

@app.get("/api/users")
async def get_users():
    """Get all users (admin/developer only)"""
    data = load_data()
    # Don't return passwords
    users = []
    for user in data.get("users", []):
        users.append({
            "username": user["username"],
            "role": user["role"]
        })
    return users

@app.post("/api/users")
async def create_user(user: User):
    """Create a new user (admin/developer only)"""
    data = load_data()
    # Check if username already exists
    for existing_user in data.get("users", []):
        if existing_user["username"] == user.username:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    if "users" not in data:
        data["users"] = []
    
    user_dict = user.dict()
    data["users"].append(user_dict)
    save_data(data)
    
    # Return user without password
    return {
        "username": user_dict["username"],
        "role": user_dict["role"]
    }

@app.put("/api/users/{username}")
async def update_user(username: str, user_update: dict):
    """Update a user (admin/developer only)"""
    data = load_data()
    users = data.get("users", [])
    
    for i, user in enumerate(users):
        if user["username"] == username:
            # Update fields if provided
            if "password" in user_update:
                users[i]["password"] = user_update["password"]
            if "role" in user_update:
                users[i]["role"] = user_update["role"]
            
            data["users"] = users
            save_data(data)
            
            return {
                "username": users[i]["username"],
                "role": users[i]["role"]
            }
    
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/api/users/{username}")
async def delete_user(username: str):
    """Delete a user (admin/developer only)"""
    data = load_data()
    users = data.get("users", [])
    
    # Don't allow deleting the last user
    if len(users) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last user")
    
    # Check if user exists
    user_exists = any(u["username"] == username for u in users)
    if not user_exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    data["users"] = [u for u in users if u["username"] != username]
    save_data(data)
    
    return {"message": "User deleted successfully"}

@app.get("/api/schedules")
async def get_schedules():
    data = load_data()
    return data["schedules"]

@app.post("/api/schedules")
async def create_schedule(schedule: Schedule):
    data = load_data()
    schedule_id = f"schedule_{len(data['schedules']) + 1}"
    schedule_dict = schedule.dict()
    schedule_dict["id"] = schedule_id
    data["schedules"].append(schedule_dict)
    save_data(data)
    return schedule_dict

@app.get("/api/schedules/{schedule_id}")
async def get_schedule(schedule_id: str):
    data = load_data()
    for schedule in data["schedules"]:
        if schedule["id"] == schedule_id:
            return schedule
    raise HTTPException(status_code=404, detail="Schedule not found")

@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, schedule: Schedule):
    data = load_data()
    for i, s in enumerate(data["schedules"]):
        if s["id"] == schedule_id:
            schedule_dict = schedule.dict()
            schedule_dict["id"] = schedule_id
            data["schedules"][i] = schedule_dict
            save_data(data)
            return schedule_dict
    raise HTTPException(status_code=404, detail="Schedule not found")

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    data = load_data()
    # Don't allow deleting fixed schedules
    for schedule in data["schedules"]:
        if schedule["id"] == schedule_id:
            if schedule["type"] == "fixed":
                raise HTTPException(status_code=400, detail="Cannot delete fixed schedules")
            data["schedules"] = [s for s in data["schedules"] if s["id"] != schedule_id]
            save_data(data)
            return {"message": "Schedule deleted"}
    raise HTTPException(status_code=404, detail="Schedule not found")

@app.get("/api/dispensers")
async def get_dispensers():
    """Get all dispensers - merges installed machines from data.json and assigned machines from client_machines.json"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Get installed machines and SKU templates from data.json
    installed_machines = data.get("dispensers", [])
    
    # Get assigned machines from client_machines.json
    assigned_machines = client_machines_data.get("client_machines", [])
    
    # Merge both lists
    all_dispensers = installed_machines + assigned_machines
    return all_dispensers

@app.get("/api/dispensers/{dispenser_id}")
async def get_dispenser(dispenser_id: str):
    """Get a specific dispenser - checks both data.json and client_machines.json"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Check installed machines first
    for dispenser in data.get("dispensers", []):
        if dispenser["id"] == dispenser_id:
            return dispenser
    
    # Check assigned machines
    for dispenser in client_machines_data.get("client_machines", []):
        if dispenser["id"] == dispenser_id:
            return dispenser
    
    raise HTTPException(status_code=404, detail="Dispenser not found")

@app.post("/api/dispensers")
async def create_dispenser(dispenser: Dispenser):
    """Create a dispenser - routes to client_machines.json if status is 'assigned', otherwise to data.json
    If creating an installed machine with a code that exists in assigned machines, automatically updates/moves it"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Convert to dict and check status - include all fields even if None
    # Handle both Pydantic v1 (dict()) and v2 (model_dump())
    try:
        if hasattr(dispenser, 'model_dump'):
            dispenser_dict = dispenser.model_dump(exclude_none=False)
        else:
            dispenser_dict = dispenser.dict(exclude_none=False)
    except:
        # Fallback to dict() if model_dump() fails
        dispenser_dict = dispenser.dict(exclude_none=False)
    
    # Get status from the dict (this should have the actual value sent)
    # Check both the dict and the model attribute, normalize the string
    status = dispenser_dict.get("status")
    if status is None:
        status = dispenser.status
    
    # Normalize status string (strip whitespace, convert to lowercase for comparison)
    status_normalized = str(status).strip().lower() if status else None
    
    # Check for duplicate unique_code
    # Special case: If installing a machine (status='installed') and the code exists in assigned machines,
    # automatically update/move it instead of rejecting
    existing_assigned_machine = None
    existing_assigned_index = None
    
    # Check in client_machines.json for assigned machine with same code
    for i, existing_dispenser in enumerate(client_machines_data.get("client_machines", [])):
        if existing_dispenser.get("unique_code") == dispenser.unique_code:
            existing_assigned_machine = existing_dispenser
            existing_assigned_index = i
            break
    
    # If installing and found an assigned machine with same code, update it instead of creating new
    if status_normalized == "installed" and existing_assigned_machine:
        # Update the existing assigned machine to installed status
        # Merge the new installation data with existing machine data
        dispenser_dict["id"] = existing_assigned_machine["id"]  # Keep the same ID
        # Remove from client_machines.json
        client_machines_data["client_machines"].pop(existing_assigned_index)
        save_client_machines(client_machines_data)
        # Add to data.json as installed
        data["dispensers"].append(dispenser_dict)
        save_data(data)
        return dispenser_dict
    
    # Check for duplicate unique_code in both files (normal case)
    all_dispensers = data.get("dispensers", []) + client_machines_data.get("client_machines", [])
    for existing_dispenser in all_dispensers:
        if existing_dispenser.get("unique_code") == dispenser.unique_code:
            raise HTTPException(
                status_code=400, 
                detail=f"Code '{dispenser.unique_code}' already exists. Code must be unique."
            )
    
    # Route to appropriate file based on status
    # If status is 'assigned', save to client_machines.json
    if status_normalized == "assigned":
        # Save to client_machines.json
        if "client_machines" not in client_machines_data:
            client_machines_data["client_machines"] = []
        # Ensure status is explicitly set to 'assigned'
        dispenser_dict["status"] = "assigned"
        client_machines_data["client_machines"].append(dispenser_dict)
        save_client_machines(client_machines_data)
    else:
        # Save to data.json (installed machines or SKU templates)
        data["dispensers"].append(dispenser_dict)
        save_data(data)
    
    return dispenser_dict

@app.put("/api/dispensers/{dispenser_id}")
async def update_dispenser(dispenser_id: str, dispenser: Dispenser):
    """Update a dispenser - handles moving between files if status changes"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Find the dispenser in either file
    dispenser_index = None
    in_client_machines = False
    
    # Check client_machines.json first
    for i, d in enumerate(client_machines_data.get("client_machines", [])):
        if d["id"] == dispenser_id:
            dispenser_index = i
            in_client_machines = True
            break
    
    # Check data.json if not found
    if dispenser_index is None:
        for i, d in enumerate(data.get("dispensers", [])):
            if d["id"] == dispenser_id:
                dispenser_index = i
                break
    
    if dispenser_index is None:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    # Check for duplicate unique_code (excluding the current dispenser)
    all_dispensers = data.get("dispensers", []) + client_machines_data.get("client_machines", [])
    for existing_dispenser in all_dispensers:
        if (existing_dispenser.get("unique_code") == dispenser.unique_code and 
            existing_dispenser.get("id") != dispenser_id):
            raise HTTPException(
                status_code=400, 
                detail=f"Code '{dispenser.unique_code}' already exists. Code must be unique."
            )
    
    dispenser_dict = dispenser.dict()
    dispenser_dict["id"] = dispenser_id
    
    # Determine where to save based on new status
    new_status = dispenser.status
    was_assigned = in_client_machines
    will_be_assigned = new_status == "assigned"
    
    # If status changed from assigned to installed (or vice versa), move between files
    if was_assigned and not will_be_assigned:
        # Moving from client_machines.json to data.json
        # Remove from client_machines
        client_machines_data["client_machines"].pop(dispenser_index)
        save_client_machines(client_machines_data)
        # Add to data.json
        data["dispensers"].append(dispenser_dict)
        save_data(data)
    elif not was_assigned and will_be_assigned:
        # Moving from data.json to client_machines.json
        # Remove from data.json
        data["dispensers"].pop(dispenser_index)
        save_data(data)
        # Add to client_machines
        if "client_machines" not in client_machines_data:
            client_machines_data["client_machines"] = []
        client_machines_data["client_machines"].append(dispenser_dict)
        save_client_machines(client_machines_data)
    else:
        # Status unchanged, update in place
        if in_client_machines:
            client_machines_data["client_machines"][dispenser_index] = dispenser_dict
            save_client_machines(client_machines_data)
        else:
            data["dispensers"][dispenser_index] = dispenser_dict
            save_data(data)
    
    return dispenser_dict

@app.delete("/api/dispensers/{dispenser_id}")
async def delete_dispenser(dispenser_id: str):
    """Delete a machine/dispenser - checks both files and completely removes it"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Check and remove from client_machines.json (assigned machines)
    client_machines = client_machines_data.get("client_machines", [])
    found_in_client_machines = any(d["id"] == dispenser_id for d in client_machines)
    
    if found_in_client_machines:
        client_machines_data["client_machines"] = [d for d in client_machines if d["id"] != dispenser_id]
        save_client_machines(client_machines_data)
        return {"message": "Dispenser deleted successfully"}
    
    # Check and remove from data.json (installed machines or SKU templates)
    dispensers = data.get("dispensers", [])
    dispenser_to_delete = None
    for d in dispensers:
        if d["id"] == dispenser_id:
            dispenser_to_delete = d
            break
    
    if not dispenser_to_delete:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    # IMPORTANT: Only allow deleting SKU templates (machines without client_id)
    # Installed machines (with client_id) should NOT be deleted - they should be uninstalled/removed from client instead
    # But if user explicitly wants to delete, we'll allow it and completely remove it
    # Remove dispenser completely - do NOT convert it back to SKU template
    data["dispensers"] = [d for d in dispensers if d["id"] != dispenser_id]
    
    # Also remove associated refill logs for this dispenser
    if "refill_logs" in data:
        data["refill_logs"] = [r for r in data.get("refill_logs", []) if r.get("dispenser_id") != dispenser_id]
    
    save_data(data)
    return {"message": "Dispenser deleted successfully"}

@app.post("/api/dispensers/{dispenser_id}/assign-schedule")
async def assign_schedule(dispenser_id: str, body: dict):
    """Assign a schedule to a dispenser - checks both files"""
    schedule_id = body.get("schedule_id") or body.get("scheduleId")
    # Convert empty string to None
    if schedule_id == "":
        schedule_id = None
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Check client_machines.json first
    for i, d in enumerate(client_machines_data.get("client_machines", [])):
        if d["id"] == dispenser_id:
            client_machines_data["client_machines"][i]["current_schedule_id"] = schedule_id
            save_client_machines(client_machines_data)
            return client_machines_data["client_machines"][i]
    
    # Check data.json
    for i, d in enumerate(data.get("dispensers", [])):
        if d["id"] == dispenser_id:
            data["dispensers"][i]["current_schedule_id"] = schedule_id
            save_data(data)
            return data["dispensers"][i]
    
    raise HTTPException(status_code=404, detail="Dispenser not found")

@app.post("/api/dispensers/{dispenser_id}/refill")
async def log_refill(dispenser_id: str, refill: RefillLog):
    """Log a refill - checks both files, but refills should only be for installed machines"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Find dispenser in both files
    dispenser = None
    in_client_machines = False
    dispenser_index = None
    
    # Check client_machines.json first
    for i, d in enumerate(client_machines_data.get("client_machines", [])):
        if d["id"] == dispenser_id:
            dispenser = d
            in_client_machines = True
            dispenser_index = i
            break
    
    # Check data.json if not found
    if not dispenser:
        for i, d in enumerate(data.get("dispensers", [])):
            if d["id"] == dispenser_id:
                dispenser = d
                dispenser_index = i
                break
    
    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    # Update dispenser level
    if in_client_machines:
        client_machines_data["client_machines"][dispenser_index]["current_level_ml"] = min(
            client_machines_data["client_machines"][dispenser_index]["current_level_ml"] + refill.refill_amount_ml,
            client_machines_data["client_machines"][dispenser_index]["refill_capacity_ml"]
        )
        client_machines_data["client_machines"][dispenser_index]["last_refill_date"] = refill.timestamp
        save_client_machines(client_machines_data)
    else:
        data["dispensers"][dispenser_index]["current_level_ml"] = min(
            data["dispensers"][dispenser_index]["current_level_ml"] + refill.refill_amount_ml,
            data["dispensers"][dispenser_index]["refill_capacity_ml"]
        )
        data["dispensers"][dispenser_index]["last_refill_date"] = refill.timestamp
        save_data(data)
    
    # Add refill log (always in data.json)
    refill_dict = refill.dict()
    refill_dict["id"] = f"refill_{len(data.get('refill_logs', [])) + 1}"
    if "refill_logs" not in data:
        data["refill_logs"] = []
    data["refill_logs"].append(refill_dict)
    save_data(data)
    return refill_dict

@app.get("/api/refill-logs")
async def get_refill_logs():
    data = load_data()
    return data["refill_logs"]

@app.get("/api/clients")
async def get_clients():
    data = load_data()
    return data.get("clients", [])

@app.get("/api/clients/{client_id}")
async def get_client(client_id: str):
    data = load_data()
    for client in data.get("clients", []):
        if client["id"] == client_id:
            return client
    raise HTTPException(status_code=404, detail="Client not found")

@app.post("/api/clients")
async def create_client(client: Client):
    data = load_data()
    client_id = f"client_{len(data.get('clients', [])) + 1}"
    client_dict = client.dict()
    client_dict["id"] = client_id
    if "clients" not in data:
        data["clients"] = []
    data["clients"].append(client_dict)
    save_data(data)
    return client_dict

@app.put("/api/clients/{client_id}")
async def update_client(client_id: str, client: Client):
    data = load_data()
    clients = data.get("clients", [])
    for i, c in enumerate(clients):
        if c["id"] == client_id:
            client_dict = client.dict()
            client_dict["id"] = client_id
            clients[i] = client_dict
            data["clients"] = clients
            save_data(data)
            return client_dict
    raise HTTPException(status_code=404, detail="Client not found")

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client - checks both files for associated dispensers"""
    data = load_data()
    client_machines_data = load_client_machines()
    clients = data.get("clients", [])
    
    # Check if any dispensers are using this client in both files
    for dispenser in data.get("dispensers", []):
        if dispenser.get("client_id") == client_id:
            raise HTTPException(status_code=400, detail="Cannot delete client with associated dispensers")
    
    for dispenser in client_machines_data.get("client_machines", []):
        if dispenser.get("client_id") == client_id:
            raise HTTPException(status_code=400, detail="Cannot delete client with associated dispensers")
    
    data["clients"] = [c for c in clients if c["id"] != client_id]
    save_data(data)
    return {"message": "Client deleted"}

def calculate_time_range_usage(time_ranges, ml_per_hour=None):
    """Calculate daily usage from time ranges"""
    total_usage_ml = 0
    total_run_time_hours = 0
    
    for time_range in time_ranges:
        start_h, start_m = map(int, time_range["start_time"].split(":"))
        end_h, end_m = map(int, time_range["end_time"].split(":"))
        
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m
        
        # Handle overnight ranges (e.g., 23:59 to 00:00)
        if end_minutes < start_minutes:
            end_minutes += 24 * 60
        
        duration_minutes = end_minutes - start_minutes
        duration_hours = duration_minutes / 60
        
        if ml_per_hour:
            # Method 1: Use ml_per_hour rate
            # Calculate total spray time in hours for this range
            cycle_duration = time_range["spray_seconds"] + time_range["pause_seconds"]
            duration_seconds = duration_minutes * 60
            cycles = duration_seconds / cycle_duration
            spray_time_seconds = cycles * time_range["spray_seconds"]
            spray_time_hours = spray_time_seconds / 3600
            total_run_time_hours += spray_time_hours
        else:
            # Method 2: Use default 0.1 ml per second
            ML_PER_SECOND = 0.1
            duration_seconds = duration_minutes * 60
            cycle_duration = time_range["spray_seconds"] + time_range["pause_seconds"]
            cycles = duration_seconds / cycle_duration
            usage_per_cycle = time_range["spray_seconds"] * ML_PER_SECOND
            total_usage_ml += usage_per_cycle * cycles
    
    if ml_per_hour:
        # Calculate using ml_per_hour
        total_usage_ml = total_run_time_hours * ml_per_hour
    
    return total_usage_ml

@app.get("/api/dispensers/{dispenser_id}/usage-calculation")
async def calculate_usage(dispenser_id: str):
    """Calculate daily usage based on assigned schedule - checks both files"""
    data = load_data()
    client_machines_data = load_client_machines()
    
    # Find dispenser in both files
    dispenser = None
    for d in client_machines_data.get("client_machines", []):
        if d["id"] == dispenser_id:
            dispenser = d
            break
    
    if not dispenser:
        for d in data.get("dispensers", []):
            if d["id"] == dispenser_id:
                dispenser = d
                break
    
    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    if not dispenser.get("current_schedule_id"):
        return {"daily_usage_ml": 0, "days_until_empty": None}
    
    # Find schedule
    schedule = None
    for s in data["schedules"]:
        if s["id"] == dispenser["current_schedule_id"]:
            schedule = s
            break
    
    if not schedule:
        return {"daily_usage_ml": 0, "days_until_empty": None}
    
    # Check for ml_per_hour: machine-specific takes priority over schedule-specific
    ml_per_hour = dispenser.get("ml_per_hour") or schedule.get("ml_per_hour")
    
    # Check if it's a time-based schedule
    if schedule.get("time_ranges"):
        daily_usage_ml = calculate_time_range_usage(schedule["time_ranges"], ml_per_hour)
        cycle_usage_ml = daily_usage_ml / 24  # Approximate per hour
    else:
        # Old format: interval-based schedule
        ML_PER_SECOND = 0.1
        
        if ml_per_hour:
            # Calculate total run time in hours
            cycle_usage_ml = 0
            for interval in schedule.get("intervals", []):
                cycle_usage_ml += interval["spray_seconds"]
            # Convert to hours
            cycle_run_time_hours = cycle_usage_ml / 3600
            cycle_usage_ml = cycle_run_time_hours * ml_per_hour
        else:
            # Use default calculation
            cycle_usage_ml = 0
            for interval in schedule.get("intervals", []):
                cycle_usage_ml += interval["spray_seconds"] * ML_PER_SECOND
        
        # Calculate daily usage
        daily_cycles = schedule.get("daily_cycles", 1)
        daily_usage_ml = cycle_usage_ml * daily_cycles
    
    # Calculate actual usage since last refill if last_refill_date is provided
    actual_usage_since_refill = 0
    if daily_usage_ml > 0 and dispenser.get("last_refill_date"):
        try:
            from datetime import datetime, timezone
            last_refill = datetime.fromisoformat(dispenser["last_refill_date"].replace('Z', '+00:00'))
            if last_refill.tzinfo is None:
                last_refill = last_refill.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            time_diff = now - last_refill
            hours_since_refill = time_diff.total_seconds() / 3600
            days_since_refill = hours_since_refill / 24
            
            # Calculate usage based on schedule type
            if schedule.get("time_ranges"):
                # For time-based schedules, calculate usage per hour
                if ml_per_hour:
                    actual_usage_since_refill = hours_since_refill * (daily_usage_ml / 24)
                else:
                    actual_usage_since_refill = days_since_refill * daily_usage_ml
            else:
                # For interval-based schedules
                actual_usage_since_refill = days_since_refill * daily_usage_ml
        except Exception as e:
            # If date parsing fails, use default calculation
            pass
    
    # Calculate days until empty
    if daily_usage_ml > 0:
        # If we have actual usage since refill, we can calculate remaining level
        # Otherwise use current_level_ml as is
        remaining_level = dispenser["current_level_ml"]
        if actual_usage_since_refill > 0:
            # Note: This is informational - actual level should be updated via refill logs
            # But we can show projected remaining based on usage
            remaining_level = max(0, dispenser["current_level_ml"] - actual_usage_since_refill)
        
        days_until_empty = remaining_level / daily_usage_ml if remaining_level > 0 else 0
    else:
        days_until_empty = None
    
    return {
        "daily_usage_ml": round(daily_usage_ml, 2),
        "days_until_empty": round(days_until_empty, 2) if days_until_empty else None,
        "cycle_usage_ml": round(cycle_usage_ml, 2),
        "usage_since_refill": round(actual_usage_since_refill, 2) if actual_usage_since_refill > 0 else None,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

