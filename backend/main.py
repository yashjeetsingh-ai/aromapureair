from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from starlette.responses import JSONResponse, RedirectResponse, HTMLResponse, Response
import json
import os
from enum import Enum
import base64
import time
import hmac
import hashlib
import secrets
import bcrypt
from gsheets_service import (
    load_users, save_users,
    load_clients, save_clients,
    load_dispensers, save_dispensers,
    load_schedules, save_schedule, delete_schedule,
    load_schedule_time_ranges, save_schedule_time_ranges,
    load_schedule_intervals, save_schedule_intervals,
    load_refill_logs, save_refill_logs,
    load_technician_assignments, save_technician_assignments,
    load_client_machines, save_client_machines,
    clear_data_cache
)

app = FastAPI(title="Perfume Dispenser Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data storage - using Google Sheets (see gsheets_service.py)

TOKEN_SECRET = os.environ.get("TOKEN_SECRET", "change-this-secret")
TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12 hours
EXCLUDED_AUTH_PATHS = {"/api/login", "/api/client-login", "/docs", "/redoc", "/openapi.json", "/api/docs", "/api/health"}

class UserRole(str, Enum):
    TECHNICIAN = "technician"
    ADMIN = "admin"
    DEVELOPER = "developer"
    CLIENT = "client"

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
    days_of_week: Optional[List[int]] = None  # Days of week (0=Monday, 6=Sunday). If None, runs every day

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
    installation_date: Optional[str] = None  # Date when machine was installed
    ml_per_hour: float  # Machine-specific ML dispense rate per hour (required)
    unique_code: str  # Unique code for each machine installation (required)
    status: Optional[str] = None  # Status of the machine (e.g., 'assigned', 'installed', etc.)

class RefillLog(BaseModel):
    model_config = ConfigDict(extra="allow")  # Allow fields to be optional during creation
    
    id: Optional[str] = None  # Backend will generate unique ID if not provided
    dispenser_id: Optional[str] = None  # Can be provided or extracted from URL
    technician_username: str
    refill_amount_ml: float  # This is the "adding_ml_refill" amount
    level_before_refill: Optional[float] = None  # Level captured when refill dialog opens
    current_ml_refill: Optional[float] = None  # Calculated: level_before_refill + refill_amount_ml
    fragrance_code: Optional[str] = None
    client_id: Optional[str] = None
    machine_unique_code: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[str] = None
    number_of_refills_done: Optional[int] = None  # Count of refills for this machine
    timestamp: str
    notes: Optional[str] = None

class TechnicianAssignment(BaseModel):
    id: Optional[str] = None
    dispenser_id: str
    technician_username: str
    assigned_by: str  # Admin username who assigned
    assigned_date: str  # When the task was assigned
    visit_date: Optional[str] = None  # Scheduled visit date
    status: str = "pending"  # pending, completed, cancelled
    task_type: str = "refill"  # refill, maintenance, inspection
    notes: Optional[str] = None
    completed_date: Optional[str] = None

# Data storage functions - using Google Sheets (imported from gsheets_service.py)
# All load/save functions are now imported from gsheets_service module

# Password security functions (must be defined before init_default_data)
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    if not password:
        raise ValueError("Password cannot be empty")
    # Generate salt and hash password
    salt = bcrypt.gensalt(rounds=12)  # Higher rounds = more secure but slower
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    if not plain_password or not hashed_password:
        return False
    try:
        # Check if it's already a bcrypt hash (starts with $2b$)
        if hashed_password.startswith('$2b$') or hashed_password.startswith('$2a$'):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        # Legacy: if it's a plain text password (for migration), compare directly
        # This allows gradual migration from plain text to hashed
        return plain_password == hashed_password
    except Exception:
        return False

def is_password_hashed(password: str) -> bool:
    """Check if a password is already hashed"""
    return password.startswith('$2b$') or password.startswith('$2a$')

def hash_existing_passwords():
    """Migrate existing plain text passwords to hashed passwords"""
    users = load_users()
    updated = False
    for user in users:
        password = str(user.get("password") or "").strip()
        if password and not is_password_hashed(password):
            # Hash the plain text password
            user["password"] = hash_password(password)
            updated = True
    if updated:
        save_users(users)
        print("Migrated existing passwords to hashed format")

def init_default_data():
    """Initialize default data in Google Sheets if they don't exist"""
    # Initialize default users if empty
    users = load_users()
    if not users:
        default_users = [
            {"username": "tech1", "password": hash_password("tech123"), "role": "technician"},
            {"username": "admin1", "password": hash_password("admin123"), "role": "admin"},
            {"username": "dev1", "password": hash_password("dev123"), "role": "developer"}
        ]
        save_users(default_users)
    else:
        # Migrate any existing plain text passwords to hashed
        hash_existing_passwords()
    
    # Initialize default schedules if empty
    schedules = load_schedules()
    if not schedules:
        default_schedules = [
            {
                "id": "universal_schedule",
                "name": "Universal Schedule",
                "type": "fixed",
                "time_ranges": [
                    {"start_time": "00:00", "end_time": "06:00", "spray_seconds": 20, "pause_seconds": 40},
                    {"start_time": "06:00", "end_time": "12:00", "spray_seconds": 30, "pause_seconds": 30},
                    {"start_time": "12:00", "end_time": "15:00", "spray_seconds": 50, "pause_seconds": 20},
                    {"start_time": "15:00", "end_time": "23:55", "spray_seconds": 100, "pause_seconds": 10}
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
        for schedule in default_schedules:
            save_schedule(schedule)
    
    # Don't initialize default clients - start with empty list
    # Clients should be added through the admin interface
    
    # Don't initialize default dispensers - start with empty list
    # Dispensers should be added through the admin interface

# Initialize data on startup
# Clear cache to force fresh load from Google Sheets
clear_data_cache()
init_default_data()

# Token utilities
def _sign_payload(payload: str) -> str:
    return hmac.new(TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def generate_token(user: dict) -> str:
    issued_at = int(time.time())
    payload = f"{user['username']}|{user['role']}|{issued_at}"
    signature = _sign_payload(payload)
    token = f"{base64.urlsafe_b64encode(payload.encode()).decode()}.{signature}"
    return token


def verify_token(token: str) -> dict:
    try:
        encoded_payload, signature = token.split(".")
        payload = base64.urlsafe_b64decode(encoded_payload.encode()).decode()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if _sign_payload(payload) != signature:
        raise HTTPException(status_code=401, detail="Invalid token signature")

    try:
        username, role, issued_at_str = payload.split("|")
        issued_at = int(issued_at_str)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if time.time() - issued_at > TOKEN_TTL_SECONDS:
        raise HTTPException(status_code=401, detail="Token expired")

    return {"username": username, "role": role}

def require_roles(request: Request, allowed_roles: list):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def authenticate_user(username: str, password: str):
    """Authenticate user using credentials from Google Sheets with secure password hashing"""
    users = load_users()
    
    # Normalize input - strip whitespace and convert to string
    username_normalized = str(username).strip() if username else ""
    password_normalized = str(password).strip() if password else ""
    
    if not username_normalized or not password_normalized:
        return None
    
    # Find user and verify password securely
    for user in users:
        # Get username, always as string, strip whitespace
        user_username = str(user.get("username") or "").strip()
        
        if user_username == username_normalized:
            # Get stored password (could be hashed or plain text for migration)
            stored_password = str(user.get("password") or "").strip()
            
            # Verify password using secure comparison
            if verify_password(password_normalized, stored_password):
                # Return user without password
                user_copy = {k: v for k, v in user.items() if k != "password"}
                return user
    
    return None

def authenticate_client(client_id: str, password: str):
    """Authenticate client using client_id and fixed password"""
    if password != "123456":
        return None
    
    clients = load_clients()
    for client in clients:
        if client["id"] == client_id:
            # Return a user-like dict for token generation
            return {
                "username": client_id,
                "role": "client",
                "client_id": client_id,
                "client_name": client.get("name", "")
            }
    return None


@app.middleware("http")
async def enforce_auth(request: Request, call_next):
    path = request.url.path
    
    # Allow excluded paths without authentication
    if path in EXCLUDED_AUTH_PATHS:
        return await call_next(request)
    
    # Allow Swagger assets
    if path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi.json"):
        return await call_next(request)
    
    # Allow API health and docs endpoints
    if path.startswith("/api/health") or path.startswith("/api/docs"):
        return await call_next(request)

    # For OPTIONS requests (CORS preflight), validate token if provided but still allow to pass
    if request.method == "OPTIONS":
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            try:
                user = verify_token(token)
                request.state.user = user
            except HTTPException:
                # Invalid token in OPTIONS - still allow OPTIONS to pass for CORS
                pass
        return await call_next(request)

    # For all other methods, require authentication
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    token = auth_header.split(" ", 1)[1].strip()
    try:
        user = verify_token(token)
        request.state.user = user
    except HTTPException as e:
        return JSONResponse({"detail": e.detail}, status_code=e.status_code)

    return await call_next(request)

# API Endpoints

@app.post("/api/login")
async def login(credentials: LoginRequest):
    """Unified login endpoint - tries regular user first, then client if that fails"""
    # Try regular user authentication first
    user = authenticate_user(credentials.username, credentials.password)
    if user:
        token = generate_token(user)
        return {"username": user["username"], "role": user["role"], "token": token}
    
    # If user authentication fails, try client authentication
    client = authenticate_client(credentials.username, credentials.password)
    if client:
        token = generate_token(client)
        return {
            "username": client["username"],
            "role": client["role"],
            "client_id": client["client_id"],
            "client_name": client.get("client_name", ""),
            "token": token
        }
    
    # Both failed
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/client-login")
async def client_login(credentials: LoginRequest):
    """Client login endpoint - uses client_id as username and fixed password 123456"""
    client = authenticate_client(credentials.username, credentials.password)
    if not client:
        raise HTTPException(status_code=401, detail="Invalid client credentials")
    token = generate_token(client)
    return {
        "username": client["username"],
        "role": client["role"],
        "client_id": client["client_id"],
        "client_name": client.get("client_name", ""),
        "token": token
    }

@app.get("/api/users")
async def get_users():
    """Get all users (admin/developer only)"""
    users = load_users()
    # Don't return passwords
    return [{
        "username": user["username"],
        "role": user["role"]
    } for user in users]

@app.post("/api/users")
async def create_user(user: User):
    """Create a new user (admin/developer only) - password is automatically hashed"""
    users = load_users()
    # Check if username already exists
    for existing_user in users:
        if existing_user["username"] == user.username:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user.dict()
    # Hash the password before storing
    user_dict["password"] = hash_password(user.password)
    users.append(user_dict)
    save_users(users)
    
    # Return user without password
    return {
        "username": user_dict["username"],
        "role": user_dict["role"]
    }

@app.put("/api/users/{username}")
async def update_user(username: str, user_update: dict):
    """Update a user (admin/developer only) - password is automatically hashed if provided"""
    users = load_users()
    
    for i, user in enumerate(users):
        if user["username"] == username:
            # Update fields if provided
            if "password" in user_update:
                # Hash the password before storing
                users[i]["password"] = hash_password(user_update["password"])
            if "role" in user_update:
                users[i]["role"] = user_update["role"]
            
            save_users(users)
            
            return {
                "username": users[i]["username"],
                "role": users[i]["role"]
            }
    
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/api/users/{username}")
async def delete_user(username: str):
    """Delete a user (admin/developer only)"""
    users = load_users()
    
    # Don't allow deleting the last user
    if len(users) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last user")
    
    # Check if user exists
    user_exists = any(u["username"] == username for u in users)
    if not user_exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    users = [u for u in users if u["username"] != username]
    save_users(users)
    
    return {"message": "User deleted successfully"}

@app.post("/api/users/migrate-passwords")
async def migrate_passwords(request: Request):
    """Migrate all plain text passwords to hashed format (admin/developer only)"""
    require_roles(request, ["admin", "developer"])
    hash_existing_passwords()
    return {"message": "Password migration completed successfully"}

@app.get("/api/schedules")
async def get_schedules():
    return load_schedules()

@app.post("/api/schedules")
async def create_schedule(schedule: Schedule):
    schedules = load_schedules()
    schedule_id = f"schedule_{len(schedules) + 1}"
    schedule_dict = schedule.dict()
    schedule_dict["id"] = schedule_id
    return save_schedule(schedule_dict)

@app.get("/api/schedules/{schedule_id}")
async def get_schedule(schedule_id: str):
    schedules = load_schedules()
    for schedule in schedules:
        if schedule.get("id") == schedule_id:
            return schedule
    raise HTTPException(status_code=404, detail="Schedule not found")

@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, schedule: Schedule):
    schedules = load_schedules()
    schedule_found = any(s.get("id") == schedule_id for s in schedules)
    if not schedule_found:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule_dict = schedule.dict()
    schedule_dict["id"] = schedule_id
    return save_schedule(schedule_dict)

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule_endpoint(schedule_id: str):
    schedules = load_schedules()
    # Don't allow deleting fixed schedules
    for schedule in schedules:
        if schedule.get("id") == schedule_id:
            if schedule.get("type") == "fixed":
                raise HTTPException(status_code=400, detail="Cannot delete fixed schedules")
            delete_schedule(schedule_id)
            return {"message": "Schedule deleted"}
    raise HTTPException(status_code=404, detail="Schedule not found")

@app.get("/api/dispensers")
async def get_dispensers():
    """Get all dispensers - merges installed machines from dispensers.json and assigned machines from client_machines.json"""
    installed_machines = load_dispensers()
    client_machines_data = load_client_machines()
    assigned_machines = client_machines_data.get("client_machines", [])
    
    # Merge both lists
    all_dispensers = installed_machines + assigned_machines
    return all_dispensers

@app.get("/api/dispensers/{dispenser_id}")
async def get_dispenser(dispenser_id: str):
    """Get a specific dispenser - checks both dispensers.json and client_machines.json"""
    installed_machines = load_dispensers()
    client_machines_data = load_client_machines()
    
    # Check installed machines first
    for dispenser in installed_machines:
        if dispenser["id"] == dispenser_id:
            return dispenser
    
    # Check assigned machines
    for dispenser in client_machines_data.get("client_machines", []):
        if dispenser["id"] == dispenser_id:
            return dispenser
    
    raise HTTPException(status_code=404, detail="Dispenser not found")

@app.post("/api/dispensers")
async def create_dispenser(dispenser: Dispenser):
    """Create a dispenser - routes to client_machines.json if status is 'assigned', otherwise to dispensers.json
    If creating an installed machine with a code that exists in assigned machines, automatically updates/moves it"""
    installed_machines = load_dispensers()
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
        # Add to dispensers.json as installed
        installed_machines.append(dispenser_dict)
        save_dispensers(installed_machines)
        return dispenser_dict
    
    # Check for duplicate unique_code in both files (normal case)
    all_dispensers = installed_machines + client_machines_data.get("client_machines", [])
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
        # Save to dispensers.json (installed machines or SKU templates)
        installed_machines.append(dispenser_dict)
        save_dispensers(installed_machines)
    
    return dispenser_dict

@app.put("/api/dispensers/{dispenser_id}")
async def update_dispenser(dispenser_id: str, dispenser: Dispenser):
    """Update a dispenser - handles moving between files if status changes"""
    installed_machines = load_dispensers()
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
    
    # Check dispensers.json if not found
    if dispenser_index is None:
        for i, d in enumerate(installed_machines):
            if d["id"] == dispenser_id:
                dispenser_index = i
                break
    
    if dispenser_index is None:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    # Check for duplicate unique_code (excluding the current dispenser)
    all_dispensers = installed_machines + client_machines_data.get("client_machines", [])
    for existing_dispenser in all_dispensers:
        if (existing_dispenser.get("unique_code") == dispenser.unique_code and 
            existing_dispenser.get("id") != dispenser_id):
            raise HTTPException(
                status_code=400, 
                detail=f"Code '{dispenser.unique_code}' already exists. Code must be unique."
            )
    
    # Convert to dict - include all fields even if None
    # Handle both Pydantic v1 (dict()) and v2 (model_dump())
    try:
        if hasattr(dispenser, 'model_dump'):
            dispenser_dict = dispenser.model_dump(exclude_none=False)
        else:
            dispenser_dict = dispenser.dict(exclude_none=False)
    except:
        # Fallback to dict() if model_dump() fails
        dispenser_dict = dispenser.dict(exclude_none=False)
    dispenser_dict["id"] = dispenser_id
    
    # Prevent changing client_id to a different client (security check)
    # Get the original machine to check its client_id
    original_machine = None
    if in_client_machines:
        original_machine = client_machines_data.get("client_machines", [])[dispenser_index]
    else:
        original_machine = installed_machines[dispenser_index]
    
    # If machine has a client_id, don't allow changing it to a different client
    if original_machine and original_machine.get("client_id"):
        if dispenser_dict.get("client_id") and dispenser_dict.get("client_id") != original_machine.get("client_id"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot change machine's client. Machine belongs to client '{original_machine.get('client_id')}'."
            )
    
    # Determine where to save based on new status
    new_status = dispenser.status
    was_assigned = in_client_machines
    will_be_assigned = new_status == "assigned"
    
    # If status changed from assigned to installed (or vice versa), move between files
    if was_assigned and not will_be_assigned:
        # Moving from client_machines.json to dispensers.json
        # Remove from client_machines
        client_machines_data["client_machines"].pop(dispenser_index)
        save_client_machines(client_machines_data)
        # Add to dispensers.json
        installed_machines.append(dispenser_dict)
        save_dispensers(installed_machines)
    elif not was_assigned and will_be_assigned:
        # Moving from dispensers.json to client_machines.json
        # Remove from dispensers.json
        installed_machines.pop(dispenser_index)
        save_dispensers(installed_machines)
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
            installed_machines[dispenser_index] = dispenser_dict
            save_dispensers(installed_machines)
    
    return dispenser_dict

@app.delete("/api/dispensers/{dispenser_id}")
async def delete_dispenser(dispenser_id: str):
    """Delete a machine/dispenser - checks both files and completely removes it"""
    installed_machines = load_dispensers()
    client_machines_data = load_client_machines()
    
    # Check and remove from client_machines.json (assigned machines)
    client_machines = client_machines_data.get("client_machines", [])
    found_in_client_machines = any(d["id"] == dispenser_id for d in client_machines)
    
    if found_in_client_machines:
        client_machines_data["client_machines"] = [d for d in client_machines if d["id"] != dispenser_id]
        save_client_machines(client_machines_data)
        return {"message": "Dispenser deleted successfully"}
    
    # Check and remove from dispensers.json (installed machines or SKU templates)
    dispenser_to_delete = None
    for d in installed_machines:
        if d["id"] == dispenser_id:
            dispenser_to_delete = d
            break
    
    if not dispenser_to_delete:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    # IMPORTANT: Only allow deleting SKU templates (machines without client_id)
    # Installed machines (with client_id) should NOT be deleted - they should be uninstalled/removed from client instead
    # But if user explicitly wants to delete, we'll allow it and completely remove it
    # Remove dispenser completely - do NOT convert it back to SKU template
    installed_machines = [d for d in installed_machines if d["id"] != dispenser_id]
    save_dispensers(installed_machines)
    
    # Also remove associated refill logs for this dispenser (only if there are any)
    refill_logs = load_refill_logs()
    refills_to_remove = [r for r in refill_logs if r.get("dispenser_id") == dispenser_id]
    if refills_to_remove:
        refill_logs = [r for r in refill_logs if r.get("dispenser_id") != dispenser_id]
        save_refill_logs(refill_logs)
    
    return {"message": "Dispenser deleted successfully"}

@app.post("/api/dispensers/{dispenser_id}/assign-schedule")
async def assign_schedule(dispenser_id: str, body: dict):
    """Assign a schedule to a dispenser - checks both files"""
    schedule_id = body.get("schedule_id") or body.get("scheduleId")
    # Convert empty string to None
    if schedule_id == "":
        schedule_id = None
    installed_machines = load_dispensers()
    client_machines_data = load_client_machines()
    
    # Check client_machines.json first
    for i, d in enumerate(client_machines_data.get("client_machines", [])):
        if d["id"] == dispenser_id:
            client_machines_data["client_machines"][i]["current_schedule_id"] = schedule_id
            save_client_machines(client_machines_data)
            return client_machines_data["client_machines"][i]
    
    # Check dispensers.json
    for i, d in enumerate(installed_machines):
        if d["id"] == dispenser_id:
            installed_machines[i]["current_schedule_id"] = schedule_id
            save_dispensers(installed_machines)
            return installed_machines[i]
    
    raise HTTPException(status_code=404, detail="Dispenser not found")

@app.post("/api/dispensers/{dispenser_id}/refill")
async def log_refill(dispenser_id: str, refill: RefillLog):
    """Log a refill - checks both files, but refills should only be for installed machines"""
    installed_machines = load_dispensers()
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
    
    # Check dispensers.json if not found
    if not dispenser:
        for i, d in enumerate(installed_machines):
            if d["id"] == dispenser_id:
                dispenser = d
                dispenser_index = i
                break
    
    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    # Helper function to convert to float safely (handles strings, ints, floats, None)
    def safe_float(value):
        """Convert value to float, handling strings, integers, and None"""
        if value is None:
            return 0.0
        if isinstance(value, str):
            try:
                # Remove any whitespace and convert
                cleaned = value.strip()
                return float(cleaned) if cleaned else 0.0
            except (ValueError, TypeError):
                return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        return 0.0
    
    # Get current level and capacity with type safety
    refill_capacity = safe_float(dispenser.get("refill_capacity_ml", 0))
    refill_amount = safe_float(refill.refill_amount_ml)  # This is "adding_ml_refill"
    
    # Use level_before_refill from request if provided (even if 0), otherwise use current_level_ml
    # This ensures we capture the actual level before refill from frontend calculation
    if refill.level_before_refill is not None:
        level_before_refill = safe_float(refill.level_before_refill)
        # Ensure it's not negative
        if level_before_refill < 0:
            level_before_refill = 0.0
    else:
        # Use stored current_level_ml as fallback only if not provided in request
        level_before_refill = safe_float(dispenser.get("current_level_ml", 0))
    
    # Ensure level_before_refill is valid (not None)
    if level_before_refill is None:
        level_before_refill = safe_float(dispenser.get("current_level_ml", 0))
    
    # Calculate new level: level_before_refill + refill_amount (capped at capacity)
    # This is the "current_ml_refill" - level after adding the refill
    new_level = min(level_before_refill + refill_amount, refill_capacity)
    
    # Use current_ml_refill from request if provided (even if 0), otherwise calculate it
    if refill.current_ml_refill is not None:
        current_ml_refill = safe_float(refill.current_ml_refill)
        # Ensure it's not negative
        if current_ml_refill < 0:
            current_ml_refill = 0.0
    else:
        # Calculate it if not provided
        current_ml_refill = new_level
    
    # Ensure current_ml_refill is valid (not None)
    if current_ml_refill is None:
        current_ml_refill = new_level
    
    # Log for debugging (can be removed in production)
    print(f"Refill Calculation: dispenser_id={dispenser_id}")
    print(f"  - Received level_before_refill from request: {refill.level_before_refill}")
    print(f"  - Received current_ml_refill from request: {refill.current_ml_refill}")
    print(f"  - Calculated level_before_refill: {level_before_refill}")
    print(f"  - Calculated current_ml_refill: {current_ml_refill}")
    print(f"  - Adding ml refill: {refill_amount}, capacity: {refill_capacity}")
    
    # Update dispenser level using current_ml_refill (ensure it's stored as float, not string)
    # This ensures we use the calculated value from frontend which uses level_before_refill
    if in_client_machines:
        client_machines_data["client_machines"][dispenser_index]["current_level_ml"] = float(current_ml_refill)
        client_machines_data["client_machines"][dispenser_index]["last_refill_date"] = refill.timestamp
        save_client_machines(client_machines_data)
    else:
        installed_machines[dispenser_index]["current_level_ml"] = float(current_ml_refill)
        installed_machines[dispenser_index]["last_refill_date"] = refill.timestamp
        save_dispensers(installed_machines)
    
    # Count number of refills done for this machine (number_of_refills_done)
    existing_refills = load_refill_logs()
    refills_for_machine = [r for r in existing_refills if r.get("dispenser_id") == dispenser_id]
    number_of_refills_done = len(refills_for_machine) + 1  # +1 for this refill
    
    # Generate unique refill ID using timestamp and counter for better organization
    # Format: refill_YYYYMMDD_HHMMSS_dispenserID_last6chars_counter
    timestamp_now = datetime.now(timezone.utc)
    existing_refills_count = len(existing_refills)
    # Use microsecond for better uniqueness
    refill_id = f"refill_{timestamp_now.strftime('%Y%m%d_%H%M%S_%f')}_{dispenser_id[-6:]}_{existing_refills_count + 1}"
    
    # Get machine details for refill log
    machine_unique_code = dispenser.get("unique_code")
    client_id = dispenser.get("client_id")
    location = dispenser.get("location")
    installation_date = dispenser.get("installation_date")
    
    # Ensure values are floats, not None - always store these critical fields
    level_before_refill_value = float(level_before_refill) if level_before_refill is not None else 0.0
    current_ml_refill_value = float(current_ml_refill) if current_ml_refill is not None else float(new_level)
    
    # Extract fragrance code from notes if not provided directly
    fragrance_code_value = refill.fragrance_code
    if not fragrance_code_value and refill.notes:
        # Try to extract from notes format: "Fragrance Code: XXX"
        import re
        match = re.search(r'Fragrance Code:\s*([^\n]+)', refill.notes)
        if match:
            fragrance_code_value = match.group(1).strip()
    
    # Add refill log to refill_logs.json with all new fields
    # Ensure all fields are stored, even if they come from fallback values
    refill_dict = {
        "id": refill_id,
        "dispenser_id": dispenser_id,  # Use from URL path
        "technician_username": refill.technician_username,
        "refill_amount_ml": float(refill_amount),  # This is "adding_ml_refill"
        "level_before_refill": level_before_refill_value,  # Always store the captured/calculated level before refill
        "current_ml_refill": current_ml_refill_value,  # Always store the calculated level after refill
        "fragrance_code": fragrance_code_value if fragrance_code_value else None,
        "client_id": refill.client_id if refill.client_id else (client_id if client_id else None),
        "machine_unique_code": refill.machine_unique_code if refill.machine_unique_code else (machine_unique_code if machine_unique_code else None),
        "location": refill.location if refill.location else (location if location else None),
        "installation_date": refill.installation_date if refill.installation_date else (installation_date if installation_date else None),
        "number_of_refills_done": number_of_refills_done,
        "timestamp": refill.timestamp,
        "notes": refill.notes if refill.notes else None
    }
    
    # Ensure critical fields are always present (even if 0)
    if "level_before_refill" not in refill_dict:
        refill_dict["level_before_refill"] = 0.0
    if "current_ml_refill" not in refill_dict:
        refill_dict["current_ml_refill"] = float(new_level)
    
    # Debug: Print what we're storing
    print(f"Storing refill log:")
    print(f"  - level_before_refill: {refill_dict.get('level_before_refill')} (type: {type(refill_dict.get('level_before_refill'))})")
    print(f"  - current_ml_refill: {refill_dict.get('current_ml_refill')} (type: {type(refill_dict.get('current_ml_refill'))})")
    print(f"  - refill_amount_ml: {refill_dict.get('refill_amount_ml')}")
    print(f"  - fragrance_code: {refill_dict.get('fragrance_code')}")
    print(f"  - number_of_refills_done: {refill_dict.get('number_of_refills_done')}")
    print(f"  - Full refill_dict keys: {list(refill_dict.keys())}")
    print(f"  - Full refill_dict: {refill_dict}")
    
    existing_refills.append(refill_dict)
    save_refill_logs(existing_refills)
    
    return refill_dict

@app.get("/api/refill-logs")
async def get_refill_logs(request: Request):
    """Get refill logs - admins/developers see all, technicians see only their own"""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    refill_logs = load_refill_logs()
    
    # If user is technician, filter to only their own logs
    if user.get("role") == "technician":
        technician_username = user.get("username", "")
        technician_normalized = str(technician_username).strip() if technician_username else ""
        refill_logs = [
            log for log in refill_logs
            if str(log.get("technician_username") or "").strip() == technician_normalized
        ]
    # Admin and developer can see all logs
    
    return refill_logs

@app.get("/api/clients")
async def get_clients():
    return load_clients()

@app.get("/api/clients/{client_id}")
async def get_client(client_id: str):
    clients = load_clients()
    for client in clients:
        if client["id"] == client_id:
            return client
    raise HTTPException(status_code=404, detail="Client not found")

@app.post("/api/clients")
async def create_client(client: Client):
    existing_clients = load_clients()
    
    # Generate client ID: first 4 chars of name + first 4 chars of address + last 4 digits of phone
    def generate_client_id(name, address, phone):
        # Get first 4 characters of name (uppercase, alphanumeric only)
        name_part = ''.join(c for c in name[:4].upper() if c.isalnum())
        if len(name_part) < 4:
            name_part = name_part.ljust(4, 'X')  # Pad with X if shorter
        
        # Get first 4 characters of address (uppercase, alphanumeric only)
        address_clean = address.replace('\n', ' ').replace('\r', ' ') if address else ''
        address_part = ''.join(c for c in address_clean[:4].upper() if c.isalnum())
        if len(address_part) < 4:
            address_part = address_part.ljust(4, 'X')  # Pad with X if shorter
        
        # Get last 4 digits of phone number
        phone_clean = ''.join(c for c in str(phone) if c.isdigit())
        phone_part = phone_clean[-4:] if len(phone_clean) >= 4 else phone_clean.zfill(4)
        
        return f"{name_part}{address_part}{phone_part}"
    
    # Generate base client ID
    base_client_id = generate_client_id(
        client.name or '',
        client.address or '',
        client.phone or ''
    )
    
    # Ensure ID is unique
    existing_ids = {c.get("id") for c in existing_clients}
    client_id = base_client_id
    counter = 1
    while client_id in existing_ids:
        # If duplicate, append a number
        client_id = f"{base_client_id}{counter:02d}"
        counter += 1
        if counter > 99:  # Safety limit
            # Fallback to timestamp-based ID
            import time
            client_id = f"{base_client_id}{int(time.time()) % 10000:04d}"
            break
    
    client_dict = client.dict()
    client_dict["id"] = client_id
    existing_clients.append(client_dict)
    save_clients(existing_clients)
    return client_dict

@app.put("/api/clients/{client_id}")
async def update_client(client_id: str, client: Client):
    clients = load_clients()
    for i, c in enumerate(clients):
        if c["id"] == client_id:
            client_dict = client.dict()
            client_dict["id"] = client_id
            clients[i] = client_dict
            save_clients(clients)
            return client_dict
    raise HTTPException(status_code=404, detail="Client not found")

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client - checks both files for associated dispensers"""
    installed_machines = load_dispensers()
    client_machines_data = load_client_machines()
    clients = load_clients()
    
    # Check if any dispensers are using this client in both files
    for dispenser in installed_machines:
        if dispenser.get("client_id") == client_id:
            raise HTTPException(status_code=400, detail="Cannot delete client with associated dispensers")
    
    for dispenser in client_machines_data.get("client_machines", []):
        if dispenser.get("client_id") == client_id:
            raise HTTPException(status_code=400, detail="Cannot delete client with associated dispensers")
    
    clients = [c for c in clients if c["id"] != client_id]
    save_clients(clients)
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
    installed_machines = load_dispensers()
    client_machines_data = load_client_machines()
    schedules = load_schedules()
    
    # Find dispenser in both files
    dispenser = None
    for d in client_machines_data.get("client_machines", []):
        if d["id"] == dispenser_id:
            dispenser = d
            break
    
    if not dispenser:
        for d in installed_machines:
            if d["id"] == dispenser_id:
                dispenser = d
                break
    
    if not dispenser:
        raise HTTPException(status_code=404, detail="Dispenser not found")
    
    if not dispenser.get("current_schedule_id"):
        return {"daily_usage_ml": 0, "days_until_empty": None}
    
    # Find schedule
    schedule = None
    for s in schedules:
        if s.get("id") == dispenser.get("current_schedule_id"):
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
        # Helper function to convert to float safely
        def safe_float_usage(value):
            """Convert value to float, handling strings and None"""
            if value is None:
                return 0.0
            if isinstance(value, str):
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return 0.0
            return float(value)
        
        # If we have actual usage since refill, we can calculate remaining level
        # Otherwise use current_level_ml as is (with type safety)
        remaining_level = safe_float_usage(dispenser.get("current_level_ml", 0))
        if actual_usage_since_refill > 0:
            # Note: This is informational - actual level should be updated via refill logs
            # But we can show projected remaining based on usage
            remaining_level = max(0, remaining_level - actual_usage_since_refill)
        
        days_until_empty = remaining_level / daily_usage_ml if remaining_level > 0 else 0
    else:
        days_until_empty = None
    
    return {
        "daily_usage_ml": round(daily_usage_ml, 2),
        "days_until_empty": round(days_until_empty, 2) if days_until_empty else None,
        "cycle_usage_ml": round(cycle_usage_ml, 2),
        "usage_since_refill": round(actual_usage_since_refill, 2) if actual_usage_since_refill > 0 else None,
    }

# Technician Assignment Endpoints
@app.get("/api/technician-assignments")
async def get_technician_assignments(technician: str = None, status: str = None):
    """Get all technician assignments, optionally filtered by technician username or status"""
    assignments = load_technician_assignments()
    
    if technician:
        # Normalize technician username for comparison (strip whitespace)
        technician_normalized = str(technician).strip() if technician else ""
        # Debug: print all assignments and filtered results
        print(f"DEBUG: Filtering assignments for technician: '{technician_normalized}'")
        print(f"DEBUG: Total assignments before filter: {len(assignments)}")
        for a in assignments:
            stored_username = str(a.get("technician_username") or "").strip()
            print(f"DEBUG: Assignment {a.get('id')}: technician_username='{stored_username}' (match: {stored_username == technician_normalized})")
        
        assignments = [
            a for a in assignments 
            if str(a.get("technician_username") or "").strip() == technician_normalized
        ]
        print(f"DEBUG: Filtered assignments count: {len(assignments)}")
    
    if status:
        assignments = [a for a in assignments if a.get("status") == status]
    
    return assignments

@app.get("/api/technician-assignments/{assignment_id}")
async def get_technician_assignment(assignment_id: str):
    """Get a specific assignment by ID"""
    assignments = load_technician_assignments()
    for assignment in assignments:
        if assignment["id"] == assignment_id:
            return assignment
    raise HTTPException(status_code=404, detail="Assignment not found")

@app.post("/api/technician-assignments")
async def create_technician_assignment(assignment: TechnicianAssignment):
    """Create a new technician assignment"""
    assignments = load_technician_assignments()
    
    # Generate ID if not provided
    assignment_id = assignment.id or f"assign_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(assignments)}"
    
    assignment_dict = assignment.dict()
    assignment_dict["id"] = assignment_id
    
    assignments.append(assignment_dict)
    save_technician_assignments(assignments)
    return assignment_dict

@app.put("/api/technician-assignments/{assignment_id}")
async def update_technician_assignment(assignment_id: str, assignment_update: dict):
    """Update a technician assignment"""
    assignments = load_technician_assignments()
    
    for i, assignment in enumerate(assignments):
        if assignment["id"] == assignment_id:
            # Update fields
            for key, value in assignment_update.items():
                if key != "id":  # Don't allow changing ID
                    assignments[i][key] = value
            
            save_technician_assignments(assignments)
            return assignments[i]
    
    raise HTTPException(status_code=404, detail="Assignment not found")

@app.delete("/api/technician-assignments/{assignment_id}")
async def delete_technician_assignment(assignment_id: str):
    """Delete a technician assignment"""
    assignments = load_technician_assignments()
    
    # Check if assignment exists
    assignment_exists = any(a["id"] == assignment_id for a in assignments)
    if not assignment_exists:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignments = [a for a in assignments if a["id"] != assignment_id]
    save_technician_assignments(assignments)
    return {"message": "Assignment deleted successfully"}

@app.post("/api/technician-assignments/{assignment_id}/complete")
async def complete_assignment(assignment_id: str, completion_data: dict = None):
    """Mark an assignment as completed"""
    assignments = load_technician_assignments()
    
    for i, assignment in enumerate(assignments):
        if assignment["id"] == assignment_id:
            assignments[i]["status"] = "completed"
            assignments[i]["completed_date"] = datetime.now().isoformat()
            if completion_data:
                if "notes" in completion_data:
                    completion_notes = completion_data.get("notes")
                    # For installation tasks, preserve CLIENT_ID prefix if it exists
                    if assignment.get("task_type") == "installation" and assignment.get("notes"):
                        # Extract CLIENT_ID from original notes if present
                        import re
                        client_id_match = re.search(r'CLIENT_ID:([^|]+)', assignment.get("notes", ""))
                        if client_id_match:
                            # Preserve CLIENT_ID and append completion notes
                            client_id_part = f"CLIENT_ID:{client_id_match.group(1).strip()}"
                            if completion_notes:
                                assignments[i]["notes"] = f"{client_id_part} | {completion_notes}"
                            else:
                                assignments[i]["notes"] = client_id_part
                        else:
                            # No CLIENT_ID found, just use completion notes
                            assignments[i]["notes"] = completion_notes
                    else:
                        # For non-installation tasks, just update notes normally
                        assignments[i]["notes"] = completion_notes
            
            save_technician_assignments(assignments)
            return assignments[i]
    
    raise HTTPException(status_code=404, detail="Assignment not found")

@app.get("/api/technician-stats/{technician_username}")
async def get_technician_stats(technician_username: str, start_date: str = None, end_date: str = None):
    """Get statistics for a specific technician"""
    assignments = load_technician_assignments()
    refill_logs = load_refill_logs()
    
    # Normalize technician username for comparison (strip whitespace)
    technician_normalized = str(technician_username).strip() if technician_username else ""
    
    # Filter assignments for this technician
    tech_assignments = [
        a for a in assignments 
        if str(a.get("technician_username") or "").strip() == technician_normalized
    ]
    
    # Filter refill logs for this technician
    tech_refills = [
        r for r in refill_logs 
        if str(r.get("technician_username") or "").strip() == technician_normalized
    ]
    
    # Apply date filters if provided
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        tech_assignments = [a for a in tech_assignments if datetime.fromisoformat(a.get("assigned_date", "1970-01-01").replace('Z', '+00:00')) >= start_dt]
        tech_refills = [r for r in tech_refills if datetime.fromisoformat(r.get("timestamp", "1970-01-01").replace('Z', '+00:00')) >= start_dt]
    
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        tech_assignments = [a for a in tech_assignments if datetime.fromisoformat(a.get("assigned_date", "1970-01-01").replace('Z', '+00:00')) <= end_dt]
        tech_refills = [r for r in tech_refills if datetime.fromisoformat(r.get("timestamp", "1970-01-01").replace('Z', '+00:00')) <= end_dt]
    
    # Calculate stats
    total_assigned = len(tech_assignments)
    completed = len([a for a in tech_assignments if a.get("status") == "completed"])
    pending = len([a for a in tech_assignments if a.get("status") == "pending"])
    cancelled = len([a for a in tech_assignments if a.get("status") == "cancelled"])
    total_refills = len(tech_refills)
    total_ml_refilled = sum(r.get("refill_amount_ml", 0) for r in tech_refills)
    
    # Count unique visits (by date and dispenser)
    unique_visits = set()
    for assignment in tech_assignments:
        if assignment.get("status") == "completed" and assignment.get("completed_date"):
            visit_key = f"{assignment.get('dispenser_id')}_{assignment.get('completed_date', '')[:10]}"
            unique_visits.add(visit_key)
    
    return {
        "technician_username": technician_username,
        "machines_assigned": total_assigned,
        "refills_completed": total_refills,
        "pending_refills": pending,
        "completed_tasks": completed,
        "cancelled_tasks": cancelled,
        "visit_count": len(unique_visits),
        "total_ml_refilled": round(total_ml_refilled, 2)
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify API is running"""
    try:
        # Test Google Sheets connection
        from gsheets_service import get_spreadsheet
        spreadsheet = get_spreadsheet()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "storage": "Google Sheets",
            "spreadsheet_id": "1TkSgekL4LxhRl8U0q972Z21tiiP5PNyYIrQBB8C5144",
            "version": "1.0.0"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@app.get("/api/docs")
async def api_docs():
    """API documentation endpoint - redirects to FastAPI Swagger UI"""
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

