# Client Dashboard Requirements

## Overview
This document outlines all the features and information that should be displayed in the Client Dashboard for the Aromahpure Air system.

---

## 1. **Dashboard Overview/Summary Section**

### 1.1 Summary Cards (Top of Dashboard)
- **Total Machines Installed**: Count of all machines with `client_id` matching logged-in client and `status: "installed"`
- **Active Machines**: Machines that are currently operational (installed status)
- **Machines Needing Refill**: Machines with low/urgent levels (based on calculated usage)
- **Upcoming Maintenance**: Count of scheduled technician visits (from technician_assignments)

### 1.2 Quick Stats
- **Total Refill Capacity**: Sum of all `refill_capacity_ml` for client's machines
- **Average Current Level**: Average of `current_level_ml` across all machines
- **Last Refill Date**: Most recent `last_refill_date` across all machines
- **Total Refills This Month**: Count of refill_logs for client's machines in current month

---

## 2. **My Machines Section**

### 2.1 Machine List/Table View
Display all machines where `client_id` matches the logged-in client. Show:

#### Essential Information:
- **Machine Name** (`name`)
- **SKU** (`sku`)
- **Location** (`location`)
- **Unique Code** (`unique_code`)
- **Status** (`status`) - with color coding:
  - "installed" = Green
  - "assigned" = Yellow
  - Other/null = Gray

#### Level & Capacity Information:
- **Current Level** (`current_level_ml`) - Displayed as:
  - Progress bar showing percentage
  - Text: "XXX ml / YYY ml"
  - Color coding:
    - Green: > 60% capacity
    - Yellow: 30-60% capacity
    - Orange: 10-30% capacity
    - Red: < 10% capacity
- **Refill Capacity** (`refill_capacity_ml`)
- **Percentage Full**: Calculated as `(current_level_ml / refill_capacity_ml) * 100`

#### Schedule Information:
- **Current Schedule** (`current_schedule_id`) - Display schedule name if available
- **Usage Rate** (`ml_per_hour`) - Display as "X ml/hour"

#### Dates:
- **Installation Date** (`installation_date`) - Formatted in IST
- **Last Refill Date** (`last_refill_date`) - Formatted in IST
- **Days Since Last Refill**: Calculated from `last_refill_date`

#### Calculated Metrics:
- **Estimated Days Until Empty**: Based on usage calculation API
- **Daily Usage**: From usage calculation API
- **Cycle Usage**: From usage calculation API

### 2.2 Machine Detail View (Click to expand or modal)
When clicking on a machine, show:
- All information from list view
- **Schedule Details**: Full schedule information if `current_schedule_id` exists
- **Refill History**: List of all refill_logs for this machine
- **Maintenance History**: Technician assignments related to this machine
- **Usage Statistics**: Charts/graphs showing:
  - Usage over time
  - Refill frequency
  - Level trends

### 2.3 Filters & Search
- Filter by:
  - Location
  - Status
  - Level status (Good/Medium/Low/Urgent)
  - SKU
- Search by:
  - Machine name
  - Unique code
  - Location

### 2.4 Sorting Options
- Sort by:
  - Location (alphabetical)
  - Current level (ascending/descending)
  - Last refill date (newest/oldest)
  - Installation date (newest/oldest)
  - Status

---

## 3. **Refill History Section**

### 3.1 Refill Logs Table
Display all refill_logs where `client_id` matches logged-in client. Show:

- **Date & Time** (`timestamp`) - Formatted in IST
- **Machine Name** - From dispenser data
- **Location** (`location`)
- **Unique Code** (`machine_unique_code`)
- **Technician** (`technician_username`)
- **Refill Amount** (`refill_amount_ml`) - "Added: XXX ml"
- **Level Before Refill** (`level_before_refill`)
- **Level After Refill** (`current_ml_refill`)
- **Fragrance Code** (`fragrance_code`)
- **Refill Number** (`number_of_refills_done`) - "Refill #X"
- **Notes** (`notes`)

