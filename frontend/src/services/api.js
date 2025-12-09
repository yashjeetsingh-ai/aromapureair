import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed?.token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    }
  } catch {
    // ignore parsing errors
  }
  return config;
});

export const login = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};

export const getSchedules = async () => {
  const response = await api.get('/schedules');
  return response.data;
};

export const createSchedule = async (schedule) => {
  const response = await api.post('/schedules', schedule);
  return response.data;
};

export const updateSchedule = async (scheduleId, schedule) => {
  const response = await api.put(`/schedules/${scheduleId}`, schedule);
  return response.data;
};

export const deleteSchedule = async (scheduleId) => {
  const response = await api.delete(`/schedules/${scheduleId}`);
  return response.data;
};

export const getDispensers = async () => {
  const response = await api.get('/dispensers');
  return response.data;
};

export const getDispenser = async (dispenserId) => {
  const response = await api.get(`/dispensers/${dispenserId}`);
  return response.data;
};

export const createDispenser = async (dispenser) => {
  const response = await api.post('/dispensers', dispenser);
  return response.data;
};

export const updateDispenser = async (dispenserId, dispenser) => {
  const response = await api.put(`/dispensers/${dispenserId}`, dispenser);
  return response.data;
};

export const deleteDispenser = async (dispenserId) => {
  const response = await api.delete(`/dispensers/${dispenserId}`);
  return response.data;
};

export const assignSchedule = async (dispenserId, scheduleId) => {
  const response = await api.post(`/dispensers/${dispenserId}/assign-schedule`, {
    schedule_id: scheduleId
  });
  return response.data;
};

export const logRefill = async (dispenserId, refillData) => {
  const response = await api.post(`/dispensers/${dispenserId}/refill`, refillData);
  return response.data;
};

export const getRefillLogs = async () => {
  const response = await api.get('/refill-logs');
  return response.data;
};

export const calculateUsage = async (dispenserId) => {
  const response = await api.get(`/dispensers/${dispenserId}/usage-calculation`);
  return response.data;
};

export const getClients = async () => {
  const response = await api.get('/clients');
  return response.data;
};

export const getClient = async (clientId) => {
  const response = await api.get(`/clients/${clientId}`);
  return response.data;
};

export const createClient = async (client) => {
  const response = await api.post('/clients', client);
  return response.data;
};

export const updateClient = async (clientId, client) => {
  const response = await api.put(`/clients/${clientId}`, client);
  return response.data;
};

export const deleteClient = async (clientId) => {
  const response = await api.delete(`/clients/${clientId}`);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (user) => {
  const response = await api.post('/users', user);
  return response.data;
};

export const updateUser = async (username, user) => {
  const response = await api.put(`/users/${username}`, user);
  return response.data;
};

export const deleteUser = async (username) => {
  const response = await api.delete(`/users/${username}`);
  return response.data;
};

// Technician Assignments
export const getTechnicianAssignments = async (technician = null, status = null) => {
  let url = '/technician-assignments';
  const params = new URLSearchParams();
  if (technician) params.append('technician', technician);
  if (status) params.append('status', status);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await api.get(url);
  return response.data;
};

export const createTechnicianAssignment = async (assignment) => {
  const response = await api.post('/technician-assignments', assignment);
  return response.data;
};

export const updateTechnicianAssignment = async (assignmentId, assignmentUpdate) => {
  const response = await api.put(`/technician-assignments/${assignmentId}`, assignmentUpdate);
  return response.data;
};

export const deleteTechnicianAssignment = async (assignmentId) => {
  const response = await api.delete(`/technician-assignments/${assignmentId}`);
  return response.data;
};

export const completeAssignment = async (assignmentId, completionData = {}) => {
  const response = await api.post(`/technician-assignments/${assignmentId}/complete`, completionData);
  return response.data;
};

export const getTechnicianStats = async (technicianUsername, startDate = null, endDate = null) => {
  let url = `/technician-stats/${technicianUsername}`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await api.get(url);
  return response.data;
};

