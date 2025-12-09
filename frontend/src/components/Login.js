import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { login as loginApi } from '../services/api';
import Logo from './Logo';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userData = await loginApi(username, password);
      login(userData);
      navigate(`/${userData.role}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, width: '100%', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <Logo size="large" color="primary" />
            </Box>
            <Typography variant="subtitle1" component="h2" gutterBottom color="text.secondary" sx={{ fontWeight: 400, mb: 1 }}>
              Management System
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Sign in to access your dashboard
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
          </form>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" display="block" gutterBottom sx={{ fontWeight: 500, mb: 1.5, color: 'text.primary' }}>
              Demo Credentials
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Technician:</strong> tech1 / tech123
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <strong>Admin:</strong> admin1 / admin123
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <strong>Developer:</strong> dev1 / dev123
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;

