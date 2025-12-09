import React, { useState, useEffect, useContext } from 'react';
import { formatDateIST, formatDateTimeIST, formatDateTimeFullIST, toISTDateTimeLocal, fromISTDateTimeLocal, toISTDateLocal, fromISTDateLocal, getCurrentISTISO } from '../utils/dateUtils';
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
  Tabs,
  Tab,
  Checkbox,
  ListItemText,
  OutlinedInput,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
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
  PersonAdd,
  Assignment,
  PlaylistAdd,
  Build,
  Cancel,
  EventNote,
  Close,
  Menu,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import ResponsiveTable from './ResponsiveTable';
import TechnicianView from './TechnicianView';
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
  createTechnicianAssignment,
  getTechnicianAssignments,
  updateTechnicianAssignment,
  deleteTechnicianAssignment,
  getTechnicianStats,
} from '../services/api';

function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  // Dashboard view when no tab is specified, Machines tab = 0, Clients = 1, Users = 2, Refill Logs = 3
  const [activeTab, setActiveTab] = useState(location?.state?.tab !== undefined ? location.state.tab : null);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const [dispensers, setDispensers] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [refillLogs, setRefillLogs] = useState([]);
  const [usageData, setUsageData] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Technician View Mode
  const [technicianViewMode, setTechnicianViewMode] = useState(false);
  const [selectedTechnicianForView, setSelectedTechnicianForView] = useState('');
  const [technicianAssignments, setTechnicianAssignments] = useState([]);
  const [technicianStats, setTechnicianStats] = useState(null);
  
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
  
  // Assign Technician states
  const [assignTechnicianDialogOpen, setAssignTechnicianDialogOpen] = useState(false);
  const [selectedMachineForAssignment, setSelectedMachineForAssignment] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assignVisitDate, setAssignVisitDate] = useState('');
  const [assignServiceType, setAssignServiceType] = useState('refill');
  
  // Assign Task states
  const [assignTaskDialogOpen, setAssignTaskDialogOpen] = useState(false);
  const [assignTaskSubTab, setAssignTaskSubTab] = useState(0); // 0 = Machine List, 1 = Assigned Tasks
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [assignTaskForm, setAssignTaskForm] = useState({
    client_id: '',
    service_type: 'refill', // refill, maintenance, installation, discontinue
    machine_codes: [], // Multiple machine codes
    selected_machines: [], // Array of {code, location, sku} objects
    visit_date: '',
    technician_username: '',
    notes: '',
  });
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({
    technician_username: '',
    visit_date: '',
    task_type: 'refill',
    status: 'pending',
    notes: '',
  });
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

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
    installation_date: null,
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
      const [dispensersData, schedulesData, logsData, clientsData, usersData, assignmentsData] = await Promise.all([
        getDispensers(),
        getSchedules(),
        getRefillLogs(),
        getClients(),
        getUsers(),
        getTechnicianAssignments(),
      ]);
      setDispensers(dispensersData);
      setSchedules(schedulesData);
      setRefillLogs(logsData);
      setClients(clientsData);
      setUsers(usersData);
      setAssignedTasks(assignmentsData);

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

  const loadTechnicianData = async (technicianUsername) => {
    try {
      const [assignmentsData, statsData] = await Promise.all([
        getTechnicianAssignments(technicianUsername),
        getTechnicianStats(technicianUsername),
      ]);
      setTechnicianAssignments(assignmentsData);
      setTechnicianStats(statsData);
    } catch (err) {
      console.error('Error loading technician data:', err);
    }
  };

  const handleTechnicianViewChange = async (technicianUsername) => {
    if (technicianUsername) {
      setSelectedTechnicianForView(technicianUsername);
      setTechnicianViewMode(true);
      setLoading(true);
      try {
        await loadTechnicianData(technicianUsername);
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedTechnicianForView('');
      setTechnicianViewMode(false);
      setTechnicianAssignments([]);
      setTechnicianStats(null);
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

  const handleEditTask = async () => {
    if (!editingTask) return;
    try {
      await updateTechnicianAssignment(editingTask.id, {
        technician_username: editTaskForm.technician_username,
        visit_date: editTaskForm.visit_date ? new Date(editTaskForm.visit_date).toISOString() : null,
        task_type: editTaskForm.task_type,
        status: editTaskForm.status,
        notes: editTaskForm.notes,
      });
      setEditingTask(null);
      setEditTaskForm({
        technician_username: '',
        visit_date: '',
        task_type: 'refill',
        status: 'pending',
        notes: '',
      });
      loadData();
      alert('Task updated successfully!');
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Error updating task: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTechnicianAssignment(taskToDelete.id);
      setTaskToDelete(null);
      setDeleteTaskDialogOpen(false);
      loadData();
      alert('Task deleted successfully!');
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Error deleting task: ' + (err.response?.data?.detail || 'Unknown error'));
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
        // Check if this is a SKU template (no client_id) before updating
        const isSKUTemplate = !editingMachine.client_id;
        const oldMlPerHour = editingMachine.ml_per_hour;
        const newMlPerHour = parseFloat(machineForm.ml_per_hour);
        const oldCapacity = editingMachine.refill_capacity_ml;
        const newCapacity = parseFloat(machineForm.refill_capacity_ml);
        
        // Check if ml_per_hour or capacity changed
        const mlPerHourChanged = isSKUTemplate && oldMlPerHour !== newMlPerHour;
        const capacityChanged = isSKUTemplate && oldCapacity !== newCapacity;
        
        await updateDispenser(editingMachine.id, machineData);
        
        // If updating a SKU template (no client_id) and ml_per_hour or capacity changed, 
        // update all installed/assigned machines with the same SKU
        if (isSKUTemplate && (mlPerHourChanged || capacityChanged)) {
          // Get fresh list of all dispensers (including client_machines.json) to find machines to update
          const allDispensersData = await getDispensers();
          
          // Find all machines (installed and assigned) with the same SKU
          const machinesToUpdate = allDispensersData.filter(d => 
            d.sku === machineForm.sku && 
            d.client_id && // Only update client machines, not other SKU templates
            d.id !== editingMachine.id // Don't update the template itself
          );
          
          if (machinesToUpdate.length > 0) {
            const shouldUpdate = window.confirm(
              `This SKU template is used by ${machinesToUpdate.length} installed/assigned machine(s).\n\n` +
              `Do you want to update their ${mlPerHourChanged && capacityChanged ? 'ML Per Hour and Capacity' : mlPerHourChanged ? 'ML Per Hour' : 'Capacity'} to match the new SKU template values?\n\n` +
              `This will update:\n` +
              `${mlPerHourChanged ? `- ML Per Hour: ${oldMlPerHour} → ${newMlPerHour}\n` : ''}` +
              `${capacityChanged ? `- Capacity: ${oldCapacity} → ${newCapacity}\n` : ''}`
            );
            
            if (shouldUpdate) {
              // Update all machines with the same SKU
              const updatePromises = machinesToUpdate.map(async (machine) => {
                const updatedMachine = {
                  ...machine,
                  ml_per_hour: mlPerHourChanged ? newMlPerHour : machine.ml_per_hour,
                  refill_capacity_ml: capacityChanged ? newCapacity : machine.refill_capacity_ml,
                };
                await updateDispenser(machine.id, updatedMachine);
                
                // Recalculate usage if machine has a schedule
                if (machine.current_schedule_id) {
                  try {
                    await calculateUsage(machine.id);
                  } catch (err) {
                    console.error(`Error recalculating usage for ${machine.id}:`, err);
                  }
                }
              });
              
              await Promise.all(updatePromises);
              alert(`Successfully updated ${machinesToUpdate.length} machine(s) with the new SKU values.`);
            }
          }
        }
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
        installation_date: dispenser.installation_date || null,
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
        installation_date: getCurrentISTISO(), // Default to current date in IST for new installations
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
        last_refill_date: null,
        installation_date: addMachineToClientForm.installation_date || null, // Store installation date if provided
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

      // Ensure installation_date is always set for new installations
      // For editing, preserve existing value if not provided, otherwise use form value or current date
      let installationDate = installationForm.installation_date;
      if (!installationDate || installationDate.trim() === '') {
        if (editingInstallation) {
          // When editing, try to preserve existing installation_date from the machine
          const existingMachine = dispensers.find(d => d.id === (editingInstallation.id || assignedMachine?.id));
          installationDate = existingMachine?.installation_date || getCurrentISTISO();
        } else {
          // For new installations, always set to current date if not provided
          installationDate = getCurrentISTISO();
        }
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
        installation_date: installationDate, // Always set installation date
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

  // Extract client_id from installation task notes or dispenser_id
  const getClientIdFromInstallationTask = (task) => {
    if (task.task_type === 'installation') {
      // First, try to extract from notes
      if (task.notes) {
        const match = task.notes.match(/CLIENT_ID:([^|]+)/);
        if (match) {
          return match[1].trim();
        }
      }
      // Fallback: try to extract from dispenser_id pattern (installation_client_client_1_timestamp)
      if (task.dispenser_id && task.dispenser_id.startsWith('installation_client_')) {
        // Pattern: installation_client_client_1_timestamp
        // Extract: client_1 (the part after "installation_client_" and before the timestamp)
        // The timestamp is typically a long number, so we extract until we hit a long number
        const parts = task.dispenser_id.replace('installation_client_', '').split('_');
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

  // eslint-disable-next-line no-unused-vars
  const getLevelColor = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage < 20) return 'error';
    if (percentage < 50) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar 
        user={user} 
        logout={logout} 
        role="admin" 
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 4 },
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
              Admin Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ mt: { xs: 0, md: 0 }, mb: 4 }}>

        {/* Technician View Selector */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>View as Technician</InputLabel>
            <Select
              value={selectedTechnicianForView}
              onChange={(e) => handleTechnicianViewChange(e.target.value)}
              label="View as Technician"
            >
              <MenuItem value="">
                <em>Admin View</em>
              </MenuItem>
              {users.filter(u => u.role === 'technician').map((tech) => (
                <MenuItem key={tech.username} value={tech.username}>
                  {tech.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {technicianViewMode && (
            <Chip 
              label={`Viewing as: ${selectedTechnicianForView}`} 
              color="primary" 
              onDelete={() => handleTechnicianViewChange('')}
              deleteIcon={<Close />}
            />
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : technicianViewMode ? (
          /* Technician View Mode */
          <TechnicianView 
            technicianUsername={selectedTechnicianForView}
            assignments={technicianAssignments}
            stats={technicianStats}
            dispensers={dispensers}
            clients={clients}
            schedules={schedules}
            refillLogs={refillLogs}
            usageData={usageData}
            onDataChange={loadData}
          />
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
                                              {formatDateTimeIST(log.timestamp)}
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
                {(() => {
                  // Filter to show only SKU templates (machines without client_id)
                  const skuTemplates = dispensers.filter(d => !d.client_id);
                  
                  if (skuTemplates.length === 0) {
                    return (
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                        <Typography color="text.secondary" variant="body1">
                          No SKU templates found. Click "Add Machine" to create one.
                        </Typography>
                      </Box>
                    );
                  }
                  
                  return (
                    <ResponsiveTable
                      columns={[
                        { 
                          id: 'sku', 
                          label: 'SKU',
                          render: (value) => (
                            <Chip
                              label={value || 'N/A'}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ fontWeight: 500 }}
                            />
                          ),
                        },
                        { 
                          id: 'unique_code', 
                          label: 'Code',
                          render: (value) => (
                            <Typography variant="body2" fontWeight={500}>
                              {value || 'N/A'}
                            </Typography>
                          ),
                          bold: true,
                        },
                        { 
                          id: 'refill_capacity_ml', 
                          label: 'Capacity (ml)',
                          render: (value) => (
                            <Typography variant="body2" fontWeight={500}>
                              {value} ml
                            </Typography>
                          ),
                        },
                        { 
                          id: 'ml_per_hour', 
                          label: 'ML Per Hour Usage',
                          render: (value) => (
                            <Typography variant="body2" fontWeight={500}>
                              {value ? `${value} ml/hr` : 'N/A'}
                            </Typography>
                          ),
                        },
                      ]}
                      data={skuTemplates}
                      renderActions={(dispenser) => (
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
                      )}
                    />
                  );
                })()}
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
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3, gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenClientDialog()}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Add Client
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={async () => {
                      // Sync all machines across all clients with their SKU templates
                      const allClientMachines = dispensers.filter(d => d.client_id);
                      const machinesToSync = [];
                      const syncDetails = [];
                      
                      // Group by SKU for better reporting
                      const skuGroups = {};
                      
                      for (const machine of allClientMachines) {
                        // Find the SKU template
                        const skuTemplate = dispensers.find(d => d.sku === machine.sku && !d.client_id);
                        if (skuTemplate) {
                          const needsMlPerHourUpdate = machine.ml_per_hour !== skuTemplate.ml_per_hour;
                          const needsCapacityUpdate = machine.refill_capacity_ml !== skuTemplate.refill_capacity_ml;
                          
                          if (needsMlPerHourUpdate || needsCapacityUpdate) {
                            machinesToSync.push({
                              machine,
                              skuTemplate,
                              needsMlPerHourUpdate,
                              needsCapacityUpdate
                            });
                            
                            // Group by SKU for summary
                            if (!skuGroups[machine.sku]) {
                              skuGroups[machine.sku] = {
                                sku: machine.sku,
                                count: 0,
                                mlPerHourChanges: [],
                                capacityChanges: []
                              };
                            }
                            skuGroups[machine.sku].count++;
                            if (needsMlPerHourUpdate) {
                              skuGroups[machine.sku].mlPerHourChanges.push({
                                code: machine.unique_code,
                                old: machine.ml_per_hour,
                                new: skuTemplate.ml_per_hour
                              });
                            }
                            if (needsCapacityUpdate) {
                              skuGroups[machine.sku].capacityChanges.push({
                                code: machine.unique_code,
                                old: machine.refill_capacity_ml,
                                new: skuTemplate.refill_capacity_ml
                              });
                            }
                          }
                        }
                      }
                      
                      if (machinesToSync.length === 0) {
                        alert('All machines are already in sync with their SKU templates.');
                        return;
                      }
                      
                      // Create summary message
                      let summaryMessage = `Found ${machinesToSync.length} machine(s) across all clients that need to be synced:\n\n`;
                      
                      // Add summary by SKU
                      Object.values(skuGroups).forEach(group => {
                        summaryMessage += `${group.sku}: ${group.count} machine(s)\n`;
                        if (group.mlPerHourChanges.length > 0) {
                          const uniqueChanges = [...new Set(group.mlPerHourChanges.map(c => `${c.old} → ${c.new}`))];
                          summaryMessage += `  - ML/hr updates: ${uniqueChanges.join(', ')}\n`;
                        }
                        if (group.capacityChanges.length > 0) {
                          const uniqueChanges = [...new Set(group.capacityChanges.map(c => `${c.old} → ${c.new}`))];
                          summaryMessage += `  - Capacity updates: ${uniqueChanges.join(', ')}\n`;
                        }
                        summaryMessage += '\n';
                      });
                      
                      summaryMessage += 'Do you want to update all these machines to match their SKU template values?';
                      
                      const shouldSync = window.confirm(summaryMessage);
                      
                      if (shouldSync) {
                        try {
                          let successCount = 0;
                          let errorCount = 0;
                          
                          for (const { machine, skuTemplate, needsMlPerHourUpdate, needsCapacityUpdate } of machinesToSync) {
                            try {
                              const updatedMachine = {
                                ...machine,
                                ml_per_hour: needsMlPerHourUpdate ? skuTemplate.ml_per_hour : machine.ml_per_hour,
                                refill_capacity_ml: needsCapacityUpdate ? skuTemplate.refill_capacity_ml : machine.refill_capacity_ml,
                              };
                              await updateDispenser(machine.id, updatedMachine);
                              
                              // Recalculate usage if machine has a schedule
                              if (machine.current_schedule_id) {
                                try {
                                  await calculateUsage(machine.id);
                                } catch (err) {
                                  console.error(`Error recalculating usage for ${machine.id}:`, err);
                                }
                              }
                              
                              successCount++;
                            } catch (err) {
                              console.error(`Error updating machine ${machine.id}:`, err);
                              errorCount++;
                            }
                          }
                          
                          if (errorCount > 0) {
                            alert(`Synced ${successCount} machine(s) successfully. ${errorCount} machine(s) failed to update.`);
                          } else {
                            alert(`Successfully synced ${successCount} machine(s) across all clients with their SKU templates.`);
                          }
                          
                          loadData();
                        } catch (err) {
                          alert('Error syncing machines: ' + (err.response?.data?.detail || 'Unknown error'));
                        }
                      }
                    }}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Sync All Machines with SKU Templates
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
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'auto', maxHeight: '80vh' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Refill ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 150 }}>Date & Time</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Fragrance Code</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Machine Code</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 150 }}>Machine Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 150 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Installation Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 100 }}>ML/Hr</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 100 }}>Refill #</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Level Before</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Adding ML</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Current ML</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 120 }}>Technician</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2, minWidth: 200 }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {refillLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={16} align="center" sx={{ py: 6 }}>
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
                                {/* Refill ID */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    {log.id || '-'}
                                  </Typography>
                                </TableCell>
                                
                                {/* Date & Time */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2">
                                    {new Date(log.timestamp).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </Typography>
                                </TableCell>
                                
                                {/* Fragrance Code */}
                                <TableCell sx={{ py: 1.5 }}>
                                  {log.fragrance_code ? (
                                    <Chip 
                                      label={log.fragrance_code} 
                                      size="small" 
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontWeight: 500 }}
                                    />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                
                                {/* Machine Unique Code */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {log.machine_unique_code || machine?.unique_code || '-'}
                                  </Typography>
                                </TableCell>
                                
                                {/* Machine Name */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {machine?.name || log.dispenser_id || '-'}
                                  </Typography>
                                </TableCell>
                                
                                {/* SKU */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Chip 
                                    label={machine?.sku || 'N/A'} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                
                                {/* Client */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {log.client_id ? getClientName(log.client_id) : (machine?.client_id ? getClientName(machine.client_id) : '-')}
                                  </Typography>
                                </TableCell>
                                
                                {/* Location */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {log.location || machine?.location || '-'}
                                  </Typography>
                                </TableCell>
                                
                                {/* Installation Date */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2">
                                    {log.installation_date ? formatDateIST(log.installation_date) : (machine?.installation_date ? formatDateIST(machine.installation_date) : '-')}
                                  </Typography>
                                </TableCell>
                                
                                {/* ML Per Hour */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {machine?.ml_per_hour
                                      ? `${machine.ml_per_hour} ml/hr`
                                      : 'N/A'}
                                  </Typography>
                                </TableCell>
                                
                                {/* Number of Refills Done */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Chip 
                                    label={log.number_of_refills_done || '-'} 
                                    size="small" 
                                    color="info"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                                
                                {/* Level Before Refill */}
                                <TableCell sx={{ py: 1.5 }}>
                                  {log.level_before_refill !== undefined && log.level_before_refill !== null ? (
                                    <Typography variant="body2" fontWeight={500} color="warning.main">
                                      {log.level_before_refill.toFixed(1)} ml
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                
                                {/* Adding ML Refill */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Chip 
                                    label={`+${log.refill_amount_ml?.toFixed(1) || 0} ml`} 
                                    size="small" 
                                    color="success"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                                
                                {/* Current ML Refill */}
                                <TableCell sx={{ py: 1.5 }}>
                                  {log.current_ml_refill !== undefined && log.current_ml_refill !== null ? (
                                    <Typography variant="body2" fontWeight={600} color="success.dark">
                                      {log.current_ml_refill.toFixed(1)} ml
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                
                                {/* Technician */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {log.technician_username || '-'}
                                  </Typography>
                                </TableCell>
                                
                                {/* Notes */}
                                <TableCell sx={{ py: 1.5 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ 
                                    maxWidth: 200, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
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
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Installation Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Last Refill Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Next Refill Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dispensers.filter(d => d.client_id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={14} align="center" sx={{ py: 6 }}>
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
                              <TableCell colSpan={14} align="center" sx={{ py: 6 }}>
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
                                    {formatDateIST(dispenser.installation_date)}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 2 }}>
                                  <Typography variant="body2">
                                    {formatDateIST(dispenser.last_refill_date)}
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
                                            {nextRefillDate ? formatDateIST(nextRefillDate) : 'N/A'}
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
                                            {nextRefillDate ? formatDateIST(nextRefillDate) : 'N/A'}
                                          </Typography>
                                          <Typography variant="caption" color="warning.main">
                                            Urgent ({daysUntilRefill.toFixed(1)} days)
                                          </Typography>
                                        </Box>
                                      );
                                    } else {
                                      // Normal
                                      return nextRefillDate ? formatDateIST(nextRefillDate) : 'N/A';
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

            {/* Assign Technician View */}
            {activeTab === 5 && (
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
                    Assign Technician
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Assign technicians to machines and manage service tasks
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3, gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<PlaylistAdd />}
                    onClick={() => {
                      setAssignTaskForm({
                        client_id: '',
                        service_type: 'refill',
                        machine_codes: [],
                        selected_machines: [],
                        visit_date: '',
                        technician_username: '',
                        notes: '',
                      });
                      setAssignTaskDialogOpen(true);
                    }}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Assign Task
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadData}
                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                  >
                    Refresh
                  </Button>
                </Box>

                {/* Sub-Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs 
                    value={assignTaskSubTab} 
                    onChange={(e, newValue) => setAssignTaskSubTab(newValue)}
                    sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 } }}
                  >
                    <Tab label="Machine List" icon={<Devices sx={{ fontSize: 18 }} />} iconPosition="start" />
                    <Tab 
                      label={`Assigned Tasks (${assignedTasks.length})`} 
                      icon={<Assignment sx={{ fontSize: 18 }} />} 
                      iconPosition="start" 
                    />
                  </Tabs>
                </Box>

                {/* Machine List Sub-Tab */}
                {assignTaskSubTab === 0 && (
                  <>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Client</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>SKU</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Unique Code</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Current Level</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Installation Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Last Refill Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Next Due Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            // Helper function to calculate next due date
                            const calculateNextDueDate = (dispenser) => {
                              const schedule = schedules.find(s => s.id === dispenser.current_schedule_id);
                              const dailyUsage = usageData[dispenser.id]?.daily_usage_ml || 0;
                              const lastRefill = dispenser.last_refill_date ? new Date(dispenser.last_refill_date) : null;
                              
                              if (!dailyUsage || dailyUsage === 0) return null;
                              
                              let currentLevel = dispenser.current_level_ml;
                              if (lastRefill && dailyUsage > 0 && schedule) {
                                const now = new Date();
                                const timeDiffMs = now - lastRefill;
                                const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
                                const refillAmount = dispenser.current_level_ml > 0 
                                  ? dispenser.current_level_ml 
                                  : dispenser.refill_capacity_ml;
                                const usageSinceRefill = daysElapsed * dailyUsage;
                                currentLevel = Math.max(0, Math.min(refillAmount - usageSinceRefill, dispenser.refill_capacity_ml));
                              }
                              
                              if (currentLevel <= 0) return new Date(); // Already due
                              
                              const daysUntilEmpty = currentLevel / dailyUsage;
                              const daysUntilRefill = daysUntilEmpty - 2; // 2 days buffer
                              
                              const nextDate = new Date();
                              nextDate.setDate(nextDate.getDate() + Math.round(daysUntilRefill));
                              return nextDate;
                            };

                            const installedMachines = dispensers
                              .filter(d => {
                                if (!d.client_id) return false;
                                if (d.status === 'assigned') return false;
                                if (d.status === 'installed') return true;
                                if (!d.status && d.location && d.location.trim() !== '') return true;
                                return false;
                              })
                              .map(d => ({
                                ...d,
                                nextDueDate: calculateNextDueDate(d)
                              }))
                              .sort((a, b) => {
                                // Sort by next due date ascending (earliest first, null last)
                                if (!a.nextDueDate && !b.nextDueDate) return 0;
                                if (!a.nextDueDate) return 1;
                                if (!b.nextDueDate) return -1;
                                return a.nextDueDate - b.nextDueDate;
                              });

                            if (installedMachines.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                                    <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                    <Typography color="text.secondary" variant="body1">
                                      No installed machines found
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return installedMachines.map((dispenser, index) => {
                              const schedule = schedules.find(s => s.id === dispenser.current_schedule_id);
                              const dailyUsage = usageData[dispenser.id]?.daily_usage_ml || 0;
                              const lastRefill = dispenser.last_refill_date ? new Date(dispenser.last_refill_date) : null;
                              
                              // Calculate current level based on refill logs and usage
                              let currentLevel = dispenser.current_level_ml || 0;
                              
                              if (lastRefill && dailyUsage > 0 && schedule) {
                                // Find the refill log that matches last_refill_date to get the level after refill
                                const matchingRefillLog = refillLogs
                                  .filter(log => {
                                    if (log.dispenser_id !== dispenser.id) return false;
                                    const logDate = new Date(log.timestamp);
                                    const refillDate = new Date(dispenser.last_refill_date);
                                    return Math.abs(logDate - refillDate) < 60000; // Within 1 minute
                                  })
                                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                                
                                // Use current_level_ml as the level immediately after the last refill
                                // This is what the API sets it to: old_level + refill_amount (capped)
                                const levelAfterRefill = dispenser.current_level_ml || dispenser.refill_capacity_ml || 0;
                                
                                const now = new Date();
                                const timeDiffMs = now - lastRefill;
                                const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
                                const usageSinceRefill = daysElapsed * dailyUsage;
                                
                                // Current level = level after refill - usage since refill
                                currentLevel = Math.max(0, Math.min(levelAfterRefill - usageSinceRefill, dispenser.refill_capacity_ml));
                              } else {
                                // If no schedule or last refill date, use stored current_level_ml
                                currentLevel = dispenser.current_level_ml || 0;
                              }

                              const percentage = (currentLevel / dispenser.refill_capacity_ml) * 100;
                              let urgencyStatus = 'good';
                              let urgencyColor = 'success';
                              if (percentage < 20) {
                                urgencyStatus = 'critical';
                                urgencyColor = 'error';
                              } else if (percentage < 50) {
                                urgencyStatus = 'medium';
                                urgencyColor = 'warning';
                              }

                              // Calculate days until due
                              const nextDueDate = dispenser.nextDueDate;
                              let daysUntilDue = null;
                              let dueStatus = 'normal';
                              if (nextDueDate) {
                                const now = new Date();
                                daysUntilDue = Math.round((nextDueDate - now) / (1000 * 60 * 60 * 24));
                                if (daysUntilDue < 0) dueStatus = 'overdue';
                                else if (daysUntilDue <= 2) dueStatus = 'urgent';
                                else if (daysUntilDue <= 5) dueStatus = 'soon';
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
                                      {dispenser.unique_code || '-'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 2 }}>
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>
                                        {currentLevel.toFixed(1)} / {dispenser.refill_capacity_ml} ml
                                      </Typography>
                                      <LinearProgress
                                        variant="determinate"
                                        value={percentage}
                                        color={urgencyColor}
                                        sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ py: 2 }}>
                                    <Typography variant="body2">
                                      {dispenser.installation_date 
                                        ? new Date(dispenser.installation_date).toLocaleDateString() 
                                        : 'N/A'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 2 }}>
                                    <Typography variant="body2">
                                      {formatDateIST(dispenser.last_refill_date)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 2 }}>
                                    {nextDueDate ? (
                                      <Box>
                                        <Typography 
                                          variant="body2" 
                                          fontWeight={500}
                                          color={dueStatus === 'overdue' ? 'error.main' : dueStatus === 'urgent' ? 'warning.main' : 'text.primary'}
                                        >
                                          {formatDateIST(nextDueDate)}
                                        </Typography>
                                        <Chip
                                          label={
                                            dueStatus === 'overdue' ? `${Math.abs(daysUntilDue)} days overdue` :
                                            daysUntilDue === 0 ? 'Due today' :
                                            `${daysUntilDue} days`
                                          }
                                          size="small"
                                          color={
                                            dueStatus === 'overdue' ? 'error' :
                                            dueStatus === 'urgent' ? 'warning' :
                                            dueStatus === 'soon' ? 'info' : 'default'
                                          }
                                          variant="outlined"
                                          sx={{ mt: 0.5 }}
                                        />
                                      </Box>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">N/A</Typography>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ py: 2 }}>
                                    <Chip
                                      label={urgencyStatus.charAt(0).toUpperCase() + urgencyStatus.slice(1)}
                                      size="small"
                                      color={urgencyColor}
                                      sx={{ fontWeight: 500 }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ py: 2 }}>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<PersonAdd />}
                                      onClick={() => {
                                        setSelectedMachineForAssignment(dispenser);
                                        setSelectedTechnician('');
                                        setAssignVisitDate('');
                                        setAssignServiceType('refill');
                                        setAssignTechnicianDialogOpen(true);
                                      }}
                                      sx={{ textTransform: 'none', borderRadius: 1.5 }}
                                    >
                                      Assign
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        Showing <strong>{dispensers.filter(d => {
                          if (!d.client_id) return false;
                          if (d.status === 'assigned') return false;
                          if (d.status === 'installed') return true;
                          if (!d.status && d.location && d.location.trim() !== '') return true;
                          return false;
                        }).length}</strong> installed machines (sorted by next due date)
                      </Typography>
                    </Box>
                  </>
                )}

                {/* Assigned Tasks Sub-Tab */}
                {assignTaskSubTab === 1 && (
                  <>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Client</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Machine Code</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>SKU</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Service Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Technician</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Assigned By</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Assigned Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Visit Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {assignedTasks.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                                <Assignment sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                                <Typography color="text.secondary" variant="body1">
                                  No tasks assigned yet
                                </Typography>
                                <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                  Click "Assign Task" to create a new task
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            assignedTasks
                              .sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date))
                              .map((task, index) => {
                                const dispenser = dispensers.find(d => d.id === task.dispenser_id);
                                const installationClientId = task.task_type === 'installation' 
                                  ? getClientIdFromInstallationTask(task) 
                                  : null;
                                const clientId = installationClientId || dispenser?.client_id;
                                const isInstallation = task.task_type === 'installation';
                                return (
                                  <TableRow 
                                    key={task.id}
                                    hover
                                    sx={{ 
                                      '&:hover': { bgcolor: 'action.hover' },
                                      bgcolor: index % 2 === 0 ? 'white' : 'grey.50'
                                    }}
                                  >
                                    <TableCell sx={{ py: 2 }}>
                                      <Typography variant="body2" fontWeight={500}>
                                        {getClientName(clientId)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Typography variant="body2">
                                        {isInstallation ? 'Installation Task' : (dispenser?.location || '-')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Typography variant="body2" fontWeight={500}>
                                        {isInstallation ? '-' : (dispenser?.unique_code || '-')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Chip 
                                        label={isInstallation ? 'N/A' : (dispenser?.sku || 'N/A')} 
                                        size="small" 
                                        variant="outlined"
                                      />
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Chip 
                                        label={task.task_type?.charAt(0).toUpperCase() + task.task_type?.slice(1) || 'Refill'}
                                        size="small"
                                        color={
                                          task.task_type === 'maintenance' ? 'secondary' :
                                          task.task_type === 'installation' ? 'info' :
                                          task.task_type === 'discontinue' ? 'error' : 'primary'
                                        }
                                        icon={
                                          task.task_type === 'maintenance' ? <Build sx={{ fontSize: 14 }} /> :
                                          task.task_type === 'discontinue' ? <Cancel sx={{ fontSize: 14 }} /> : undefined
                                        }
                                      />
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <People sx={{ fontSize: 16, color: 'primary.main' }} />
                                        <Typography variant="body2">
                                          {task.technician_username || '-'}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Typography variant="body2">
                                        {task.assigned_by || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Typography variant="body2">
                                        {formatDateIST(task.assigned_date)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <EventNote sx={{ fontSize: 16, color: 'info.main' }} />
                                        <Typography variant="body2">
                                          {formatDateIST(task.visit_date)}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Chip 
                                        label={
                                          task.status === 'completed' ? 'Completed' :
                                          task.status === 'assigned' ? 'Assigned & Pending' :
                                          task.status === 'cancelled' ? 'Cancelled' : 'Pending'
                                        }
                                        size="small"
                                        color={
                                          task.status === 'completed' ? 'success' :
                                          task.status === 'assigned' ? 'info' :
                                          task.status === 'cancelled' ? 'error' : 'warning'
                                        }
                                      />
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => {
                                            setEditingTask(task);
                                            setEditTaskForm({
                                              technician_username: task.technician_username || '',
                                              visit_date: task.visit_date ? task.visit_date.split('T')[0] : '',
                                              task_type: task.task_type || 'refill',
                                              status: task.status || 'pending',
                                              notes: task.notes || '',
                                            });
                                          }}
                                          sx={{ '&:hover': { bgcolor: 'primary.lighter' } }}
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => {
                                            setTaskToDelete(task);
                                            setDeleteTaskDialogOpen(true);
                                          }}
                                          sx={{ '&:hover': { bgcolor: 'error.lighter' } }}
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

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        Showing <strong>{assignedTasks.length}</strong> assigned tasks
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Client Dialog */}
      <Dialog 
        open={clientDialogOpen} 
        onClose={handleCloseClientDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
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
      <Dialog 
        open={machineDialogOpen} 
        onClose={handleCloseMachineDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
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
      <Dialog 
        open={userDialogOpen} 
        onClose={handleCloseUserDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
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
      <Dialog 
        open={installationDialogOpen} 
        onClose={handleCloseInstallationDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
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

          {/* SKU Field - Show as read-only TextField when editing, Select when creating new */}
          {editingInstallation ? (
            <TextField
              fullWidth
              label="Machine SKU"
              value={installationForm.sku || ''}
              margin="normal"
              disabled
              helperText="SKU cannot be changed after installation"
            />
          ) : (
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
          )}

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
            label="Installation Date (IST)"
            type="datetime-local"
            value={toISTDateTimeLocal(installationForm.installation_date)}
            onChange={(e) => {
              const dateTime = fromISTDateTimeLocal(e.target.value);
              setInstallationForm({ 
                ...installationForm, 
                installation_date: dateTime
              });
            }}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Date and time when the machine was installed (IST)"
            required
          />

          <TextField
            fullWidth
            label="Last Refill Date & Time (IST)"
            type="datetime-local"
            value={toISTDateTimeLocal(installationForm.last_refill_date)}
            onChange={(e) => {
              const dateTime = fromISTDateTimeLocal(e.target.value);
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
            helperText="Date and time when the machine was last refilled (IST)"
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
      <Dialog 
        open={addMachineToClientDialogOpen} 
        onClose={handleCloseAddMachineToClientDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
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
            value={toISTDateLocal(addMachineToClientForm.installation_date)}
            onChange={(e) => {
              const date = fromISTDateLocal(e.target.value);
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
      <Dialog 
        open={viewClientDialogOpen} 
        onClose={() => setViewClientDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
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
                    {clientAssets.length > 0 && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Refresh />}
                        onClick={async () => {
                          // Sync all machines to match their SKU templates
                          const machinesToSync = [];
                          const syncDetails = [];
                          
                          for (const machine of clientAssets) {
                            // Find the SKU template
                            const skuTemplate = dispensers.find(d => d.sku === machine.sku && !d.client_id);
                            if (skuTemplate) {
                              const needsMlPerHourUpdate = machine.ml_per_hour !== skuTemplate.ml_per_hour;
                              const needsCapacityUpdate = machine.refill_capacity_ml !== skuTemplate.refill_capacity_ml;
                              
                              if (needsMlPerHourUpdate || needsCapacityUpdate) {
                                machinesToSync.push({
                                  machine,
                                  skuTemplate,
                                  needsMlPerHourUpdate,
                                  needsCapacityUpdate
                                });
                                
                                syncDetails.push(
                                  `• ${machine.unique_code}: ` +
                                  `${needsMlPerHourUpdate ? `ML/hr: ${machine.ml_per_hour} → ${skuTemplate.ml_per_hour}` : ''}` +
                                  `${needsMlPerHourUpdate && needsCapacityUpdate ? ', ' : ''}` +
                                  `${needsCapacityUpdate ? `Capacity: ${machine.refill_capacity_ml} → ${skuTemplate.refill_capacity_ml}` : ''}`
                                );
                              }
                            }
                          }
                          
                          if (machinesToSync.length === 0) {
                            alert('All machines are already in sync with their SKU templates.');
                            return;
                          }
                          
                          const shouldSync = window.confirm(
                            `Found ${machinesToSync.length} machine(s) that need to be synced with their SKU templates:\n\n` +
                            syncDetails.join('\n') +
                            `\n\nDo you want to update these machines to match their SKU template values?`
                          );
                          
                          if (shouldSync) {
                            try {
                              const updatePromises = machinesToSync.map(async ({ machine, skuTemplate, needsMlPerHourUpdate, needsCapacityUpdate }) => {
                                const updatedMachine = {
                                  ...machine,
                                  ml_per_hour: needsMlPerHourUpdate ? skuTemplate.ml_per_hour : machine.ml_per_hour,
                                  refill_capacity_ml: needsCapacityUpdate ? skuTemplate.refill_capacity_ml : machine.refill_capacity_ml,
                                };
                                await updateDispenser(machine.id, updatedMachine);
                                
                                // Recalculate usage if machine has a schedule
                                if (machine.current_schedule_id) {
                                  try {
                                    await calculateUsage(machine.id);
                                  } catch (err) {
                                    console.error(`Error recalculating usage for ${machine.id}:`, err);
                                  }
                                }
                              });
                              
                              await Promise.all(updatePromises);
                              alert(`Successfully synced ${machinesToSync.length} machine(s) with their SKU templates.`);
                              loadData();
                            } catch (err) {
                              alert('Error syncing machines: ' + (err.response?.data?.detail || 'Unknown error'));
                            }
                          }
                        }}
                      >
                        Sync with SKU Templates
                      </Button>
                    )}
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

      {/* Assign Technician Dialog */}
      <Dialog 
        open={assignTechnicianDialogOpen} 
        onClose={() => setAssignTechnicianDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Assign Technician</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMachineForAssignment && (
            <Box>
              {/* Machine Details */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                  Machine Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Client</Typography>
                    <Typography variant="body2" fontWeight={500}>{getClientName(selectedMachineForAssignment.client_id)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Location</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedMachineForAssignment.location || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">SKU</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedMachineForAssignment.sku || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Unique Code</Typography>
                    <Typography variant="body2" fontWeight={500}>{selectedMachineForAssignment.unique_code || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Current Level</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedMachineForAssignment.current_level_ml?.toFixed(1) || 0} / {selectedMachineForAssignment.refill_capacity_ml} ml
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Last Refill</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {selectedMachineForAssignment.last_refill_date 
                        ? formatDateIST(selectedMachineForAssignment.last_refill_date) 
                        : 'Never'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Service Type Selection */}
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={assignServiceType}
                  onChange={(e) => setAssignServiceType(e.target.value)}
                  label="Service Type"
                >
                  <MenuItem value="refill">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Refresh sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography>Refill</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="maintenance">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Build sx={{ fontSize: 18, color: 'secondary.main' }} />
                      <Typography>Maintenance</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="installation">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Add sx={{ fontSize: 18, color: 'info.main' }} />
                      <Typography>Installation</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="discontinue">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cancel sx={{ fontSize: 18, color: 'error.main' }} />
                      <Typography>Discontinue</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Visit Date Selection */}
              <TextField
                fullWidth
                type="date"
                label="Visit Date"
                value={assignVisitDate}
                onChange={(e) => setAssignVisitDate(e.target.value)}
                margin="normal"
                required
                InputLabelProps={{ shrink: true }}
                helperText="Select the scheduled visit date for this task"
              />

              {/* Technician Selection with visit count */}
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Select Technician</InputLabel>
                <Select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  label="Select Technician"
                >
                  <MenuItem value="">Select a Technician</MenuItem>
                  {users
                    .filter(u => u.role === 'technician')
                    .map((technician) => {
                      // Count visits for this technician on the selected date
                      const selectedDateStr = assignVisitDate;
                      const visitsOnDate = assignedTasks.filter(task => {
                        if (task.technician_username !== technician.username) return false;
                        if (!task.visit_date) return false;
                        const taskDate = task.visit_date.split('T')[0];
                        return taskDate === selectedDateStr;
                      });
                      const visitCount = visitsOnDate.length;
                      
                      // Get client names for visits
                      const clientNames = visitsOnDate.map(task => {
                        const taskDispenser = dispensers.find(d => d.id === task.dispenser_id);
                        return getClientName(taskDispenser?.client_id);
                      }).filter(Boolean);
                      const uniqueClientNames = [...new Set(clientNames)];
                      
                      return (
                        <MenuItem key={technician.username} value={technician.username}>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <People sx={{ fontSize: 18, color: 'primary.main' }} />
                                <Typography fontWeight={500}>{technician.username}</Typography>
                              </Box>
                              {assignVisitDate && (
                                <Chip 
                                  label={`${visitCount} visit${visitCount !== 1 ? 's' : ''}`}
                                  size="small"
                                  color={visitCount === 0 ? 'success' : visitCount < 3 ? 'warning' : 'error'}
                                  variant="outlined"
                                  sx={{ ml: 2 }}
                                />
                              )}
                            </Box>
                            {assignVisitDate && visitCount > 0 && (
                              <Box sx={{ mt: 0.5, pl: 3.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Clients: {uniqueClientNames.join(', ')}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
                </Select>
              </FormControl>

              {/* Show scheduled visits for selected technician on selected date */}
              {selectedTechnician && assignVisitDate && (() => {
                const visitsOnDate = assignedTasks.filter(task => {
                  if (task.technician_username !== selectedTechnician) return false;
                  if (!task.visit_date) return false;
                  const taskDate = task.visit_date.split('T')[0];
                  return taskDate === assignVisitDate;
                });
                
                if (visitsOnDate.length > 0) {
                  return (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'info.dark' }}>
                        Scheduled Visits on {formatDateIST(assignVisitDate)} ({visitsOnDate.length})
                      </Typography>
                      {visitsOnDate.map((visit, idx) => {
                        const visitDispenser = dispensers.find(d => d.id === visit.dispenser_id);
                        return (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip 
                              label={visit.task_type} 
                              size="small" 
                              color={visit.task_type === 'refill' ? 'primary' : 'secondary'}
                              sx={{ minWidth: 80 }}
                            />
                            <Typography variant="body2">
                              {getClientName(visitDispenser?.client_id)} - {visitDispenser?.location || 'N/A'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                }
                return null;
              })()}

              {users.filter(u => u.role === 'technician').length === 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1.5 }}>
                  <Typography variant="body2" color="warning.dark">
                    No technicians found. Please add technician users in the Users tab first.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTechnicianDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (selectedTechnician && selectedMachineForAssignment && assignVisitDate) {
                try {
                  await createTechnicianAssignment({
                    dispenser_id: selectedMachineForAssignment.id,
                    technician_username: selectedTechnician,
                    assigned_by: user?.username || 'admin',
                    assigned_date: getCurrentISTISO(),
                    visit_date: new Date(assignVisitDate).toISOString(),
                    status: 'assigned',
                    task_type: assignServiceType,
                    notes: null,
                  });
                  alert(`Technician "${selectedTechnician}" has been assigned to machine at "${selectedMachineForAssignment.location}" (${selectedMachineForAssignment.unique_code || selectedMachineForAssignment.sku}) for ${assignVisitDate}.`);
                  setAssignTechnicianDialogOpen(false);
                  setSelectedMachineForAssignment(null);
                  setSelectedTechnician('');
                  setAssignVisitDate('');
                  setAssignServiceType('refill');
                  loadData(); // Refresh data
                } catch (err) {
                  alert('Error assigning technician: ' + (err.response?.data?.detail || 'Unknown error'));
                }
              }
            }}
            variant="contained"
            disabled={!selectedTechnician || !assignVisitDate}
            startIcon={<PersonAdd />}
          >
            Assign Technician
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog 
        open={assignTaskDialogOpen} 
        onClose={() => setAssignTaskDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaylistAdd sx={{ color: 'primary.main' }} />
            <Typography variant="h6">Assign Task</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Select Client */}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Client</InputLabel>
              <Select
                value={assignTaskForm.client_id}
                onChange={(e) => {
                  setAssignTaskForm({
                    ...assignTaskForm,
                    client_id: e.target.value,
                    machine_codes: [],
                    selected_machines: [],
                  });
                }}
                label="Select Client"
              >
                <MenuItem value="">Select a Client</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography>{client.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Select Service Type */}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Service Type</InputLabel>
              <Select
                value={assignTaskForm.service_type}
                onChange={(e) => setAssignTaskForm({ ...assignTaskForm, service_type: e.target.value })}
                label="Service Type"
              >
                <MenuItem value="refill">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Refresh sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography>Refill</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="maintenance">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Build sx={{ fontSize: 18, color: 'secondary.main' }} />
                    <Typography>Maintenance</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="installation">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Add sx={{ fontSize: 18, color: 'info.main' }} />
                    <Typography>Installation</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="discontinue">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Cancel sx={{ fontSize: 18, color: 'error.main' }} />
                    <Typography>Discontinue</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Select Machine Codes (Multiple) - Not required for installation tasks */}
            {assignTaskForm.client_id && assignTaskForm.service_type !== 'installation' && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Select Machine Code(s)</InputLabel>
                <Select
                  multiple
                  value={assignTaskForm.machine_codes}
                  onChange={(e) => {
                    const selectedCodes = e.target.value;
                    // Get machine details for selected codes
                    const clientMachines = dispensers.filter(d => 
                      d.client_id === assignTaskForm.client_id && 
                      (d.status === 'installed' || (!d.status && d.location))
                    );
                    const selectedMachines = clientMachines
                      .filter(m => selectedCodes.includes(m.unique_code))
                      .map(m => ({
                        id: m.id,
                        code: m.unique_code,
                        location: m.location,
                        sku: m.sku,
                      }));
                    setAssignTaskForm({
                      ...assignTaskForm,
                      machine_codes: selectedCodes,
                      selected_machines: selectedMachines,
                    });
                  }}
                  input={<OutlinedInput label="Select Machine Code(s)" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((code) => (
                        <Chip key={code} label={code} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {dispensers
                    .filter(d => 
                      d.client_id === assignTaskForm.client_id && 
                      d.unique_code &&
                      (d.status === 'installed' || (!d.status && d.location))
                    )
                    .map((machine) => (
                      <MenuItem key={machine.id} value={machine.unique_code}>
                        <Checkbox checked={assignTaskForm.machine_codes.indexOf(machine.unique_code) > -1} />
                        <ListItemText 
                          primary={machine.unique_code} 
                          secondary={`${machine.sku} - ${machine.location || 'No Location'}`}
                        />
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            {/* Info message for installation tasks */}
            {assignTaskForm.client_id && assignTaskForm.service_type === 'installation' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1.5 }}>
                <Typography variant="body2" color="info.dark">
                  <strong>Installation Task:</strong> No machine code selection required. The technician will have access to the client's information and can manage installations.
                </Typography>
              </Box>
            )}

            {/* Selected Machines Details */}
            {assignTaskForm.selected_machines.length > 0 && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Selected Machines ({assignTaskForm.selected_machines.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Machine Code</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignTaskForm.selected_machines.map((machine, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{machine.code}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{machine.location || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={machine.sku} size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Visit Date */}
            <TextField
              fullWidth
              type="date"
              label="Visit Date"
              value={assignTaskForm.visit_date}
              onChange={(e) => setAssignTaskForm({ ...assignTaskForm, visit_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />

            {/* Assign Technician */}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Assign Technician</InputLabel>
              <Select
                value={assignTaskForm.technician_username}
                onChange={(e) => setAssignTaskForm({ ...assignTaskForm, technician_username: e.target.value })}
                label="Assign Technician"
              >
                <MenuItem value="">Select a Technician</MenuItem>
                {users
                  .filter(u => u.role === 'technician')
                  .map((technician) => {
                    // Count visits for this technician on the selected date
                    const selectedDateStr = assignTaskForm.visit_date;
                    const visitsOnDate = assignedTasks.filter(task => {
                      if (task.technician_username !== technician.username) return false;
                      if (!task.visit_date) return false;
                      const taskDate = task.visit_date.split('T')[0];
                      return taskDate === selectedDateStr;
                    });
                    const visitCount = visitsOnDate.length;
                    
                    // Get client names for visits
                    const clientNames = visitsOnDate.map(task => {
                      const taskDispenser = dispensers.find(d => d.id === task.dispenser_id);
                      return getClientName(taskDispenser?.client_id);
                    }).filter(Boolean);
                    const uniqueClientNames = [...new Set(clientNames)];
                    
                    return (
                      <MenuItem key={technician.username} value={technician.username}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <People sx={{ fontSize: 18, color: 'primary.main' }} />
                              <Typography fontWeight={500}>{technician.username}</Typography>
                            </Box>
                            {assignTaskForm.visit_date && (
                              <Chip 
                                label={`${visitCount} visit${visitCount !== 1 ? 's' : ''}`}
                                size="small"
                                color={visitCount === 0 ? 'success' : visitCount < 3 ? 'warning' : 'error'}
                                variant="outlined"
                                sx={{ ml: 2 }}
                              />
                            )}
                          </Box>
                          {assignTaskForm.visit_date && visitCount > 0 && (
                            <Box sx={{ mt: 0.5, pl: 3.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Clients: {uniqueClientNames.join(', ')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>

            {/* Show scheduled visits for selected technician on selected date */}
            {assignTaskForm.technician_username && assignTaskForm.visit_date && (() => {
              const visitsOnDate = assignedTasks.filter(task => {
                if (task.technician_username !== assignTaskForm.technician_username) return false;
                if (!task.visit_date) return false;
                const taskDate = task.visit_date.split('T')[0];
                return taskDate === assignTaskForm.visit_date;
              });
              
              if (visitsOnDate.length > 0) {
                return (
                  <Box sx={{ mt: 1, p: 2, bgcolor: 'info.light', borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'info.dark' }}>
                      Scheduled Visits on {formatDateIST(assignTaskForm.visit_date)} ({visitsOnDate.length})
                    </Typography>
                    {visitsOnDate.map((visit, idx) => {
                      const visitDispenser = dispensers.find(d => d.id === visit.dispenser_id);
                      return (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip 
                            label={visit.task_type} 
                            size="small" 
                            color={visit.task_type === 'refill' ? 'primary' : 'secondary'}
                            sx={{ minWidth: 80 }}
                          />
                          <Typography variant="body2">
                            {getClientName(visitDispenser?.client_id)} - {visitDispenser?.location || 'N/A'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                );
              }
              return null;
            })()}

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={assignTaskForm.notes}
              onChange={(e) => setAssignTaskForm({ ...assignTaskForm, notes: e.target.value })}
              margin="normal"
              placeholder="Add any additional notes for this task..."
            />

            {users.filter(u => u.role === 'technician').length === 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1.5 }}>
                <Typography variant="body2" color="warning.dark">
                  No technicians found. Please add technician users in the Users tab first.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTaskDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              const isInstallation = assignTaskForm.service_type === 'installation';
              const hasValidData = assignTaskForm.client_id && assignTaskForm.technician_username && 
                (isInstallation || (assignTaskForm.selected_machines.length > 0));
              
              if (hasValidData) {
                try {
                  if (isInstallation) {
                    // For installation tasks, create assignment with client_id in notes and a placeholder dispenser_id
                    await createTechnicianAssignment({
                      dispenser_id: `installation_client_${assignTaskForm.client_id}_${Date.now()}`, // Placeholder ID
                      technician_username: assignTaskForm.technician_username,
                      assigned_by: user?.username || 'admin',
                      assigned_date: getCurrentISTISO(),
                      visit_date: assignTaskForm.visit_date ? new Date(assignTaskForm.visit_date).toISOString() : null,
                      status: 'assigned',
                      task_type: 'installation',
                      notes: `CLIENT_ID:${assignTaskForm.client_id}${assignTaskForm.notes ? ' | ' + assignTaskForm.notes : ''}`,
                    });
                    alert(`Installation task assigned to "${assignTaskForm.technician_username}" successfully!`);
                  } else {
                    // For other tasks, create assignment for each selected machine
                    for (const machine of assignTaskForm.selected_machines) {
                      await createTechnicianAssignment({
                        dispenser_id: machine.id,
                        technician_username: assignTaskForm.technician_username,
                        assigned_by: user?.username || 'admin',
                        assigned_date: getCurrentISTISO(),
                        visit_date: assignTaskForm.visit_date ? new Date(assignTaskForm.visit_date).toISOString() : null,
                        status: 'assigned',
                        task_type: assignTaskForm.service_type,
                        notes: assignTaskForm.notes || null,
                      });
                    }
                    alert(`${assignTaskForm.selected_machines.length} task(s) assigned to "${assignTaskForm.technician_username}" successfully!`);
                  }
                  setAssignTaskDialogOpen(false);
                  setAssignTaskForm({
                    client_id: '',
                    service_type: 'refill',
                    machine_codes: [],
                    selected_machines: [],
                    visit_date: '',
                    technician_username: '',
                    notes: '',
                  });
                  loadData(); // Refresh data
                } catch (err) {
                  alert('Error assigning task: ' + (err.response?.data?.detail || 'Unknown error'));
                }
              }
            }}
            variant="contained"
            disabled={
              !assignTaskForm.client_id || 
              !assignTaskForm.technician_username || 
              (assignTaskForm.service_type !== 'installation' && assignTaskForm.selected_machines.length === 0)
            }
            startIcon={<PlaylistAdd />}
          >
            {assignTaskForm.service_type === 'installation' 
              ? 'Assign Installation Task' 
              : `Assign Task (${assignTaskForm.selected_machines.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog 
        open={!!editingTask} 
        onClose={() => setEditingTask(null)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Technician</InputLabel>
            <Select
              value={editTaskForm.technician_username}
              onChange={(e) => setEditTaskForm({ ...editTaskForm, technician_username: e.target.value })}
              label="Technician"
            >
              {users.filter(u => u.role === 'technician').map((user) => (
                <MenuItem key={user.username} value={user.username}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Visit Date"
            type="date"
            value={editTaskForm.visit_date}
            onChange={(e) => setEditTaskForm({ ...editTaskForm, visit_date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Task Type</InputLabel>
            <Select
              value={editTaskForm.task_type}
              onChange={(e) => setEditTaskForm({ ...editTaskForm, task_type: e.target.value })}
              label="Task Type"
            >
              <MenuItem value="refill">Refill</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="installation">Installation</MenuItem>
              <MenuItem value="inspection">Inspection</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={editTaskForm.status}
              onChange={(e) => setEditTaskForm({ ...editTaskForm, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="assigned">Assigned & Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Notes"
            value={editTaskForm.notes}
            onChange={(e) => setEditTaskForm({ ...editTaskForm, notes: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTask(null)}>Cancel</Button>
          <Button onClick={handleEditTask} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={deleteTaskDialogOpen} onClose={() => setDeleteTaskDialogOpen(false)}>
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this task? This action cannot be undone.
          </Typography>
          {taskToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Technician:</strong> {taskToDelete.technician_username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Task Type:</strong> {taskToDelete.task_type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {taskToDelete.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTaskDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTask} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default AdminDashboard;
