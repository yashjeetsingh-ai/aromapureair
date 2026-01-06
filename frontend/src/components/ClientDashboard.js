import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Business,
  Devices,
  History,
  Logout,
  Menu,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDateIST } from '../utils/dateUtils';
import {
  getDispensers,
  getRefillLogs,
  getClients,
  calculateUsage,
} from '../services/api';

function ClientDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [dispensers, setDispensers] = useState([]);
  const [refillLogs, setRefillLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [usageData, setUsageData] = useState({});
  const [loading, setLoading] = useState(true);

  const clientId = user?.client_id || user?.username;
  const clientName = user?.client_name || 'Client';

  useEffect(() => {
    if (!user || user.role !== 'client') {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispensersData, logsData, clientsData] = await Promise.all([
        getDispensers(),
        getRefillLogs(),
        getClients(),
      ]);

      // Filter to only this client's machines
      const clientMachines = dispensersData.filter(d => d.client_id === clientId);
      setDispensers(clientMachines);
      setRefillLogs(logsData.filter(log => {
        const machine = clientMachines.find(d => d.id === log.dispenser_id);
        return machine !== undefined;
      }));
      setClients(clientsData);

      // Load usage data for machines with schedules
      const usagePromises = clientMachines
        .filter(d => d.current_schedule_id)
        .map(async (d) => {
          try {
            const usage = await calculateUsage(d.id);
            return { [d.id]: usage };
          } catch {
            return { [d.id]: null };
          }
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const clientMachines = dispensers.filter(d => d.client_id === clientId);
  const clientRefillLogs = refillLogs.filter(log => {
    return clientMachines.some(d => d.id === log.dispenser_id);
  });

  // Calculate statistics
  const totalMachines = clientMachines.length;
  const lowLevelMachines = clientMachines.filter(d => {
    const dailyUsage = usageData[d.id]?.daily_usage_ml || 0;
    const lastRefill = d.last_refill_date ? new Date(d.last_refill_date) : null;
    let currentLevel = d.current_level_ml;
    
    if (lastRefill && dailyUsage > 0 && d.current_schedule_id) {
      const now = new Date();
      const timeDiffMs = now - lastRefill;
      const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
      const refillAmount = d.current_level_ml > 0 ? d.current_level_ml : d.refill_capacity_ml;
      const usageSinceRefill = daysElapsed * dailyUsage;
      currentLevel = Math.max(0, Math.min(refillAmount - usageSinceRefill, d.refill_capacity_ml));
    }
    
    const percentage = (currentLevel / d.refill_capacity_ml) * 100;
    return percentage < 20;
  }).length;

  const totalRefills = clientRefillLogs.length;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'primary.main',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <Menu />
          </IconButton>
          <Business sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 500 }}>
            {clientName} Dashboard
          </Typography>
          <Button
            color="inherit"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{ textTransform: 'none' }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          pt: { xs: 8, sm: 9 },
          pb: 4,
        }}
      >
        <Container maxWidth="xl">
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Total Machines
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {totalMachines}
                      </Typography>
                    </Box>
                    <Devices sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Low Level Machines
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {lowLevelMachines}
                      </Typography>
                    </Box>
                    <History sx={{ fontSize: 40, color: 'warning.main', opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Total Refills
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {totalRefills}
                      </Typography>
                    </Box>
                    <History sx={{ fontSize: 40, color: 'success.main', opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Machines Table */}
          <Card elevation={0} sx={{ mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                My Machines
              </Typography>
              {clientMachines.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Devices sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                  <Typography color="text.secondary" variant="body1">
                    No machines assigned yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Unique Code</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Current Level</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Last Refill</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clientMachines.map((machine) => {
                        const dailyUsage = usageData[machine.id]?.daily_usage_ml || 0;
                        const lastRefill = machine.last_refill_date ? new Date(machine.last_refill_date) : null;
                        let currentLevel = machine.current_level_ml;
                        
                        if (lastRefill && dailyUsage > 0 && machine.current_schedule_id) {
                          const now = new Date();
                          const timeDiffMs = now - lastRefill;
                          const daysElapsed = timeDiffMs / (1000 * 60 * 60 * 24);
                          const refillAmount = machine.current_level_ml > 0 ? machine.current_level_ml : machine.refill_capacity_ml;
                          const usageSinceRefill = daysElapsed * dailyUsage;
                          currentLevel = Math.max(0, Math.min(refillAmount - usageSinceRefill, machine.refill_capacity_ml));
                        }
                        
                        const percentage = (currentLevel / machine.refill_capacity_ml) * 100;
                        let statusColor = 'success';
                        let statusText = 'Good';
                        if (percentage < 20) {
                          statusColor = 'error';
                          statusText = 'Low';
                        } else if (percentage < 50) {
                          statusColor = 'warning';
                          statusText = 'Medium';
                        }

                        return (
                          <TableRow key={machine.id} hover>
                            <TableCell>{machine.location || '-'}</TableCell>
                            <TableCell>
                              <Chip label={machine.sku || 'N/A'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{machine.unique_code || '-'}</TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {currentLevel.toFixed(1)} / {machine.refill_capacity_ml} ml
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  color={statusColor}
                                  sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={statusText} size="small" color={statusColor} />
                            </TableCell>
                            <TableCell>{formatDateIST(machine.last_refill_date)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Refill Logs */}
          <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                Refill History
              </Typography>
              {clientRefillLogs.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <History sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                  <Typography color="text.secondary" variant="body1">
                    No refill logs found
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Machine Code</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount (ml)</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Technician</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clientRefillLogs
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map((log) => {
                          const machine = clientMachines.find(d => d.id === log.dispenser_id);
                          return (
                            <TableRow key={log.id} hover>
                              <TableCell>{formatDateIST(log.timestamp)}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>
                                {machine?.unique_code || log.machine_unique_code || '-'}
                              </TableCell>
                              <TableCell>{machine?.location || log.location || '-'}</TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  +{log.refill_amount_ml?.toFixed(1) || 0} ml
                                </Typography>
                              </TableCell>
                              <TableCell>{log.technician_username || '-'}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
}

export default ClientDashboard;

