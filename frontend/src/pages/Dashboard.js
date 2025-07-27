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
import axios from '../utils/axios';
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
        
        // Fetch SLA metrics only for staff (admin/agent)
        if (user.role === 'admin' || user.role === 'agent') {
          try {
            const metricsResponse = await axios.get('/api/tickets/metrics/sla', {
              params: {
                startDate: formattedStartDate,
                endDate: formattedEndDate
              }
            });
            setMetrics(metricsResponse.data.metrics);
          } catch (metricsError) {
            console.error('Error fetching SLA metrics:', metricsError);
            // Set default metrics for staff if API fails
            setMetrics({
              totalTickets: 0,
              resolvedTickets: 0,
              slaBreaches: 0,
              responseBreaches: 0,
              avgResponseTime: 0,
              avgResolutionTime: 0,
              slaComplianceRate: 100,
              responseComplianceRate: 100,
              statusBreakdown: {
                new: 0,
                open: 0,
                in_progress: 0,
                resolved: 0,
                closed: 0
              },
              priorityMetrics: {
                urgent: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                high: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                medium: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                low: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 }
              }
            });
          }
        } else {
          // For clients, calculate basic metrics from their tickets
          try {
            const ticketsResponse = await axios.get('/api/tickets', {
              params: {
                createdById: user.id,
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                limit: 1000 // Get all tickets for metrics calculation
              }
            });
            
            const tickets = ticketsResponse.data.tickets || [];
            const totalTickets = tickets.length;
            const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
            
            // Calculate status breakdown for clients
            const statusBreakdown = {
              new: tickets.filter(t => t.status === 'new').length,
              open: tickets.filter(t => t.status === 'open').length,
              in_progress: tickets.filter(t => t.status === 'in_progress').length,
              resolved: tickets.filter(t => t.status === 'resolved').length,
              closed: tickets.filter(t => t.status === 'closed').length
            };
            
            setMetrics({
              totalTickets,
              resolvedTickets,
              slaBreaches: 0,
              responseBreaches: 0,
              avgResponseTime: 0,
              avgResolutionTime: 0,
              slaComplianceRate: 100,
              responseComplianceRate: 100,
              statusBreakdown,
              priorityMetrics: {
                urgent: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                high: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                medium: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                low: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 }
              }
            });
          } catch (clientMetricsError) {
            console.error('Error fetching client metrics:', clientMetricsError);
            // Set default metrics for clients
            setMetrics({
              totalTickets: 0,
              resolvedTickets: 0,
              slaBreaches: 0,
              responseBreaches: 0,
              avgResponseTime: 0,
              avgResolutionTime: 0,
              slaComplianceRate: 100,
              responseComplianceRate: 100,
              statusBreakdown: {
                new: 0,
                open: 0,
                in_progress: 0,
                resolved: 0,
                closed: 0
              },
              priorityMetrics: {
                urgent: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                high: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                medium: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
                low: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 }
              }
            });
          }
        }
        
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
    if (!metrics || !metrics.statusBreakdown) return null;
    
    const statusData = [
      metrics.statusBreakdown.new,
      metrics.statusBreakdown.open,
      metrics.statusBreakdown.in_progress,
      metrics.statusBreakdown.resolved,
      metrics.statusBreakdown.closed
    ];
    
    // Only show chart if there's data
    if (statusData.every(value => value === 0)) return null;
    
    return {
      series: statusData,
      options: {
        labels: ['Новые', 'Открытые', 'В работе', 'Решенные', 'Закрытые'],
        colors: [
          theme.palette.info.main,
          theme.palette.info.light,
          theme.palette.warning.main,
          theme.palette.success.main,
          theme.palette.success.dark
        ],
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
          metrics.priorityMetrics.urgent.total - metrics.priorityMetrics.urgent.slaBreaches,
          metrics.priorityMetrics.high.total - metrics.priorityMetrics.high.slaBreaches,
          metrics.priorityMetrics.medium.total - metrics.priorityMetrics.medium.slaBreaches,
          metrics.priorityMetrics.low.total - metrics.priorityMetrics.low.slaBreaches
        ]
      }, {
        name: 'SLA нарушено',
        data: [
          metrics.priorityMetrics.urgent.slaBreaches,
          metrics.priorityMetrics.high.slaBreaches,
          metrics.priorityMetrics.medium.slaBreaches,
          metrics.priorityMetrics.low.slaBreaches
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
          categories: ['Критический', 'Высокий', 'Средний', 'Низкий'],
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
      case 'urgent':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.error.light;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
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
      case 'urgent':
        return 'Критический';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
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
        <Grid item xs={12} sm={6} md={12}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        
        {/* Status breakdown cards */}
        {/* Show "Новые заявки" only for staff */}
        {(user.role === 'admin' || user.role === 'agent') && (
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: theme.palette.info.main, mr: 2 }}>
                  <TicketIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Новые заявки
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.statusBreakdown?.new || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        <Grid item xs={12} sm={6} md={user.role === 'client' ? 3 : 2.4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.info.light, mr: 2 }}>
                <TicketIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Открытые заявки
                </Typography>
                <Typography variant="h4">
                  {metrics?.statusBreakdown?.open || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={user.role === 'client' ? 3 : 2.4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.warning.main, mr: 2 }}>
                <WarningIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  В работе
                </Typography>
                <Typography variant="h4">
                  {metrics?.statusBreakdown?.in_progress || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={user.role === 'client' ? 3 : 2.4}>
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
                  {metrics?.statusBreakdown?.resolved || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={user.role === 'client' ? 3 : 2.4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: theme.palette.success.dark, mr: 2 }}>
                <ResolvedIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Закрытые заявки
                </Typography>
                <Typography variant="h4">
                  {metrics?.statusBreakdown?.closed || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Show SLA metrics only for staff */}
        {(user.role === 'admin' || user.role === 'agent') && (
          <>
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
          </>
        )}
      </Grid>
      
      {/* Charts - only for staff */}
      {(user.role === 'admin' || user.role === 'agent') && (
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
      )}
      
      {/* Recent tickets and response time */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={(user.role === 'admin' || user.role === 'agent') ? 8 : 12}>
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
        
        {/* Show response time chart only for staff */}
        {(user.role === 'admin' || user.role === 'agent') && (
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
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;