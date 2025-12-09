import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tabs,
  Tab,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Pending,
  Cancel,
  Build,
  Devices,
  Business,
  ArrowBack,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { formatDateIST, formatDateTimeIST, getCurrentISTISO } from '../utils/dateUtils';
import {
  completeAssignment,
  logRefill,
  getDispenser,
  calculateUsage,
} from '../services/api';

function TechnicianView({
  technicianUsername,
  assignments,
  stats,
  dispensers,
  clients,
  schedules,
  refillLogs,
  usageData,
  onDataChange,
}) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Tasks, 1 = Machines, 2 = Stats
  const [refillDialogOpen, setRefillDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedDispenser, setSelectedDispenser] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillNotes, setRefillNotes] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getDispenserById = (dispenserId) => {
    return dispensers.find((d) => d.id === dispenserId);
  };

  const getClientIdFromInstallationTask = (assignment) => {
    if (assignment.task_type === 'installation') {
      if (assignment.notes) {
        const match = assignment.notes.match(/CLIENT_ID:([^|]+)/);
        if (match) return match[1].trim();
      }
      if (assignment.dispenser_id && assignment.dispenser_id.startsWith('installation_client_')) {
        const parts = assignment.dispenser_id.replace('installation_client_', '').split('_');
        if (parts.length >= 1) {
          const potentialClientId = parts[0];
          if (potentialClientId.startsWith('client_') || potentialClientId.match(/^[A-Z0-9]{8,12}$/)) {
            return potentialClientId;
          }
          if (parts[0] === 'client' && parts[1]) {
            return `${parts[0]}_${parts[1]}`;
          }
        }
      }
    }
    return null;
  };

  const handleRefillClick = (dispenser) => {
    setSelectedDispenser(dispenser);
    setRefillAmount('');
    setRefillNotes('');
    setRefillDialogOpen(true);
  };

  const handleCompleteClick = (assignment) => {
    setSelectedAssignment(assignment);
    setCompletionNotes('');
    setCompleteDialogOpen(true);
  };

  const handleRefillSubmit = async () => {
    if (!selectedDispenser || !refillAmount) {
      alert('Please enter refill amount');
      return;
    }

    try {
      await logRefill(selectedDispenser.id, {
        dispenser_id: selectedDispenser.id,
        technician_username: technicianUsername,
        refill_amount_ml: parseFloat(refillAmount),
        timestamp: getCurrentISTISO(),
        notes: refillNotes,
      });
      setRefillDialogOpen(false);
      onDataChange();
      alert('Refill logged successfully!');
    } catch (err) {
      alert('Error logging refill: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleCompleteSubmit = async () => {
    if (!selectedAssignment) return;

    try {
      await completeAssignment(selectedAssignment.id, {
        notes: completionNotes,
      });
      setCompleteDialogOpen(false);
      onDataChange();
      alert('Task completed successfully!');
    } catch (err) {
      alert('Error completing task: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  // Get all assignments
  const pendingAssignments = assignments.filter((a) => a.status === 'pending');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');
  
  // Get all machines the technician has worked on:
  // 1. From refill logs
  const technicianRefillLogs = refillLogs.filter(log => log.technician_username === technicianUsername);
  const machinesFromRefills = technicianRefillLogs
    .map(log => getDispenserById(log.dispenser_id))
    .filter((d) => d);
  
  // 2. From completed assignments (excluding installation placeholders)
  const machinesFromAssignments = assignments
    .filter((a) => a.status === 'completed' && a.dispenser_id && !a.dispenser_id.startsWith('installation_client_'))
    .map((a) => getDispenserById(a.dispenser_id))
    .filter((d) => d);
  
  // 3. From installation tasks - get machines for the client
  const installationTasks = assignments.filter(a => 
    a.task_type === 'installation' && 
    a.status === 'completed' && 
    a.dispenser_id && 
    a.dispenser_id.startsWith('installation_client_')
  );
  
  const machinesFromInstallations = installationTasks
    .map(task => {
      const clientId = getClientIdFromInstallationTask(task);
      if (clientId) {
        return dispensers.filter(d => d.client_id === clientId && d.status === 'installed');
      }
      return [];
    })
    .flat();
  
  // Combine all machines and remove duplicates
  const allTechnicianMachines = [
    ...machinesFromRefills,
    ...machinesFromAssignments,
    ...machinesFromInstallations
  ];
  
  // Remove duplicates by id
  const technicianMachines = Array.from(
    new Map(allTechnicianMachines.map(m => [m.id, m])).values()
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 400, mb: 1, color: 'text.primary', fontSize: '2rem' }}>
          Technician View: {technicianUsername}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
          Viewing dashboard as {technicianUsername}
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Total Assignments
                </Typography>
                <Typography variant="h4">{stats.machines_assigned || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Completed Tasks
                </Typography>
                <Typography variant="h4" color="success.main">{stats.completed_tasks || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Pending Tasks
                </Typography>
                <Typography variant="h4" color="warning.main">{stats.pending_refills || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Total Refills
                </Typography>
                <Typography variant="h4">{stats.refills_completed || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="My Tasks" icon={<Assignment />} iconPosition="start" />
            <Tab label="My Machines" icon={<Devices />} iconPosition="start" />
            <Tab label="Statistics" icon={<Business />} iconPosition="start" />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* Tasks Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Pending Tasks ({pendingAssignments.length})
              </Typography>
              {pendingAssignments.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No pending tasks</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Task Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Machine/Client</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Visit Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingAssignments.map((assignment) => {
                        const dispenser = getDispenserById(assignment.dispenser_id);
                        const isInstallation = assignment.task_type === 'installation';
                        return (
                          <TableRow key={assignment.id} hover>
                            <TableCell>
                              <Chip
                                label={assignment.task_type?.charAt(0).toUpperCase() + assignment.task_type?.slice(1) || 'Refill'}
                                size="small"
                                color={assignment.task_type === 'maintenance' ? 'secondary' : 'primary'}
                              />
                            </TableCell>
                            <TableCell>
                              {isInstallation ? (() => {
                                const clientId = getClientIdFromInstallationTask(assignment);
                                return (
                                  <Typography variant="body2">
                                    {clientId ? getClientName(clientId) : 'Installation Task'}
                                  </Typography>
                                );
                              })() : (
                                <Typography variant="body2">{dispenser?.unique_code || '-'}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {isInstallation ? (() => {
                                const clientId = getClientIdFromInstallationTask(assignment);
                                const clientMachines = dispensers.filter(d => d.client_id === clientId);
                                return (
                                  <Typography variant="body2">
                                    {clientMachines.length > 0 ? `${clientMachines.length} machine(s)` : '-'}
                                  </Typography>
                                );
                              })() : (
                                <Typography variant="body2">{dispenser?.location || '-'}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{formatDateIST(assignment.visit_date)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label="Pending" size="small" color="warning" />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleCompleteClick(assignment)}
                              >
                                Complete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                Completed Tasks ({completedAssignments.length})
              </Typography>
              {completedAssignments.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No completed tasks</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Task Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Machine/Client</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Completed Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {completedAssignments.map((assignment) => {
                        const dispenser = getDispenserById(assignment.dispenser_id);
                        const isInstallation = assignment.task_type === 'installation';
                        return (
                          <TableRow key={assignment.id} hover>
                            <TableCell>
                              <Chip
                                label={assignment.task_type?.charAt(0).toUpperCase() + assignment.task_type?.slice(1) || 'Refill'}
                                size="small"
                                color="success"
                              />
                            </TableCell>
                            <TableCell>
                              {isInstallation ? (() => {
                                const clientId = getClientIdFromInstallationTask(assignment);
                                return (
                                  <Typography variant="body2">
                                    {clientId ? getClientName(clientId) : 'Installation Task'}
                                  </Typography>
                                );
                              })() : (
                                <Typography variant="body2">{dispenser?.unique_code || '-'}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{formatDateIST(assignment.completed_date)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label="Completed" size="small" color="success" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Machines Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                My Machines ({technicianMachines.length})
              </Typography>
              {technicianMachines.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No machines assigned</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Current Level</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Installation Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Last Refill</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Refill Count</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {technicianMachines.map((machine) => {
                        const usage = usageData[machine.id];
                        const percentage = (machine.current_level_ml / machine.refill_capacity_ml) * 100;
                        const machineRefills = technicianRefillLogs.filter(log => log.dispenser_id === machine.id);
                        return (
                          <TableRow key={machine.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {machine.unique_code || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={machine.sku || 'N/A'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{getClientName(machine.client_id)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{machine.location || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {machine.current_level_ml.toFixed(1)} / {machine.refill_capacity_ml} ml
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  color={percentage < 20 ? 'error' : percentage < 50 ? 'warning' : 'success'}
                                  sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{formatDateIST(machine.installation_date)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{formatDateIST(machine.last_refill_date)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {machineRefills.length} refill{machineRefills.length !== 1 ? 's' : ''}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleRefillClick(machine)}
                              >
                                Log Refill
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Refill History */}
              {technicianRefillLogs.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Refill History ({technicianRefillLogs.length})
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Machine Code</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Amount (ml)</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {technicianRefillLogs
                          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                          .map((log) => {
                            const machine = getDispenserById(log.dispenser_id);
                            return (
                              <TableRow key={log.id} hover>
                                <TableCell>
                                  <Typography variant="body2">{formatDateTimeIST(log.timestamp)}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    {machine?.unique_code || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{machine ? getClientName(machine.client_id) : '-'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    {log.refill_amount_ml} ml
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {log.notes || '-'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Statistics Tab */}
          {activeTab === 2 && stats && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Task Statistics
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography>Total Assigned:</Typography>
                          <Typography fontWeight={600}>{stats.machines_assigned || 0}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography>Completed:</Typography>
                          <Typography fontWeight={600} color="success.main">{stats.completed_tasks || 0}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography>Pending:</Typography>
                          <Typography fontWeight={600} color="warning.main">{stats.pending_refills || 0}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Cancelled:</Typography>
                          <Typography fontWeight={600} color="error.main">{stats.cancelled_tasks || 0}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Refill Statistics
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography>Total Refills:</Typography>
                          <Typography fontWeight={600}>{stats.refills_completed || 0}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography>Total ML Refilled:</Typography>
                          <Typography fontWeight={600}>{stats.total_ml_refilled?.toFixed(2) || 0} ml</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography>Unique Visits:</Typography>
                          <Typography fontWeight={600}>{stats.visit_count || 0}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Refill Dialog */}
      <Dialog open={refillDialogOpen} onClose={() => setRefillDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Refill</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Refill Amount (ml)"
            type="number"
            value={refillAmount}
            onChange={(e) => setRefillAmount(e.target.value)}
            margin="normal"
            required
            inputProps={{ min: 0, step: 0.1 }}
          />
          <TextField
            fullWidth
            label="Notes (optional)"
            multiline
            rows={3}
            value={refillNotes}
            onChange={(e) => setRefillNotes(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefillDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRefillSubmit} variant="contained" disabled={!refillAmount}>
            Log Refill
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Task</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Completion Notes (optional)"
            multiline
            rows={3}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCompleteSubmit} variant="contained">
            Complete Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TechnicianView;
