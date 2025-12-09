import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Devices,
  Business,
  People,
  Schedule,
  History,
  Logout,
  Dashboard,
  CheckCircle,
} from '@mui/icons-material';
import Logo from './Logo';

const drawerWidth = 260;

function Sidebar({ user, logout, role }) {
  const navigate = useNavigate();
  const location = useLocation();

  const getMenuItems = () => {
    const baseItems = [
      {
        text: 'Dashboard',
        icon: <Dashboard />,
        path: `/${role}`,
      },
    ];

    if (role === 'admin') {
      return [
        ...baseItems,
        {
          text: 'Machines',
          icon: <Devices />,
          path: '/admin',
          tab: 0,
        },
        {
          text: 'Clients',
          icon: <Business />,
          path: '/admin',
          tab: 1,
        },
        {
          text: 'Users',
          icon: <People />,
          path: '/admin',
          tab: 2,
        },
        {
          text: 'Refill Logs',
          icon: <History />,
          path: '/admin',
          tab: 3,
        },
        {
          text: 'Installed',
          icon: <Devices />,
          path: '/admin',
          tab: 4,
        },
        {
          text: 'Assign Technician',
          icon: <People />,
          path: '/admin',
          tab: 5,
        },
      ];
    } else if (role === 'technician') {
      return [
        ...baseItems,
        {
          text: 'Installed Machines',
          icon: <Devices />,
          path: '/technician',
          tab: 0,
        },
        {
          text: 'Refill & Maintain',
          icon: <History />,
          path: '/technician',
          tab: 1,
        },
        {
          text: 'Completed Tasks',
          icon: <CheckCircle />,
          path: '/technician',
          tab: 2,
        },
      ];
    } else if (role === 'developer') {
      return [
        ...baseItems,
        {
          text: 'Schedules',
          icon: <Schedule />,
          path: '/developer',
        },
      ];
    }
    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleNavigation = (item) => {
    if (item.tab !== undefined) {
      // For admin dashboard tabs, navigate and set tab via state
      navigate(item.path, { state: { tab: item.tab }, replace: true });
      // Also trigger a custom event for tab change
      window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: item.tab } }));
    } else {
      // For Dashboard, navigate without tab state
      navigate(item.path, { state: {}, replace: true });
      // Trigger event to show Dashboard (no tab)
      window.dispatchEvent(new CustomEvent('tabChange', { detail: {} }));
    }
  };

  const isActive = (item) => {
    if (item.tab !== undefined) {
      // Check if we're on the admin page and the tab matches
      const currentTab = location.state?.tab;
      return location.pathname === item.path && currentTab === item.tab;
    }
    // For Dashboard, check if we're on the path and no tab is set
    return location.pathname === item.path && (location.state?.tab === undefined || location.state?.tab === null);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box
        sx={{
          p: 2.5,
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Logo size="medium" color="primary" />
      </Box>

      <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 36,
              height: 36,
              fontSize: '0.875rem',
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true }}>
              {user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>

      <List sx={{ pt: 2 }}>
        {menuItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item)}
              selected={isActive(item)}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  bgcolor: 'grey.100',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item) ? 'white' : 'text.secondary',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: isActive(item) ? 600 : 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <ListItemButton
          onClick={logout}
          sx={{
            borderRadius: 1,
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.light',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}

export default Sidebar;

