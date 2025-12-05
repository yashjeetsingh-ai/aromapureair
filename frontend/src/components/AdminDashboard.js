import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { 
  Refresh, 
  Add, 
  Edit, 
  Delete, 
  Business, 
  Devices, 
  History, 
  People, 
  Warning,
  FilterList,
  Search,
  CheckCircle,
  Error as ErrorIcon,
  Visibility,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import {
  getDispensers,
  getSchedules,
  assignSchedule,
  getRefillLogs,
  calculateUsage,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  createDispenser,
  updateDispenser,
  deleteDispenser,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../services/api';

function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  // Dashboard view when no tab is specified, Machines tab = 0, Clients = 1, Users = 2, Refill Logs = 3
  const [activeTab, setActiveTab] = useState(location?.state?.tab !== undefined ? location.state.tab : null);
  const [dispensers, setDispensers] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [refillLogs, setRefillLogs] = useState([]);
  const [usageData, setUsageData] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filter states for Installed tab
  const [installedFilters, setInstalledFilters] = useState({
    client: '',
    location: '',
    sku: '',
    status: '', // 'all', 'good', 'medium', 'low', 'urgent', 'overdue'
  });

  // Dialog states
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [installationDialogOpen, setInstallationDialogOpen] = useState(false);
  const [addMachineToClientDialogOpen, setAddMachineToClientDialogOpen] = useState(false);
  const [viewClientDialogOpen, setViewClientDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editingInstallation, setEditingInstallation] = useState(null);

  // Form states
  const [clientForm, setClientForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  const [machineForm, setMachineForm] = useState({
    sku: '',
    code: '',
    refill_capacity_ml: 500,
    ml_per_hour: '',
  });

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'technician',
  });

  const [installationForm, setInstallationForm] = useState({
    client_id: '',
    location: '',
    sku: '',
    unique_code: '',
    status: 'installed',
    ml_per_hour: '',
    schedule_id: '',
    refill_amount_ml: 0,
    last_refill_date: null,
    calculated_current_level: 0,
  });

  const [addMachineToClientForm, setAddMachineToClientForm] = useState({
    client_id: '',
    sku: '',
    unique_code: '',
    location: '',
    status: 'assigned',
    installation_date: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Handle tab navigation from sidebar
    // If tab is explicitly set, use it; otherwise show Dashboard (null)
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
        setActiveTab(null); // Dashboard view when no tab specified
      }
    };
    window.addEventListener('tabChange', handleTabChange);
    return () => window.removeEventListener('tabChange', handleTabChange);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispensersData, schedulesData, logsData, clientsData, usersData] = await Promise.all([
        getDispensers(),
        getSchedules(),
        getRefillLogs(),
        getClients(),
        getUsers(),
      ]);
      setDispensers(dispensersData);
      setSchedules(schedulesData);
      setRefillLogs(logsData);
      setClients(clientsData);
      setUsers(usersData);

      // Load usage data for each dispenser
      const usagePromises = dispensersData.map(async (d) => {
        if (d.current_schedule_id) {
          const usage = await calculateUsage(d.id);
          return { [d.id]: usage };
        }
        return { [d.id]: null };
      });
      const usageResults = await Promise.all(usagePromises);
      const usageMap = Object.assign({}, ...usageResults);
      setUsageData(usageMap);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleScheduleChange = async (dispenserId, scheduleId) => {
    try {
      await assignSchedule(dispenserId, scheduleId);
      loadData();
    } catch (err) {
      console.error('Error assigning schedule:', err);
      alert('Error assigning schedule: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleOpenClientDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setClientForm({
        name: client.name || '',
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
      });
    } else {
      setEditingClient(null);
      setClientForm({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setClientDialogOpen(true);
  };

  const handleCloseClientDialog = () => {
    setClientDialogOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = async () => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientForm);
      } else {
        await createClient(clientForm);
      }
      handleCloseClientDialog();
      loadData();
      
      // Client saved successfully
    } catch (err) {
      alert('Error saving client: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteClient(clientId);
        loadData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error deleting client');
      }
    }
  };

  const handleOpenMachineDialog = (machine = null) => {
    if (machine) {
      setEditingMachine(machine);
      setMachineForm({
        sku: machine.sku || '',
        code: machine.unique_code || '',
        refill_capacity_ml: machine.refill_capacity_ml || 500,
        ml_per_hour: machine.ml_per_hour || '',
      });
    } else {
      setEditingMachine(null);
      setMachineForm({
        sku: '',
        code: '',
        refill_capacity_ml: 500,
        ml_per_hour: '',
      });
    }
    setMachineDialogOpen(true);
  };

  const handleCloseMachineDialog = () => {
    setMachineDialogOpen(false);
    setEditingMachine(null);
  };

  const handleDeleteMachine = async (machineId, machineName) => {
    if (window.confirm(`Are you sure you want to delete machine "${machineName || machineId}"?\n\nThis action cannot be undone.`)) {
      try {
        await deleteDispenser(machineId);
        loadData();
      } catch (err) {
        alert('Error deleting machine: ' + (err.response?.data?.detail || 'Unknown error'));
      }
    }
  };

  const handleSaveMachine = async () => {
    try {
      if (!machineForm.sku) {
        alert('SKU is required');
        return;
      }
      if (!machineForm.code) {
        alert('Code is required');
        return;
      }
      if (!machineForm.refill_capacity_ml) {
        alert('Capacity (ml) is required');
        return;
      }
      if (!machineForm.ml_per_hour) {
        alert('ML Per Hour Usage is required');
        return;
      }
      
      // Check for duplicate code (excluding current machine if editing)
      const duplicateCode = dispensers.find(d => 
        d.unique_code === machineForm.code && 
        (!editingMachine || d.id !== editingMachine.id)
      );
      
      if (duplicateCode) {
        alert(`Code "${machineForm.code}" already exists. Code must be unique.`);
        return;
      }
      
      const machineData = {
        sku: machineForm.sku,
        unique_code: machineForm.code,
        refill_capacity_ml: parseFloat(machineForm.refill_capacity_ml),
        ml_per_hour: parseFloat(machineForm.ml_per_hour),
        // Preserve existing fields when editing, but SKU templates should NEVER have client_id
        id: editingMachine?.id || `disp_${Date.now()}`,
        name: editingMachine?.name || machineForm.sku, // Use SKU as default name
        location: editingMachine?.location || '',
        client_id: null, // SKU templates should never have a client_id
        current_schedule_id: editingMachine?.current_schedule_id || null,
        current_level_ml: editingMachine?.current_level_ml || 0,
        last_refill_date: editingMachine?.last_refill_date || null,
        status: editingMachine?.status || null,
      };
      
      if (editingMachine) {
        await updateDispenser(editingMachine.id, machineData);
      } else {
        await createDispenser(machineData);
      }
      handleCloseMachineDialog();
      loadData();
    } catch (err) {
      alert('Error saving machine: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleOpenUserDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        role: 'technician',
      });
    }
    setUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update user
        const updateData = { role: userForm.role };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await updateUser(editingUser.username, updateData);
      } else {
        // Create new user
        if (!userForm.password) {
          alert('Password is required for new users');
          return;
        }
        await createUser(userForm);
      }
      handleCloseUserDialog();
      loadData();
    } catch (err) {
      alert('Error saving user: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDeleteUser = async (username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await deleteUser(username);
        loadData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error deleting user');
      }
    }
  };

  // Calculate current level based on last refill date and daily usage
  const calculateCurrentLevel = (refillAmount, lastRefillDate, scheduleId, mlPerHour, machineCapacity) => {
    if (!lastRefillDate || !scheduleId) {
      return refillAmount || machineCapacity || 0;
    }

    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) {
      return refillAmount || machineCapacity || 0;
    }

    // Calculate daily usage
    let dailyUsage = 0;
    if (schedule.time_ranges) {
      // Time-based schedule
      if (mlPerHour) {
        let totalHours = 0;
        schedule.time_ranges.forEach(range => {
          const start = new Date(`2000-01-01T${range.start_time}`);
          const end = new Date(`2000-01-01T${range.end_time}`);
          const diff = (end - start) / (1000 * 60 * 60);
          totalHours += diff;
        });
        dailyUsage = totalHours * mlPerHour;
      }
    } else {
      // Interval-based schedule
      if (mlPerHour) {
        let totalSeconds = 0;
        schedule.intervals?.forEach(interval => {
          totalSeconds += interval.spray_seconds;
        });
        const totalHours = totalSeconds / 3600;
        dailyUsage = totalHours * mlPerHour * (schedule.daily_cycles || 1);
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
      return refillAmount || machineCapacity || 0;
    }

    // Calculate time elapsed since last refill (with time precision)
    const lastRefill = new Date(lastRefillDate);
    const now = new Date();
    const timeDiffMs = now - lastRefill;
    const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24); // Days with decimal precision (includes hours/minutes)

    // Current level = (today date with time - refill date time) * daily usage
    // This calculates usage, then subtract from refill amount
    const usageSinceRefill = daysElapsed * dailyUsage;
    const calculatedLevel = Math.max(0, (refillAmount || machineCapacity || 0) - usageSinceRefill);
    
    // Never allow current level to exceed capacity
    const currentLevel = Math.min(calculatedLevel, machineCapacity || 0);

    return currentLevel;
  };

  const handleOpenInstallationDialog = (dispenser = null, clientId = null) => {
    if (dispenser) {
      setEditingInstallation(dispenser);
      const machine = dispensers.find(d => d.id === dispenser.id);
      
      // Find the refill log that matches last_refill_date to get the actual refill amount
      const matchingRefillLog = dispenser.last_refill_date
        ? refillLogs
            .filter(log => {
              if (log.dispenser_id !== dispenser.id) return false;
              const logDate = new Date(log.timestamp);
              const refillDate = new Date(dispenser.last_refill_date);
              return Math.abs(logDate - refillDate) < 60000; // Within 1 minute
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null;
      
      // Determine refill amount
      // If there's a matching refill log, the level after refill = level before + refill_amount
      // So level after refill = current_level_ml (which was updated by the API)
      // But we need to work backwards: if current_level_ml = old_level + refill_amount_ml
      // Then level after refill = current_level_ml
      // So refill amount = current_level_ml (the level immediately after refill)
      const refillAmount = matchingRefillLog
        ? dispenser.current_level_ml // Level after refill (already updated by API)
        : (dispenser.current_level_ml || machine?.refill_capacity_ml || 0); // Use stored value or capacity
      
      // Calculate current level if we have last refill date and schedule
      const calculated = dispenser.last_refill_date && dispenser.current_schedule_id
        ? calculateCurrentLevel(
            refillAmount,
            dispenser.last_refill_date,
            dispenser.current_schedule_id,
            dispenser.ml_per_hour || null,
            machine?.refill_capacity_ml || 0
          )
        : dispenser.current_level_ml || 0;
      
      setInstallationForm({
        client_id: dispenser.client_id || '',
        location: dispenser.location || '',
        sku: dispenser.sku || '',
        unique_code: dispenser.unique_code || '',
        status: dispenser.status || 'installed',
        ml_per_hour: dispenser.ml_per_hour || '',
        schedule_id: dispenser.current_schedule_id || '',
        refill_amount_ml: refillAmount,
        last_refill_date: dispenser.last_refill_date || null,
        calculated_current_level: calculated,
      });
    } else {
      setEditingInstallation(null);
      setInstallationForm({
        client_id: clientId || '',
        location: '',
        sku: '',
        unique_code: '',
        status: 'installed',
        ml_per_hour: '',
        schedule_id: '',
        refill_amount_ml: 0,
        last_refill_date: null,
        calculated_current_level: 0,
      });
    }
    setInstallationDialogOpen(true);
  };

  const handleCloseInstallationDialog = () => {
    setInstallationDialogOpen(false);
    setEditingInstallation(null);
  };

  const handleOpenAddMachineToClientDialog = (clientId) => {
    setAddMachineToClientForm({
      client_id: clientId || '',
      sku: '',
      unique_code: '',
      location: '',
      status: 'assigned',
      installation_date: null,
    });
    setAddMachineToClientDialogOpen(true);
  };

  const handleCloseAddMachineToClientDialog = () => {
    setAddMachineToClientDialogOpen(false);
    setAddMachineToClientForm({
      client_id: '',
      sku: '',
      unique_code: '',
      location: '',
      status: 'assigned',
      installation_date: null,
    });
  };

  const handleSaveMachineToClient = async () => {
    try {
      if (!addMachineToClientForm.client_id || !addMachineToClientForm.sku || !addMachineToClientForm.unique_code) {
        alert('Client, SKU, and Unique Code are required');
        return;
      }

      // Find the SKU template from Machines tab (must not have client_id)
      // This is assigning an existing SKU to a client, not creating a new SKU
      const skuTemplate = dispensers.find(d => 
        d.sku === addMachineToClientForm.sku && 
        !d.client_id
      );
      
      if (!skuTemplate) {
        alert('SKU not found in Machines tab. Please ensure the SKU exists in the Machine SKU Management tab.');
        return;
      }

      // Ensure the SKU template has all required fields
      if (!skuTemplate.ml_per_hour) {
        alert('Machine SKU must have ML Per Hour Usage defined. Please update the SKU in Machines tab first.');
        return;
      }
      if (!skuTemplate.unique_code) {
        alert('Machine SKU must have Code defined. Please update the SKU in Machines tab first.');
        return;
      }
      
      // Check for duplicate code
      const duplicateCode = dispensers.find(d => d.unique_code === addMachineToClientForm.unique_code);
      if (duplicateCode) {
        alert(`Code "${addMachineToClientForm.unique_code}" already exists. Code must be unique.`);
        return;
      }
      
      // Create a machine instance/assignment - this is NOT a new SKU
      // We're assigning 1 quantity of an existing SKU to the client
      const machineAssetData = {
        ...skuTemplate, // Copy all SKU template properties
        id: `disp_${Date.now()}`, // New unique ID for this instance
        name: skuTemplate.sku, // Use SKU as name
        client_id: addMachineToClientForm.client_id, // Assign to client
        unique_code: addMachineToClientForm.unique_code, // Unique code for this specific machine instance
        location: addMachineToClientForm.location || '', // Location where this instance is placed
        status: 'assigned', // Status: assigned to client (not yet installed)
        current_schedule_id: null,
        current_level_ml: 0,
        last_refill_date: addMachineToClientForm.installation_date || null,
        ml_per_hour: skuTemplate.ml_per_hour, // Copy from SKU template
        refill_capacity_ml: skuTemplate.refill_capacity_ml, // Copy from SKU template
        sku: skuTemplate.sku, // Keep the same SKU reference
      };

      await createDispenser(machineAssetData);
      await loadData();
      handleCloseAddMachineToClientDialog();
      alert('Machine asset added to client successfully');
    } catch (error) {
      console.error('Error adding machine to client:', error);
      alert('Failed to add machine to client');
    }
  };

  const handleSaveInstallation = async () => {
    try {
      if (!installationForm.client_id || !installationForm.sku || !installationForm.location) {
        alert('Client, SKU, and Location are required');
        return;
      }

      // Find the SKU template from Machines tab (for capacity and ml_per_hour)
      // Also find the assigned machine instance (if editing)
      const skuTemplate = dispensers.find(d => d.sku === installationForm.sku && !d.client_id);
      if (!skuTemplate) {
        alert('SKU template not found in Machines tab. Please ensure the SKU exists.');
        return;
      }
      
      // Ensure the SKU template has all required fields
      if (!skuTemplate.ml_per_hour) {
        alert('Machine SKU must have ML Per Hour Usage defined. Please update the SKU in Machines tab first.');
        return;
      }
      
      // Determine the unique_code to use
      const finalUniqueCode = installationForm.unique_code;
      
      if (!finalUniqueCode) {
        alert('Unique code is required for installation.');
        return;
      }

      // Find the assigned machine instance (if editing an existing installation OR if installing an assigned machine)
      let assignedMachine = null;
      if (editingInstallation) {
        // If editing, find by ID
        assignedMachine = dispensers.find(d => d.id === editingInstallation.id);
      } else {
        // If creating new installation, check if there's an assigned machine with the same unique_code
        // This allows converting an assigned machine to installed
        assignedMachine = dispensers.find(d => 
          d.unique_code === finalUniqueCode && 
          d.status === 'assigned' &&
          d.client_id === installationForm.client_id
        );
      }

      // When saving installation, store the refill amount as current_level_ml
      // The current level will be calculated dynamically based on last_refill_date
      // So we store the refill amount (what was refilled TO, not what was added)
      // IMPORTANT: refill_amount_ml is the level AFTER refill, not the amount added
      let refillAmount = parseFloat(installationForm.refill_amount_ml);
      // If refill amount is 0, null, undefined, or NaN, use SKU template capacity as default
      if (!refillAmount || refillAmount === 0 || isNaN(refillAmount)) {
        refillAmount = skuTemplate.refill_capacity_ml;
      }
      
      // Never allow refill amount to exceed capacity (from SKU template)
      if (refillAmount > skuTemplate.refill_capacity_ml) {
        refillAmount = skuTemplate.refill_capacity_ml;
        alert(`Refill amount cannot exceed capacity (${skuTemplate.refill_capacity_ml} ml). It has been set to capacity.`);
      }
      
      // Check for duplicate code (excluding current installation if editing, and excluding assigned machines)
      // Allow installing assigned machines (they will be converted to installed)
      const duplicateCode = dispensers.find(d => 
        d.unique_code === finalUniqueCode && 
        d.status !== 'assigned' && // Allow assigned machines to be installed
        (!editingInstallation || d.id !== editingInstallation.id)
      );
      
      if (duplicateCode) {
        alert(`Code "${finalUniqueCode}" already exists as an installed machine. Code must be unique.`);
        return;
      }

      // Create/update installation data - this is an instance of the SKU, not a new SKU
      const installationData = {
        ...skuTemplate, // Start with SKU template properties
        id: assignedMachine?.id || `disp_${Date.now()}`, // Use existing ID if editing or converting assigned machine, or create new
        name: skuTemplate.sku, // Use SKU as name
        client_id: installationForm.client_id, // Assign to client
        location: installationForm.location,
        unique_code: finalUniqueCode, // Unique code for this specific instance
        current_schedule_id: installationForm.schedule_id || null,
        current_level_ml: refillAmount, // Store refill amount (level after refill), NOT calculated level
        ml_per_hour: installationForm.ml_per_hour ? parseFloat(installationForm.ml_per_hour) : skuTemplate.ml_per_hour, // Use form value or fallback to SKU template (required)
        refill_capacity_ml: skuTemplate.refill_capacity_ml, // Copy from SKU template
        last_refill_date: installationForm.last_refill_date || null,
        status: installationForm.status || 'installed', // Use status from form, default to "installed"
        sku: skuTemplate.sku, // Keep the same SKU reference
      };

      // If editing existing installation OR converting assigned machine to installed, use UPDATE
      if (editingInstallation || assignedMachine) {
        const machineId = editingInstallation?.id || assignedMachine.id;
        await updateDispenser(machineId, installationData);
        // Recalculate usage after update
        if (installationData.current_schedule_id) {
          await calculateUsage(machineId);
        }
      } else {
        // Create new installation - create a NEW dispenser record
        // This allows multiple installations of the same SKU in different locations
        const newInstallationData = {
          ...installationData,
          id: `disp_${Date.now()}`, // Generate unique ID
          name: skuTemplate.sku, // Use SKU as name
          status: installationForm.status || 'installed', // Ensure status is always set
        };
        console.log('Creating installation with data:', newInstallationData);
        await createDispenser(newInstallationData);
        // Recalculate usage after creation
        if (installationData.current_schedule_id) {
          await calculateUsage(newInstallationData.id);
        }
      }
      
      handleCloseInstallationDialog();
      loadData();
    } catch (err) {
      alert('Error saving installation: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'No Client';
  };

  // eslint-disable-next-line no-unused-vars
  const getLevelColor = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage < 20) return 'error';
    if (percentage < 50) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar user={user} logout={logout} role="admin" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          width: { sm: `calc(100% - 260px)` },
        }}
      >
        <Container maxWidth="xl" sx={{ mt: 0, mb: 4 }}>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Dashboard Overview */}
            {activeTab === null && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    Dashboard Overview
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Monitor your perfume dispenser operations at a glance
                  </Typography>
                </Box>
                
                {/* Summary Cards - Only from Installed Machines */}
                {(() => {
                  const installedMachines = dispensers.filter(d => d.client_id);
                  const installedMachineIds = installedMachines.map(d => d.id);
                  const installedRefillLogs = refillLogs.filter(log => installedMachineIds.includes(log.dispenser_id));
                  
                  return (
                    <Grid container spacing={3} sx={{ mb: 5 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card 
                          elevation={0} 
                          sx={{ 
                            height: '100%',
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '1px solid rgba(25, 118, 210, 0.12)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                            },
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 12px 24px rgba(25, 118, 210, 0.15)',
                              borderColor: 'primary.main',
                            }
                          }}
                        >
                          <CardContent sx={{ p: 3.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography 
                                  color="text.secondary" 
                                  gutterBottom 
                                  variant="body2"
                                  sx={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px',
                                    mb: 1.5
                                  }}
                                >
                                  Installed Machines
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 300, color: 'text.primary', fontSize: '2.5rem', lineHeight: 1.2 }}>
                                  {installedMachines.length}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                    borderRadius: 2,
                                    p: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                                }}
                              >
                                <Devices sx={{ fontSize: 32, color: 'white' }} />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Card 
                          elevation={0} 
                          sx={{ 
                            border: '1px solid', 
                            borderColor: 'divider', 
                            height: '100%',
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                              borderColor: 'secondary.main',
                            }
                          }}
                        >
                          <CardContent sx={{ p: 3.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography 
                                  color="text.secondary" 
                                  gutterBottom 
                                  variant="body2"
                                  sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1.5 }}
                                >
                                  Total Clients
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 300, mt: 1, color: 'text.primary', fontSize: '2.5rem', lineHeight: 1.2 }}>
                                  {clients.length}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  bgcolor: 'secondary.main',
                                  borderRadius: '10px',
                                  p: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Business sx={{ fontSize: 32, color: 'white' }} />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Card 
                          elevation={0} 
                          sx={{ 
                            border: '1px solid', 
                            borderColor: 'divider', 
                            height: '100%',
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #ffffff 0%, #fff8e1 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(237, 108, 2, 0.15)',
                              borderColor: 'warning.main',
                            }
                          }}
                        >
                          <CardContent sx={{ p: 3.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography 
                                  color="text.secondary" 
                                  gutterBottom 
                                  variant="body2"
                                  sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1.5 }}
                                >
                                  Low Level Machines
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 300, mt: 1, color: 'warning.main', fontSize: '2.5rem', lineHeight: 1.2 }}>
                                  {installedMachines.filter(d => {
                                    const percentage = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                    return percentage < 20;
                                  }).length}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  bgcolor: 'warning.main',
                                  borderRadius: '10px',
                                  p: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Warning sx={{ fontSize: 32, color: 'white' }} />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Card 
                          elevation={0} 
                          sx={{ 
                            border: '1px solid', 
                            borderColor: 'divider', 
                            height: '100%',
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)',
                              borderColor: 'success.main',
                            }
                          }}
                        >
                          <CardContent sx={{ p: 3.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography 
                                  color="text.secondary" 
                                  gutterBottom 
                                  variant="body2"
                                  sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', mb: 1.5 }}
                                >
                                  Total Refills
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 300, mt: 1, color: 'text.primary', fontSize: '2.5rem', lineHeight: 1.2 }}>
                                  {installedRefillLogs.length}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  bgcolor: 'success.main',
                                  borderRadius: '10px',
                                  p: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <History sx={{ fontSize: 32, color: 'white' }} />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  );
                })()}

                {/* Recent Activity & Quick Stats */}
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 3 }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <History sx={{ mr: 1.5, color: 'primary.main' }} />
                          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                            Recent Refill Activity
                          </Typography>
                        </Box>
                        {(() => {
                          const installedMachineIds = dispensers.filter(d => d.client_id).map(d => d.id);
                          const installedRefillLogs = refillLogs.filter(log => installedMachineIds.includes(log.dispenser_id));
                          
                          return installedRefillLogs.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                              <History sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                              <Typography color="text.secondary" variant="body1">
                                No refill logs for installed machines yet
                              </Typography>
                            </Box>
                          ) : (
                            <TableContainer>
                              <Table>
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Date & Time</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Machine</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Client</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Technician</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {installedRefillLogs
                                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                    .slice(0, 5)
                                    .map((log, index) => {
                                      const machine = dispensers.find((d) => d.id === log.dispenser_id);
                                      return (
                                        <TableRow 
                                          key={log.id} 
                                          hover
                                          sx={{ 
                                            '&:hover': { bgcolor: 'action.hover' },
                                            bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                                          }}
                                        >
                                          <TableCell sx={{ py: 1.5 }}>
                                            <Typography variant="body2">
                                              {new Date(log.timestamp).toLocaleString()}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ py: 1.5 }}>
                                            <Chip 
                                              label={machine?.sku || machine?.name || log.dispenser_id} 
                                              size="small" 
                                              variant="outlined"
                                              sx={{ fontWeight: 500 }}
                                            />
                                          </TableCell>
                                          <TableCell sx={{ py: 1.5 }}>
                                            <Typography variant="body2" fontWeight={500}>
                                              {getClientName(machine?.client_id)}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ py: 1.5 }}>
                                            <Chip 
                                              label={`${log.refill_amount_ml} ml`} 
                                              size="small" 
                                              color="success"
                                              sx={{ fontWeight: 500 }}
                                            />
                                          </TableCell>
                                          <TableCell sx={{ py: 1.5 }}>
                                            <Typography variant="body2">
                                              {log.technician_username}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 3 }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Devices sx={{ mr: 1.5, color: 'primary.main' }} />
                          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                            Machine Status Overview
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          {(() => {
                            const installedMachines = dispensers.filter(d => d.client_id);
                            
                            return installedMachines.length === 0 ? (
                              <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                <Typography color="text.secondary" variant="body1">
                                  No installed machines
                                </Typography>
                              </Box>
                            ) : (
                              <>
                                <Box sx={{ mb: 3 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
                                      <Typography variant="body2" fontWeight={500}>Good Level (&gt;50%)</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                      {installedMachines.filter(d => {
                                        const pct = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                        return pct >= 50;
                                      }).length}
                                    </Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={(installedMachines.filter(d => {
                                      const pct = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                      return pct >= 50;
                                    }).length / installedMachines.length) * 100}
                                    color="success"
                                    sx={{ height: 10, borderRadius: 1.5 }}
                                  />
                                </Box>
                                <Box sx={{ mb: 3 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Warning sx={{ fontSize: 18, color: 'warning.main' }} />
                                      <Typography variant="body2" fontWeight={500}>Medium Level (20-50%)</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                      {installedMachines.filter(d => {
                                        const pct = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                        return pct >= 20 && pct < 50;
                                      }).length}
                                    </Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={(installedMachines.filter(d => {
                                      const pct = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                      return pct >= 20 && pct < 50;
                                    }).length / installedMachines.length) * 100}
                                    color="warning"
                                    sx={{ height: 10, borderRadius: 1.5 }}
                                  />
                                </Box>
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
                                      <Typography variant="body2" fontWeight={500}>Low Level (&lt;20%)</Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                      {installedMachines.filter(d => {
                                        const pct = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                        return pct < 20;
                                      }).length}
                                    </Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={(installedMachines.filter(d => {
                                      const pct = (d.current_level_ml / d.refill_capacity_ml) * 100;
                                      return pct < 20;
                                    }).length / installedMachines.length) * 100}
                                    color="error"
                                    sx={{ height: 10, borderRadius: 1.5 }}
                                  />
                                </Box>
                              </>
                            );
                          })()}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Machines View - Simple Table */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    Machine SKU Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Manage machine SKU list - Add, edit, and delete machine SKUs with their specifications
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3, gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadData}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenMachineDialog()}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Add Machine
                  </Button>
                </Box>

                {/* Simple Machine Table */}
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Capacity (ml)</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>ML Per Hour Usage</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        // Filter to show only SKU templates (machines without client_id)
                        // SKU templates are the base machine definitions, not instances assigned to clients
                        const skuTemplates = dispensers.filter(d => !d.client_id);
                        
                        if (skuTemplates.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                <Typography color="text.secondary" variant="body1">
                                  No SKU templates found. Click "Add Machine" to create one.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return skuTemplates.map((dispenser, index) => (
                          <TableRow 
                            key={dispenser.id} 
                            hover
                            sx={{ 
                              '&:hover': { bgcolor: 'action.hover' },
                              bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                            }}
                          >
                            <TableCell sx={{ py: 2 }}>
                              <Chip
                                label={dispenser.sku || 'N/A'}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {dispenser.unique_code || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {dispenser.refill_capacity_ml} ml
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {dispenser.ml_per_hour
                                  ? `${dispenser.ml_per_hour} ml/hr`
                                  : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenMachineDialog(dispenser)}
                                  sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteMachine(dispenser.id, dispenser.name)}
                                  sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Clients View */}
            {activeTab === 1 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    Client Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Manage client information and their installations
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenClientDialog()}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Add Client
                  </Button>
                </Box>

                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Client Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Contact Person</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Phone</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Address</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Installed Machines</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body1" sx={{ mb: 1 }}>
                              No clients found
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              Click "Add Client" to create your first client
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        clients.map((client, index) => {
                          const clientMachines = dispensers.filter((d) => d.client_id === client.id);
                          return (
                            <TableRow 
                              key={client.id} 
                              hover
                              sx={{ 
                                '&:hover': { bgcolor: 'action.hover' },
                                bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                              }}
                            >
                              <TableCell sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Business sx={{ fontSize: 18, color: 'primary.main' }} />
                                  <Typography variant="body2" fontWeight={500}>
                                    {client.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2">
                                  {client.contact_person || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2">
                                  {client.email || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2">
                                  {client.phone || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {client.address || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Chip
                                  label={`${clientMachines.length} Machine${clientMachines.length !== 1 ? 's' : ''}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontWeight: 500 }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => {
                                      setViewingClient(client);
                                      setViewClientDialogOpen(true);
                                    }}
                                    title="View Client Details"
                                    sx={{ '&:hover': { bgcolor: 'info.light', color: 'white' } }}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleOpenAddMachineToClientDialog(client.id)}
                                    title="Add Machine Asset"
                                    sx={{ '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                                  >
                                    <Add fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleOpenClientDialog(client)}
                                    title="Edit Client"
                                    sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteClient(client.id)}
                                    title="Delete Client"
                                    sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Users View */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    User Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Manage user accounts and access permissions
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenUserDialog()}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Add User
                  </Button>
                </Box>

                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Username</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                            <People sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body1">
                              No users found. Click "Add User" to create one.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((usr, index) => (
                          <TableRow 
                            key={usr.username} 
                            hover
                            sx={{ 
                              '&:hover': { bgcolor: 'action.hover' },
                              bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                            }}
                          >
                            <TableCell sx={{ py: 2, fontWeight: 500 }}>{usr.username}</TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Chip
                                label={usr.role.charAt(0).toUpperCase() + usr.role.slice(1)}
                                color={
                                  usr.role === 'developer'
                                    ? 'secondary'
                                    : usr.role === 'admin'
                                    ? 'primary'
                                    : 'default'
                                }
                                size="small"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenUserDialog(usr)}
                                  sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteUser(usr.username)}
                                  disabled={usr.username === user?.username}
                                  sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Refill Logs View */}
            {activeTab === 3 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    Refill Logs
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Track all refill activities and history
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadData}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Refresh
                  </Button>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Date & Time</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Machine</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>SKU Code</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>ML Per Hour</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Technician</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Amount (ml)</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {refillLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                            <History sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body1">
                              No refill logs found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        refillLogs
                          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                          .map((log, index) => {
                            const machine = dispensers.find((d) => d.id === log.dispenser_id);
                            return (
                              <TableRow 
                                key={log.id} 
                                hover
                                sx={{ 
                                  '&:hover': { bgcolor: 'action.hover' },
                                  bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                                }}
                              >
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {machine?.name || log.dispenser_id}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Chip 
                                    label={machine?.sku || 'N/A'} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {machine?.ml_per_hour
                                      ? `${machine.ml_per_hour} ml/hr`
                                      : 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {getClientName(machine?.client_id)}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2">
                                    {log.technician_username}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Chip 
                                    label={`${log.refill_amount_ml} ml`} 
                                    size="small" 
                                    color="success"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {log.notes || '-'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Installed Machines View */}
            {activeTab === 4 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    Installed Machines
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Manage installed machines, monitor levels, and track refill schedules
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenInstallationDialog()}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Create New Installation
                  </Button>
                </Box>

                {/* Filters */}
                <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                      <FilterList sx={{ color: 'primary.main', fontSize: 24 }} />
                      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        Filters
                      </Typography>
                    </Box>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={installedFilters.client}
                            onChange={(e) => setInstalledFilters({ ...installedFilters, client: e.target.value })}
                            displayEmpty
                            sx={{ bgcolor: 'background.paper' }}
                          >
                            <MenuItem value="">All Clients</MenuItem>
                            {clients.filter(client => {
                              // Only show clients that have installed machines
                              return dispensers.some(d => {
                                if (d.client_id !== client.id) return false;
                                if (!d.client_id) return false;
                                // Only count machines with status "installed"
                                return d.status === 'installed';
                              });
                            }).map((client) => (
                              <MenuItem key={client.id} value={client.id}>
                                {client.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Filter by Location"
                          value={installedFilters.location}
                          onChange={(e) => setInstalledFilters({ ...installedFilters, location: e.target.value })}
                          InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={installedFilters.sku}
                            onChange={(e) => setInstalledFilters({ ...installedFilters, sku: e.target.value })}
                            displayEmpty
                            sx={{ bgcolor: 'background.paper' }}
                          >
                            <MenuItem value="">All SKUs</MenuItem>
                            {[...new Set(dispensers.filter(d => {
                              if (!d.client_id) return false;
                              // Only show SKUs from installed machines
                              return d.status === 'installed';
                            }).map(d => d.sku))].map((sku) => (
                              <MenuItem key={sku} value={sku}>
                                {sku}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={installedFilters.status}
                            onChange={(e) => setInstalledFilters({ ...installedFilters, status: e.target.value })}
                            displayEmpty
                            sx={{ bgcolor: 'background.paper' }}
                          >
                            <MenuItem value="">All Status</MenuItem>
                            <MenuItem value="good">Good Level (&gt;50%)</MenuItem>
                            <MenuItem value="medium">Medium Level (20-50%)</MenuItem>
                            <MenuItem value="low">Low Level (&lt;20%)</MenuItem>
                            <MenuItem value="urgent">Urgent Refill</MenuItem>
                            <MenuItem value="overdue">Overdue</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    {(installedFilters.client || installedFilters.location || installedFilters.sku || installedFilters.status) && (
                      <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-start' }}>
                        <Button
                          size="small"
                          onClick={() => setInstalledFilters({ client: '', location: '', sku: '', status: '' })}
                          sx={{ textTransform: 'none', borderRadius: 1.5 }}
                        >
                          Clear Filters
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Unique Code</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>ML Per Hour</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Schedule</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Capacity (ml)</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Current Level (ml)</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Daily ML Usage</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Last Refill Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Next Refill Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dispensers.filter(d => d.client_id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                            <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                            <Typography color="text.secondary" variant="body1">
                              No installed machines. Click "Create New Installation" to add one.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (() => {
                        // Apply filters - Only show machines with status "Installed"
                        // Machines with status "Assigned" should NOT appear in Installed tab
                        // If status is missing, check if it was created from installation form (has schedule or location) - treat as "installed"
                        let filteredDispensers = dispensers.filter(d => {
                          if (!d.client_id) return false;
                          // Explicitly exclude "assigned" status
                          if (d.status === 'assigned') return false;
                          // Show if status is "installed"
                          if (d.status === 'installed') return true;
                          // If status is missing but has location and was likely created from installation form, show it
                          // (for backward compatibility with existing installations)
                          if (!d.status && d.location && d.location.trim() !== '') return true;
                          return false;
                        });
                        
                        if (installedFilters.client) {
                          filteredDispensers = filteredDispensers.filter(d => d.client_id === installedFilters.client);
                        }
                        
                        if (installedFilters.location) {
                          filteredDispensers = filteredDispensers.filter(d => 
                            d.location?.toLowerCase().includes(installedFilters.location.toLowerCase())
                          );
                        }
                        
                        if (installedFilters.sku) {
                          filteredDispensers = filteredDispensers.filter(d => d.sku === installedFilters.sku);
                        }
                        
                        if (installedFilters.status) {
                          filteredDispensers = filteredDispensers.filter(d => {
                            const schedule = schedules.find(s => s.id === d.current_schedule_id);
                            const dailyUsage = usageData[d.id]?.daily_usage_ml || 0;
                            const lastRefill = d.last_refill_date ? new Date(d.last_refill_date) : null;
                            
                            let currentLevel = d.current_level_ml;
                            if (lastRefill && dailyUsage > 0 && schedule) {
                              const now = new Date();
                              const timeDiffMs = now - lastRefill;
                              const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
                              const usageSinceRefill = daysElapsed * dailyUsage;
                              const refillAmount = d.current_level_ml;
                              currentLevel = Math.max(0, Math.min(refillAmount - usageSinceRefill, d.refill_capacity_ml));
                            }
                            
                            const percentage = (currentLevel / d.refill_capacity_ml) * 100;
                            let daysUntilRefill = null;
                            
                            if (dailyUsage > 0 && currentLevel > 0) {
                              const daysUntilEmpty = currentLevel / dailyUsage;
                              daysUntilRefill = daysUntilEmpty - 2;
                            }
                            
                            switch (installedFilters.status) {
                              case 'good':
                                return percentage >= 50;
                              case 'medium':
                                return percentage >= 20 && percentage < 50;
                              case 'low':
                                return percentage < 20;
                              case 'urgent':
                                return daysUntilRefill !== null && daysUntilRefill >= 0 && daysUntilRefill < 2;
                              case 'overdue':
                                return daysUntilRefill !== null && daysUntilRefill < 0;
                              default:
                                return true;
                            }
                          });
                        }
                        
                        if (filteredDispensers.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                                <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                <Typography color="text.secondary" variant="body1">
                                  No machines match the selected filters.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return filteredDispensers.map((dispenser, index) => {
                            const schedule = schedules.find(s => s.id === dispenser.current_schedule_id);
                            const dailyUsage = usageData[dispenser.id]?.daily_usage_ml || 0;
                            
                            const lastRefill = dispenser.last_refill_date 
                              ? new Date(dispenser.last_refill_date) 
                              : null;
                            
                            // Calculate current level based on last refill date and daily usage
                            // Formula: current level = refill amount - ((today - refill date) * daily usage)
                            let currentLevel = dispenser.current_level_ml;
                            let usageSinceRefill = 0;
                            
                            if (lastRefill && dailyUsage > 0 && schedule) {
                              const now = new Date();
                              const timeDiffMs = now - lastRefill;
                              const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
                              
                              // Determine refill amount (level immediately after refill)
                              // When creating installation, current_level_ml stores the refill amount
                              // But if it's 0, it means no refill was done yet, so use capacity as default
                              const refillAmount = dispenser.current_level_ml > 0 
                                ? dispenser.current_level_ml 
                                : dispenser.refill_capacity_ml;
                              
                              // Calculate usage since refill: (today date with time - refill date time) * daily usage
                              usageSinceRefill = daysElapsed * dailyUsage;
                              
                              // Current level = refill amount - usage since refill
                              // Never allow current level to exceed capacity
                              currentLevel = Math.max(0, Math.min(refillAmount - usageSinceRefill, dispenser.refill_capacity_ml));
                            }
                            
                            // Calculate next refill date: when current level runs out minus 2 days
                            // Formula: (current level / daily usage) - 2
                            let nextRefillDate = null;
                            if (dailyUsage > 0 && currentLevel > 0) {
                              // Days until current level runs out
                              const daysUntilEmpty = currentLevel / dailyUsage;
                              // Refill 2 days before it runs out
                              const daysUntilRefill = daysUntilEmpty - 2;
                              
                              // Always show a date, even if negative (means overdue/urgent)
                              if (daysUntilRefill !== null && !isNaN(daysUntilRefill)) {
                                const nextDate = new Date();
                                nextDate.setDate(nextDate.getDate() + Math.round(daysUntilRefill));
                                nextRefillDate = nextDate;
                              }
                            }

                            return (
                              <TableRow 
                                key={dispenser.id} 
                                hover 
                                sx={{ 
                                  '&:hover': { bgcolor: 'action.hover' },
                                  bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                                }}
                              >
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {getClientName(dispenser.client_id)}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2">
                                    {dispenser.location || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Chip 
                                    label={dispenser.sku || 'N/A'} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {dispenser.unique_code && dispenser.unique_code.trim() !== '' ? dispenser.unique_code : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  {(() => {
                                    // Determine the actual status - if missing but has location, treat as "installed"
                                    const actualStatus = dispenser.status || (dispenser.location && dispenser.location.trim() !== '' ? 'installed' : null);
                                    if (actualStatus) {
                                      return (
                                        <Chip 
                                          label={actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)} 
                                          size="small" 
                                          color={actualStatus === 'assigned' ? 'primary' : actualStatus === 'installed' ? 'success' : 'default'}
                                          variant="outlined"
                                        />
                                      );
                                    }
                                    return (
                                      <Chip 
                                        label="N/A" 
                                        size="small" 
                                        color="default"
                                        variant="outlined"
                                      />
                                    );
                                  })()}
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {dispenser.ml_per_hour ? `${dispenser.ml_per_hour} ml/hr` : 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2">
                                    {schedule ? schedule.name : 'No Schedule'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {dispenser.refill_capacity_ml} ml
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {currentLevel.toFixed(1)} ml
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {dailyUsage > 0 ? `${dailyUsage.toFixed(2)} ml` : 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2">
                                    {lastRefill ? lastRefill.toLocaleDateString() : 'Never'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  {(() => {
                                    if (!dailyUsage || dailyUsage === 0) return 'N/A';
                                    
                                    // Calculate days until current level runs out, minus 2 days
                                    const daysUntilEmpty = currentLevel / dailyUsage;
                                    const daysUntilRefill = daysUntilEmpty - 2;
                                    
                                    if (daysUntilRefill < 0) {
                                      // Overdue - should have been refilled already
                                      const overdueDays = Math.abs(daysUntilRefill);
                                      return (
                                        <Box>
                                          <Typography variant="body2" color="error.main">
                                            {nextRefillDate ? nextRefillDate.toLocaleDateString() : 'N/A'}
                                          </Typography>
                                          <Typography variant="caption" color="error.main">
                                            Overdue ({overdueDays.toFixed(1)} days ago)
                                          </Typography>
                                        </Box>
                                      );
                                    } else if (daysUntilRefill < 2) {
                                      // Urgent - less than 2 days
                                      return (
                                        <Box>
                                          <Typography variant="body2">
                                            {nextRefillDate ? nextRefillDate.toLocaleDateString() : 'N/A'}
                                          </Typography>
                                          <Typography variant="caption" color="warning.main">
                                            Urgent ({daysUntilRefill.toFixed(1)} days)
                                          </Typography>
                                        </Box>
                                      );
                                    } else {
                                      // Normal
                                      return nextRefillDate ? nextRefillDate.toLocaleDateString() : 'N/A';
                                    }
                                  })()}
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleOpenInstallationDialog(dispenser)}
                                      sx={{ '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteMachine(dispenser.id, dispenser.name || dispenser.sku)}
                                      title="Delete Installation"
                                      sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Results count */}
                {(() => {
                  let filteredCount = dispensers.filter(d => d.client_id).length;
                  if (installedFilters.client || installedFilters.location || installedFilters.sku || installedFilters.status) {
                    let filtered = dispensers.filter(d => d.client_id);
                    if (installedFilters.client) filtered = filtered.filter(d => d.client_id === installedFilters.client);
                    if (installedFilters.location) filtered = filtered.filter(d => d.location?.toLowerCase().includes(installedFilters.location.toLowerCase()));
                    if (installedFilters.sku) filtered = filtered.filter(d => d.sku === installedFilters.sku);
                    if (installedFilters.status) {
                      filtered = filtered.filter(d => {
                        const schedule = schedules.find(s => s.id === d.current_schedule_id);
                        const dailyUsage = usageData[d.id]?.daily_usage_ml || 0;
                        const lastRefill = d.last_refill_date ? new Date(d.last_refill_date) : null;
                        let currentLevel = d.current_level_ml;
                        if (lastRefill && dailyUsage > 0 && schedule) {
                          const now = new Date();
                          const timeDiffMs = now - lastRefill;
                          const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
                          const usageSinceRefill = daysElapsed * dailyUsage;
                          const refillAmount = d.current_level_ml;
                          currentLevel = Math.max(0, Math.min(refillAmount - usageSinceRefill, d.refill_capacity_ml));
                        }
                        const percentage = (currentLevel / d.refill_capacity_ml) * 100;
                        let daysUntilRefill = null;
                        if (dailyUsage > 0 && currentLevel > 0) {
                          const daysUntilEmpty = currentLevel / dailyUsage;
                          daysUntilRefill = daysUntilEmpty - 2;
                        }
                        switch (installedFilters.status) {
                          case 'good': return percentage >= 50;
                          case 'medium': return percentage >= 20 && percentage < 50;
                          case 'low': return percentage < 20;
                          case 'urgent': return daysUntilRefill !== null && daysUntilRefill >= 0 && daysUntilRefill < 2;
                          case 'overdue': return daysUntilRefill !== null && daysUntilRefill < 0;
                          default: return true;
                        }
                      });
                    }
                    filteredCount = filtered.length;
                  }
                  return (
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        Showing <strong>{filteredCount}</strong> of <strong>{dispensers.filter(d => d.client_id).length}</strong> installed machines
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Client Dialog */}
      <Dialog open={clientDialogOpen} onClose={handleCloseClientDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClientDialog}>Cancel</Button>
          <Button onClick={handleSaveClient} variant="contained" disabled={!clientForm.name}>
            {editingClient ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Machine Dialog */}
      <Dialog open={machineDialogOpen} onClose={handleCloseMachineDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMachine ? 'Edit Machine SKU' : 'Add New Machine SKU'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="SKU"
            placeholder="e.g., AROMA-DISP-001"
            value={machineForm.sku}
            onChange={(e) => setMachineForm({ ...machineForm, sku: e.target.value })}
            margin="normal"
            required
            helperText="Stock Keeping Unit - Unique identifier for the machine type"
          />
          <TextField
            fullWidth
            label="Code"
            placeholder="e.g., AD001"
            value={machineForm.code}
            onChange={(e) => setMachineForm({ ...machineForm, code: e.target.value })}
            margin="normal"
            required
            helperText="Unique code for this machine SKU"
          />
          <TextField
            fullWidth
            label="Capacity (ml)"
            type="number"
            placeholder="e.g., 500"
            value={machineForm.refill_capacity_ml}
            onChange={(e) => setMachineForm({ ...machineForm, refill_capacity_ml: e.target.value })}
            margin="normal"
            required
            helperText="Maximum refill capacity in milliliters"
            inputProps={{ min: 0, step: 1 }}
          />
          <TextField
            fullWidth
            label="ML Per Hour Usage"
            type="number"
            placeholder="e.g., 50"
            value={machineForm.ml_per_hour}
            onChange={(e) => setMachineForm({ ...machineForm, ml_per_hour: e.target.value })}
            margin="normal"
            required
            helperText="Machine-specific dispense rate (ml/hour)"
            inputProps={{ min: 0, step: 0.1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMachineDialog}>Cancel</Button>
          <Button
            onClick={handleSaveMachine}
            variant="contained"
            disabled={!machineForm.sku || !machineForm.code || !machineForm.refill_capacity_ml || !machineForm.ml_per_hour}
          >
            {editingMachine ? 'Update' : 'Create Machine'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            margin="normal"
            required
            disabled={!!editingUser}
          />
          <TextField
            fullWidth
            label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            margin="normal"
            required={!editingUser}
          />
          <FormControl fullWidth margin="normal">
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            >
              <MenuItem value="technician">Technician</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="developer">Developer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog}>Cancel</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={!userForm.username || (!editingUser && !userForm.password)}
          >
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Installation Dialog */}
      <Dialog open={installationDialogOpen} onClose={handleCloseInstallationDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingInstallation ? 'Edit Installation' : 'Create New Installation'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <Select
              value={installationForm.client_id || ''}
              onChange={(e) => {
                const selectedClientId = e.target.value;
                // Reset SKU and unique_code when client changes
                setInstallationForm({ 
                  ...installationForm, 
                  client_id: selectedClientId, 
                  sku: '', 
                  unique_code: '',
                  ml_per_hour: '',
                  refill_amount_ml: 0,
                  calculated_current_level: 0
                });
              }}
              displayEmpty
            >
              <MenuItem value="">Select Client</MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Location"
            placeholder="e.g., Main Lobby, Floor 1, Room 201"
            value={installationForm.location}
            onChange={(e) => setInstallationForm({ ...installationForm, location: e.target.value })}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal" required>
            <Select
              value={installationForm.sku || ''}
              onChange={(e) => {
                const selectedSku = e.target.value;
                // Find the SKU template from Machines tab (without client_id) to get capacity and ml_per_hour
                const skuTemplate = dispensers.find(d => d.sku === selectedSku && !d.client_id);
                
                // Find client assets (machines) for this client with this SKU
                const clientAssets = installationForm.client_id && selectedSku
                  ? dispensers.filter(d => 
                      d.client_id === installationForm.client_id && 
                      d.sku === selectedSku &&
                      d.unique_code &&
                      d.unique_code.trim() !== ''
                    )
                  : [];
                
                // Auto-select unique code if only one asset found, and auto-fill location
                let autoSelectedUniqueCode = '';
                let autoFilledLocation = installationForm.location || '';
                if (clientAssets.length === 1) {
                  autoSelectedUniqueCode = clientAssets[0].unique_code || '';
                  autoFilledLocation = clientAssets[0].location || '';
                }
                
                setInstallationForm({
                  ...installationForm,
                  sku: selectedSku,
                  unique_code: autoSelectedUniqueCode,
                  location: autoFilledLocation, // Auto-fill location when unique code is auto-selected
                  ml_per_hour: '', // Will be auto-filled when schedule is selected
                  refill_amount_ml: skuTemplate?.refill_capacity_ml || 0,
                  calculated_current_level: skuTemplate?.refill_capacity_ml || 0,
                });
              }}
              displayEmpty
              disabled={!installationForm.client_id}
            >
              <MenuItem value="">Select Machine SKU</MenuItem>
              {installationForm.client_id ? (
                // Only show SKUs from machines assigned to the selected client (status "assigned" or missing)
                [...new Set(dispensers
                  .filter(d => 
                    d.client_id === installationForm.client_id &&
                    (d.status === 'assigned' || !d.status || d.status === null || d.status === undefined || d.status === '')
                  )
                  .map(d => d.sku)
                )].map((sku) => (
                  <MenuItem key={sku} value={sku}>
                    {sku}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>Select a client first</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Unique Code Field - Show when client and SKU are selected */}
          {installationForm.client_id && installationForm.sku && (() => {
            // Find all client assets (machines) for this client with this SKU
            const clientAssets = dispensers.filter(d => 
              d.client_id === installationForm.client_id && 
              d.sku === installationForm.sku &&
              d.unique_code &&
              d.unique_code.trim() !== ''
            );
            
            if (clientAssets.length === 0) {
              // No assets found - allow manual entry
              return (
                <TextField
                  fullWidth
                  label="Unique Machine Code"
                  placeholder="e.g., AAA001, AAA002"
                  value={installationForm.unique_code || ''}
                  onChange={(e) => {
                    // When manually entering unique code, try to find matching asset to auto-fill location
                    const enteredCode = e.target.value;
                    const matchingAsset = dispensers.find(d => 
                      d.client_id === installationForm.client_id &&
                      d.sku === installationForm.sku &&
                      d.unique_code === enteredCode
                    );
                    setInstallationForm({ 
                      ...installationForm, 
                      unique_code: enteredCode,
                      location: matchingAsset?.location || installationForm.location
                    });
                  }}
                  margin="normal"
                  helperText="Enter unique code for this machine installation"
                />
              );
            } else if (clientAssets.length === 1) {
              // Only one asset - auto-selected and show as editable text field
              const uniqueCodeValue = installationForm.unique_code || clientAssets[0].unique_code || '';
              // Auto-fill location if unique code is auto-selected and location is empty
              if (clientAssets[0].unique_code && uniqueCodeValue === clientAssets[0].unique_code && !installationForm.location) {
                // Use useEffect-like behavior - update location when unique code is auto-selected
                setTimeout(() => {
                  setInstallationForm(prev => {
                    if (prev.unique_code === clientAssets[0].unique_code && !prev.location) {
                      return {
                        ...prev,
                        location: clientAssets[0].location || ''
                      };
                    }
                    return prev;
                  });
                }, 0);
              }
              return (
                <TextField
                  fullWidth
                  label="Unique Machine Code"
                  value={uniqueCodeValue}
                  onChange={(e) => {
                    const newUniqueCode = e.target.value;
                    // Find the asset with this unique code and auto-fill location
                    const selectedAsset = clientAssets.find(a => a.unique_code === newUniqueCode);
                    setInstallationForm({ 
                      ...installationForm, 
                      unique_code: newUniqueCode,
                      location: selectedAsset?.location || installationForm.location
                    });
                  }}
                  margin="normal"
                  helperText={`Auto-selected from client assets (1 found). You can edit if needed.`}
                />
              );
            } else {
              // Multiple assets (2 or more) - show dropdown to select from them
              return (
                <FormControl fullWidth margin="normal" required>
                  <Select
                    value={installationForm.unique_code || ''}
                    onChange={(e) => {
                      const selectedUniqueCode = e.target.value;
                      // Find the asset with this unique code and auto-fill location
                      const selectedAsset = clientAssets.find(a => a.unique_code === selectedUniqueCode);
                      setInstallationForm({ 
                        ...installationForm, 
                        unique_code: selectedUniqueCode,
                        location: selectedAsset?.location || ''
                      });
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">Select Unique Code</MenuItem>
                    {clientAssets.map((asset) => (
                      <MenuItem key={asset.id} value={asset.unique_code}>
                        {asset.unique_code}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {clientAssets.length} unique code(s) found for this client with SKU {installationForm.sku}. Please select one.
                  </Typography>
                </FormControl>
              );
            }
          })()}

          <TextField
            fullWidth
            label="ML Per Hour"
            type="number"
            placeholder="Auto-filled from schedule"
            value={installationForm.ml_per_hour}
            onChange={(e) => {
              const mlPerHour = e.target.value;
              // Get SKU template from Machines tab (without client_id)
              const skuTemplate = dispensers.find(d => d.sku === installationForm.sku && !d.client_id);
              const refillAmount = parseFloat(installationForm.refill_amount_ml) || skuTemplate?.refill_capacity_ml || 0;
              const calculated = installationForm.last_refill_date && installationForm.schedule_id
                ? calculateCurrentLevel(
                    refillAmount,
                    installationForm.last_refill_date,
                    installationForm.schedule_id,
                    mlPerHour ? parseFloat(mlPerHour) : null,
                    skuTemplate?.refill_capacity_ml || 0
                  )
                : refillAmount;
              setInstallationForm({ 
                ...installationForm, 
                ml_per_hour: mlPerHour,
                calculated_current_level: calculated
              });
            }}
            margin="normal"
            helperText="Auto-filled from selected schedule (editable)"
            inputProps={{ min: 0, step: 0.1 }}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Status</InputLabel>
            <Select
              value={installationForm.status || 'installed'}
              onChange={(e) => setInstallationForm({ ...installationForm, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="installed">Installed</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <Select
              value={installationForm.schedule_id || ''}
              onChange={(e) => {
                const scheduleId = e.target.value;
                const selectedSchedule = schedules.find(s => s.id === scheduleId);
                // Get SKU template from Machines tab (without client_id)
                const skuTemplate = dispensers.find(d => d.sku === installationForm.sku && !d.client_id);
                const refillAmount = parseFloat(installationForm.refill_amount_ml) || skuTemplate?.refill_capacity_ml || 0;
                
                // Auto-fill ml_per_hour from selected schedule
                const mlPerHourFromSchedule = selectedSchedule?.ml_per_hour || '';
                
                const calculated = installationForm.last_refill_date && scheduleId
                  ? calculateCurrentLevel(
                      refillAmount,
                      installationForm.last_refill_date,
                      scheduleId,
                      mlPerHourFromSchedule ? parseFloat(mlPerHourFromSchedule) : (installationForm.ml_per_hour ? parseFloat(installationForm.ml_per_hour) : null),
                      skuTemplate?.refill_capacity_ml || 0
                    )
                  : refillAmount;
                setInstallationForm({ 
                  ...installationForm, 
                  schedule_id: scheduleId,
                  ml_per_hour: mlPerHourFromSchedule || installationForm.ml_per_hour || '', // Auto-fill from schedule
                  calculated_current_level: calculated
                });
              }}
              displayEmpty
            >
              <MenuItem value="">No Schedule</MenuItem>
              {schedules.map((schedule) => (
                <MenuItem key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Refill Amount (ml)"
            type="number"
            value={installationForm.refill_amount_ml}
            onChange={(e) => {
              const refillAmount = parseFloat(e.target.value) || 0;
              // Get SKU template from Machines tab (without client_id)
              const skuTemplate = dispensers.find(d => d.sku === installationForm.sku && !d.client_id);
              const calculated = installationForm.last_refill_date && installationForm.schedule_id
                ? calculateCurrentLevel(
                    refillAmount,
                    installationForm.last_refill_date,
                    installationForm.schedule_id,
                    installationForm.ml_per_hour ? parseFloat(installationForm.ml_per_hour) : null,
                    skuTemplate?.refill_capacity_ml || 0
                  )
                : refillAmount;
              setInstallationForm({ 
                ...installationForm, 
                refill_amount_ml: e.target.value,
                calculated_current_level: calculated
              });
            }}
            margin="normal"
            helperText="Amount refilled (defaults to machine capacity)"
            inputProps={{ min: 0, step: 0.1 }}
          />

          <TextField
            fullWidth
            label="Last Refill Date & Time"
            type="datetime-local"
            value={installationForm.last_refill_date ? new Date(installationForm.last_refill_date).toISOString().slice(0, 16) : ''}
            onChange={(e) => {
              const dateTime = e.target.value ? new Date(e.target.value).toISOString() : null;
              // Get SKU template from Machines tab (without client_id)
              const skuTemplate = dispensers.find(d => d.sku === installationForm.sku && !d.client_id);
              const refillAmount = parseFloat(installationForm.refill_amount_ml) || skuTemplate?.refill_capacity_ml || 0;
              const calculated = dateTime && installationForm.schedule_id
                ? calculateCurrentLevel(
                    refillAmount,
                    dateTime,
                    installationForm.schedule_id,
                    installationForm.ml_per_hour ? parseFloat(installationForm.ml_per_hour) : null,
                    skuTemplate?.refill_capacity_ml || 0
                  )
                : refillAmount;
              setInstallationForm({ 
                ...installationForm, 
                last_refill_date: dateTime,
                calculated_current_level: calculated
              });
            }}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Date and time when the machine was last refilled"
          />

          <TextField
            fullWidth
            label="Current Level (ml) - Calculated"
            type="number"
            value={installationForm.calculated_current_level.toFixed(2)}
            margin="normal"
            disabled
            helperText="Automatically calculated based on refill amount, last refill date, and daily usage"
            InputLabelProps={{ shrink: true }}
          />

          {installationForm.schedule_id && installationForm.ml_per_hour && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Daily ML Usage will be calculated based on schedule running time × ml per hour
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Next Refill Date will be set to 2 days before the machine runs empty
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInstallationDialog}>Cancel</Button>
          <Button
            onClick={handleSaveInstallation}
            variant="contained"
            disabled={!installationForm.client_id || !installationForm.sku || !installationForm.location}
          >
            {editingInstallation ? 'Update' : 'Create Installation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Machine to Client Dialog - Simple Form */}
      <Dialog open={addMachineToClientDialogOpen} onClose={handleCloseAddMachineToClientDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Machine Asset to Client</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Machine SKU</InputLabel>
            <Select
              value={addMachineToClientForm.sku || ''}
              onChange={(e) => setAddMachineToClientForm({ ...addMachineToClientForm, sku: e.target.value })}
              displayEmpty
              label="Machine SKU"
            >
              <MenuItem value="">Select Machine SKU</MenuItem>
              {(() => {
                // Only show SKU templates (machines without client_id) from the Machines tab
                const skuTemplates = dispensers.filter(d => !d.client_id);
                // Get unique SKUs to avoid duplicates
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
            value={addMachineToClientForm.unique_code}
            onChange={(e) => setAddMachineToClientForm({ ...addMachineToClientForm, unique_code: e.target.value })}
            margin="normal"
            required
            helperText="Unique identifier for this specific machine"
          />

          <TextField
            fullWidth
            label="Location"
            placeholder="e.g., Washroom1, Lobby, Room1"
            value={addMachineToClientForm.location}
            onChange={(e) => setAddMachineToClientForm({ ...addMachineToClientForm, location: e.target.value })}
            margin="normal"
            helperText="Location where the machine will be installed"
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Status</InputLabel>
            <Select
              value={addMachineToClientForm.status || 'assigned'}
              onChange={(e) => setAddMachineToClientForm({ ...addMachineToClientForm, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="assigned">Assigned</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Installation Date"
            type="date"
            value={addMachineToClientForm.installation_date ? new Date(addMachineToClientForm.installation_date).toISOString().slice(0, 10) : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value).toISOString() : null;
              setAddMachineToClientForm({ ...addMachineToClientForm, installation_date: date });
            }}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Date when the machine was installed/assigned to client"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddMachineToClientDialog}>Cancel</Button>
          <Button
            onClick={handleSaveMachineToClient}
            variant="contained"
            disabled={!addMachineToClientForm.client_id || !addMachineToClientForm.sku || !addMachineToClientForm.unique_code}
          >
            Add Machine Asset
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Client Details Dialog */}
      <Dialog open={viewClientDialogOpen} onClose={() => setViewClientDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Client Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingClient && (() => {
            const clientAssets = dispensers.filter((d) => d.client_id === viewingClient.id);
            return (
              <Box>
                {/* Client Information */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: 'text.primary' }}>
                    Client Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Client Name
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewingClient.name}
                      </Typography>
                    </Grid>
                    {viewingClient.contact_person && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Contact Person
                        </Typography>
                        <Typography variant="body1">
                          {viewingClient.contact_person}
                        </Typography>
                      </Grid>
                    )}
                    {viewingClient.email && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {viewingClient.email}
                        </Typography>
                      </Grid>
                    )}
                    {viewingClient.phone && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Phone
                        </Typography>
                        <Typography variant="body1">
                          {viewingClient.phone}
                        </Typography>
                      </Grid>
                    )}
                    {viewingClient.address && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Address
                        </Typography>
                        <Typography variant="body1">
                          {viewingClient.address}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* Assigned Machines/Assets */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      Assigned Machines ({clientAssets.length})
                    </Typography>
                  </Box>
                  
                  {clientAssets.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                      <Typography color="text.secondary" variant="body1">
                        No machines assigned to this client
                      </Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                        Click the "+" button to add machine assets
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>SKU</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Unique Code</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Capacity (ml)</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Current Level (ml)</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>ML Per Hour</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 1.5 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {clientAssets.map((asset, index) => {
                            const levelPercentage = asset.refill_capacity_ml > 0 
                              ? (asset.current_level_ml / asset.refill_capacity_ml) * 100 
                              : 0;
                            return (
                              <TableRow 
                                key={asset.id}
                                hover
                                sx={{ 
                                  '&:hover': { bgcolor: 'action.hover' },
                                  bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                                }}
                              >
                                <TableCell sx={{ py: 1.5 }}>
                                  <Chip 
                                    label={asset.sku || 'N/A'} 
                                    size="small" 
                                    variant="outlined"
                                    color="primary"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {asset.unique_code && asset.unique_code.trim() !== '' ? asset.unique_code : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2">
                                    {asset.location || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2">
                                    {asset.refill_capacity_ml ? `${asset.refill_capacity_ml} ml` : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                  <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                      {asset.current_level_ml ? `${asset.current_level_ml.toFixed(1)} ml` : '0 ml'}
                                    </Typography>
                                    {asset.refill_capacity_ml > 0 && (
                                      <LinearProgress
                                        variant="determinate"
                                        value={levelPercentage}
                                        color={
                                          levelPercentage < 20 ? 'error' :
                                          levelPercentage < 50 ? 'warning' : 'success'
                                        }
                                        sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                                      />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2">
                                    {asset.ml_per_hour ? `${asset.ml_per_hour} ml/hr` : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1.5 }}>
                                  {(() => {
                                    // Determine the actual status - default to 'assigned' if missing
                                    const actualStatus = asset.status || 'assigned';
                                    return (
                                      <Chip 
                                        label={actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)} 
                                        size="small" 
                                        color={actualStatus === 'assigned' ? 'primary' : actualStatus === 'installed' ? 'success' : 'default'}
                                        variant="outlined"
                                      />
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewClientDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default AdminDashboard;