### 3.2 Filters
- Filter by:
  - Date range (from/to)
  - Machine (by unique code or name)
  - Technician
- Search by:
  - Fragrance code
  - Notes

### 3.3 Statistics
- **Total Refills**: Count of all refills
- **Total Volume Refilled**: Sum of all `refill_amount_ml`
- **Average Refill Amount**: Average of `refill_amount_ml`
- **Most Recent Refill**: Latest `timestamp`
- **Refills This Month**: Count for current month
- **Refills This Year**: Count for current year

---

## 4. **Maintenance & Service Section**

### 4.1 Upcoming Visits
Display technician_assignments where:
- `dispenser_id` matches one of client's machines
- `status` is "assigned" or "pending"
- Show:
  - **Visit Date** (`visit_date`) - Formatted in IST
  - **Task Type** (`task_type`) - "refill", "installation", "maintenance"
  - **Technician** (`technician_username`)
  - **Machine** - Machine name and location
  - **Status** (`status`)
  - **Assigned Date** (`assigned_date`) - Formatted in IST

### 4.2 Completed Services
Display technician_assignments where:
- `dispenser_id` matches one of client's machines
- `status` is "completed"
- Show same fields as upcoming visits plus:
  - **Completed Date** (`completed_date`) - Formatted in IST
  - **Notes** (`notes`)

### 4.3 Service History Summary
- **Total Service Visits**: Count of all assignments
- **Completed Visits**: Count of completed assignments
- **Pending Visits**: Count of pending/assigned
- **Next Scheduled Visit**: Earliest `visit_date` for pending/assigned

---

## 5. **Usage Analytics Section**

### 5.1 Usage Overview
- **Total Daily Usage**: Sum of daily usage across all machines
- **Average Daily Usage per Machine**: Average of daily usage
- **Projected Monthly Usage**: Daily usage * 30
- **Total Capacity Utilization**: Percentage of total capacity used

### 5.2 Usage Charts/Graphs
- **Usage Over Time**: Line chart showing usage trends
- **Level Trends**: Line chart showing current_level_ml over time
- **Refill Frequency**: Bar chart showing refills per month
- **Machine Comparison**: Compare usage across different machines

### 5.3 Predictions
- **Estimated Next Refill Date**: Based on usage rate and current level
- **Days Until Empty**: For each machine
- **Recommended Refill Schedule**: Based on historical data

---

## 6. **Account Information Section**

### 6.1 Client Details
Display client information (read-only):
- **Client Name** (`name`)
- **Client ID** (`id`)
- **Contact Person** (`contact_person`)
- **Email** (`email`)
- **Phone** (`phone`)
- **Address** (`address`)

### 6.2 Account Settings
- View account information
- Change password (if implemented)
- Notification preferences (if implemented)

---

## 7. **Notifications & Alerts**

### 7.1 Alert Types
- **Low Level Alert**: When machine level < 10% capacity
- **Medium Level Alert**: When machine level 10-30% capacity
- **Upcoming Maintenance**: When technician visit is scheduled within 7 days
- **Refill Completed**: When technician completes a refill
- **Installation Complete**: When new machine is installed

### 7.2 Alert Display
- Badge count on dashboard
- Alert list/panel
- Color-coded priority levels

---

## 8. **Additional Features**

### 8.1 Export/Download
- Export machine list to CSV/PDF
- Export refill history to CSV/PDF
- Export usage reports

### 8.2 Mobile Responsiveness
- Responsive design for mobile devices
- Touch-friendly interface
- Optimized for tablets

### 8.3 Real-time Updates
- Auto-refresh data every X minutes
- Manual refresh button
- Loading states

---

## 9. **API Endpoints Needed**

### 9.1 Client-Specific Endpoints (May need to be created)
- `GET /api/clients/{client_id}/machines` - Get all machines for a client
- `GET /api/clients/{client_id}/refill-logs` - Get refill logs for a client
- `GET /api/clients/{client_id}/assignments` - Get technician assignments for a client
- `GET /api/clients/{client_id}/usage-stats` - Get usage statistics for a client

