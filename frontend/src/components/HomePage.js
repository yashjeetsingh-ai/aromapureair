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
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Logo size="medium" color="primary" />
          </Box>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => navigate('/login')}
            sx={{ mr: 2 }}
          >
            Sign In
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => navigate('/login')}
          >
            Get Started
          </Button>
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
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 400,
              mb: 4,
              textAlign: 'center',
              color: 'text.primary',
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' },
              lineHeight: 1.2,
            }}
          >
            Aromahpure Air
            <br />
            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', fontSize: '0.6em' }}>
              Perfume Dispenser Management System
            </Box>
          </Typography>
          <Typography
            variant="h5"
            component="p"
            sx={{
              mb: 6,
              textAlign: 'center',
              color: 'text.secondary',
              maxWidth: '800px',
              mx: 'auto',
              fontWeight: 400,
              fontSize: { xs: '1.1rem', md: '1.5rem' },
              lineHeight: 1.6,
            }}
          >
            Streamline your aroma dispensing operations with intelligent scheduling,
            real-time monitoring, and comprehensive client management.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 5,
                py: 2,
                fontSize: '1.1rem',
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 5,
                py: 2,
                fontSize: '1.1rem',
              }}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            textAlign: 'center',
            mb: 1,
            fontWeight: 400,
            color: 'text.primary',
          }}
        >
          Key Features
        </Typography>
        <Typography
          variant="body1"
          component="p"
          sx={{
            textAlign: 'center',
            mb: 6,
            color: 'text.secondary',
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          Enterprise-grade solutions for managing your perfume dispensing operations
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 1.5, fontWeight: 500 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
          py: 6,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 400 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            Access your dashboard and start managing your perfume dispensers today
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              px: 6,
              py: 1.5,
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
