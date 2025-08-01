import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Alert,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Security,
  History,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  ConfirmationNumber,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const profileValidationSchema = yup.object({
  firstName: yup
    .string('Введите имя')
    .required('Имя обязательно')
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов'),
  lastName: yup
    .string('Введите фамилию')
    .required('Фамилия обязательна')
    .min(2, 'Фамилия должна содержать минимум 2 символа')
    .max(50, 'Фамилия не должна превышать 50 символов'),
  email: yup
    .string('Введите email')
    .email('Введите корректный email')
    .required('Email обязателен'),
  phone: yup
    .string('Введите телефон')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Введите корректный номер телефона'),
  telegramId: yup
    .string('Введите Telegram ID')
    .matches(/^@?[a-zA-Z0-9_]{5,32}$/, 'Telegram ID должен содержать от 5 до 32 символов (буквы, цифры, подчеркивания)'),
  department: yup
    .string('Введите отдел'),
  company: yup
    .string('Введите компанию'),
});

const passwordValidationSchema = yup.object({
  currentPassword: yup
    .string('Введите текущий пароль')
    .required('Текущий пароль обязателен'),
  newPassword: yup
    .string('Введите новый пароль')
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'
    )
    .required('Новый пароль обязателен'),
  confirmPassword: yup
    .string('Подтвердите пароль')
    .oneOf([yup.ref('newPassword'), null], 'Пароли должны совпадать')
    .required('Подтверждение пароля обязательно'),
});

