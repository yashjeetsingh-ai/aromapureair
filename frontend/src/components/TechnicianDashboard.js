import React, { useState, useEffect, useContext } from 'react';
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
  AppBar,
  Toolbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Refresh, LocationOn, Inventory } from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { getDispensers, logRefill, getClients } from '../services/api';
import { Chip, LinearProgress } from '@mui/material';
import Sidebar from './Sidebar';

function TechnicianDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [dispensers, setDispensers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispenser, setSelectedDispenser] = useState(null);
  const [refillDialogOpen, setRefillDialogOpen] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDispensers();
  }, []);

  const loadDispensers = async () => {
    try {
      setLoading(true);
      const [dispensersData, clientsData] = await Promise.all([
        getDispensers(),
        getClients(),
      ]);
      setDispensers(dispensersData);
      setClients(clientsData);
    } catch (err) {
      console.error('Error loading dispensers:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'No Client';
  };

  const handleRefillClick = (dispenser) => {
    setSelectedDispenser(dispenser);
    setRefillAmount('');
    setNotes('');
    setRefillDialogOpen(true);
  };

  const handleRefillSubmit = async () => {
    try {
      const refillData = {
        dispenser_id: selectedDispenser.id,
        technician_username: user.username,
        refill_amount_ml: parseFloat(refillAmount),
        timestamp: new Date().toISOString(),
        notes: notes || null,
      };

      await logRefill(selectedDispenser.id, refillData);
      setSuccess('Refill logged successfully!');
      setRefillDialogOpen(false);
      loadDispensers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error logging refill:', err);
      alert('Error logging refill: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const getLevelColor = (current, capacity) => {
    const percentage = (current / capacity) * 100;
    if (percentage < 20) return 'error';
    if (percentage < 50) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar user={user} logout={logout} role="technician" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 260px)` },
        }}
      >
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Machines
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDispensers}
          >
            Refresh
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
            {dispensers.map((dispenser) => (
              <Card key={dispenser.id} elevation={3} sx={{ transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {dispenser.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {dispenser.location}
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
                  </Box>
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {dispenser.current_level_ml.toFixed(1)} / {dispenser.refill_capacity_ml} ml
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
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleRefillClick(dispenser)}
                    sx={{ mt: 2 }}
                  >
                    Log Refill
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>

      <Dialog open={refillDialogOpen} onClose={() => setRefillDialogOpen(false)}>
        <DialogTitle>Log Refill - {selectedDispenser?.name}</DialogTitle>
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefillDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRefillSubmit} variant="contained" disabled={!refillAmount}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default TechnicianDashboard;

