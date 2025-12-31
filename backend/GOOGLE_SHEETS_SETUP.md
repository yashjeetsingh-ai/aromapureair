# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for the Aromaflow backend.

## Prerequisites

1. Google Service Account JSON file (`google_service.json`) - Already provided
2. Google Sheet created with ID: `1TkSgekL4LxhRl8U0q972Z21tiiP5PNyYIrQBB8C5144`

## Step 1: Share Google Sheet with Service Account

**IMPORTANT**: You must share your Google Sheet with the service account email address:

**Service Account Email**: `avaipl-auto-aromah@avaipl29dec.iam.gserviceaccount.com`

### How to share:
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1TkSgekL4LxhRl8U0q972Z21tiiP5PNyYIrQBB8C5144/edit
2. Click the "Share" button (top right)
3. Add the email: `avaipl-auto-aromah@avaipl29dec.iam.gserviceaccount.com`
4. Give "Editor" permissions
5. Uncheck "Notify people" (optional)
6. Click "Share"

## Step 2: Install Dependencies

Install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `gspread==5.12.0` - Google Sheets API client
- `google-auth==2.23.4` - Google authentication library

## Step 3: Migrate Existing Data (Optional)

If you have existing JSON files with data that you want to migrate to Google Sheets:

```bash
cd backend
python migrate_to_gsheets.py
```

This script will:
- Read data from all JSON files (users.json, clients.json, dispensers.json, etc.)
- Upload the data to Google Sheets
- Create the necessary worksheets (tabs) in your Google Sheet

**Note**: The migration script will ask for confirmation if Google Sheets already contains data.

## Step 4: Run the Application

Start the FastAPI server:

```bash
cd backend
python main.py
```

Or using uvicorn:

```bash
cd backend
uvicorn main:app --reload
```

The application will now use Google Sheets as the data source instead of JSON files.

## Google Sheet Structure

The application will automatically create the following worksheets (tabs) in your Google Sheet:

1. **Users** - User accounts and credentials
2. **Clients** - Client information
3. **Dispensers** - Dispenser/machine data
4. **Schedules** - Schedule configurations
5. **ScheduleTimeRanges** - Time range data for schedules
6. **ScheduleIntervals** - Interval data for schedules
7. **RefillLogs** - Refill log entries
8. **TechnicianAssignments** - Technician assignment records
9. **ClientMachines** - Client machine assignments

## Data Flow

- **Read Operations**: Data is fetched directly from Google Sheets
- **Write Operations**: Data is written directly to Google Sheets
- **Real-time Sync**: All changes are immediately reflected in Google Sheets
- **Backup**: Your data is automatically backed up in Google Drive

## Troubleshooting

### Error: "Access Denied" or "Permission Denied"
- Make sure you've shared the Google Sheet with the service account email
- Verify the service account email is correct: `avaipl-auto-aromah@avaipl29dec.iam.gserviceaccount.com`

### Error: "Spreadsheet not found"
- Verify the spreadsheet ID is correct: `1TkSgekL4LxhRl8U0q972Z21tiiP5PNyYIrQBB8C5144`
- Check that `google_service.json` file exists in the backend directory

### Error: "Module not found: gspread"
- Run: `pip install -r requirements.txt`

### Data not appearing in Google Sheets
- Check that the service account has "Editor" permissions
- Verify the worksheet names match exactly (case-sensitive)
- Check the application logs for error messages

## Important Notes

1. **Data Format**: Complex data types (lists, dictionaries) are stored as JSON strings in Google Sheets
2. **Headers**: Each worksheet has a header row that defines the column structure
3. **Performance**: Google Sheets API has rate limits. Large datasets may take time to load/save
4. **Backup**: While Google Sheets provides cloud backup, consider exporting data periodically

## Support

If you encounter any issues, check:
1. Service account permissions
2. Google Sheets API is enabled in your Google Cloud project
3. Network connectivity
4. Application logs for detailed error messages

