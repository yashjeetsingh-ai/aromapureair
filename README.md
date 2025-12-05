# Perfume Dispenser Management System

A comprehensive management system for perfume dispensers with customizable schedules, role-based access, and refill tracking.

## Features

- **Role-Based Access Control**: Three user roles (Technician, Admin, Developer)
- **Schedule Management**: Fixed and fully customizable schedules
- **Dispenser Management**: Track multiple dispensers with real-time level monitoring
- **Refill Logging**: Simple interface for technicians to log refills
- **Usage Calculation**: Automatic calculation of daily usage and depletion estimates
- **Local JSON Storage**: All data stored locally in JSON files (prototype)

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Material-UI
- **Storage**: JSON files (local)

## Project Structure

```
Aroma-Disp/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── data.json            # JSON data storage (created on first run)
└── frontend/
    ├── src/
    │   ├── components/      # React components
    │   ├── services/        # API service functions
    │   └── context/         # React context
    └── package.json         # Node dependencies
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the FastAPI server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Default Credentials

The system comes with three default users:

- **Technician**: `tech1` / `tech123`
- **Admin**: `admin1` / `admin123`
- **Developer**: `dev1` / `dev123`

## User Roles

### Technician
- Simple login interface
- View all dispensers with current levels
- Log refills with amount and optional notes

### Admin
- View all dispensers and their schedules
- Assign schedules to dispensers
- View refill logs
- Monitor usage calculations and depletion estimates

### Developer
- Full access to schedule management
- Create custom schedules with multiple intervals
- Edit and delete custom schedules (fixed schedules are protected)
- View schedule usage statistics

## Schedule System

### Fixed Schedules
Four preset schedules are included:
- Morning Schedule: 5s spray / 55s pause, 4 cycles/day
- Afternoon Schedule: 10s spray / 50s pause, 4 cycles/day
- Evening Schedule: 15s spray / 45s pause, 4 cycles/day
- Night Schedule: 20s spray / 40s pause, 4 cycles/day

### Custom Schedules
Developers can create fully customizable schedules with:
- Multiple spray/pause intervals per cycle
- Custom cycle duration
- Custom daily cycle count
- Automatic usage calculation

## Usage Calculation

The system calculates usage based on:
- Spray duration per interval
- Number of intervals per cycle
- Daily cycle count
- Assumed consumption: 0.1ml per second of spray

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `GET /api/dispensers` - Get all dispensers
- `POST /api/dispensers/{id}/assign-schedule` - Assign schedule to dispenser
- `POST /api/dispensers/{id}/refill` - Log refill
- `GET /api/dispensers/{id}/usage-calculation` - Get usage calculations
- `GET /api/refill-logs` - Get all refill logs

## Notes

- This is a prototype system using local JSON storage
- Data persists in `backend/data.json`
- No database required for this prototype
- CORS is configured for local development

