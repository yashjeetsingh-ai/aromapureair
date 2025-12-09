import React, { useState, useEffect, useContext } from 'react';
import { formatDateIST, formatDateTimeIST, formatDateTimeFullIST, toISTDateTimeLocal, fromISTDateTimeLocal, getCurrentISTISO } from '../utils/dateUtils';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  IconButton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormHelperText,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Refresh, 
  LocationOn, 
  Inventory,
  Assignment,
  CheckCircle,
  PendingActions,
  DirectionsWalk,
  Devices,
  Build,
  CalendarMonth,
  Done,
  PlayArrow,
  Edit,
  Visibility,
  Business,
  ArrowBack,
  Add,
  Delete,
  Menu,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { 
  getDispensers, 
  logRefill, 
  getRefillLogs,
  getClients, 
  getClient,
  getSchedules,
  createSchedule,
  calculateUsage,
  getTechnicianAssignments,
  getTechnicianStats,
  completeAssignment,
  updateClient,
  createDispenser,
  updateDispenser,
  assignSchedule,
} from '../services/api';
import Sidebar from './Sidebar';
import ResponsiveTable from './ResponsiveTable';
import { useLocation } from 'react-router-dom';

function TechnicianDashboard() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(location?.state?.tab !== undefined ? location.state.tab : null);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const [dispensers, setDispensers] = useState([]);
  const [clients, setClients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [usageData, setUsageData] = useState({});
  const [refillLogs, setRefillLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispenser, setSelectedDispenser] = useState(null);
  const [refillDialogOpen, setRefillDialogOpen] = useState(false);
  const [refillCodeEntryDialogOpen, setRefillCodeEntryDialogOpen] = useState(false);
  const [refillUniqueCode, setRefillUniqueCode] = useState('');
  const [refillAmount, setRefillAmount] = useState('');
  const [fragranceCode, setFragranceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [levelBeforeRefill, setLevelBeforeRefill] = useState(null); // Capture level when dialog opens
  const [success, setSuccess] = useState('');
  
  // Date filter
  const [filterDate, setFilterDate] = useState('');
  
  // Complete task dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Client access view for installation tasks
  const [clientAccessView, setClientAccessView] = useState(null); // { clientId, assignmentId }
  const [clientAccessTab, setClientAccessTab] = useState(0); // 0 = Client, 1 = Installed
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });
  const [viewingDispenser, setViewingDispenser] = useState(null);
  const [editingDispenser, setEditingDispenser] = useState(null);
  const [dispenserForm, setDispenserForm] = useState({
    name: '',
    sku: '',
    location: '',
    refill_capacity_ml: 500,
    ml_per_hour: 2.0,
    unique_code: '',
  });
  
  // Installation and Add Machine dialogs
  const [installationDialogOpen, setInstallationDialogOpen] = useState(false);
  const [addMachineDialogOpen, setAddMachineDialogOpen] = useState(false);
  const [installationForm, setInstallationForm] = useState({
    location: '',
    sku: '',
    unique_code: '',
    status: 'installed',
    ml_per_hour: '',
    schedule_id: '',
    refill_amount_ml: 0,
    last_refill_date: null,
    installation_date: null,
  });
  const [addMachineForm, setAddMachineForm] = useState({
    sku: '',
    unique_code: '',
    location: '',
    status: 'assigned',
  });
  const [customScheduleDialogOpen, setCustomScheduleDialogOpen] = useState(false);
  const [customScheduleForm, setCustomScheduleForm] = useState({
    name: '',
    type: 'custom',
    scheduleType: 'time_based', // 'time_based' or 'interval_based'
    duration_minutes: 120,
    daily_cycles: 1,
    ml_per_hour: '',
    intervals: [{ spray_seconds: 20, pause_seconds: 40 }],
    time_ranges: [
      { start_time: '00:00', end_time: '06:00', spray_seconds: 20, pause_seconds: 40 },
      { start_time: '06:00', end_time: '12:00', spray_seconds: 30, pause_seconds: 30 },
      { start_time: '12:00', end_time: '15:00', spray_seconds: 50, pause_seconds: 20 },
      { start_time: '15:00', end_time: '23:55', spray_seconds: 100, pause_seconds: 10 },
    ],
    days_of_week: [0, 1, 2, 3, 4, 5, 6], // All days selected by default (0=Monday, 6=Sunday)
  });

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Handle tab navigation from sidebar
    if (location?.state?.tab !== undefined) {
      setActiveTab(location.state.tab);
    } else {
      setActiveTab(null); // Dashboard view
    }
  }, [location]);

  useEffect(() => {
    // Listen for tab changes from sidebar
    const handleTabChange = (event) => {
      if (event.detail?.tab !== undefined) {
        setActiveTab(event.detail.tab);
      } else {
        setActiveTab(null); // Dashboard view
      }
    };
    window.addEventListener('tabChange', handleTabChange);
    return () => window.removeEventListener('tabChange', handleTabChange);
  }, []);

  // Refresh schedules when installation dialog opens
  useEffect(() => {
    if (installationDialogOpen) {
      const refreshSchedules = async () => {
        try {
          const schedulesData = await getSchedules();
          setSchedules(schedulesData);
        } catch (err) {
          console.error('Error refreshing schedules:', err);
        }
      };
      refreshSchedules();
    }
  }, [installationDialogOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispensersData, clientsData, schedulesData, assignmentsData, statsData, refillLogsData] = await Promise.all([
        getDispensers(),
        getClients(),
        getSchedules(),
        getTechnicianAssignments(user?.username),
        getTechnicianStats(user?.username),
        getRefillLogs(),
      ]);
      setDispensers(dispensersData);
      setClients(clientsData);
      setSchedules(schedulesData);
      setAssignments(assignmentsData);
      setStats(statsData);
      setRefillLogs(refillLogsData);

      // Load usage data for installed machines
      const installedMachines = dispensersData.filter(d => d.client_id && d.status === 'installed');
      const usagePromises = installedMachines.map(async (d) => {
        if (d.current_schedule_id) {
          try {
            const usage = await calculateUsage(d.id);
            return { [d.id]: usage };
          } catch {
            return { [d.id]: null };
          }
        }
        return { [d.id]: null };
      });
      const usageResults = await Promise.all(usagePromises);
      const usageMap = Object.assign({}, ...usageResults);
      setUsageData(usageMap);
      
      // Also load refill logs for accurate current level calculation
      try {
        const refillLogsData = await getRefillLogs();
        setRefillLogs(refillLogsData);
      } catch (err) {
        console.error('Error loading refill logs:', err);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'No Client';
  };

  const getDispenserDetails = (dispenserId) => {
    return dispensers.find(d => d.id === dispenserId);
  };

  // Calculate current level based on last refill date and daily usage
  const calculateCurrentLevel = (dispenser) => {
    if (!dispenser) return 0;
    
    const { current_level_ml, last_refill_date, current_schedule_id, ml_per_hour, refill_capacity_ml } = dispenser;
    
    // If no last refill date or schedule, return stored current level
    if (!last_refill_date || !current_schedule_id) {
      return current_level_ml || refill_capacity_ml || 0;
    }

    const schedule = schedules.find(s => s.id === current_schedule_id);
    if (!schedule) {
      return current_level_ml || refill_capacity_ml || 0;
    }

    // Use usageData from API if available (more accurate)
    const usageInfo = usageData[dispenser.id];
    if (usageInfo && usageInfo.usage_since_refill !== undefined && usageInfo.usage_since_refill !== null) {
      // Calculate remaining level: current_level_ml - usage_since_refill
      const remainingLevel = Math.max(0, (current_level_ml || 0) - usageInfo.usage_since_refill);
      return Math.min(remainingLevel, refill_capacity_ml || 0);
    }

    // Fallback to manual calculation if usageData not available
    // Find the refill log that matches last_refill_date to get the refill amount
    const matchingRefillLog = refillLogs
      .filter(log => {
        if (log.dispenser_id !== dispenser.id) return false;
        const logDate = new Date(log.timestamp);
        const refillDate = new Date(last_refill_date);
        return Math.abs(logDate - refillDate) < 60000; // Within 1 minute
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    // Determine the level after last refill
    // The API updates current_level_ml when a refill happens: current_level_ml = old_level + refill_amount (capped)
    // So current_level_ml should represent the level immediately after the last refill
    let levelAfterRefill = current_level_ml || refill_capacity_ml || 0;
    
    // If we have a matching refill log and it's the most recent one, we can verify
    // But since API already updates current_level_ml correctly, we'll use it as baseline

    // Calculate daily usage
    let dailyUsage = 0;
    if (schedule.time_ranges) {
      // Time-based schedule
      if (ml_per_hour) {
        let totalHours = 0;
        schedule.time_ranges.forEach(range => {
          const start = new Date(`2000-01-01T${range.start_time}`);
          const end = new Date(`2000-01-01T${range.end_time}`);
          const diff = (end - start) / (1000 * 60 * 60);
          totalHours += diff;
        });
        dailyUsage = totalHours * ml_per_hour;
      }
    } else {
      // Interval-based schedule
      if (ml_per_hour) {
        let totalSeconds = 0;
        schedule.intervals?.forEach(interval => {
          totalSeconds += interval.spray_seconds;
        });
        const totalHours = totalSeconds / 3600;
        dailyUsage = totalHours * ml_per_hour * (schedule.daily_cycles || 1);
      } else {
        const ML_PER_SECOND = 0.1;
        let cycleUsage = 0;
        schedule.intervals?.forEach(interval => {
          cycleUsage += interval.spray_seconds * ML_PER_SECOND;
        });
        dailyUsage = cycleUsage * (schedule.daily_cycles || 1);
      }
    }

    if (dailyUsage === 0) {
      return levelAfterRefill;
    }

    // Calculate time elapsed since last refill (with time precision)
    const lastRefill = new Date(last_refill_date);
    const now = new Date();
    const timeDiffMs = now - lastRefill;
    const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24); // Days with decimal precision (includes hours/minutes)

    // Calculate usage since last refill
    // Start from the level after last refill, then subtract usage since then
    const usageSinceRefill = daysElapsed * dailyUsage;
    const calculatedLevel = Math.max(0, levelAfterRefill - usageSinceRefill);
    
    // Never allow current level to exceed capacity
    const currentLevel = Math.min(calculatedLevel, refill_capacity_ml || 0);

    return currentLevel;
  };

  // Extract client_id from installation task notes or dispenser_id
  const getClientIdFromInstallationTask = (assignment) => {
    if (assignment.task_type === 'installation') {
      // First, try to extract from notes
      if (assignment.notes) {
        const match = assignment.notes.match(/CLIENT_ID:([^|]+)/);
        if (match) {
          return match[1].trim();
        }
      }
      // Fallback: try to extract from dispenser_id pattern (installation_client_client_1_timestamp)
      if (assignment.dispenser_id && assignment.dispenser_id.startsWith('installation_client_')) {
        // Pattern: installation_client_client_1_timestamp
        // Extract: client_1 (the part after "installation_client_" and before the timestamp)
        // The timestamp is typically a long number, so we extract until we hit a long number
        const parts = assignment.dispenser_id.replace('installation_client_', '').split('_');
        if (parts.length >= 2) {
          // First part should be the client_id (e.g., "client_1" or new format like "YJMEKHAS9199")
          const potentialClientId = parts[0];
          // Check if it's a valid client ID format
          if (potentialClientId.startsWith('client_') || potentialClientId.match(/^[A-Z0-9]{8,12}$/)) {
            return potentialClientId;
          }
          // If first part is just "client", combine with second part
          if (parts[0] === 'client' && parts[1]) {
            return `${parts[0]}_${parts[1]}`;
          }
        }
      }
    }
    return null;
  };

  // Get client machines for a specific client
  const getClientMachines = (clientId) => {
    return dispensers.filter(d => d.client_id === clientId);
  };

  // Get SKU templates (machines without client_id)
  const getSKUTemplates = () => {
    return dispensers.filter(d => !d.client_id);
  };

  // Handle Add Machine to Client
  const handleAddMachine = async () => {
    if (!clientAccessView?.clientId || !addMachineForm.sku || !addMachineForm.unique_code) {
      alert('SKU and Unique Code are required');
      return;
    }

    try {
      // Find the SKU template
      const skuTemplate = getSKUTemplates().find(d => d.sku === addMachineForm.sku);
      
      if (!skuTemplate) {
        alert('SKU not found. Please ensure the SKU exists in the Machine SKU Management.');
        return;
      }

      if (!skuTemplate.ml_per_hour) {
        alert('Machine SKU must have ML Per Hour Usage defined.');
        return;
      }

      // Check for duplicate code - must be unique across ALL clients
      const duplicateCode = dispensers.find(d => d.unique_code === addMachineForm.unique_code);
      if (duplicateCode) {
        const existingClient = clients.find(c => c.id === duplicateCode.client_id);
        alert(`Code "${addMachineForm.unique_code}" already exists for client "${existingClient?.name || duplicateCode.client_id}". Each machine code must be unique across all clients.`);
        return;
      }

      // Create machine instance
      const machineData = {
        ...skuTemplate,
        id: `disp_${Date.now()}`,
        name: skuTemplate.sku,
        client_id: clientAccessView.clientId,
        unique_code: addMachineForm.unique_code,
        location: addMachineForm.location || '',
        status: 'assigned',
        current_schedule_id: null,
        current_level_ml: 0,
        last_refill_date: null,
        ml_per_hour: skuTemplate.ml_per_hour,
        refill_capacity_ml: skuTemplate.refill_capacity_ml,
        sku: skuTemplate.sku,
      };

      await createDispenser(machineData);
      await loadData();
      setAddMachineDialogOpen(false);
      setAddMachineForm({
        sku: '',
        unique_code: '',
        location: '',
        status: 'assigned',
      });
      alert('Machine added to client successfully!');
    } catch (err) {
      console.error('Error adding machine:', err);
      alert('Error adding machine: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  // Handle Create Installation
  const handleCreateInstallation = async () => {
    if (!clientAccessView?.clientId || !installationForm.sku || !installationForm.location || !installationForm.unique_code) {
      alert('SKU, Location, and Unique Code are required');
      return;
    }

    try {
      // Find the SKU template
      const skuTemplate = getSKUTemplates().find(d => d.sku === installationForm.sku);
      
      if (!skuTemplate) {
        alert('SKU template not found. Please ensure the SKU exists.');
        return;
      }

      if (!skuTemplate.ml_per_hour) {
        alert('Machine SKU must have ML Per Hour Usage defined.');
        return;
      }

      // Find if there's an assigned machine with this code for THIS client
      let assignedMachine = dispensers.find(d => 
        d.unique_code === installationForm.unique_code && 
        d.client_id === clientAccessView.clientId &&
        d.status === 'assigned'
      );

      // Check if code already exists for a DIFFERENT client
      const existingMachineWithCode = dispensers.find(d => 
        d.unique_code === installationForm.unique_code && 
        d.client_id !== clientAccessView.clientId
      );

      if (existingMachineWithCode && !assignedMachine) {
        const existingClient = clients.find(c => c.id === existingMachineWithCode.client_id);
        alert(`Code "${installationForm.unique_code}" already exists for client "${existingClient?.name || existingMachineWithCode.client_id}". Each machine code must be unique across all clients.`);
        return;
      }

      // Ensure installation_date is always set - use form value or default to current date
      const installationDate = installationForm.installation_date && installationForm.installation_date.trim() !== '' 
        ? installationForm.installation_date 
        : getCurrentISTISO();
      
      const installationData = {
        ...skuTemplate,
        id: assignedMachine ? assignedMachine.id : `disp_${Date.now()}`,
        name: skuTemplate.sku,
        client_id: clientAccessView.clientId,
        unique_code: installationForm.unique_code,
        location: installationForm.location,
        status: 'installed',
        current_schedule_id: installationForm.schedule_id || null,
        current_level_ml: installationForm.refill_amount_ml || 0,
        last_refill_date: installationForm.last_refill_date || getCurrentISTISO(),
        installation_date: installationDate, // Always set installation date
        ml_per_hour: skuTemplate.ml_per_hour,
        refill_capacity_ml: skuTemplate.refill_capacity_ml,
        sku: skuTemplate.sku,
      };

      if (assignedMachine) {
        // Update existing assigned machine to installed
        await updateDispenser(assignedMachine.id, installationData);
      } else {
        // Check for duplicate code (should not happen if validation above works, but double-check)
        const duplicateCode = dispensers.find(d => d.unique_code === installationForm.unique_code);
        if (duplicateCode) {
          const existingClient = clients.find(c => c.id === duplicateCode.client_id);
          alert(`Code "${installationForm.unique_code}" already exists for client "${existingClient?.name || duplicateCode.client_id}". Each machine code must be unique across all clients.`);
          return;
        }
        // Create new installation
        await createDispenser(installationData);
      }

      await loadData();
      setInstallationDialogOpen(false);
      setInstallationForm({
        location: '',
        sku: '',
        unique_code: '',
        status: 'installed',
        ml_per_hour: '',
        schedule_id: '',
        refill_amount_ml: 0,
        last_refill_date: null,
        installation_date: null,
      });
      alert('Installation created successfully!');
    } catch (err) {
      console.error('Error creating installation:', err);
      alert('Error creating installation: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleAddTimeRange = () => {
    setCustomScheduleForm({
      ...customScheduleForm,
      time_ranges: [
        ...customScheduleForm.time_ranges,
        { start_time: '00:00', end_time: '23:59', spray_seconds: 20, pause_seconds: 40 },
      ],
    });
  };

  const handleRemoveTimeRange = (index) => {
    setCustomScheduleForm({
      ...customScheduleForm,
      time_ranges: customScheduleForm.time_ranges.filter((_, i) => i !== index),
    });
  };

  const handleTimeRangeChange = (index, field, value) => {
    const newTimeRanges = [...customScheduleForm.time_ranges];
    if (field === 'spray_seconds' || field === 'pause_seconds') {
      newTimeRanges[index][field] = parseInt(value) || 0;
    } else {
      newTimeRanges[index][field] = value;
    }
    setCustomScheduleForm({ ...customScheduleForm, time_ranges: newTimeRanges });
  };

  const handleAddInterval = () => {
    setCustomScheduleForm({
      ...customScheduleForm,
      intervals: [...customScheduleForm.intervals, { spray_seconds: 20, pause_seconds: 40 }],
    });
  };

  const handleRemoveInterval = (index) => {
    setCustomScheduleForm({
      ...customScheduleForm,
      intervals: customScheduleForm.intervals.filter((_, i) => i !== index),
    });
  };

  const handleIntervalChange = (index, field, value) => {
    const newIntervals = [...customScheduleForm.intervals];
    newIntervals[index][field] = parseInt(value) || 0;
    setCustomScheduleForm({ ...customScheduleForm, intervals: newIntervals });
  };

  const handleDayToggle = (day) => {
    const currentDays = customScheduleForm.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    setCustomScheduleForm({ ...customScheduleForm, days_of_week: newDays });
  };

  const handleCreateCustomSchedule = async () => {
    if (!customScheduleForm.name.trim()) {
      alert('Schedule name is required');
      return;
    }

    try {
      let scheduleData;
      
      if (customScheduleForm.scheduleType === 'time_based') {
        if (customScheduleForm.time_ranges.length === 0) {
          alert('At least one time range is required');
          return;
        }
        scheduleData = {
          name: customScheduleForm.name.trim(),
          type: 'custom',
          time_ranges: customScheduleForm.time_ranges.map((tr) => ({
            start_time: tr.start_time,
            end_time: tr.end_time,
            spray_seconds: parseInt(tr.spray_seconds) || 0,
            pause_seconds: parseInt(tr.pause_seconds) || 0,
          })),
        };
        if (customScheduleForm.ml_per_hour) {
          scheduleData.ml_per_hour = parseFloat(customScheduleForm.ml_per_hour) || null;
        }
      } else {
        if (customScheduleForm.intervals.length === 0) {
          alert('At least one interval is required');
          return;
        }
        scheduleData = {
          name: customScheduleForm.name.trim(),
          type: 'custom',
          intervals: customScheduleForm.intervals.map((i) => ({
            spray_seconds: parseInt(i.spray_seconds) || 0,
            pause_seconds: parseInt(i.pause_seconds) || 0,
          })),
          duration_minutes: parseInt(customScheduleForm.duration_minutes) || 60,
          daily_cycles: parseInt(customScheduleForm.daily_cycles) || 1,
        };
        if (customScheduleForm.ml_per_hour) {
          scheduleData.ml_per_hour = parseFloat(customScheduleForm.ml_per_hour) || null;
        }
      }

      // Add days_of_week if not all days selected
      if (customScheduleForm.days_of_week && customScheduleForm.days_of_week.length < 7) {
        scheduleData.days_of_week = customScheduleForm.days_of_week;
      }

      const created = await createSchedule(scheduleData);

      // Refresh schedules and pre-select the newly created one
      const schedulesData = await getSchedules();
      setSchedules(schedulesData);
      setInstallationForm({
        ...installationForm,
        schedule_id: created?.id || '',
      });

      // Reset form
      setCustomScheduleForm({
        name: '',
        type: 'custom',
        scheduleType: 'time_based',
        duration_minutes: 120,
        daily_cycles: 1,
        ml_per_hour: '',
        intervals: [{ spray_seconds: 20, pause_seconds: 40 }],
        time_ranges: [
          { start_time: '00:00', end_time: '06:00', spray_seconds: 20, pause_seconds: 40 },
          { start_time: '06:00', end_time: '12:00', spray_seconds: 30, pause_seconds: 30 },
          { start_time: '12:00', end_time: '15:00', spray_seconds: 50, pause_seconds: 20 },
          { start_time: '15:00', end_time: '23:55', spray_seconds: 100, pause_seconds: 10 },
        ],
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
      });
      setCustomScheduleDialogOpen(false);
      alert('Custom schedule created and selected.');
    } catch (err) {
      console.error('Error creating schedule:', err);
      alert(err.response?.data?.detail || 'Error creating custom schedule');
    }
  };

  const handleRefillClick = (dispenser = null) => {
    // Always show code entry dialog first
    // Pre-fill code if dispenser is provided (from table/assignment)
    if (dispenser && dispenser.unique_code) {
      setRefillUniqueCode(dispenser.unique_code);
    } else {
      setRefillUniqueCode('');
    }
    setSelectedDispenser(null);
    setFragranceCode('');
    setRefillAmount('');
    setNotes('');
    setRefillCodeEntryDialogOpen(true);
  };

  const handleRefillCodeEntry = () => {
    if (!refillUniqueCode || refillUniqueCode.trim() === '') {
      alert('Please enter or scan the machine unique code');
      return;
    }

    // Find machine by unique code
    const machine = dispensers.find(d => 
      d.unique_code && d.unique_code.toUpperCase().trim() === refillUniqueCode.toUpperCase().trim()
    );

    if (!machine) {
      alert(`Machine with code "${refillUniqueCode}" not found. Please check the code and try again.`);
      setRefillUniqueCode('');
      return;
    }

    // Check if machine is installed
    if (machine.status !== 'installed' && (!machine.status || machine.status === 'assigned')) {
      alert(`Machine "${refillUniqueCode}" is not installed yet. Please install the machine first.`);
      setRefillUniqueCode('');
      return;
    }

    // Capture level_before_refill when opening refill dialog (Step 1)
    // Use the calculated current level (accounts for usage since last refill)
    // This shows the ACTUAL current level (41.4 ml), not the stored level after last refill (500 ml)
    const actualCurrentLevel = calculateCurrentLevel(machine);
    console.log('Capturing level_before_refill:', {
      stored_level: machine.current_level_ml,
      calculated_level: actualCurrentLevel,
      machine_id: machine.id,
      last_refill_date: machine.last_refill_date,
      current_schedule_id: machine.current_schedule_id,
      usageData: usageData[machine.id]
    });
    
    // Ensure we capture a valid value (not 0 unless machine is actually empty)
    if (actualCurrentLevel !== null && actualCurrentLevel !== undefined) {
      setLevelBeforeRefill(actualCurrentLevel);
    } else {
      // Fallback to stored level if calculation fails
      console.warn('calculateCurrentLevel returned null/undefined, using stored level:', machine.current_level_ml);
      setLevelBeforeRefill(machine.current_level_ml || 0);
    }
    
    // Set selected machine and open refill dialog
    setSelectedDispenser(machine);
    setFragranceCode(''); // Fragrance code is separate from SKU, don't pre-fill
    setRefillAmount('');
    setNotes('');
    setRefillCodeEntryDialogOpen(false);
    setRefillDialogOpen(true);
  };

  const handleRefillSubmit = async () => {
    try {
      if (!fragranceCode || fragranceCode.trim() === '') {
        alert('Please enter the fragrance code');
        return;
      }

      if (!refillAmount || parseFloat(refillAmount) <= 0) {
        alert('Please enter a valid refill amount');
        return;
      }

      const refillAmountValue = parseFloat(refillAmount);
      const maxCapacity = selectedDispenser.refill_capacity_ml || 0;
      
      // Use the captured level_before_refill (calculated current level accounting for usage)
      // Always recalculate to ensure we have the latest value, but use captured value if available and valid
      let levelBeforeRefillValue;
      const recalculatedLevel = calculateCurrentLevel(selectedDispenser);
      
      if (levelBeforeRefill !== null && levelBeforeRefill !== undefined && levelBeforeRefill > 0) {
        // Use captured value if it's valid (> 0)
        levelBeforeRefillValue = levelBeforeRefill;
        console.log('Using captured level_before_refill:', levelBeforeRefillValue);
      } else {
        // Use recalculated value if captured value is 0, null, or undefined
        levelBeforeRefillValue = recalculatedLevel;
        console.log('Using recalculated level_before_refill (captured was invalid):', levelBeforeRefillValue);
      }
      
      // Final fallback: if still 0 or invalid, use stored current_level_ml
      if (levelBeforeRefillValue === 0 || levelBeforeRefillValue === null || levelBeforeRefillValue === undefined || isNaN(levelBeforeRefillValue)) {
        levelBeforeRefillValue = selectedDispenser.current_level_ml || 0;
        console.log('Using stored current_level_ml as final fallback:', levelBeforeRefillValue);
      }
      
      // Check if adding this amount would exceed capacity
      const totalAfterRefill = levelBeforeRefillValue + refillAmountValue;
      if (totalAfterRefill > maxCapacity) {
        const maxAllowed = maxCapacity - levelBeforeRefillValue;
        alert(`Cannot add ${refillAmountValue} ml. Current level is ${levelBeforeRefillValue.toFixed(1)} ml. Maximum you can add is ${maxAllowed.toFixed(1)} ml (total capacity: ${maxCapacity} ml)`);
        return;
      }
      
      if (refillAmountValue > maxCapacity) {
        alert(`Refill amount cannot exceed maximum capacity of ${maxCapacity} ml`);
        return;
      }
      
      // Warn if already at or near capacity
      if (levelBeforeRefillValue >= maxCapacity) {
        alert(`Machine is already at maximum capacity (${maxCapacity} ml). Cannot add more.`);
        return;
      }

      const refillTimestamp = getCurrentISTISO();
      
      // Calculate current_ml_refill (Step 3): level_before_refill + adding_ml_refill
      const currentMlRefill = Math.min(
        levelBeforeRefillValue + refillAmountValue,
        selectedDispenser.refill_capacity_ml || 0
      );
      
      // Combine fragrance code with notes if notes exist
      const combinedNotes = fragranceCode 
        ? (notes ? `Fragrance Code: ${fragranceCode}\n${notes}` : `Fragrance Code: ${fragranceCode}`)
        : (notes || null);
      
      const refillData = {
        dispenser_id: selectedDispenser.id,
        technician_username: user.username,
        refill_amount_ml: refillAmountValue, // This is "adding_ml_refill"
        level_before_refill: levelBeforeRefillValue, // Send calculated level before refill (accounts for usage)
        current_ml_refill: currentMlRefill,
        fragrance_code: fragranceCode,
        client_id: selectedDispenser.client_id || null,
        machine_unique_code: selectedDispenser.unique_code || null,
        location: selectedDispenser.location || null,
        installation_date: selectedDispenser.installation_date || null,
        timestamp: refillTimestamp,
        notes: combinedNotes,
      };
      
      // Debug log
      console.log('Refill Data being sent:', {
        level_before_refill: refillData.level_before_refill,
        level_before_refill_state: levelBeforeRefill,
        level_before_refill_value: levelBeforeRefillValue,
        adding_ml_refill: refillData.refill_amount_ml,
        current_ml_refill: refillData.current_ml_refill,
        selectedDispenser_current_level: selectedDispenser.current_level_ml,
        calculated_current_level: calculateCurrentLevel(selectedDispenser)
      });

      await logRefill(selectedDispenser.id, refillData);
      
      // Reset form
      setRefillAmount('');
      setFragranceCode('');
      setNotes('');
      setLevelBeforeRefill(null);
      setSelectedDispenser(null);
      setRefillDialogOpen(false);
      
      setSuccess('Refill logged successfully!');
      loadData(); // This will refresh all data including refill logs count
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error logging refill:', err);
      alert('Error logging refill: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleCompleteTask = async () => {
    try {
      await completeAssignment(selectedAssignment.id, { notes: completionNotes });
      setSuccess('Task completed successfully!');
      setCompleteDialogOpen(false);
      setSelectedAssignment(null);
      setCompletionNotes('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error completing task:', err);
      alert('Error completing task: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const getLevelColor = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage < 20) return 'error';
    if (percentage < 50) return 'warning';
    return 'success';
  };

  // Filter assignments by date
  const filteredAssignments = filterDate
    ? assignments.filter(a => {
        const assignedDate = a.assigned_date?.split('T')[0];
        const visitDate = a.visit_date?.split('T')[0];
        return assignedDate === filterDate || visitDate === filterDate;
      })
    : assignments;

  // Get pending assignments (tasks to do) - includes both 'pending' and 'assigned' status
  const pendingAssignments = filteredAssignments.filter(a => a.status === 'pending' || a.status === 'assigned');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar 
        user={user} 
        logout={logout} 
        role="technician" 
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', md: `calc(100% - 260px)` },
          mt: { xs: 7, md: 0 },
        }}
      >
        {/* Mobile App Bar */}
        <AppBar
          position="fixed"
          sx={{
            display: { xs: 'flex', md: 'none' },
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Technician Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ mt: { xs: 0, md: 2 }, mb: 4 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Client Access View for Installation Tasks - Shows above all other views */}
              {clientAccessView ? (
                <Box>
                  <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => setClientAccessView(null)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <ArrowBack />
                    </IconButton>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 0.5, color: 'text.primary', fontSize: '2rem' }}>
                        Client Access
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getClientName(clientAccessView.clientId)}
                      </Typography>
                    </Box>
                  </Box>

                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                      <Tabs value={clientAccessTab} onChange={(e, newValue) => setClientAccessTab(newValue)}>
                        <Tab label="Client" icon={<Business />} iconPosition="start" />
                        <Tab label="Installed" icon={<Devices />} iconPosition="start" />
                      </Tabs>
                    </Box>

                    <CardContent sx={{ p: 3 }}>
                      {/* Client Tab */}
                      {clientAccessTab === 0 && (() => {
                        const client = clients.find(c => c.id === clientAccessView.clientId);
                        if (!client) {
                          return (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                              <Typography color="text.secondary">Client not found</Typography>
                            </Box>
                          );
                        }
                        return (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                              <Button
                                variant="outlined"
                                startIcon={editingClient ? <Visibility /> : <Edit />}
                                onClick={() => {
                                  if (editingClient) {
                                    setEditingClient(null);
                                  } else {
                                    setEditingClient(client);
                                    setClientForm({
                                      name: client.name || '',
                                      contact_person: client.contact_person || '',
                                      email: client.email || '',
                                      phone: client.phone || '',
                                      address: client.address || '',
                                    });
                                  }
                                }}
                              >
                                {editingClient ? 'View' : 'Edit'}
                              </Button>
                            </Box>

                            {editingClient ? (
                              <Box sx={{ maxWidth: 600 }}>
                                <TextField
                                  fullWidth
                                  label="Client Name"
                                  value={clientForm.name}
                                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                                  margin="normal"
                                  required
                                />
                                <TextField
                                  fullWidth
                                  label="Contact Person"
                                  value={clientForm.contact_person}
                                  onChange={(e) => setClientForm({ ...clientForm, contact_person: e.target.value })}
                                  margin="normal"
                                />
                                <TextField
                                  fullWidth
                                  label="Email"
                                  type="email"
                                  value={clientForm.email}
                                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                                  margin="normal"
                                />
                                <TextField
                                  fullWidth
                                  label="Phone"
                                  value={clientForm.phone}
                                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                                  margin="normal"
                                />
                                <TextField
                                  fullWidth
                                  label="Address"
                                  multiline
                                  rows={3}
                                  value={clientForm.address}
                                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                                  margin="normal"
                                />
                                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                  <Button
                                    variant="contained"
                                    onClick={async () => {
                                      try {
                                        await updateClient(client.id, clientForm);
                                        await loadData();
                                        setEditingClient(null);
                                        alert('Client updated successfully!');
                                      } catch (err) {
                                        alert('Error updating client: ' + (err.response?.data?.detail || 'Unknown error'));
                                      }
                                    }}
                                  >
                                    Save Changes
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    onClick={() => {
                                      setEditingClient(null);
                                      setClientForm({
                                        name: '',
                                        contact_person: '',
                                        email: '',
                                        phone: '',
                                        address: '',
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Client Name
                                  </Typography>
                                  <Typography variant="body1" sx={{ mb: 2 }}>
                                    {client.name || '-'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Contact Person
                                  </Typography>
                                  <Typography variant="body1" sx={{ mb: 2 }}>
                                    {client.contact_person || '-'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Email
                                  </Typography>
                                  <Typography variant="body1" sx={{ mb: 2 }}>
                                    {client.email || '-'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Phone
                                  </Typography>
                                  <Typography variant="body1" sx={{ mb: 2 }}>
                                    {client.phone || '-'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Address
                                  </Typography>
                                  <Typography variant="body1">
                                    {client.address || '-'}
                                  </Typography>
                                </Grid>
                              </Grid>
                            )}
                          </Box>
                        );
                      })()}

                      {/* Installed Tab */}
                      {clientAccessTab === 1 && (() => {
                        const clientMachines = getClientMachines(clientAccessView.clientId);
                        return (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6">Installed Machines ({clientMachines.length})</Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="outlined"
                                  startIcon={<Add />}
                                  onClick={() => {
                                    setAddMachineForm({
                                      sku: '',
                                      unique_code: '',
                                      location: '',
                                      status: 'assigned',
                                    });
                                    setAddMachineDialogOpen(true);
                                  }}
                                >
                                  Add Machine
                                </Button>
                                <Button
                                  variant="contained"
                                  startIcon={<Devices />}
                                  onClick={async () => {
                                    // Refresh schedules to include any newly created custom schedules
                                    try {
                                      const schedulesData = await getSchedules();
                                      setSchedules(schedulesData);
                                    } catch (err) {
                                      console.error('Error refreshing schedules:', err);
                                    }
                                    setInstallationForm({
                                      location: '',
                                      sku: '',
                                      unique_code: '',
                                      status: 'installed',
                                      ml_per_hour: '',
                                      schedule_id: '',
                                      refill_amount_ml: 0,
                                      last_refill_date: null,
                                      installation_date: null,
                                    });
                                    setInstallationDialogOpen(true);
                                  }}
                                >
                                  Create Installation
                                </Button>
                              </Box>
                            </Box>

                            {clientMachines.length === 0 ? (
                              <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                <Typography color="text.secondary">No installed machines found</Typography>
                              </Box>
                            ) : (
                              <ResponsiveTable
                                columns={[
                                  { 
                                    id: 'unique_code', 
                                    label: 'Machine Code',
                                    render: (value) => (
                                      <Typography variant="body2" fontWeight={500}>
                                        {value || '-'}
                                      </Typography>
                                    ),
                                    bold: true,
                                  },
                                  { 
                                    id: 'sku', 
                                    label: 'SKU',
                                    render: (value) => (
                                      <Chip label={value || 'N/A'} size="small" variant="outlined" />
                                    ),
                                  },
                                  { id: 'location', label: 'Location' },
                                  { 
                                    id: 'status', 
                                    label: 'Status',
                                    render: (value) => (
                                      <Chip
                                        label={value === 'installed' ? 'Installed' : value === 'assigned' ? 'Assigned' : value || 'N/A'}
                                        size="small"
                                        color={value === 'installed' ? 'success' : value === 'assigned' ? 'info' : 'default'}
                                      />
                                    ),
                                  },
                                  { id: 'refill_capacity_ml', label: 'Capacity (ml)' },
                                  { id: 'current_level_ml', label: 'Current Level (ml)' },
                                ]}
                                data={clientMachines}
                                renderActions={(machine) => (
                                  <>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setViewingDispenser(machine);
                                        setEditingDispenser(null);
                                      }}
                                    >
                                      <Visibility fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        setEditingDispenser(machine);
                                        setViewingDispenser(null);
                                        setDispenserForm({
                                          name: machine.name || '',
                                          sku: machine.sku || '',
                                          location: machine.location || '',
                                          refill_capacity_ml: machine.refill_capacity_ml || 500,
                                          ml_per_hour: machine.ml_per_hour || 2.0,
                                          unique_code: machine.unique_code || '',
                                        });
                                      }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              />
                            )}
                          </Box>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <>
              {/* Dashboard View */}
              {activeTab === null && (
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                      Technician Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      Welcome back, {user?.username}! Here's your activity overview.
          </Typography>
                  </Box>

                  {/* Date Filter */}
                  <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CalendarMonth sx={{ color: 'primary.main' }} />
                    <TextField
                      type="date"
                      label="Filter by Date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      sx={{ width: 200 }}
                    />
                    {filterDate && (
                      <Button size="small" onClick={() => setFilterDate('')}>
                        Clear Filter
                      </Button>
                    )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
                      onClick={loadData}
                      sx={{ ml: 'auto' }}
          >
            Refresh
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

                  {/* KPI Cards */}
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card 
                        elevation={0} 
                        sx={{ 
                          height: '100%',
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
                          border: '1px solid rgba(25, 118, 210, 0.12)',
                          '&:hover': { boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)' }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography color="text.secondary" variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>
                                Machines Assigned
                              </Typography>
                              <Typography variant="h3" sx={{ fontWeight: 300, color: 'primary.main', fontSize: '2.5rem' }}>
                                {stats?.machines_assigned || 0}
                              </Typography>
                            </Box>
                            <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1.5 }}>
                              <Assignment sx={{ fontSize: 28, color: 'white' }} />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card 
                        elevation={0} 
                        sx={{ 
                          height: '100%',
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%)',
                          border: '1px solid rgba(46, 125, 50, 0.12)',
                          '&:hover': { boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)' }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography color="text.secondary" variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>
                                Refills Completed
                              </Typography>
                              <Typography variant="h3" sx={{ fontWeight: 300, color: 'success.main', fontSize: '2.5rem' }}>
                                {stats?.refills_completed || 0}
                              </Typography>
                            </Box>
                            <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1.5 }}>
                              <CheckCircle sx={{ fontSize: 28, color: 'white' }} />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card 
                        elevation={0} 
                        sx={{ 
                          height: '100%',
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #ffffff 0%, #fff3e0 100%)',
                          border: '1px solid rgba(237, 108, 2, 0.12)',
                          '&:hover': { boxShadow: '0 4px 12px rgba(237, 108, 2, 0.15)' }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography color="text.secondary" variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>
                                Pending Refills
                              </Typography>
                              <Typography variant="h3" sx={{ fontWeight: 300, color: 'warning.main', fontSize: '2.5rem' }}>
                                {stats?.pending_refills || 0}
                              </Typography>
                            </Box>
                            <Box sx={{ bgcolor: 'warning.main', borderRadius: 2, p: 1.5 }}>
                              <PendingActions sx={{ fontSize: 28, color: 'white' }} />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Card 
                        elevation={0} 
                        sx={{ 
                          height: '100%',
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #ffffff 0%, #f3e5f5 100%)',
                          border: '1px solid rgba(156, 39, 176, 0.12)',
                          '&:hover': { boxShadow: '0 4px 12px rgba(156, 39, 176, 0.15)' }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography color="text.secondary" variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1 }}>
                                Count of Visits
                              </Typography>
                              <Typography variant="h3" sx={{ fontWeight: 300, color: '#9c27b0', fontSize: '2.5rem' }}>
                                {stats?.visit_count || 0}
                              </Typography>
                            </Box>
                            <Box sx={{ bgcolor: '#9c27b0', borderRadius: 2, p: 1.5 }}>
                              <DirectionsWalk sx={{ fontSize: 28, color: 'white' }} />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Tasks Assigned by Admin */}
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Assignment sx={{ mr: 1.5, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          Tasks Assigned by Admin
                        </Typography>
                        <Chip 
                          label={`${pendingAssignments.length} Pending`} 
                          size="small" 
                          color="warning" 
                          sx={{ ml: 2 }}
                        />
                      </Box>

                      {pendingAssignments.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2, opacity: 0.5 }} />
                          <Typography color="text.secondary" variant="body1">
                            No pending tasks! Great job!
                          </Typography>
          </Box>
        ) : (
                        <ResponsiveTable
                          columns={[
                            { 
                              id: 'client', 
                              label: 'Client',
                              render: (_, assignment) => {
                                const dispenser = getDispenserDetails(assignment.dispenser_id);
                                const installationClientId = assignment.task_type === 'installation' 
                                  ? getClientIdFromInstallationTask(assignment) 
                                  : null;
                                const clientId = installationClientId || dispenser?.client_id;
                                return (
                                  <Typography variant="body2" fontWeight={500}>
                                    {getClientName(clientId)}
                                  </Typography>
                                );
                              },
                              bold: true,
                            },
                            { 
                              id: 'location', 
                              label: 'Location',
                              render: (_, assignment) => {
                                const dispenser = getDispenserDetails(assignment.dispenser_id);
                                const isInstallation = assignment.task_type === 'installation';
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {!isInstallation && <LocationOn fontSize="small" color="action" />}
                                    <Typography variant="body2">
                                      {isInstallation ? 'Installation Task' : (dispenser?.location || '-')}
                                    </Typography>
                                  </Box>
                                );
                              },
                            },
                            { 
                              id: 'machine', 
                              label: 'Machine',
                              render: (_, assignment) => {
                                const dispenser = getDispenserDetails(assignment.dispenser_id);
                                const isInstallation = assignment.task_type === 'installation';
                                return (
                                  <Chip 
                                    label={isInstallation ? 'Installation' : (dispenser?.sku || dispenser?.unique_code || 'N/A')} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                );
                              },
                            },
                            { 
                              id: 'task_type', 
                              label: 'Task Type',
                              render: (value) => (
                                <Chip 
                                  label={value?.charAt(0).toUpperCase() + value?.slice(1) || 'Refill'} 
                                  size="small" 
                                  color={value === 'maintenance' ? 'secondary' : 'primary'}
                                  variant="outlined"
                                />
                              ),
                            },
                            { 
                              id: 'assigned_date', 
                              label: 'Assigned Date',
                              render: (value) => formatDateIST(value),
                            },
                            { 
                              id: 'visit_date', 
                              label: 'Visit Date',
                              render: (value) => formatDateIST(value),
                            },
                            { 
                              id: 'status', 
                              label: 'Status',
                              render: (value) => (
                                <Chip 
                                  label={
                                    value === 'completed' ? 'Completed' :
                                    value === 'assigned' ? 'Assigned & Pending' :
                                    value === 'cancelled' ? 'Cancelled' : 'Pending'
                                  }
                                  size="small" 
                                  color={
                                    value === 'completed' ? 'success' :
                                    value === 'assigned' ? 'info' :
                                    value === 'cancelled' ? 'error' : 'warning'
                                  }
                                />
                              ),
                            },
                          ]}
                          data={pendingAssignments}
                          renderActions={(assignment) => {
                            const dispenser = getDispenserDetails(assignment.dispenser_id);
                            const isInstallation = assignment.task_type === 'installation';
                            
                            if (isInstallation) {
                              return (
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      const clientId = getClientIdFromInstallationTask(assignment);
                                      if (clientId) {
                                        setClientAccessView({ clientId, assignmentId: assignment.id });
                                        setClientAccessTab(0);
                                      }
                                    }}
                                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                    startIcon={<Business />}
                                  >
                                    Client Access
                                  </Button>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="success"
                                    startIcon={<Done />}
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setCompletionNotes('');
                                      setCompleteDialogOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                  >
                                    Complete
                                  </Button>
                                </Box>
                              );
                            }
                            
                            return (
                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="success"
                                  startIcon={<Done />}
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setCompletionNotes('');
                                    setCompleteDialogOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                >
                                  Complete
                                </Button>
                                {dispenser && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PlayArrow />}
                                    onClick={() => handleRefillClick(dispenser)}
                                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                  >
                                    Refill
                                  </Button>
                                )}
                              </Box>
                            );
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* Installed Machines Tab */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                      Installed Machines
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      View all installed machines and their current status
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={loadData}
                    >
                      Refresh
                    </Button>
                  </Box>

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                      {success}
                    </Alert>
                  )}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
                    {dispensers
                      .filter(d => d.client_id && (d.status === 'installed' || (!d.status && d.location)))
                      .map((dispenser) => {
                        const schedule = schedules.find(s => s.id === dispenser.current_schedule_id);
                        const dailyUsage = usageData[dispenser.id]?.daily_usage_ml || 0;
                        
                        return (
                          <Card key={dispenser.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                    {dispenser.name || dispenser.sku}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                                      {dispenser.location || 'No Location'}
                        </Typography>
                      </Box>
                      {dispenser.sku && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Inventory fontSize="small" color="action" />
                          <Chip label={dispenser.sku} size="small" variant="outlined" />
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Client: {getClientName(dispenser.client_id)}
                      </Typography>
                    </Box>
                                <Chip 
                                  label="Installed" 
                                  size="small" 
                                  color="success"
                                  variant="outlined"
                                />
                  </Box>
                              
                              {schedule && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                  Schedule: {schedule.name}
                                </Typography>
                              )}
                              
                              {dailyUsage > 0 && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                  Daily Usage: {dailyUsage.toFixed(2)} ml
                                </Typography>
                              )}
                              
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {dispenser.current_level_ml?.toFixed(1) || 0} / {dispenser.refill_capacity_ml} ml
                      </Typography>
                      <Chip
                        label={`${((dispenser.current_level_ml / dispenser.refill_capacity_ml) * 100).toFixed(0)}%`}
                        size="small"
                        color={getLevelColor(dispenser.current_level_ml, dispenser.refill_capacity_ml)}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(dispenser.current_level_ml / dispenser.refill_capacity_ml) * 100}
                      color={getLevelColor(dispenser.current_level_ml, dispenser.refill_capacity_ml)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                              
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                                Last Refill: {formatDateIST(dispenser.last_refill_date)}
                              </Typography>
                              
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleRefillClick(dispenser)}
                                sx={{ mt: 1 }}
                  >
                    Log Refill
                  </Button>
                </CardContent>
              </Card>
                        );
                      })}
                  </Box>
                  
                  {dispensers.filter(d => d.client_id && (d.status === 'installed' || (!d.status && d.location))).length === 0 && (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                      <Typography color="text.secondary" variant="body1">
                        No installed machines found
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Refill & Maintain Tab */}
              {activeTab === 1 && (
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                      Refill & Maintain
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      Manage refills and maintenance tasks for assigned machines
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={loadData}
                    >
                      Refresh
                    </Button>
                  </Box>

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                      {success}
                    </Alert>
                  )}

                  {/* All Assignments Table */}
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Build sx={{ mr: 1.5, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          All Tasks
                        </Typography>
                      </Box>

                      {assignments.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                          <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                          <Typography color="text.secondary" variant="body1">
                            No tasks assigned yet
                          </Typography>
                        </Box>
                      ) : (
                        <ResponsiveTable
                          columns={[
                            { 
                              id: 'client', 
                              label: 'Client',
                              render: (_, assignment) => {
                                const dispenser = getDispenserDetails(assignment.dispenser_id);
                                const installationClientId = assignment.task_type === 'installation' 
                                  ? getClientIdFromInstallationTask(assignment) 
                                  : null;
                                const clientId = installationClientId || dispenser?.client_id;
                                return (
                                  <Typography variant="body2" fontWeight={500}>
                                    {getClientName(clientId)}
                                  </Typography>
                                );
                              },
                              bold: true,
                            },
                            { 
                              id: 'location', 
                              label: 'Location',
                              render: (_, assignment) => {
                                const dispenser = getDispenserDetails(assignment.dispenser_id);
                                return (
                                  <Typography variant="body2">
                                    {assignment.task_type === 'installation' ? 'Installation Task' : (dispenser?.location || '-')}
                                  </Typography>
                                );
                              },
                            },
                            { 
                              id: 'machine', 
                              label: 'Machine',
                              render: (_, assignment) => {
                                const dispenser = getDispenserDetails(assignment.dispenser_id);
                                return (
                                  <Chip 
                                    label={assignment.task_type === 'installation' ? 'Installation' : (dispenser?.sku || dispenser?.unique_code || 'N/A')} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                );
                              },
                            },
                            { 
                              id: 'task_type', 
                              label: 'Task Type',
                              render: (value) => (
                                <Chip 
                                  label={value?.charAt(0).toUpperCase() + value?.slice(1) || 'Refill'} 
                                  size="small" 
                                  color={value === 'maintenance' ? 'secondary' : 'primary'}
                                  variant="outlined"
                                />
                              ),
                            },
                            { id: 'assigned_by', label: 'Assigned By' },
                            { 
                              id: 'assigned_date', 
                              label: 'Assigned Date',
                              render: (value) => formatDateIST(value),
                            },
                            { 
                              id: 'status', 
                              label: 'Status',
                              render: (value) => (
                                <Chip 
                                  label={
                                    value === 'completed' ? 'Completed' :
                                    value === 'assigned' ? 'Assigned & Pending' :
                                    value === 'cancelled' ? 'Cancelled' : 'Pending'
                                  }
                                  size="small" 
                                  color={
                                    value === 'completed' ? 'success' :
                                    value === 'assigned' ? 'info' :
                                    value === 'cancelled' ? 'error' : 'warning'
                                  }
                                />
                              ),
                            },
                          ]}
                          data={assignments.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date))}
                          renderActions={(assignment) => {
                            const dispenser = getDispenserDetails(assignment.dispenser_id);
                            
                            if (assignment.status === 'completed') {
                              return (
                                <Typography variant="body2" color="success.main">
                                  ✓ Done
                                </Typography>
                              );
                            }
                            
                            if (assignment.task_type === 'installation' && (assignment.status === 'pending' || assignment.status === 'assigned')) {
                              return (
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      const clientId = getClientIdFromInstallationTask(assignment);
                                      if (clientId) {
                                        setClientAccessView({ clientId, assignmentId: assignment.id });
                                        setClientAccessTab(0);
                                      }
                                    }}
                                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                    startIcon={<Business />}
                                  >
                                    Client Access
                                  </Button>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="success"
                                    startIcon={<Done />}
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setCompletionNotes('');
                                      setCompleteDialogOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                  >
                                    Complete
                                  </Button>
                                </Box>
                              );
                            }
                            
                            if (assignment.task_type !== 'installation' && (assignment.status === 'pending' || assignment.status === 'assigned')) {
                              return (
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setCompletionNotes('');
                                      setCompleteDialogOpen(true);
                                    }}
                                    sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                  >
                                    Complete
                                  </Button>
                                  {dispenser && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleRefillClick(dispenser)}
                                      sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                                    >
                                      Refill
                                    </Button>
                                  )}
                                </Box>
                              );
                            }
                            
                            return null;
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
          </Box>
              )}

              {/* Completed Tasks Tab */}
              {activeTab === 2 && (
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                      Completed Tasks
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      View all tasks you have completed
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={loadData}
                    >
                      Refresh
                    </Button>
                  </Box>

                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                      {success}
                    </Alert>
                  )}

                  {/* Completed Assignments Table */}
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <CheckCircle sx={{ mr: 1.5, color: 'success.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          My Completed Tasks ({assignments.filter(a => a.status === 'completed').length})
                        </Typography>
                      </Box>

                      {(() => {
                        const completedTasks = assignments.filter(a => a.status === 'completed');
                        return completedTasks.length === 0 ? (
                          <Box sx={{ py: 6, textAlign: 'center' }}>
                            <CheckCircle sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body1">
                              No completed tasks yet
                            </Typography>
                            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                              Complete tasks to see them here
                            </Typography>
                          </Box>
                        ) : (
                          <ResponsiveTable
                            columns={[
                              { 
                                id: 'client', 
                                label: 'Client',
                                render: (_, assignment) => {
                                  const dispenser = getDispenserDetails(assignment.dispenser_id);
                                  const installationClientId = assignment.task_type === 'installation' 
                                    ? getClientIdFromInstallationTask(assignment) 
                                    : null;
                                  const clientId = installationClientId || dispenser?.client_id;
                                  return (
                                    <Typography variant="body2" fontWeight={500}>
                                      {getClientName(clientId)}
                                    </Typography>
                                  );
                                },
                                bold: true,
                              },
                              { 
                                id: 'location', 
                                label: 'Location',
                                render: (_, assignment) => {
                                  const dispenser = getDispenserDetails(assignment.dispenser_id);
                                  const isInstallation = assignment.task_type === 'installation';
                                  return (
                                    <Typography variant="body2">
                                      {isInstallation ? 'Installation Task' : (dispenser?.location || '-')}
                                    </Typography>
                                  );
                                },
                              },
                              { 
                                id: 'machine', 
                                label: 'Machine',
                                render: (_, assignment) => {
                                  const dispenser = getDispenserDetails(assignment.dispenser_id);
                                  const isInstallation = assignment.task_type === 'installation';
                                  return (
                                    <Chip 
                                      label={isInstallation ? 'Installation' : (dispenser?.sku || dispenser?.unique_code || 'N/A')} 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  );
                                },
                              },
                              { 
                                id: 'task_type', 
                                label: 'Task Type',
                                render: (value) => (
                                  <Chip 
                                    label={value?.charAt(0).toUpperCase() + value?.slice(1) || 'Refill'} 
                                    size="small" 
                                    color={
                                      value === 'maintenance' ? 'secondary' :
                                      value === 'installation' ? 'info' : 'primary'
                                    }
                                    variant="outlined"
                                  />
                                ),
                              },
                              { id: 'assigned_by', label: 'Assigned By' },
                              { 
                                id: 'assigned_date', 
                                label: 'Assigned Date',
                                render: (value) => formatDateIST(value),
                              },
                              { 
                                id: 'completed_date', 
                                label: 'Completed Date',
                                render: (value) => (
                                  <Typography variant="body2" color="success.main" fontWeight={500}>
                                    {formatDateIST(value)}
                                  </Typography>
                                ),
                              },
                              { 
                                id: 'status', 
                                label: 'Status',
                                render: () => (
                                  <Chip 
                                    label="Completed"
                                    size="small" 
                                    color="success"
                                  />
                                ),
                              },
                              { 
                                id: 'notes', 
                                label: 'Notes',
                                render: (value) => (
                                  <Typography variant="body2" color="text.secondary" sx={{ 
                                    maxWidth: { xs: '100%', md: 200 }, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {value || '-'}
                                  </Typography>
                                ),
                              },
                            ]}
                            data={completedTasks.sort((a, b) => new Date(b.completed_date || b.assigned_date) - new Date(a.completed_date || a.assigned_date))}
                          />
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Box>
              )}
                </>
              )}
            </>
        )}
      </Container>

        {/* Refill Dialog */}
        <Dialog 
          open={refillDialogOpen} 
          onClose={() => setRefillDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Devices sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Log Refill - {selectedDispenser?.unique_code || selectedDispenser?.name || selectedDispenser?.sku}</Typography>
            </Box>
          </DialogTitle>
        <DialogContent>
            {selectedDispenser && (
              <>
                {/* Machine Details Section - Read Only */}
                <Box sx={{ mb: 3, p: 2.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                    Machine Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Machine Code
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {selectedDispenser.unique_code || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        SKU
                      </Typography>
                      <Chip label={selectedDispenser.sku || 'N/A'} size="small" variant="outlined" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Client
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {getClientName(selectedDispenser.client_id)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Location
                      </Typography>
                      <Typography variant="body1">
                        {selectedDispenser.location || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Installation Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDateIST(selectedDispenser.installation_date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Last Refill Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDateIST(selectedDispenser.last_refill_date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Capacity
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {selectedDispenser.refill_capacity_ml} ml
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        ML Per Hour
                      </Typography>
                      <Typography variant="body1">
                        {selectedDispenser.ml_per_hour} ml/hr
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Current Available Quantity
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1.5, border: '1px solid', borderColor: 'info.main' }}>
                        {(() => {
                          const calculatedLevel = calculateCurrentLevel(selectedDispenser);
                          const capacity = selectedDispenser.refill_capacity_ml || 0;
                          const percentage = capacity > 0 ? (calculatedLevel / capacity) * 100 : 0;
                          return (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Box>
                                  <Typography variant="h5" fontWeight={700} color="info.dark">
                                    {calculatedLevel.toFixed(1)} ml
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    out of {capacity} ml capacity
                                  </Typography>
                                </Box>
                                <Chip
                                  label={`${percentage.toFixed(0)}%`}
                                  size="medium"
                                  color={getLevelColor(calculatedLevel, capacity)}
                                  sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                                />
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={percentage}
                                color={getLevelColor(calculatedLevel, capacity)}
                                sx={{ height: 10, borderRadius: 1 }}
                              />
                            </>
                          );
                        })()}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Status
                      </Typography>
                      <Chip
                        label={selectedDispenser.status === 'installed' ? 'Installed' : selectedDispenser.status === 'assigned' ? 'Assigned' : selectedDispenser.status || 'N/A'}
                        size="small"
                        color={selectedDispenser.status === 'installed' ? 'success' : selectedDispenser.status === 'assigned' ? 'info' : 'default'}
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Divider */}
                <Box sx={{ my: 3, borderTop: 1, borderColor: 'divider' }} />

                {/* Refill Form Section */}
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                  Refill Details
                </Typography>
                
                {/* Level Before Refill Display (Step 1 - Captured when dialog opens) */}
                {levelBeforeRefill !== null && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1.5, border: '1px solid', borderColor: 'info.main' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Level Before Refill (Step 1 - Captured)
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="info.dark">
                      {levelBeforeRefill.toFixed(1)} ml
                    </Typography>
                  </Box>
                )}
              </>
            )}
          <TextField
            fullWidth
            label="Fragrance Code"
            value={fragranceCode}
            onChange={(e) => setFragranceCode(e.target.value.toUpperCase())}
            margin="normal"
            required
            placeholder="Enter fragrance code"
            helperText="Enter the fragrance code (different from SKU)"
          />
          <TextField
            fullWidth
            label="Adding ML Refill (Step 2)"
            type="number"
            value={refillAmount}
            onChange={(e) => setRefillAmount(e.target.value)}
            margin="normal"
            required
            inputProps={{ 
              min: 0, 
              step: 0.1, 
              max: levelBeforeRefill !== null 
                ? Math.max(0, (selectedDispenser?.refill_capacity_ml || 0) - (levelBeforeRefill || 0))
                : (selectedDispenser?.refill_capacity_ml || 9999)
            }}
            helperText={
              levelBeforeRefill !== null
                ? `Current: ${levelBeforeRefill.toFixed(1)} ml | Max you can add: ${Math.max(0, (selectedDispenser?.refill_capacity_ml || 0) - levelBeforeRefill).toFixed(1)} ml | Total capacity: ${selectedDispenser?.refill_capacity_ml || 0} ml`
                : `Maximum capacity: ${selectedDispenser?.refill_capacity_ml || 0} ml`
            }
          />
          
          {/* Current ML Refill Display (Step 3 - Calculated) */}
          {refillAmount && levelBeforeRefill !== null && (
            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1.5, border: '1px solid', borderColor: 'success.main' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Current ML Refill (Step 3 - Calculated)
              </Typography>
              <Typography variant="h6" fontWeight={600} color="success.dark">
                {Math.min(
                  (levelBeforeRefill || 0) + parseFloat(refillAmount || 0),
                  selectedDispenser?.refill_capacity_ml || 0
                ).toFixed(1)} ml
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Formula: {levelBeforeRefill.toFixed(1)} ml + {parseFloat(refillAmount || 0).toFixed(1)} ml = {Math.min(
                  (levelBeforeRefill || 0) + parseFloat(refillAmount || 0),
                  selectedDispenser?.refill_capacity_ml || 0
                ).toFixed(1)} ml
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
            placeholder="Add any notes about this refill..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefillDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRefillSubmit} variant="contained" disabled={!refillAmount || !fragranceCode}>
              Submit Refill
            </Button>
          </DialogActions>
        </Dialog>

        {/* Refill Code Entry Dialog */}
        <Dialog 
          open={refillCodeEntryDialogOpen} 
          onClose={() => setRefillCodeEntryDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Devices sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Enter Machine Code</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan the barcode or enter the unique machine code to proceed with refill
              </Typography>
              <TextField
                fullWidth
                label="Machine Unique Code"
                value={refillUniqueCode}
                onChange={(e) => setRefillUniqueCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRefillCodeEntry();
                  }
                }}
                margin="normal"
                required
                autoFocus
                placeholder="Enter or scan machine code"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleRefillCodeEntry}
                        edge="end"
                        color="primary"
                      >
                        <PlayArrow />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="Press Enter or click the arrow button to continue"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setRefillCodeEntryDialogOpen(false);
              setRefillUniqueCode('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleRefillCodeEntry} variant="contained" disabled={!refillUniqueCode || refillUniqueCode.trim() === ''}>
              Continue
            </Button>
          </DialogActions>
        </Dialog>

        {/* Complete Task Dialog */}
        <Dialog 
          open={completeDialogOpen} 
          onClose={() => setCompleteDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>Complete Task</DialogTitle>
          <DialogContent>
            {selectedAssignment && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Task Type: {selectedAssignment.task_type?.charAt(0).toUpperCase() + selectedAssignment.task_type?.slice(1) || 'Refill'}
                </Typography>
                {selectedAssignment.task_type === 'installation' ? (
                  <Typography variant="body2" color="text.secondary">
                    Client: {getClientName(getClientIdFromInstallationTask(selectedAssignment))}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Machine: {getDispenserDetails(selectedAssignment.dispenser_id)?.sku || selectedAssignment.dispenser_id}
                  </Typography>
                )}
              </Box>
            )}
            <TextField
              fullWidth
              label="Completion Notes (optional)"
              multiline
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              margin="normal"
              placeholder={selectedAssignment?.task_type === 'installation' 
                ? "Add any notes about the completed installation..." 
                : "Add any notes about the completed task..."}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteTask} variant="contained" color="success" startIcon={<Done />}>
              Mark Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dispenser Dialog */}
      <Dialog 
        open={!!viewingDispenser} 
        onClose={() => setViewingDispenser(null)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Machine Details</DialogTitle>
        <DialogContent>
          {viewingDispenser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Machine Code</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingDispenser.unique_code || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">SKU</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingDispenser.sku || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingDispenser.location || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Capacity (ml)</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingDispenser.refill_capacity_ml || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Current Level (ml)</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingDispenser.current_level_ml || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">ML Per Hour</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingDispenser.ml_per_hour || '-'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingDispenser(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dispenser Dialog */}
      <Dialog open={!!editingDispenser} onClose={() => setEditingDispenser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Machine</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Machine Name"
            value={dispenserForm.name}
            onChange={(e) => setDispenserForm({ ...dispenserForm, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="SKU"
            value={dispenserForm.sku}
            onChange={(e) => setDispenserForm({ ...dispenserForm, sku: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Location"
            value={dispenserForm.location}
            onChange={(e) => setDispenserForm({ ...dispenserForm, location: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Machine Code"
            value={dispenserForm.unique_code}
            onChange={(e) => setDispenserForm({ ...dispenserForm, unique_code: e.target.value })}
            margin="normal"
            disabled
          />
          <TextField
            fullWidth
            label="Capacity (ml)"
            type="number"
            value={dispenserForm.refill_capacity_ml}
            onChange={(e) => setDispenserForm({ ...dispenserForm, refill_capacity_ml: parseFloat(e.target.value) || 0 })}
            margin="normal"
            inputProps={{ min: 0, step: 0.1 }}
          />
          <TextField
            fullWidth
            label="ML Per Hour"
            type="number"
            value={dispenserForm.ml_per_hour}
            onChange={(e) => setDispenserForm({ ...dispenserForm, ml_per_hour: parseFloat(e.target.value) || 0 })}
            margin="normal"
            inputProps={{ min: 0, step: 0.1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDispenser(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await updateDispenser(editingDispenser.id, {
                  ...editingDispenser,
                  name: dispenserForm.name,
                  sku: dispenserForm.sku,
                  location: dispenserForm.location,
                  refill_capacity_ml: dispenserForm.refill_capacity_ml,
                  ml_per_hour: dispenserForm.ml_per_hour,
                });
                await loadData();
                setEditingDispenser(null);
                alert('Machine updated successfully!');
              } catch (err) {
                alert('Error updating machine: ' + (err.response?.data?.detail || 'Unknown error'));
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Machine Dialog */}
      <Dialog 
        open={addMachineDialogOpen} 
        onClose={() => setAddMachineDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Add Machine Asset to Client</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Machine SKU</InputLabel>
            <Select
              value={addMachineForm.sku || ''}
              onChange={(e) => setAddMachineForm({ ...addMachineForm, sku: e.target.value })}
              label="Machine SKU"
            >
              <MenuItem value="">Select Machine SKU</MenuItem>
              {(() => {
                const skuTemplates = getSKUTemplates();
                const uniqueSKUs = [...new Set(skuTemplates.map(d => d.sku))];
                return uniqueSKUs.map((sku) => (
                  <MenuItem key={sku} value={sku}>
                    {sku}
                  </MenuItem>
                ));
              })()}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Unique Machine Code"
            placeholder="e.g., AAA001, AAA002"
            value={addMachineForm.unique_code}
            onChange={(e) => setAddMachineForm({ ...addMachineForm, unique_code: e.target.value })}
            margin="normal"
            required
            helperText="Unique identifier for this specific machine"
          />

          <TextField
            fullWidth
            label="Location"
            placeholder="e.g., Washroom1, Lobby, Room1"
            value={addMachineForm.location}
            onChange={(e) => setAddMachineForm({ ...addMachineForm, location: e.target.value })}
            margin="normal"
            helperText="Location where the machine will be installed"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMachineDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMachine} variant="contained" disabled={!addMachineForm.sku || !addMachineForm.unique_code}>
            Add Machine
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Installation Dialog */}
      <Dialog 
        open={installationDialogOpen} 
        onClose={() => setInstallationDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Create New Installation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Location"
            placeholder="e.g., Main Lobby, Floor 1, Room 201"
            value={installationForm.location}
            onChange={(e) => setInstallationForm({ ...installationForm, location: e.target.value })}
            margin="normal"
            required
            disabled={!!installationForm.unique_code} // Disable if machine is selected
            helperText={installationForm.unique_code ? "Location is set from selected machine" : "Enter location or select a machine below"}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Machine SKU</InputLabel>
            <Select
              value={installationForm.sku || ''}
              onChange={(e) => {
                const selectedSku = e.target.value;
                const skuTemplate = getSKUTemplates().find(d => d.sku === selectedSku);
                setInstallationForm({
                  ...installationForm,
                  sku: selectedSku,
                  ml_per_hour: skuTemplate?.ml_per_hour || '',
                  unique_code: '', // Reset unique_code when SKU changes
                  location: '', // Reset location when SKU changes
                });
              }}
              label="Machine SKU"
            >
              <MenuItem value="">Select Machine SKU</MenuItem>
              {(() => {
                // Get client machines (assigned and installed) to show only relevant SKUs
                const clientMachines = getClientMachines(clientAccessView?.clientId || '');
                // Get unique SKUs from client's machines
                const clientSKUs = [...new Set(clientMachines.map(m => m.sku).filter(Boolean))];
                
                // If no client machines, show all SKUs as fallback
                if (clientSKUs.length === 0) {
                  const skuTemplates = getSKUTemplates();
                  const uniqueSKUs = [...new Set(skuTemplates.map(d => d.sku))];
                  return uniqueSKUs.map((sku) => (
                    <MenuItem key={sku} value={sku}>
                      {sku}
                    </MenuItem>
                  ));
                }
                
                // Show only SKUs that have machines assigned to this client (without suffix)
                return clientSKUs.map((sku) => (
                  <MenuItem key={sku} value={sku}>
                    {sku}
                  </MenuItem>
                ));
              })()}
            </Select>
          </FormControl>

          {installationForm.sku && (() => {
            const skuTemplate = getSKUTemplates().find(d => d.sku === installationForm.sku);
            const clientMachines = getClientMachines(clientAccessView?.clientId || '');
            const assignedMachines = clientMachines.filter(m => m.sku === installationForm.sku && m.status === 'assigned');
            const hasAssignedMachines = assignedMachines.length > 0;
            return (
              <>
                {skuTemplate && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="info.dark">
                      <strong>Capacity:</strong> {skuTemplate.refill_capacity_ml} ml | 
                      <strong> ML/Hour:</strong> {skuTemplate.ml_per_hour} ml/h
                    </Typography>
                  </Box>
                )}

                {hasAssignedMachines && (
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Select Assigned Machine</InputLabel>
                    <Select
                      value={installationForm.unique_code || ''}
                      onChange={(e) => {
                        const selectedCode = e.target.value;
                        const selectedMachine = assignedMachines.find(m => m.unique_code === selectedCode);
                        setInstallationForm({ 
                          ...installationForm, 
                          unique_code: selectedCode,
                          location: selectedMachine?.location || '' // Auto-fill location from selected machine
                        });
                      }}
                      label="Select Assigned Machine"
                    >
                      <MenuItem value="">Select a Machine</MenuItem>
                      {assignedMachines.map((machine) => {
                        const machineCode = machine.unique_code || 'N/A';
                        const location = machine.location || 'No Location';
                        return (
                          <MenuItem key={machine.id} value={machine.unique_code}>
                            {machineCode} - {location}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                )}

                {!hasAssignedMachines && (
                  <TextField
                    fullWidth
                    label="Unique Machine Code"
                    placeholder="e.g., AAA001"
                    value={installationForm.unique_code}
                    onChange={(e) => setInstallationForm({ ...installationForm, unique_code: e.target.value })}
                    margin="normal"
                    required
                    helperText="Unique identifier for this machine"
                  />
                )}
              </>
            );
          })()}

          <FormControl fullWidth margin="normal">
            <InputLabel>Schedule</InputLabel>
            <Select
              value={installationForm.schedule_id || ''}
              onChange={(e) => {
                const scheduleId = e.target.value;
                const selectedSchedule = schedules.find(s => s.id === scheduleId);
                setInstallationForm({ 
                  ...installationForm, 
                  schedule_id: scheduleId 
                });
              }}
              label="Schedule"
              displayEmpty
            >
              <MenuItem value="">
                <em>No Schedule</em>
              </MenuItem>
              {schedules.map((schedule) => (
                <MenuItem key={schedule.id} value={schedule.id}>
                  {schedule.name} {schedule.type === 'custom' ? '(Custom)' : schedule.type === 'fixed' ? '(Fixed)' : ''}
                </MenuItem>
              ))}
            </Select>
            <Box sx={{ mt: 1 }}>
              {installationForm.schedule_id && (() => {
                const selectedSchedule = schedules.find(s => s.id === installationForm.schedule_id);
                if (selectedSchedule) {
                  return (
                    <Typography variant="caption" color="text.secondary">
                      {selectedSchedule.ml_per_hour ? `ML/Hour: ${selectedSchedule.ml_per_hour} ml/h` : 'Using default calculation'}
                    </Typography>
                  );
                }
                return null;
              })()}
            </Box>
            <FormHelperText>
              Need a new custom schedule?{' '}
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setCustomScheduleForm({
                    name: '',
                    type: 'custom',
                    scheduleType: 'time_based',
                    duration_minutes: 120,
                    daily_cycles: 1,
                    ml_per_hour: '',
                    intervals: [{ spray_seconds: 20, pause_seconds: 40 }],
                    time_ranges: [
                      { start_time: '00:00', end_time: '06:00', spray_seconds: 20, pause_seconds: 40 },
                      { start_time: '06:00', end_time: '12:00', spray_seconds: 30, pause_seconds: 30 },
                      { start_time: '12:00', end_time: '15:00', spray_seconds: 50, pause_seconds: 20 },
                      { start_time: '15:00', end_time: '23:55', spray_seconds: 100, pause_seconds: 10 },
                    ],
                    days_of_week: [0, 1, 2, 3, 4, 5, 6],
                  });
                  setCustomScheduleDialogOpen(true);
                }}
                sx={{ textTransform: 'none', ml: -1 }}
              >
                Create one here
              </Button>
            </FormHelperText>
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setCustomScheduleForm({
                  name: '',
                  type: 'custom',
                  scheduleType: 'time_based',
                  duration_minutes: 120,
                  daily_cycles: 1,
                  ml_per_hour: '',
                  intervals: [{ spray_seconds: 20, pause_seconds: 40 }],
                  time_ranges: [
                    { start_time: '00:00', end_time: '06:00', spray_seconds: 20, pause_seconds: 40 },
                    { start_time: '06:00', end_time: '12:00', spray_seconds: 30, pause_seconds: 30 },
                    { start_time: '12:00', end_time: '15:00', spray_seconds: 50, pause_seconds: 20 },
                    { start_time: '15:00', end_time: '23:55', spray_seconds: 100, pause_seconds: 10 },
                  ],
                  days_of_week: [0, 1, 2, 3, 4, 5, 6],
                });
                setCustomScheduleDialogOpen(true);
              }}
            >
              Create Custom Schedule
            </Button>
          </Box>

          <TextField
            fullWidth
            label="Initial Refill Amount (ml)"
            type="number"
            value={installationForm.refill_amount_ml}
            onChange={(e) => setInstallationForm({ ...installationForm, refill_amount_ml: parseFloat(e.target.value) || 0 })}
            margin="normal"
            inputProps={{ min: 0, step: 0.1 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">ml</InputAdornment>,
            }}
            helperText="Amount to fill during installation"
          />

          <TextField
            fullWidth
            label="Installation Date (IST)"
            type="datetime-local"
            value={toISTDateTimeLocal(installationForm.installation_date)}
            onChange={(e) => setInstallationForm({ 
              ...installationForm, 
              installation_date: fromISTDateTimeLocal(e.target.value)
            })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Date and time when the machine was installed (IST)"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallationDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateInstallation} 
            variant="contained" 
            disabled={
              !installationForm.sku || 
              !installationForm.location || 
              !installationForm.unique_code
            }
          >
            Create Installation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Schedule Dialog */}
      <Dialog 
        open={customScheduleDialogOpen} 
        onClose={() => setCustomScheduleDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Create Custom Schedule</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Schedule Name"
            value={customScheduleForm.name}
            onChange={(e) => setCustomScheduleForm({ ...customScheduleForm, name: e.target.value })}
            margin="normal"
            required
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Schedule Type
            </Typography>
            <ToggleButtonGroup
              value={customScheduleForm.scheduleType}
              exclusive
              onChange={(e, newType) => {
                if (newType) {
                  setCustomScheduleForm({ ...customScheduleForm, scheduleType: newType });
                }
              }}
              fullWidth
            >
              <ToggleButton value="time_based">Time-Based Schedule</ToggleButton>
              <ToggleButton value="interval_based">Interval-Based Schedule</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Days of Week
            </Typography>
            <FormGroup row>
              {[
                { value: 0, label: 'Mon' },
                { value: 1, label: 'Tue' },
                { value: 2, label: 'Wed' },
                { value: 3, label: 'Thu' },
                { value: 4, label: 'Fri' },
                { value: 5, label: 'Sat' },
                { value: 6, label: 'Sun' },
              ].map((day) => (
                <FormControlLabel
                  key={day.value}
                  control={
                    <Checkbox
                      checked={(customScheduleForm.days_of_week || []).includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                    />
                  }
                  label={day.label}
                />
              ))}
            </FormGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Select days when this schedule should run. Leave all selected for daily operation.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {customScheduleForm.scheduleType === 'time_based' ? (
            <>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                Time Ranges
              </Typography>
              {(customScheduleForm.time_ranges || []).map((timeRange, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2">Time Range {index + 1}</Typography>
                      {customScheduleForm.time_ranges.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveTimeRange(index)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={timeRange.start_time}
                        onChange={(e) =>
                          handleTimeRangeChange(index, 'start_time', e.target.value)
                        }
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                      <TextField
                        label="End Time"
                        type="time"
                        value={timeRange.end_time}
                        onChange={(e) =>
                          handleTimeRangeChange(index, 'end_time', e.target.value)
                        }
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Spray (seconds)"
                        type="number"
                        value={timeRange.spray_seconds}
                        onChange={(e) =>
                          handleTimeRangeChange(index, 'spray_seconds', e.target.value)
                        }
                        margin="normal"
                        required
                      />
                      <TextField
                        label="Pause (seconds)"
                        type="number"
                        value={timeRange.pause_seconds}
                        onChange={(e) =>
                          handleTimeRangeChange(index, 'pause_seconds', e.target.value)
                        }
                        margin="normal"
                        required
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddTimeRange}
                sx={{ mt: 2 }}
              >
                Add Time Range
              </Button>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={customScheduleForm.duration_minutes}
                  onChange={(e) => setCustomScheduleForm({ ...customScheduleForm, duration_minutes: e.target.value })}
                  margin="normal"
                  required
                />
                <TextField
                  label="Daily Cycles"
                  type="number"
                  value={customScheduleForm.daily_cycles}
                  onChange={(e) => setCustomScheduleForm({ ...customScheduleForm, daily_cycles: e.target.value })}
                  margin="normal"
                  required
                />
              </Box>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Intervals
              </Typography>

              {(customScheduleForm.intervals || []).map((interval, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2">Interval {index + 1}</Typography>
                      {customScheduleForm.intervals.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveInterval(index)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Spray (seconds)"
                        type="number"
                        value={interval.spray_seconds}
                        onChange={(e) =>
                          handleIntervalChange(index, 'spray_seconds', e.target.value)
                        }
                        margin="normal"
                        required
                      />
                      <TextField
                        label="Pause (seconds)"
                        type="number"
                        value={interval.pause_seconds}
                        onChange={(e) =>
                          handleIntervalChange(index, 'pause_seconds', e.target.value)
                        }
                        margin="normal"
                        required
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddInterval}
                sx={{ mt: 2 }}
              >
                Add Interval
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCustomSchedule}>Create & Select</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default TechnicianDashboard;
