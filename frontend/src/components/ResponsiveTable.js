import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
} from '@mui/material';
import { Visibility, Edit, Delete, MoreVert } from '@mui/icons-material';

/**
 * ResponsiveTable Component
 * Displays data as a table on desktop and as cards on mobile
 * 
 * @param {Array} columns - Array of column definitions: { id, label, render, align }
 * @param {Array} data - Array of data objects
 * @param {Function} renderActions - Optional function to render action buttons (receives row data)
 * @param {Object} sx - Additional styles
 */
function ResponsiveTable({ columns, data, renderActions, sx = {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    // Mobile Card View
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
        {data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No data available</Typography>
          </Box>
        ) : (
          data.map((row, rowIndex) => (
            <Card 
              key={rowIndex} 
              elevation={2}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  boxShadow: 4,
                },
                transition: 'all 0.2s',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  {columns.map((column, colIndex) => {
                    // Skip action column in mobile view (will be shown separately)
                    if (column.id === 'actions' || column.hideOnMobile) {
                      return null;
                    }

                    const value = column.render 
                      ? column.render(row[column.id], row) 
                      : row[column.id];

                    // Skip if value is empty/null and column doesn't want to show empty
                    if (!value && column.hideEmpty) {
                      return null;
                    }

                    return (
                      <Box key={colIndex}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 600, 
                              color: 'text.secondary',
                              textTransform: 'uppercase',
                              fontSize: '0.7rem',
                              letterSpacing: '0.5px',
                              minWidth: '35%',
                            }}
                          >
                            {column.label}
                          </Typography>
                          <Box sx={{ 
                            flex: 1, 
                            textAlign: column.align === 'right' ? 'right' : 'left',
                            wordBreak: 'break-word',
                          }}>
                            {typeof value === 'object' && value !== null ? (
                              value
                            ) : (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: column.bold ? 600 : 400,
                                  color: column.color || 'text.primary',
                                }}
                              >
                                {value || '-'}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {colIndex < columns.length - 1 && <Divider sx={{ mt: 1 }} />}
                      </Box>
                    );
                  })}
                  
                  {/* Actions */}
                  {renderActions && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: 1,
                        pt: 1,
                      }}>
                        {renderActions(row)}
                      </Box>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    );
  }

  // Desktop Table View
  return (
    <TableContainer 
      component={Paper} 
      elevation={0} 
      sx={{ 
        borderRadius: 2, 
        border: '1px solid', 
        borderColor: 'divider', 
        overflow: 'hidden',
        ...sx 
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            {columns.map((column) => (
              <TableCell 
                key={column.id}
                sx={{ 
                  fontWeight: 600, 
                  color: 'text.primary', 
                  py: 2,
                  ...column.headerSx 
                }}
                align={column.align || 'left'}
              >
                {column.label}
              </TableCell>
            ))}
            {renderActions && (
              <TableCell sx={{ fontWeight: 600, color: 'text.primary', py: 2 }} align="right">
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (renderActions ? 1 : 0)} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No data available</Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex} 
                hover
                sx={{ 
                  '&:last-child td': { borderBottom: 0 },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {columns.map((column) => {
                  const value = column.render 
                    ? column.render(row[column.id], row) 
                    : row[column.id];

                  return (
                    <TableCell 
                      key={column.id}
                      align={column.align || 'left'}
                      sx={column.cellSx}
                    >
                      {typeof value === 'object' && value !== null ? (
                        value
                      ) : (
                        <Typography 
                          variant="body2"
                          sx={{ 
                            fontWeight: column.bold ? 600 : 400,
                            color: column.color || 'text.primary',
                          }}
                        >
                          {value || '-'}
                        </Typography>
                      )}
                    </TableCell>
                  );
                })}
                {renderActions && (
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {renderActions(row)}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default ResponsiveTable;

