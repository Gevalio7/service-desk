import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  ConfirmationNumber as TicketIcon,
  CheckCircle as ResolvedIcon,
  Error as SlaBreachIcon,
  Warning as WarningIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import Chart from 'react-apexcharts';
import axios from 'axios';
import { format, parseISO, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [dateRange, setDateRange] = useState('week');
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get date range
        const now = new Date();
        let startDate;
        
        switch (dateRange) {
          case 'day':
            startDate = subDays(now, 1);
            break;
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subDays(now, 30);
            break;
          case 'quarter':
            startDate = subDays(now, 90);
            break;
          default:
            startDate = subDays(now, 7);
        }
        
        // Format dates for API
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(now, 'yyyy-MM-dd');
        
        // Fetch SLA metrics
        const metricsResponse = await axios.get('/api/tickets/metrics/sla', {
          params: {
            startDate: formattedStartDate,
            endDate: formattedEndDate
          }
        });
        
        setMetrics(metricsResponse.data.metrics);
        
        // Fetch recent tickets
        const ticketsResponse = await axios.get('/api/tickets', {
          params: {
            limit: 5,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
            ...(user.role === 'client' ? { createdById: user.id } : {})
          }
        });
        
        setRecentTickets(ticketsResponse.data.tickets);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Ошибка при загрузке данных дашборда');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [dateRange, user]);
  
  // Prepare chart data
  const prepareTicketStatusChart = () => {
    if (!metrics) return null;
    
    return {
      series: [metrics.resolvedTickets, metrics.totalTickets - metrics.resolvedTickets],
      options: {
        labels: ['Решенные', 'Открытые'],
        colors: [theme.palette.success.main, theme.palette.info.main],
        legend: {
          position: 'bottom'
        },
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              width: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }]
      }
    };
  };
  
  const prepareSlaComplianceChart = () => {
    if (!metrics) return null;
    
    return {
      series: [{
        name: 'SLA соблюдено',
        data: [
          metrics.priorityMetrics.P1.total - metrics.priorityMetrics.P1.slaBreaches,
          metrics.priorityMetrics.P2.total - metrics.priorityMetrics.P2.slaBreaches,
          metrics.priorityMetrics.P3.total - metrics.priorityMetrics.P3.slaBreaches,
          metrics.priorityMetrics.P4.total - metrics.priorityMetrics.P4.slaBreaches
        ]
      }, {
        name: 'SLA нарушено',
        data: [
          metrics.priorityMetrics.P1.slaBreaches,
          metrics.priorityMetrics.P2.slaBreaches,
          metrics.priorityMetrics.P3.slaBreaches,
          metrics.priorityMetrics.P4.slaBreaches
        ]
      }],
      options: {
        chart: {
          type: 'bar',
          stacked: true,
          toolbar: {
            show: false
          }
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
          },
        },
        dataLabels: {
          enabled: false
        },
        xaxis: {
          categories: ['P1', 'P2', 'P3', 'P4'],
        },
        colors: [theme.palette.success.main, theme.palette.error.main],
        fill: {
          opacity: 1
        },
        legend: {
          position: 'bottom'
        }
      }
    };
  };
  
  const prepareResponseTimeChart = () => {
    if (!metrics) return null;
    
    return {
      series: [{
        name: 'Среднее время ответа (мин)',
        data: [metrics.avgResponseTime]
      }],
      options: {
        chart: {
          type: 'bar',
          toolbar: {
            show: false
          }
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
          },
        },
        dataLabels: {
          enabled: true
        },
        xaxis: {
          categories: ['Время ответа'],
        },
        colors: [theme.palette.primary.main],
        fill: {
          opacity: 1
        }
      }
    };
  };
  
  const ticketStatusChart = prepareTicketStatusChart();
  const slaComplianceChart = prepareSlaComplianceChart();
  const responseTimeChart = prepareResponseTimeChart();
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return theme.palette.info.main;
      case 'assigned':
        return theme.palette.info.light;
      case 'in_progress':
        return theme.palette.warning.main;
      case 'on_hold':
        return theme.palette.warning.light;
      case 'resolved':
        return theme.palette.success.main;
      case 'closed':
        return theme.palette.success.dark;
      default:
        return theme.palette.grey[500];
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'P1':
        return theme.palette.error.main;
      case 'P2':
        return theme.palette.error.light;
      case 'P3':
        return theme.palette.warning.main;
      case 'P4':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };
  
  // Translate status
  const translateStatus = (status) => {
    switch (status) {
      case 'new':
        return 'Новая';
      case 'assigned':
        return 'Назначена';
      case 'in_progress':
        return 'В работе';
      case 'on_hold':
        return 'Приостановлена';
      case 'resolved':
        return 'Решена';
      case 'closed':
        return 'Закрыта';
      default:
        return status;
    }
  };
  
  // Translate priority
  const translatePriority = (priority) => {
    switch (priority) {
      case 'P1':
        return 'Критический';
      case 'P2':
        return 'Высокий';
      case 'P3':
        return 'Средний';
      case 'P4':
        return 'Низкий';
      default:
        return priority;
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Попробовать снова
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Дашборд
        </Typography>
        
        <Box>
          <Button
            variant={dateRange === 'day' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDateRange('day')}
            sx={{ mr: 1 }}
          >
            День
          </Button>
          <Button
            variant={dateRange === 'week' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDateRange('week')}
            sx={{ mr: 1 }}
          >
            Неделя
          </Button>
          <Button
            variant={dateRange === 'month' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDateRange('month')}
            sx={{ mr: 1 }}
          >
            Месяц
          </Button>
          <Button
            variant={dateRange === 'quarter' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDateRange('quarter')}
          >
            Квартал
          </Button>
        </Box>
      </Box>
      
      {/* Metrics cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                <TicketIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Всего заявок
                </Typography>
                <Typography variant="h4">
                  {metrics?.totalTickets || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.success.main, mr: 2 }}>
                <ResolvedIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Решенные заявки
                </Typography>
                <Typography variant="h4">
                  {metrics?.resolvedTickets || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.error.main, mr: 2 }}>
                <SlaBreachIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Нарушения SLA
                </Typography>
                <Typography variant="h4">
                  {metrics?.slaBreaches || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.warning.main, mr: 2 }}>
                <TimeIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Среднее время решения (ч)
                </Typography>
                <Typography variant="h4">
                  {metrics ? Math.round(metrics.avgResolutionTime / 60) : 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Статус заявок" />
            <Divider />
            <CardContent>
              {ticketStatusChart && (
                <Chart
                  options={ticketStatusChart.options}
                  series={ticketStatusChart.series}
                  type="pie"
                  height={300}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Соблюдение SLA по приоритетам" />
            <Divider />
            <CardContent>
              {slaComplianceChart && (
                <Chart
                  options={slaComplianceChart.options}
                  series={slaComplianceChart.series}
                  type="bar"
                  height={300}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Recent tickets and response time */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader 
              title="Последние заявки" 
              action={
                <Button 
                  color="primary" 
                  onClick={() => navigate('/tickets')}
                >
                  Все заявки
                </Button>
              }
            />
            <Divider />
            <List>
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <React.Fragment key={ticket.id}>
                    <ListItem 
                      button 
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      alignItems="flex-start"
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getStatusColor(ticket.status) }}>
                          <TicketIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" component="span">
                              {ticket.title}
                            </Typography>
                            <Chip
                              label={translateStatus(ticket.status)}
                              size="small"
                              sx={{ 
                                ml: 1, 
                                bgcolor: getStatusColor(ticket.status),
                                color: 'white'
                              }}
                            />
                            <Chip
                              label={translatePriority(ticket.priority)}
                              size="small"
                              sx={{ 
                                ml: 1, 
                                bgcolor: getPriorityColor(ticket.priority),
                                color: 'white'
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : 'Неизвестно'}
                            </Typography>
                            {` — ${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}`}
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Создана: {format(parseISO(ticket.createdAt), 'dd MMM yyyy HH:mm', { locale: ru })}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="Нет заявок" />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Среднее время ответа" />
            <Divider />
            <CardContent>
              {responseTimeChart && (
                <Chart
                  options={responseTimeChart.options}
                  series={responseTimeChart.series}
                  type="bar"
                  height={300}
                />
              )}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  SLA для первого ответа:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">P1 (Критический):</Typography>
                  <Typography variant="body2" fontWeight="bold">30 минут</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">P2 (Высокий):</Typography>
                  <Typography variant="body2" fontWeight="bold">2 часа</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">P3 (Средний):</Typography>
                  <Typography variant="body2" fontWeight="bold">4 часа</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">P4 (Низкий):</Typography>
                  <Typography variant="body2" fontWeight="bold">8 часов</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;