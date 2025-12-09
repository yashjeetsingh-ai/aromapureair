import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add, Delete, Edit, Menu } from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getDispensers } from '../services/api';
import Sidebar from './Sidebar';

function DeveloperDashboard() {
  const { user, logout } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const [dispensers, setDispensers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
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
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedulesData, dispensersData] = await Promise.all([
        getSchedules(),
        getDispensers(),
      ]);
      setSchedules(schedulesData);
      setDispensers(dispensersData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      const hasTimeRanges = schedule.time_ranges && schedule.time_ranges.length > 0;
      setFormData({
        name: schedule.name,
        type: schedule.type,
        scheduleType: hasTimeRanges ? 'time_based' : 'interval_based',
        duration_minutes: schedule.duration_minutes || 120,
        daily_cycles: schedule.daily_cycles || 1,
        ml_per_hour: schedule.ml_per_hour || '',
        intervals: schedule.intervals || [{ spray_seconds: 20, pause_seconds: 40 }],
        time_ranges: schedule.time_ranges || [
          { start_time: '00:00', end_time: '06:00', spray_seconds: 20, pause_seconds: 40 },
          { start_time: '06:00', end_time: '12:00', spray_seconds: 30, pause_seconds: 30 },
          { start_time: '12:00', end_time: '15:00', spray_seconds: 50, pause_seconds: 20 },
          { start_time: '15:00', end_time: '23:55', spray_seconds: 100, pause_seconds: 10 },
        ],
        days_of_week: schedule.days_of_week || [0, 1, 2, 3, 4, 5, 6],
      });
    } else {
      setEditingSchedule(null);
      setFormData({
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
    }
    setError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setError('');
  };

  const handleAddInterval = () => {
    setFormData({
      ...formData,
      intervals: [...formData.intervals, { spray_seconds: 20, pause_seconds: 40 }],
    });
  };

  const handleRemoveInterval = (index) => {
    setFormData({
      ...formData,
      intervals: formData.intervals.filter((_, i) => i !== index),
    });
  };

  const handleIntervalChange = (index, field, value) => {
    const newIntervals = [...formData.intervals];
    newIntervals[index][field] = parseInt(value) || 0;
    setFormData({ ...formData, intervals: newIntervals });
  };

  const handleDayToggle = (day) => {
    const currentDays = formData.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    setFormData({ ...formData, days_of_week: newDays });
  };

  const handleAddTimeRange = () => {
    setFormData({
      ...formData,
      time_ranges: [
        ...formData.time_ranges,
        { start_time: '00:00', end_time: '23:59', spray_seconds: 20, pause_seconds: 40 },
      ],
    });
  };

  const handleRemoveTimeRange = (index) => {
    setFormData({
      ...formData,
      time_ranges: formData.time_ranges.filter((_, i) => i !== index),
    });
  };

  const handleTimeRangeChange = (index, field, value) => {
    const newTimeRanges = [...formData.time_ranges];
    if (field === 'spray_seconds' || field === 'pause_seconds') {
      newTimeRanges[index][field] = parseInt(value) || 0;
    } else {
      newTimeRanges[index][field] = value;
    }
    setFormData({ ...formData, time_ranges: newTimeRanges });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.name.trim()) {
        setError('Schedule name is required');
        return;
      }

      let scheduleData;
      
      if (formData.scheduleType === 'time_based') {
        if (formData.time_ranges.length === 0) {
          setError('At least one time range is required');
          return;
        }
        scheduleData = {
          name: formData.name,
          type: formData.type,
          time_ranges: formData.time_ranges.map((tr) => ({
            start_time: tr.start_time,
            end_time: tr.end_time,
            spray_seconds: parseInt(tr.spray_seconds) || 0,
            pause_seconds: parseInt(tr.pause_seconds) || 0,
          })),
        };
        if (formData.ml_per_hour) {
          scheduleData.ml_per_hour = parseFloat(formData.ml_per_hour) || null;
        }
      } else {
        if (formData.intervals.length === 0) {
          setError('At least one interval is required');
          return;
        }
        scheduleData = {
          name: formData.name,
          type: formData.type,
          intervals: formData.intervals.map((i) => ({
            spray_seconds: parseInt(i.spray_seconds) || 0,
            pause_seconds: parseInt(i.pause_seconds) || 0,
          })),
          duration_minutes: parseInt(formData.duration_minutes) || 60,
          daily_cycles: parseInt(formData.daily_cycles) || 1,
        };
        if (formData.ml_per_hour) {
          scheduleData.ml_per_hour = parseFloat(formData.ml_per_hour) || null;
        }
      }

      // Add days_of_week only if not all 7 days are selected
      if (formData.days_of_week && formData.days_of_week.length < 7) {
        scheduleData.days_of_week = formData.days_of_week;
      }

      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, scheduleData);
        setSuccess('Schedule updated successfully!');
      } else {
        await createSchedule(scheduleData);
        setSuccess('Schedule created successfully!');
      }

      handleCloseDialog();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error saving schedule');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(scheduleId);
        setSuccess('Schedule deleted successfully!');
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        alert(err.response?.data?.detail || 'Error deleting schedule');
      }
    }
  };

  const calculateCycleUsage = (schedule) => {
    // Assuming 0.1ml per second of spray
    const ML_PER_SECOND = 0.1;
    
    if (schedule.time_ranges && schedule.time_ranges.length > 0) {
      // Calculate for time-based schedule
      let totalUsage = 0;
      schedule.time_ranges.forEach((tr) => {
        const [startH, startM] = tr.start_time.split(':').map(Number);
        const [endH, endM] = tr.end_time.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;
        if (endMinutes < startMinutes) endMinutes += 24 * 60;
        
        const durationSeconds = (endMinutes - startMinutes) * 60;
        const cycleDuration = tr.spray_seconds + tr.pause_seconds;
        const cycles = durationSeconds / cycleDuration;
        totalUsage += tr.spray_seconds * ML_PER_SECOND * cycles;
      });
      return totalUsage;
    } else if (schedule.intervals) {
      // Calculate for interval-based schedule
      return schedule.intervals.reduce((total, interval) => {
        return total + interval.spray_seconds * ML_PER_SECOND;
      }, 0);
    }
    return 0;
  };

  const getDispensersUsingSchedule = (scheduleId) => {
    return dispensers.filter((d) => d.current_schedule_id === scheduleId);
  };

  // Show only custom schedules to developers; fixed schedules are hidden
  const visibleSchedules = schedules.filter((s) => s.type !== 'fixed');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar 
        user={user} 
        logout={logout} 
        role="developer" 
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
              Developer Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ mt: { xs: 0, md: 2 }, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Schedule Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Create Schedule
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
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(auto-fill, minmax(300px, 1fr))',
              md: 'repeat(auto-fill, minmax(400px, 1fr))' 
            }, 
            gap: 3 
          }}>
            {visibleSchedules.map((schedule) => {
              const cycleUsage = calculateCycleUsage(schedule);
              const dailyUsage = schedule.time_ranges 
                ? cycleUsage 
                : cycleUsage * (schedule.daily_cycles || 1);
              const dispensersUsing = getDispensersUsingSchedule(schedule.id);
              const isTimeBased = schedule.time_ranges && schedule.time_ranges.length > 0;

              return (
                <Card key={schedule.id} elevation={3} sx={{ transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">{schedule.name}</Typography>
                      <Chip
                        label={schedule.type}
                        color={schedule.type === 'fixed' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </Box>
                    {isTimeBased ? (
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Type: Time-Based Schedule
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Time Ranges: {schedule.time_ranges.length}
                        </Typography>
                        {schedule.time_ranges.map((tr, idx) => (
                          <Typography key={idx} variant="caption" color="text.secondary" display="block" gutterBottom>
                            {tr.start_time} - {tr.end_time}: {tr.spray_seconds}s spray / {tr.pause_seconds}s pause
                          </Typography>
                        ))}
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Type: Interval-Based Schedule
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Duration: {schedule.duration_minutes || 'N/A'} minutes
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Daily Cycles: {schedule.daily_cycles || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Intervals: {schedule.intervals?.length || 0}
                        </Typography>
                      </>
                    )}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Daily Usage: {dailyUsage.toFixed(2)} ml
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Used by: {dispensersUsing.length} dispenser(s)
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {schedule.type === 'custom' && (
                        <>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(schedule)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(schedule.id)}
                            disabled={dispensersUsing.length > 0}
                          >
                            <Delete />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Schedule Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Schedule Type
            </Typography>
            <ToggleButtonGroup
              value={formData.scheduleType}
              exclusive
              onChange={(e, newType) => {
                if (newType) {
                  setFormData({ ...formData, scheduleType: newType });
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
                      checked={(formData.days_of_week || []).includes(day.value)}
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

          {formData.scheduleType === 'time_based' ? (
            <>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                Time Ranges
              </Typography>
              {formData.time_ranges.map((timeRange, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2">Time Range {index + 1}</Typography>
                      {formData.time_ranges.length > 1 && (
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
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  margin="normal"
                  required
                />
                <TextField
                  label="Daily Cycles"
                  type="number"
                  value={formData.daily_cycles}
                  onChange={(e) => setFormData({ ...formData, daily_cycles: e.target.value })}
                  margin="normal"
                  required
                />
              </Box>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Intervals
              </Typography>

              {formData.intervals.map((interval, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2">Interval {index + 1}</Typography>
                      {formData.intervals.length > 1 && (
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
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSchedule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default DeveloperDashboard;

