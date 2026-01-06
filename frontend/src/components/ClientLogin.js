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
  Link,
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { clientLogin } from '../services/api';
import Logo from './Logo';

function ClientLogin() {
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Client login only
      const userData = await clientLogin(clientId, password);
      
      // Verify it's a client role
      if (userData.role !== 'client') {
        setError('Staff login is not allowed here. Please use the Staff Login page.');
        return;
      }
      
      login(userData);
      navigate(`/${userData.role}`);
    } catch (err) {
      console.error('Client login error:', err);
      if (err.response) {
        setError(err.response.data?.detail || 'Login failed. Please check your Client ID and password.');
      } else if (err.request) {
        setError('Network error: Could not reach the server. Please check your connection.');
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Login failed. Please try again.');
      }
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
        py: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3, sm: 4, md: 5 }, 
            width: '100%', 
            border: '1px solid', 
            borderColor: 'divider',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
            <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'center' }}>
              <Logo size="large" color="primary" />
            </Box>
            <Typography variant="subtitle1" component="h2" gutterBottom color="text.secondary" sx={{ fontWeight: 500, mb: 1, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              Client Portal
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}>
              Sign in to view your machines and refill history
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
              label="Client ID"
              variant="outlined"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              margin="normal"
              required
              helperText="Enter your Client ID provided by your administrator"
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

          <Box sx={{ 
            mt: { xs: 2.5, sm: 3 }, 
            textAlign: 'center'
          }}>
            <Link 
              href="/login" 
              underline="hover"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                color: 'primary.main'
              }}
            >
              Staff Login
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default ClientLogin;