### 9.2 Existing Endpoints (Filter by client_id)
- `GET /api/dispensers` - Filter by `client_id` in frontend
- `GET /api/refill-logs` - Filter by `client_id` in frontend (may need role check)
- `GET /api/clients/{client_id}` - Get client details
- `GET /api/dispensers/{dispenser_id}/usage-calculation` - Get usage for specific machine

---

## 10. **UI/UX Considerations**

### 10.1 Navigation
- Sidebar with sections:
  - Dashboard (Overview)
  - My Machines
  - Refill History
  - Maintenance & Service
  - Usage Analytics
  - Account Settings
- Breadcrumbs for navigation
- Logout button

### 10.2 Visual Design
- Consistent with existing dashboards (Admin, Technician)
- Color scheme matching brand
- Icons for different sections
- Status indicators with colors
- Progress bars for levels

### 10.3 Data Presentation
- Cards for summary information
- Tables for detailed data
- Charts/graphs for analytics
- Modals/dialogs for detailed views
- Tooltips for additional information

---

## 11. **Security Considerations**

### 11.1 Access Control
- Clients can only see their own data
- Filter all API calls by `client_id` from JWT token
- No access to other clients' information
- No access to admin/technician features

### 11.2 Data Privacy
- Only display client's own machines
- Only display refill logs for client's machines
- Only display assignments for client's machines

---

## 12. **Implementation Checklist**

### Phase 1: Core Features
- [ ] Client login/authentication
- [ ] Dashboard overview with summary cards
- [ ] Machine list view with basic information
- [ ] Machine detail view
- [ ] Basic filters and search

### Phase 2: History & Tracking
- [ ] Refill history table
- [ ] Maintenance/service history
- [ ] Usage calculations
- [ ] Date filters

### Phase 3: Analytics
- [ ] Usage charts and graphs
- [ ] Predictions and estimates
- [ ] Export functionality

### Phase 4: Enhancements
- [ ] Notifications/alerts
- [ ] Real-time updates
- [ ] Mobile optimization
- [ ] Advanced analytics

---

## 13. **Data Flow**

### 13.1 On Login
1. Client logs in with `client_id` and password
2. JWT token includes `client_id` and `role: "client"`
3. Frontend stores `client_id` in context/state

### 13.2 On Dashboard Load
1. Fetch all dispensers: `GET /api/dispensers`
2. Filter by `client_id` matching logged-in client
3. Fetch refill logs: `GET /api/refill-logs` (if accessible) or filter client-specific
4. Fetch technician assignments (if endpoint exists)
5. Calculate usage for each machine
6. Display filtered and calculated data

### 13.3 Real-time Updates
1. Poll API endpoints every X minutes
2. Update state with new data
3. Re-render components with updated information

---

## 14. **Example Data Structure**

### Client Dashboard State
```javascript
{
  client: {
    id: "client_2",
    name: "Innovatiview India Ltd.",
    contact_person: "Yash",
    email: "yash@gmail.com",
    phone: "8976898989",
    address: "Noida"
  },
  machines: [
    {
      id: "disp_1765272011157",
      name: "AROMA Air400c",
      location: "WASHROOM1",
      current_level_ml: 500.0,
      refill_capacity_ml: 500.0,
      status: "installed",
      // ... other fields
    }
  ],
  refillLogs: [...],
  assignments: [...],
  usageData: {...},
  stats: {
    totalMachines: 5,
    activeMachines: 4,
    machinesNeedingRefill: 1,
    // ... other stats
  }
}
```

---

## Summary

The Client Dashboard should provide a comprehensive view of:
1. **Overview**: Quick summary of all machines and their status
2. **Machines**: Detailed list and individual machine information
3. **History**: Refill and maintenance history
4. **Analytics**: Usage patterns and predictions
5. **Account**: Client information and settings

All data should be filtered to show only information relevant to the logged-in client, ensuring data privacy and security.

