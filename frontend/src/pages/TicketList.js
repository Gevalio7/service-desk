import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';

const TicketList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignedToId: '',
    createdById: '',
    startDate: null,
    endDate: null,
    search: '',
    tags: ''
  });
  
  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare filter params
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      };
      
      // Add filters if they have values
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.assignedToId) params.assignedToId = filters.assignedToId;
      if (filters.createdById) params.createdById = filters.createdById;
      if (filters.search) params.search = filters.search;
      if (filters.tags) params.tags = filters.tags;
      
      // Format dates if they exist
      if (filters.startDate) {
        params.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      
      if (filters.endDate) {
        params.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }
      
      // For clients, only show their tickets
      if (user.role === 'client') {
        params.createdById = user.id;
      }
      
      // Fetch tickets
      const response = await axios.get('/api/tickets', { params });
      
      setTickets(response.data.tickets);
      setPagination({
        ...pagination,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Ошибка при загрузке заявок');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch users for filters
  const fetchUsers = async () => {
    try {
      // Only fetch users if user is admin or agent
      if (user.role === 'client') return;
      
      const response = await axios.get('/api/users', {
        params: {
          limit: 100,
          isActive: true
        }
      });
      
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, [pagination.page, user.role]);
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPagination({
      ...pagination,
      page: value
    });
  };
  
  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  // Handle date change
  const handleDateChange = (name, date) => {
    setFilters({
      ...filters,
      [name]: date
    });
  };
  
  // Apply filters
  const applyFilters = () => {
    setPagination({
      ...pagination,
      page: 1 // Reset to first page when applying filters
    });
    fetchTickets();
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      assignedToId: '',
      createdById: '',
      startDate: null,
      endDate: null,
      search: '',
      tags: ''
    });
    
    setPagination({
      ...pagination,
      page: 1
    });
    
    // Fetch tickets with reset filters
    fetchTickets();
  };
  
  // Export tickets to CSV
  const exportTickets = async () => {
    try {
      // Prepare filter params
      const params = {};
      
      // Add filters if they have values
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      
      // Format dates if they exist
      if (filters.startDate) {
        params.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      
      if (filters.endDate) {
        params.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }
      
      // For clients, only export their tickets
      if (user.role === 'client') {
        params.createdById = user.id;
      }
      
      // Get CSV data
      const response = await axios.get('/api/tickets/export', {
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tickets-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting tickets:', error);
      setError('Ошибка при экспорте заявок');
    }
  };
  
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
  
  // Translate category
  const translateCategory = (category) => {
    switch (category) {
      case 'incident':
        return 'Инцидент';
      case 'request':
        return 'Запрос';
      case 'problem':
        return 'Проблема';
      case 'change':
        return 'Изменение';
      default:
        return category;
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Заявки
        </Typography>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTickets}
            sx={{ mr: 1 }}
          >
            Обновить
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={exportTickets}
            sx={{ mr: 1 }}
          >
            Экспорт
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tickets/create')}
          >
            Создать заявку
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Фильтры
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="status-label">Статус</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Статус"
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="new">Новая</MenuItem>
                  <MenuItem value="assigned">Назначена</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="on_hold">Приостановлена</MenuItem>
                  <MenuItem value="resolved">Решена</MenuItem>
                  <MenuItem value="closed">Закрыта</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="priority-label">Приоритет</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  name="priority"
                  value={filters.priority}
                  onChange={handleFilterChange}
                  label="Приоритет"
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="P1">P1 - Критический</MenuItem>
                  <MenuItem value="P2">P2 - Высокий</MenuItem>
                  <MenuItem value="P3">P3 - Средний</MenuItem>
                  <MenuItem value="P4">P4 - Низкий</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="category-label">Категория</InputLabel>
                <Select
                  labelId="category-label"
                  id="category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  label="Категория"
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="incident">Инцидент</MenuItem>
                  <MenuItem value="request">Запрос</MenuItem>
                  <MenuItem value="problem">Проблема</MenuItem>
                  <MenuItem value="change">Изменение</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {user.role !== 'client' && (
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="created-by-label">Создатель</InputLabel>
                  <Select
                    labelId="created-by-label"
                    id="createdById"
                    name="createdById"
                    value={filters.createdById}
                    onChange={handleFilterChange}
                    label="Создатель"
                  >
                    <MenuItem value="">Все</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {user.role !== 'client' && (
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="assigned-to-label">Назначена</InputLabel>
                  <Select
                    labelId="assigned-to-label"
                    id="assignedToId"
                    name="assignedToId"
                    value={filters.assignedToId}
                    onChange={handleFilterChange}
                    label="Назначена"
                  >
                    <MenuItem value="">Все</MenuItem>
                    <MenuItem value="unassigned">Не назначена</MenuItem>
                    {users
                      .filter((user) => user.role === 'admin' || user.role === 'agent')
                      .map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                <DatePicker
                  label="Дата с"
                  value={filters.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                <DatePicker
                  label="Дата по"
                  value={filters.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                id="search"
                name="search"
                label="Поиск"
                variant="outlined"
                size="small"
                value={filters.search}
                onChange={handleFilterChange}
                InputProps={{
                  endAdornment: (
                    <SearchIcon color="action" />
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                id="tags"
                name="tags"
                label="Теги (через запятую)"
                variant="outlined"
                size="small"
                value={filters.tags}
                onChange={handleFilterChange}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={resetFilters}
              startIcon={<ClearIcon />}
              sx={{ mr: 1 }}
            >
              Сбросить
            </Button>
            
            <Button
              variant="contained"
              onClick={applyFilters}
              startIcon={<FilterListIcon />}
            >
              Применить
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tickets list */}
          {tickets.length > 0 ? (
            <>
              {tickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  sx={{ 
                    mb: 2, 
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6
                    }
                  }}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={8}>
                        <Typography variant="h6" component="div" gutterBottom>
                          {ticket.title}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {ticket.description.substring(0, 200)}
                          {ticket.description.length > 200 ? '...' : ''}
                        </Typography>
                        
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={translateStatus(ticket.status)}
                            size="small"
                            sx={{ 
                              mr: 1, 
                              bgcolor: getStatusColor(ticket.status),
                              color: 'white'
                            }}
                          />
                          
                          <Chip
                            label={translatePriority(ticket.priority)}
                            size="small"
                            sx={{ 
                              mr: 1, 
                              bgcolor: getPriorityColor(ticket.priority),
                              color: 'white'
                            }}
                          />
                          
                          <Chip
                            label={translateCategory(ticket.category)}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          
                          {ticket.tags && ticket.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          ))}
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography variant="caption" color="text.secondary">
                            ID: {ticket.id.substring(0, 8)}
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary">
                            Создана: {format(new Date(ticket.createdAt), 'dd.MM.yyyy HH:mm')}
                          </Typography>
                          
                          {ticket.createdBy && (
                            <Typography variant="caption" color="text.secondary">
                              Автор: {ticket.createdBy.firstName} {ticket.createdBy.lastName}
                            </Typography>
                          )}
                          
                          {ticket.assignedTo && (
                            <Typography variant="caption" color="text.secondary">
                              Назначена: {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                            </Typography>
                          )}
                          
                          {ticket.slaDeadline && (
                            <Typography 
                              variant="caption" 
                              color={
                                new Date() > new Date(ticket.slaDeadline) 
                                  ? 'error.main' 
                                  : 'text.secondary'
                              }
                            >
                              SLA: {format(new Date(ticket.slaDeadline), 'dd.MM.yyyy HH:mm')}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Заявки не найдены
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Попробуйте изменить параметры фильтрации или создайте новую заявку
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/tickets/create')}
                sx={{ mt: 2 }}
              >
                Создать заявку
              </Button>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default TicketList;