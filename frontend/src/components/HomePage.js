import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Devices,
  Business,
  Schedule,
  Analytics,
  Security,
  CloudSync,
} from '@mui/icons-material';
import Logo from './Logo';

function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Devices sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Machine Management',
      description: 'Comprehensive tracking and monitoring of all perfume dispensers with real-time status updates.',
    },
    {
      icon: <Business sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Client Management',
      description: 'Organize client information, locations, and installations with detailed client profiles.',
    },
    {
      icon: <Schedule sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Custom Schedules',
      description: 'Create and manage flexible spray schedules tailored to specific client requirements.',
    },
    {
      icon: <Analytics sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Usage Analytics',
      description: 'Monitor consumption patterns and predict refill requirements with intelligent calculations.',
    },
    {
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Role-Based Access',
      description: 'Secure access control with technician, admin, and developer roles for your organization.',
    },
    {
      icon: <CloudSync sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Real-Time Updates',
      description: 'Instant synchronization of refills, schedules, and machine status across all devices.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Logo size="medium" color="primary" />
          </Box>
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center' }}>
            <Button
              color="primary"
              variant="text"
              onClick={() => navigate('/client-login')}
              sx={{ 
                display: { xs: 'none', sm: 'inline-flex' },
                minWidth: { xs: 'auto', sm: 100 },
                textTransform: 'none',
              }}
            >
              Client Portal
            </Button>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => navigate('/login')}
              sx={{ 
                display: { xs: 'none', sm: 'inline-flex' },
                minWidth: { xs: 'auto', sm: 100 },
              }}
          >
              Staff Login
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => navigate('/login')}
              sx={{ 
                minWidth: { xs: 100, sm: 120 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
          >
            Get Started
          </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 10, md: 16 },
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 600,
              mb: { xs: 3, md: 4 },
              textAlign: 'center',
              color: 'text.primary',
              fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem', lg: '3.75rem' },
              lineHeight: 1.2,
              px: { xs: 1, sm: 0 },
            }}
          >
            Aromahpure Air
            <Box 
              component="span" 
              sx={{ 
                display: 'block',
                fontWeight: 400, 
                color: 'text.secondary', 
                fontSize: { xs: '0.5em', sm: '0.55em', md: '0.6em' },
                mt: { xs: 1, sm: 1.5 },
              }}
            >
              Perfume Dispenser Management System
            </Box>
          </Typography>
          <Typography
            variant="h5"
            component="p"
            sx={{
              mb: { xs: 4, md: 6 },
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: '800px',
              mx: 'auto',
              fontWeight: 400,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              lineHeight: 1.6,
              px: { xs: 1, sm: 0 },
            }}
          >
            Streamline your aroma dispensing operations with intelligent scheduling,
            real-time monitoring, and comprehensive client management.
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: { xs: 1.5, sm: 2 }, 
            flexWrap: 'wrap',
            px: { xs: 1, sm: 0 },
          }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: { xs: 4, sm: 5 },
                py: { xs: 1.5, sm: 2 },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                minWidth: { xs: 140, sm: 160 },
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: { xs: 4, sm: 5 },
                py: { xs: 1.5, sm: 2 },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                minWidth: { xs: 140, sm: 160 },
              }}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            textAlign: 'center',
            mb: { xs: 1, md: 1.5 },
            fontWeight: 600,
            color: 'text.primary',
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
          }}
        >
          Key Features
        </Typography>
        <Typography
          variant="body1"
          component="p"
          sx={{
            textAlign: 'center',
            mb: { xs: 4, md: 6 },
            color: 'text.secondary',
            maxWidth: '600px',
            mx: 'auto',
            px: { xs: 2, sm: 0 },
            fontSize: { xs: '0.875rem', sm: '1rem' },
          }}
        >
          Enterprise-grade solutions for managing your perfume dispensing operations
        </Typography>
        <Grid container spacing={{ xs: 3, sm: 4, md: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <Card 
                elevation={0} 
                sx={{ 
                  height: '100%', 
                  border: '1px solid', 
                  borderColor: 'divider',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    borderColor: 'primary.light',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 1.5, fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' }, lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'grey.50',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 5, md: 6 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" sx={{ mb: { xs: 3, md: 4 }, color: 'text.secondary', fontSize: { xs: '0.875rem', sm: '1rem' }, px: { xs: 2, sm: 0 } }}>
            Access your dashboard and start managing your perfume dispensers today
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              px: { xs: 5, sm: 6 },
              py: { xs: 1.25, sm: 1.5 },
              fontSize: { xs: '1rem', sm: '1.1rem' },
              minWidth: { xs: 160, sm: 180 },
            }}
          >
            Sign In Now
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: 'white',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 3,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            © 2024 Aroma Dispenser Management System. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default HomePage;
