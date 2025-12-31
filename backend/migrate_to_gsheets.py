"""
Migration script to migrate data from JSON files to Google Sheets
Run this script once to migrate existing JSON data to Google Sheets
"""
import json
import os
import time
from gsheets_service import (
    save_users, save_clients, save_dispensers, save_schedule,
    save_refill_logs, save_technician_assignments, save_client_machines,
    load_users, load_clients, load_dispensers, load_refill_logs,
    load_technician_assignments, load_client_machines,
    clear_worksheet_cache
)

def load_json_file(filepath):
    """Load a JSON file"""
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return None

def migrate_json_to_gsheets():
    """Migrate all JSON files to Google Sheets"""
    print("Starting migration from JSON files to Google Sheets...")
    print("Note: Adding delays to avoid API rate limits...")
    
    # Clear cache before starting
    clear_worksheet_cache()
    
    # Check if Google Sheets already has data
    try:
        print("\nChecking for existing data in Google Sheets...")
        existing_users = load_users()
        time.sleep(1)  # Delay to avoid rate limits
        if existing_users:
            response = input("Google Sheets already contains data. Continue anyway? (y/n): ")
            if response.lower() != 'y':
                print("Migration cancelled.")
                return
    except Exception as e:
        print(f"Warning: Could not check existing data: {e}")
        print("Continuing with migration...")
        time.sleep(2)  # Wait a bit if there was an error
    
    # Migrate Users
    print("\nMigrating users...")
    users_data = load_json_file("users.json")
    if users_data:
        save_users(users_data)
        time.sleep(1)  # Delay between operations
        print(f"  ✓ Migrated {len(users_data)} users")
    else:
        print("  - No users.json found")
    
    # Migrate Clients
    print("\nMigrating clients...")
    clients_data = load_json_file("clients.json")
    if clients_data:
        save_clients(clients_data)
        time.sleep(1)
        print(f"  ✓ Migrated {len(clients_data)} clients")
    else:
        print("  - No clients.json found")
    
    # Migrate Dispensers
    print("\nMigrating dispensers...")
    dispensers_data = load_json_file("dispensers.json")
    if dispensers_data:
        save_dispensers(dispensers_data)
        time.sleep(1)
        print(f"  ✓ Migrated {len(dispensers_data)} dispensers")
    else:
        print("  - No dispensers.json found")
    
    # Migrate Schedules
    print("\nMigrating schedules (this may take a while due to rate limits)...")
    schedules_data = load_json_file("schedules.json")
    if schedules_data:
        # Also need to load time_ranges and intervals
        time_ranges_data = load_json_file("schedule_time_ranges.json") or []
        intervals_data = load_json_file("schedule_intervals.json") or []
        
        # Group time_ranges and intervals by schedule_id
        time_ranges_by_schedule = {}
        for tr in time_ranges_data:
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
        for interval in intervals_data:
            schedule_id = interval.get("schedule_id")
            if schedule_id:
                if schedule_id not in intervals_by_schedule:
                    intervals_by_schedule[schedule_id] = []
                intervals_by_schedule[schedule_id].append({
                    "spray_seconds": interval.get("spray_seconds"),
                    "pause_seconds": interval.get("pause_seconds")
                })
        
        # Save each schedule with its time_ranges and intervals
        for i, schedule in enumerate(schedules_data, 1):
            schedule_id = schedule.get("id")
            if schedule_id:
                # Merge time_ranges and intervals if they exist
                if schedule_id in time_ranges_by_schedule:
                    schedule["time_ranges"] = time_ranges_by_schedule[schedule_id]
                if schedule_id in intervals_by_schedule:
                    schedule["intervals"] = intervals_by_schedule[schedule_id]
                
                try:
                    save_schedule(schedule)
                    print(f"  ✓ Migrated schedule {i}/{len(schedules_data)}: {schedule.get('name', schedule_id)}")
                    # Longer delay between schedule saves as they involve multiple API calls
                    time.sleep(2)
                except Exception as e:
                    print(f"  ✗ Error migrating schedule {schedule_id}: {e}")
                    print(f"     Waiting 5 seconds before continuing...")
                    time.sleep(5)
        print(f"  ✓ Completed migrating {len(schedules_data)} schedules")
    else:
        print("  - No schedules.json found")
    
    # Migrate Refill Logs
    print("\nMigrating refill logs...")
    refill_logs_data = load_json_file("refill_logs.json")
    if refill_logs_data:
        save_refill_logs(refill_logs_data)
        time.sleep(1)
        print(f"  ✓ Migrated {len(refill_logs_data)} refill logs")
    else:
        print("  - No refill_logs.json found")
    
    # Migrate Technician Assignments
    print("\nMigrating technician assignments...")
    assignments_data = load_json_file("technician_assignments.json")
    if assignments_data:
        save_technician_assignments(assignments_data)
        time.sleep(1)
        print(f"  ✓ Migrated {len(assignments_data)} technician assignments")
    else:
        print("  - No technician_assignments.json found")
    
    # Migrate Client Machines
    print("\nMigrating client machines...")
    client_machines_data = load_json_file("client_machines.json")
    if client_machines_data:
        # Handle both dict and list formats
        if isinstance(client_machines_data, dict):
            save_client_machines(client_machines_data)
            count = len(client_machines_data.get("client_machines", []))
        else:
            save_client_machines({"client_machines": client_machines_data})
            count = len(client_machines_data)
        time.sleep(1)
        print(f"  ✓ Migrated {count} client machines")
    else:
        print("  - No client_machines.json found")
    
    print("\n" + "="*50)
    print("Migration completed successfully!")
    print("="*50)
    print("\nNote: Make sure to share your Google Sheet with the service account email:")
    print("  avaipl-auto-aromah@avaipl29dec.iam.gserviceaccount.com")
    print("\nYou can now use the application with Google Sheets as the data source.")

if __name__ == "__main__":
    try:
        migrate_json_to_gsheets()
    except Exception as e:
        print(f"\nError during migration: {e}")
        import traceback
        traceback.print_exc()

