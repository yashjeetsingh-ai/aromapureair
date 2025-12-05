import React from 'react';
import { Box, Typography } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';

function Logo({ size = 'medium', color = 'primary' }) {
  const sizes = {
    small: { fontSize: '1.25rem', iconSize: 20 },
    medium: { fontSize: '1.5rem', iconSize: 24 },
    large: { fontSize: '2rem', iconSize: 32 },
  };

  const currentSize = sizes[size] || sizes.medium;

  const getColor = () => {
    if (color === 'primary') return 'primary.main';
    if (color === 'white') return 'white';
    return 'text.primary';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: getColor(),
          color: color === 'primary' ? 'white' : color === 'white' ? 'primary.main' : 'white',
          borderRadius: '6px',
          width: currentSize.iconSize + 8,
          height: currentSize.iconSize + 8,
        }}
      >
        <AutoAwesome sx={{ fontSize: currentSize.iconSize }} />
      </Box>
      <Typography
        variant="h6"
        component="div"
        sx={{
          fontWeight: 500,
          color: getColor(),
          fontSize: currentSize.fontSize,
          letterSpacing: '0.02em',
        }}
      >
        AromaFlow
      </Typography>
    </Box>
  );
}

export default Logo;