const UserProfile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [userActivity, setUserActivity] = useState([]);
  const [userTickets, setUserTickets] = useState([]);

  useEffect(() => {
    fetchUserActivity();
    fetchUserTickets();
  }, []);

  const fetchUserActivity = async () => {
    try {
      // Используем реальный API для получения активности пользователя
      const response = await fetch(`/api/users/${user.id}/activity`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserActivity(data.activity || []);
      } else {
        throw new Error('Failed to fetch user activity');
      }
    } catch (err) {
      console.error('Error fetching user activity:', err);
      // Fallback к мокковым данным при ошибке
      const mockActivity = [
        {
          id: 1,
          action: 'Вход в систему',
          timestamp: new Date().toISOString(),
          details: 'Успешный вход с IP 192.168.1.1'
        },
        {
          id: 2,
          action: 'Создание тикета',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: 'Создан тикет #123 "Проблема с входом"'
        },
        {
          id: 3,
          action: 'Обновление профиля',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          details: 'Изменен номер телефона'
        }
      ];
      
      setUserActivity(mockActivity);
    }
  };

  const fetchUserTickets = async () => {
    try {
      // Используем реальный API для получения тикетов пользователя
      const response = await fetch('/api/tickets?createdById=' + user.id, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTickets(data.tickets || []);
      } else {
        throw new Error('Failed to fetch user tickets');
      }
    } catch (err) {
      console.error('Error fetching user tickets:', err);
      // Fallback к мокковым данным при ошибке
      const mockTickets = [
        {
          id: 123,
          title: 'Проблема с входом в систему',
          status: 'new',
          priority: 'high',
          createdAt: new Date().toISOString()
        },
        {
          id: 122,
          title: 'Запрос новой функции',
          status: 'in_progress',
          priority: 'medium',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 121,
          title: 'Вопрос по оплате',
          status: 'resolved',
          priority: 'low',
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      
      setUserTickets(mockTickets);
    }
  };

  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      telegramId: user?.telegramId || '',
      department: user?.department || '',
      company: user?.company || '',
    },
    validationSchema: profileValidationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        
        await updateProfile(values);
        
        setSuccess('Профиль успешно обновлен');
        setEditMode(false);
        
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.message || 'Ошибка обновления профиля');
      } finally {
        setLoading(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: passwordValidationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        
        await changePassword(values.currentPassword, values.newPassword);
        
        setSuccess('Пароль успешно изменен');
        setPasswordDialogOpen(false);
        passwordFormik.resetForm();
        
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.message || 'Ошибка изменения пароля');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    if (editMode) {
      profileFormik.resetForm();
    }
    setEditMode(!editMode);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Открыт';
      case 'in_progress': return 'В работе';
      case 'resolved': return 'Решен';
      case 'closed': return 'Закрыт';
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

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <Avatar sx={{ width: 64, height: 64, mr: 3, fontSize: '1.5rem' }}>
          {user?.name?.charAt(0) || 'U'}
        </Avatar>
        <Box flexGrow={1}>
          <Typography variant="h4" component="h1">
            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Пользователь'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Button
          variant={editMode ? "outlined" : "contained"}
          startIcon={editMode ? <Cancel /> : <Edit />}
          onClick={handleEditToggle}
        >
          {editMode ? 'Отмена' : 'Редактировать'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Профиль" icon={<Person />} />
          <Tab label="Безопасность" icon={<Security />} />
          <Tab label="Мои тикеты" icon={<ConfirmationNumber />} />
          <Tab label="Активность" icon={<History />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Личная информация
            </Typography>
            
            <form onSubmit={profileFormik.handleSubmit}>
              <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="firstName"
                  name="firstName"
                  label="Имя"
                  value={profileFormik.values.firstName}
                  onChange={profileFormik.handleChange}
                  error={profileFormik.touched.firstName && Boolean(profileFormik.errors.firstName)}
                  helperText={profileFormik.touched.firstName && profileFormik.errors.firstName}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="lastName"
                  name="lastName"
                  label="Фамилия"
                  value={profileFormik.values.lastName}
                  onChange={profileFormik.handleChange}
                  error={profileFormik.touched.lastName && Boolean(profileFormik.errors.lastName)}
                  helperText={profileFormik.touched.lastName && profileFormik.errors.lastName}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    label="Email"
                    type="email"
                    value={profileFormik.values.email}
                    onChange={profileFormik.handleChange}
                    error={profileFormik.touched.email && Boolean(profileFormik.errors.email)}
                    helperText={profileFormik.touched.email && profileFormik.errors.email}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="phone"
                    name="phone"
                    label="Телефон"
                    value={profileFormik.values.phone}
                    onChange={profileFormik.handleChange}
                    error={profileFormik.touched.phone && Boolean(profileFormik.errors.phone)}
                    helperText={profileFormik.touched.phone && profileFormik.errors.phone}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="telegramId"
                    name="telegramId"
                    label="Telegram ID"
                    value={profileFormik.values.telegramId}
                    onChange={profileFormik.handleChange}
                    error={profileFormik.touched.telegramId && Boolean(profileFormik.errors.telegramId)}
                    helperText={profileFormik.touched.telegramId && profileFormik.errors.telegramId}
                    disabled={!editMode}
                    placeholder="@username или username"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="department"
                    name="department"
                    label="Отдел"
                    value={profileFormik.values.department}
                    onChange={profileFormik.handleChange}
                    error={profileFormik.touched.department && Boolean(profileFormik.errors.department)}
                    helperText={profileFormik.touched.department && profileFormik.errors.department}
                    disabled={!editMode}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="company"
                    name="company"
                    label="Компания"
                    value={profileFormik.values.company}
                    onChange={profileFormik.handleChange}
                    error={profileFormik.touched.company && Boolean(profileFormik.errors.company)}
                    helperText={profileFormik.touched.company && profileFormik.errors.company}
                    disabled={!editMode}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Роль"
                    value={user?.role === 'admin' ? 'Администратор' : user?.role === 'agent' ? 'Агент' : 'Пользователь'}
                    disabled
                  />
                </Grid>
              </Grid>
              
              {editMode && (
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={loading}
                  >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleEditToggle}
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                </Box>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Настройки безопасности
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText
                  primary="Изменить пароль"
                  secondary="Обновите пароль для повышения безопасности"
                />
                <Button
                  variant="outlined"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  Изменить
                </Button>
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <Schedule />
                </ListItemIcon>
                <ListItemText
                  primary="Последний вход"
                  secondary={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Неизвестно'}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Мои тикеты
            </Typography>
            
            {userTickets.length === 0 ? (
              <Typography color="text.secondary">
                У вас пока нет тикетов
              </Typography>
            ) : (
              <List>
                {userTickets.map((ticket, index) => (
                  <React.Fragment key={ticket.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">
                              #{ticket.id} {ticket.title}
                            </Typography>
                            <Chip
                              label={getStatusText(ticket.status)}
                              color={getStatusColor(ticket.status)}
                              size="small"
                            />
                            <Chip
                              label={getPriorityText(ticket.priority)}
                              color={getPriorityColor(ticket.priority)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={`Создан: ${new Date(ticket.createdAt).toLocaleString()}`}
                      />
                    </ListItem>
                    {index < userTickets.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              История активности
            </Typography>
            
            {userActivity.length === 0 ? (
              <Typography color="text.secondary">
                История активности пуста
              </Typography>
            ) : (
              <List>
                {userActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemText
                        primary={activity.action}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(activity.timestamp).toLocaleString()}
                            </Typography>
                            <Typography variant="body2">
                              {activity.details}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < userActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Изменить пароль</DialogTitle>
        <form onSubmit={passwordFormik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              id="currentPassword"
              name="currentPassword"
              label="Текущий пароль"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordFormik.values.currentPassword}
              onChange={passwordFormik.handleChange}
              error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
              helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    edge="end"
                  >
                    {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />
            
            <TextField
              fullWidth
              margin="normal"
              id="newPassword"
              name="newPassword"
              label="Новый пароль"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordFormik.values.newPassword}
              onChange={passwordFormik.handleChange}
              error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
              helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    edge="end"
                  >
                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />
            
            <TextField
              fullWidth
              margin="normal"
              id="confirmPassword"
              name="confirmPassword"
              label="Подтвердите новый пароль"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordFormik.values.confirmPassword}
              onChange={passwordFormik.handleChange}
              error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
              helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                  >
                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Изменение...' : 'Изменить пароль'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UserProfile;