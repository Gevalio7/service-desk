import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  DatePicker,
  LocalizationProvider
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Download,
  Assessment,
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  Schedule,
  PriorityHigh
} from '@mui/icons-material';
import { ru } from 'date-fns/locale';
import Chart from 'react-apexcharts';
import { useAuth } from '../contexts/AuthContext';

const Reports = () => {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('tickets');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    generateReport();
  }, [reportType, dateRange]);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Используем реальный API для генерации отчета
      const startDateParam = dateRange.start ? dateRange.start.toISOString().split('T')[0] : '';
      const endDateParam = dateRange.end ? dateRange.end.toISOString().split('T')[0] : '';
      
      const params = new URLSearchParams();
      if (startDateParam) params.append('startDate', startDateParam);
      if (endDateParam) params.append('endDate', endDateParam);
      
      const response = await fetch(`/api/reports/${reportType}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Ошибка генерации отчета');
      // Fallback к мокковым данным при ошибке
      const mockData = generateMockData(reportType);
      setReportData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (type) => {
    switch (type) {
      case 'tickets':
        return {
          summary: {
            total: 156,
            open: 23,
            inProgress: 45,
            resolved: 78,
            closed: 10
          },
          chartData: {
            series: [{
              name: 'Тикеты',
              data: [12, 19, 15, 27, 32, 25, 18, 22, 28, 35, 30, 24]
            }],
            options: {
              chart: { type: 'line', height: 350 },
              xaxis: {
                categories: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
              },
              title: { text: 'Динамика создания тикетов' }
            }
          },
          tableData: [
            { id: 1, title: 'Проблема с входом', status: 'new', priority: 'high', assignee: 'Иван Петров', created: '2024-01-25' },
            { id: 2, title: 'Запрос функции', status: 'in_progress', priority: 'medium', assignee: 'Мария Сидорова', created: '2024-01-24' },
            { id: 3, title: 'Ошибка в системе', status: 'resolved', priority: 'urgent', assignee: 'Алексей Иванов', created: '2024-01-23' }
          ]
        };
      
      case 'users':
        return {
          summary: {
            total: 89,
            active: 76,
            inactive: 13,
            newThisMonth: 8
          },
          chartData: {
            series: [76, 13],
            options: {
              chart: { type: 'donut', height: 350 },
              labels: ['Активные', 'Неактивные'],
              title: { text: 'Статус пользователей' }
            }
          },
          tableData: [
            { id: 1, name: 'Иван Петров', email: 'ivan@example.com', role: 'admin', status: 'active', lastLogin: '2024-01-25' },
            { id: 2, name: 'Мария Сидорова', email: 'maria@example.com', role: 'agent', status: 'active', lastLogin: '2024-01-24' },
            { id: 3, name: 'Алексей Иванов', email: 'alexey@example.com', role: 'client', status: 'inactive', lastLogin: '2024-01-20' }
          ]
        };
      
      case 'performance':
        return {
          summary: {
            avgResponseTime: '2.5 часа',
            avgResolutionTime: '1.2 дня',
            satisfactionRate: '94%',
            slaCompliance: '87%'
          },
          chartData: {
            series: [{
              name: 'Время ответа (часы)',
              data: [2.1, 2.8, 1.9, 3.2, 2.5, 2.0, 2.7, 2.3, 2.9, 2.1, 2.4, 2.6]
            }, {
              name: 'Время решения (дни)',
              data: [1.5, 1.8, 1.2, 2.1, 1.4, 1.1, 1.6, 1.3, 1.7, 1.2, 1.4, 1.5]
            }],
            options: {
              chart: { type: 'line', height: 350 },
              xaxis: {
                categories: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
              },
              title: { text: 'Показатели производительности' }
            }
          },
          tableData: [
            { metric: 'Среднее время ответа', value: '2.5 часа', trend: 'up', change: '+0.3' },
            { metric: 'Среднее время решения', value: '1.2 дня', trend: 'down', change: '-0.2' },
            { metric: 'Уровень удовлетворенности', value: '94%', trend: 'up', change: '+2%' },
            { metric: 'Соблюдение SLA', value: '87%', trend: 'down', change: '-3%' }
          ]
        };
      
      default:
        return null;
    }
  };

  const handleExportReport = () => {
    // Здесь будет логика экспорта отчета
    const reportContent = {
      type: reportType,
      dateRange: dateRange,
      data: reportData,
      generatedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(reportContent, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `report-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      case 'active': return 'success';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Открыт';
      case 'in_progress': return 'В работе';
      case 'resolved': return 'Решен';
      case 'closed': return 'Закрыт';
      case 'active': return 'Активен';
      case 'inactive': return 'Неактивен';
      default: return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      case 'critical': return 'Критический';
      default: return priority;
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'agent': return 'Агент';
      case 'user': return 'Пользователь';
      default: return role;
    }
  };

  if (!hasRole(['admin', 'agent'])) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          У вас нет прав доступа к отчетам
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Box p={3}>
        {/* Header */}
        <Typography variant="h4" component="h1" mb={3}>
          Отчеты и аналитика
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Тип отчета</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Тип отчета"
                  >
                    <MenuItem value="tickets">Тикеты</MenuItem>
                    <MenuItem value="users">Пользователи</MenuItem>
                    <MenuItem value="performance">Производительность</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Дата начала"
                  value={dateRange.start}
                  onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Дата окончания"
                  value={dateRange.end}
                  onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Assessment />}
                  onClick={generateReport}
                  disabled={loading}
                >
                  {loading ? 'Генерация...' : 'Сгенерировать'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {reportData && !loading && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
              {reportType === 'tickets' && (
                <>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <Assignment color="primary" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.total}</Typography>
                            <Typography color="text.secondary">Всего тикетов</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <Schedule color="error" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.open}</Typography>
                            <Typography color="text.secondary">Открытых</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <TrendingUp color="warning" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.inProgress}</Typography>
                            <Typography color="text.secondary">В работе</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <TrendingDown color="success" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.resolved}</Typography>
                            <Typography color="text.secondary">Решенных</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <Assignment color="action" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.closed}</Typography>
                            <Typography color="text.secondary">Закрытых</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}

              {reportType === 'users' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <People color="primary" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.total}</Typography>
                            <Typography color="text.secondary">Всего пользователей</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <TrendingUp color="success" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.active}</Typography>
                            <Typography color="text.secondary">Активных</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <TrendingDown color="warning" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.inactive}</Typography>
                            <Typography color="text.secondary">Неактивных</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <People color="info" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.newThisMonth}</Typography>
                            <Typography color="text.secondary">Новых за месяц</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}

              {reportType === 'performance' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <Schedule color="primary" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.avgResponseTime}</Typography>
                            <Typography color="text.secondary">Среднее время ответа</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <Assignment color="success" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.avgResolutionTime}</Typography>
                            <Typography color="text.secondary">Среднее время решения</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <TrendingUp color="info" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.satisfactionRate}</Typography>
                            <Typography color="text.secondary">Удовлетворенность</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center">
                          <PriorityHigh color="warning" sx={{ mr: 2 }} />
                          <Box>
                            <Typography variant="h4">{reportData.summary.slaCompliance}</Typography>
                            <Typography color="text.secondary">Соблюдение SLA</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Chart */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Графическая аналитика
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleExportReport}
                  >
                    Экспорт
                  </Button>
                </Box>
                
                <Chart
                  options={reportData.chartData.options}
                  series={reportData.chartData.series}
                  type={reportData.chartData.options.chart.type}
                  height={reportData.chartData.options.chart.height}
                />
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Детальные данные
                </Typography>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {reportType === 'tickets' && (
                          <>
                            <TableCell>ID</TableCell>
                            <TableCell>Заголовок</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell>Приоритет</TableCell>
                            <TableCell>Исполнитель</TableCell>
                            <TableCell>Создан</TableCell>
                          </>
                        )}
                        
                        {reportType === 'users' && (
                          <>
                            <TableCell>ID</TableCell>
                            <TableCell>Имя</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Роль</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell>Последний вход</TableCell>
                          </>
                        )}
                        
                        {reportType === 'performance' && (
                          <>
                            <TableCell>Метрика</TableCell>
                            <TableCell>Значение</TableCell>
                            <TableCell>Тренд</TableCell>
                            <TableCell>Изменение</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.tableData.map((row, index) => (
                        <TableRow key={index}>
                          {reportType === 'tickets' && (
                            <>
                              <TableCell>{row.id}</TableCell>
                              <TableCell>{row.title}</TableCell>
                              <TableCell>
                                <Chip
                                  label={getStatusText(row.status)}
                                  color={getStatusColor(row.status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getPriorityText(row.priority)}
                                  color={getPriorityColor(row.priority)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{row.assignee}</TableCell>
                              <TableCell>{row.created}</TableCell>
                            </>
                          )}
                          
                          {reportType === 'users' && (
                            <>
                              <TableCell>{row.id}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>{row.email}</TableCell>
                              <TableCell>{getRoleText(row.role)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={getStatusText(row.status)}
                                  color={getStatusColor(row.status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{row.lastLogin}</TableCell>
                            </>
                          )}
                          
                          {reportType === 'performance' && (
                            <>
                              <TableCell>{row.metric}</TableCell>
                              <TableCell>{row.value}</TableCell>
                              <TableCell>
                                {row.trend === 'up' ? (
                                  <TrendingUp color="success" />
                                ) : (
                                  <TrendingDown color="error" />
                                )}
                              </TableCell>
                              <TableCell>{row.change}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;