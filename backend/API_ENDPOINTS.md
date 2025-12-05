# API Endpoints Documentation

All endpoints save data to `data.json` file. The JSON structure is:

```json
{
  "users": [],
  "clients": [],
  "dispensers": [],
  "schedules": [],
  "refill_logs": []
}
```

## Authentication

### POST /api/login
- **Description**: User login
- **Body**: `{ "username": "string", "password": "string" }`
- **Returns**: `{ "username": "string", "role": "string" }`
- **Saves to JSON**: No (read-only)

## User Management

### GET /api/users
- **Description**: Get all users (without passwords)
- **Returns**: Array of users
- **Saves to JSON**: No (read-only)

### POST /api/users
- **Description**: Create a new user
- **Body**: `{ "username": "string", "password": "string", "role": "technician|admin|developer" }`
- **Returns**: User object (without password)
- **Saves to JSON**: ✅ Yes

### PUT /api/users/{username}
- **Description**: Update user (password and/or role)
- **Body**: `{ "password": "string" (optional), "role": "string" (optional) }`
- **Returns**: Updated user object
- **Saves to JSON**: ✅ Yes

### DELETE /api/users/{username}
- **Description**: Delete a user
- **Returns**: `{ "message": "User deleted successfully" }`
- **Saves to JSON**: ✅ Yes

## Client Management

### GET /api/clients
- **Description**: Get all clients
- **Returns**: Array of clients
- **Saves to JSON**: No (read-only)

### GET /api/clients/{client_id}
- **Description**: Get a specific client
- **Returns**: Client object
- **Saves to JSON**: No (read-only)

### POST /api/clients
- **Description**: Create a new client
- **Body**: `{ "name": "string", "contact_person": "string" (optional), "email": "string" (optional), "phone": "string" (optional), "address": "string" (optional) }`
- **Returns**: Client object with generated ID
- **Saves to JSON**: ✅ Yes

### PUT /api/clients/{client_id}
- **Description**: Update a client
- **Body**: Client object
- **Returns**: Updated client object
- **Saves to JSON**: ✅ Yes

### DELETE /api/clients/{client_id}
- **Description**: Delete a client (only if no machines are assigned)
- **Returns**: `{ "message": "Client deleted" }`
- **Saves to JSON**: ✅ Yes

## Machine/Dispenser Management

### GET /api/dispensers
- **Description**: Get all machines/dispensers
- **Returns**: Array of dispensers
- **Saves to JSON**: No (read-only)

### GET /api/dispensers/{dispenser_id}
- **Description**: Get a specific machine/dispenser
- **Returns**: Dispenser object
- **Saves to JSON**: No (read-only)

### POST /api/dispensers
- **Description**: Create a new machine/dispenser
- **Body**: `{ "id": "string", "name": "string", "sku": "string", "location": "string", "client_id": "string" (optional), "current_schedule_id": "string" (optional), "refill_capacity_ml": number (required), "current_level_ml": number, "last_refill_date": "string" (optional), "ml_per_hour": number (required), "unique_code": "string" (required, must be unique) }`
- **Returns**: Created dispenser object
- **Saves to JSON**: ✅ Yes
- **Required Fields**: `sku`, `refill_capacity_ml`, `ml_per_hour`, `unique_code`
- **Validation**: `unique_code` must be unique across all dispensers. Returns 400 error if duplicate code is provided.

### PUT /api/dispensers/{dispenser_id}
- **Description**: Update a machine/dispenser
- **Body**: Dispenser object
- **Returns**: Updated dispenser object
- **Saves to JSON**: ✅ Yes
- **Validation**: `unique_code` must be unique across all dispensers (excluding the current dispenser being updated). Returns 400 error if duplicate code is provided.

### DELETE /api/dispensers/{dispenser_id}
- **Description**: Delete a machine/dispenser
- **Returns**: `{ "message": "Dispenser deleted successfully" }`
- **Saves to JSON**: ✅ Yes

### POST /api/dispensers/{dispenser_id}/assign-schedule
- **Description**: Assign a schedule to a machine
- **Body**: `{ "schedule_id": "string" }`
- **Returns**: Updated dispenser object
- **Saves to JSON**: ✅ Yes

### POST /api/dispensers/{dispenser_id}/refill
- **Description**: Log a refill for a machine
- **Body**: `{ "dispenser_id": "string", "technician_username": "string", "refill_amount_ml": number, "timestamp": "string", "notes": "string" (optional) }`
- **Returns**: Refill log object
- **Saves to JSON**: ✅ Yes (updates dispenser level and creates refill log)

### GET /api/dispensers/{dispenser_id}/usage-calculation
- **Description**: Calculate usage statistics for a machine
- **Returns**: `{ "daily_usage_ml": number, "days_until_empty": number, "cycle_usage_ml": number }`
- **Saves to JSON**: No (read-only calculation)

## Schedule Management

### GET /api/schedules
- **Description**: Get all schedules
- **Returns**: Array of schedules
- **Saves to JSON**: No (read-only)

### GET /api/schedules/{schedule_id}
- **Description**: Get a specific schedule
- **Returns**: Schedule object
- **Saves to JSON**: No (read-only)

### POST /api/schedules
- **Description**: Create a new schedule
- **Body**: `{ "name": "string", "type": "fixed|custom", "intervals": [{ "spray_seconds": number, "pause_seconds": number }], "duration_minutes": number, "daily_cycles": number }`
- **Returns**: Schedule object with generated ID
- **Saves to JSON**: ✅ Yes

### PUT /api/schedules/{schedule_id}
- **Description**: Update a schedule
- **Body**: Schedule object
- **Returns**: Updated schedule object
- **Saves to JSON**: ✅ Yes

### DELETE /api/schedules/{schedule_id}
- **Description**: Delete a schedule (cannot delete fixed schedules)
- **Returns**: `{ "message": "Schedule deleted" }`
- **Saves to JSON**: ✅ Yes

## Refill Logs

### GET /api/refill-logs
- **Description**: Get all refill logs
- **Returns**: Array of refill log objects
- **Saves to JSON**: No (read-only)

## Data Persistence

All create, update, and delete operations automatically save to `backend/data.json`. The file is:
- Created automatically on first run
- Updated immediately after any modification
- Formatted with 2-space indentation for readability
- Located in the backend directory

## Data Structure

### User
```json
{
  "username": "string",
  "password": "string",
  "role": "technician|admin|developer"
}
```

### Client
```json
{
  "id": "client_1",
  "name": "string",
  "contact_person": "string",
  "email": "string",
  "phone": "string",
  "address": "string"
}
```

### Dispenser (Machine)
```json
{
  "id": "disp_1",
  "name": "string",
  "sku": "string",
  "location": "string",
  "client_id": "string",
  "current_schedule_id": "string",
  "refill_capacity_ml": 500.0,
  "current_level_ml": 450.0,
  "last_refill_date": "string"
}
```

### Schedule
```json
{
  "id": "schedule_1",
  "name": "string",
  "type": "fixed|custom",
  "intervals": [
    {
      "spray_seconds": 20,
      "pause_seconds": 40
    }
  ],
  "duration_minutes": 120,
  "daily_cycles": 1
}
```

### Refill Log
```json
{
  "id": "refill_1",
  "dispenser_id": "disp_1",
  "technician_username": "string",
  "refill_amount_ml": 100.0,
  "timestamp": "2024-01-01T00:00:00",
  "notes": "string"
}
```

