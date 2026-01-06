import axios from 'axios';

// Get API URL from environment variable (required)
const API_BASE_URL = process.env.REACT_APP_API_URL;

if (!API_BASE_URL) {
  console.error('REACT_APP_API_URL is not defined!');
  throw new Error('REACT_APP_API_URL environment variable is not defined. Please create a .env file in the frontend directory.');
}

// Log API URL in development only (for debugging)
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL configured:', API_BASE_URL);
}

// Sanitize console output to prevent API URL exposure
const sanitizeConsoleOutput = () => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const sanitize = (args) => {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.replace(API_BASE_URL, '[API_URL]').replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
          if (url.includes(API_BASE_URL.split('/')[2])) {
            return '[API_URL]';
          }
          return url;
        });
      }
      if (arg && typeof arg === 'object') {
        try {
          const str = JSON.stringify(arg);
          const sanitized = str.replace(API_BASE_URL, '[API_URL]').replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
            if (url.includes(API_BASE_URL.split('/')[2])) {
              return '[API_URL]';
            }
            return url;
          });
          return JSON.parse(sanitized);
        } catch {
          return arg;
        }
      }
      return arg;
    });
  };
  
  console.error = (...args) => originalError.apply(console, sanitize(args));
  console.warn = (...args) => originalWarn.apply(console, sanitize(args));
};

// Enable sanitization in development
if (process.env.NODE_ENV === 'development') {
  sanitizeConsoleOutput();
}

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

// Sanitize error responses to prevent API URL exposure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log full error in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
        } : null,
        request: error.request ? 'Request made but no response' : null,
      });
    }
    
    // Deep sanitize error to prevent API URL exposure in console
    if (error.config) {
      // Sanitize the config object (which axios uses for logging)
      if (error.config.baseURL) {
        error.config.baseURL = '[API_URL]';
      }
      if (error.config.url && typeof error.config.url === 'string') {
        error.config.url = error.config.url.replace(API_BASE_URL, '/api');
      }
      // Sanitize the full url in config
      if (error.config.url && error.config.baseURL) {
        Object.defineProperty(error.config, 'fullUrl', {
          value: '[API_URL]' + error.config.url,
          writable: false
        });
      }
    }
    
    // Sanitize error message
    if (error.message && typeof error.message === 'string') {
      error.message = error.message.replace(API_BASE_URL, '[API_URL]');
      error.message = error.message.replace(/https?:\/\/[^\s]+/g, '[API_URL]');
    }
    
    // Sanitize response config if present
    if (error.response?.config) {
      if (error.response.config.baseURL) {
        error.response.config.baseURL = '[API_URL]';
      }
      if (error.response.config.url) {
        error.response.config.url = error.response.config.url.replace(API_BASE_URL, '/api');
      }
    }
    
    // Sanitize request object
    if (error.request) {
      const requestCopy = { ...error.request };
      if (requestCopy.responseURL) {
        requestCopy.responseURL = requestCopy.responseURL.replace(API_BASE_URL, '[API_URL]');
      }
      Object.defineProperty(error, 'request', {
        value: requestCopy,
        writable: false,
        configurable: true
      });
    }
    
    return Promise.reject(error);
  }
);

export const login = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};

export const clientLogin = async (clientId, password) => {
  const response = await api.post('/client-login', { username: clientId, password });
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

