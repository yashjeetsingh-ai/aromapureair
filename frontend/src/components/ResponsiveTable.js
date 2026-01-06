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
    // Mobile Card View - Premium Design
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
        {data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              No data available
            </Typography>
          </Box>
        ) : (
          data.map((row, rowIndex) => (
            <Card 
              key={rowIndex} 
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  borderColor: 'primary.light',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Stack spacing={1}>
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

                    const visibleColumns = columns.filter(col => col.id !== 'actions' && !col.hideOnMobile);
                    const isLastVisible = colIndex === visibleColumns.length - 1 || 
                      (colIndex < columns.length - 1 && columns[colIndex + 1]?.hideOnMobile && 
                       visibleColumns.indexOf(column) === visibleColumns.length - 1);

                    return (
                      <Box key={colIndex}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'row', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'center', sm: 'center' },
                          gap: { xs: 1, sm: 2 },
                        }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 600, 
                              color: 'text.secondary',
                              textTransform: 'uppercase',
                              fontSize: '0.6875rem',
                              letterSpacing: '0.5px',
                              minWidth: { xs: '80px', sm: '100px' },
                              flexShrink: 0,
                            }}
                          >
                            {column.label}
                          </Typography>
                          <Box sx={{ 
                            flex: 1, 
                            textAlign: { xs: 'right', sm: column.align === 'right' ? 'right' : 'left' },
                            wordBreak: 'break-word',
                            minWidth: 0,
                          }}>
                            {typeof value === 'object' && value !== null ? (
                              value
                            ) : (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: column.bold ? 600 : 500,
                                  color: column.color || 'text.primary',
                                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                  lineHeight: 1.4,
                                }}
                              >
                                {value || '-'}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {!isLastVisible && <Divider sx={{ mt: 1, opacity: 0.5 }} />}
                      </Box>
                    );
                  })}
                  
                  {/* Actions */}
                  {renderActions && (
                    <>
                      <Divider sx={{ my: 0.75, opacity: 0.5 }} />
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end', 
                        gap: 0.5,
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

  // Desktop Table View - Premium Design
  return (
    <TableContainer 
      component={Paper} 
      elevation={0} 
      sx={{ 
        borderRadius: 3, 
        border: '1px solid', 
        borderColor: 'divider', 
        overflow: 'hidden',
        bgcolor: 'background.paper',
        ...sx 
      }}
    >
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            {columns.map((column) => (
              <TableCell 
                key={column.id}
                sx={{ 
                  fontWeight: 600, 
                  color: 'text.primary', 
                  py: 2.5,
                  px: 3,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.025em',
                  textTransform: 'uppercase',
                  ...column.headerSx 
                }}
                align={column.align || 'left'}
              >
                {column.label}
              </TableCell>
            ))}
            {renderActions && (
              <TableCell 
                sx={{ 
                  fontWeight: 600, 
                  color: 'text.primary', 
                  py: 2.5,
                  px: 3,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.025em',
                  textTransform: 'uppercase',
                }} 
                align="right"
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (renderActions ? 1 : 0)} align="center" sx={{ py: 6 }}>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  No data available
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex} 
                hover
                sx={{ 
                  '&:last-child td': { borderBottom: 0 },
                  '&:hover': { 
                    bgcolor: 'action.hover',
                  },
                  transition: 'background-color 0.2s ease',
                  bgcolor: rowIndex % 2 === 0 ? 'background.paper' : 'grey.50',
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
                      sx={{ 
                        py: 2,
                        px: 3,
                        ...column.cellSx 
                      }}
                    >
                      {typeof value === 'object' && value !== null ? (
                        value
                      ) : (
                        <Typography 
                          variant="body2"
                          sx={{ 
                            fontWeight: column.bold ? 600 : 500,
                            color: column.color || 'text.primary',
                            fontSize: '0.875rem',
                          }}
                        >
                          {value || '-'}
                        </Typography>
                      )}
                    </TableCell>
                  );
                })}
                {renderActions && (
                  <TableCell align="right" sx={{ py: 2, px: 3 }}>
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

