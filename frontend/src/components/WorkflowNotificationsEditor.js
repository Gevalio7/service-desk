import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Notifications,
  Email,
  Sms,
  Webhook,
  NotificationsActive,
  Person,
  Group,
  Schedule,
  Warning,
  Info,
  CheckCircle,
  Error
} from '@mui/icons-material';

const WorkflowNotificationsEditor = ({ workflowType, notifications = [], onNotificationsChange, onClose }) => {
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [notificationForm, setNotificationForm] = useState({
    eventType: 'status_change',
    notificationType: 'email',
    recipients: {},
    templateConfig: {},
    conditions: {},
    isActive: true
  });

  const eventTypes = [
    { 
      value: 'status_change', 
      label: 'Смена статуса', 
      icon: <NotificationsActive />,
      description: 'Уведомление при изменении статуса тикета'
    },
    { 
      value: 'assignment', 
      label: 'Назначение', 
      icon: <Person />,
      description: 'Уведомление при назначении тикета'
    },
    { 
      value: 'sla_breach', 
      label: 'Нарушение SLA', 
      icon: <Warning />,
      description: 'Уведомление при нарушении SLA'
    },
    { 
      value: 'sla_warning', 
      label: 'Предупреждение SLA', 
      icon: <Schedule />,
      description: 'Предупреждение о приближении нарушения SLA'
    },
    { 
      value: 'escalation', 
      label: 'Эскалация', 
      icon: <Error />,
      description: 'Уведомление при эскалации тикета'
    },
    { 
      value: 'resolution', 
      label: 'Решение', 
      icon: <CheckCircle />,
      description: 'Уведомление при решении тикета'
    },
    { 
      value: 'comment_added', 
      label: 'Новый комментарий', 
      icon: <Info />,
      description: 'Уведомление при добавлении комментария'
    }
  ];

  const notificationTypes = [
    { 
      value: 'email', 
      label: 'Email', 
      icon: <Email />,
      description: 'Отправка уведомлений по электронной почте'
    },
    { 
      value: 'telegram', 
      label: 'Telegram', 
      icon: <Sms />,
      description: 'Отправка уведомлений в Telegram'
    },
    { 
      value: 'in_app', 
      label: 'В приложении', 
      icon: <Notifications />,
      description: 'Показ уведомлений в интерфейсе приложения'
    },
    { 
      value: 'webhook', 
      label: 'Webhook', 
      icon: <Webhook />,
      description: 'Отправка HTTP запроса на внешний сервис'
    }
  ];

  const recipientTypes = [
    { value: 'assignee', label: 'Исполнитель', description: 'Пользователь, назначенный на тикет' },
    { value: 'creator', label: 'Создатель', description: 'Пользователь, создавший тикет' },
    { value: 'watchers', label: 'Наблюдатели', description: 'Пользователи, следящие за тикетом' },
    { value: 'team', label: 'Команда', description: 'Все члены команды' },
    { value: 'managers', label: 'Менеджеры', description: 'Пользователи с ролью менеджера' },
    { value: 'admins', label: 'Администраторы', description: 'Пользователи с ролью администратора' },
    { value: 'custom', label: 'Пользовательский список', description: 'Указанные пользователи' }
  ];

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const handleAddNotification = () => {
    setEditingNotification(null);
    setNotificationForm({
      eventType: 'status_change',
      notificationType: 'email',
      recipients: {
        types: ['assignee'],
        users: [],
        roles: []
      },
      templateConfig: {
        subject: '',
        message: '',
        template: 'default'
      },
      conditions: {
        statuses: [],
        priorities: [],
        categories: []
      },
      isActive: true
    });
    setNotificationDialogOpen(true);
  };

  const handleEditNotification = (notification) => {
    setEditingNotification(notification);
    setNotificationForm({
      eventType: notification.eventType,
      notificationType: notification.notificationType,
      recipients: notification.recipients || { types: ['assignee'], users: [], roles: [] },
      templateConfig: notification.templateConfig || { subject: '', message: '', template: 'default' },
      conditions: notification.conditions || { statuses: [], priorities: [], categories: [] },
      isActive: notification.isActive !== false
    });
    setNotificationDialogOpen(true);
  };

  const handleSaveNotification = () => {
    const newNotification = {
      id: editingNotification?.id || `notification-${Date.now()}`,
      workflowTypeId: workflowType.id,
      ...notificationForm
    };

    let updatedNotifications;
    if (editingNotification) {
      updatedNotifications = localNotifications.map(n => 
        n.id === editingNotification.id ? newNotification : n
      );
    } else {
      updatedNotifications = [...localNotifications, newNotification];
    }

    setLocalNotifications(updatedNotifications);
    setNotificationDialogOpen(false);
  };

  const handleDeleteNotification = (notificationId) => {
    const updatedNotifications = localNotifications.filter(n => n.id !== notificationId);
    setLocalNotifications(updatedNotifications);
  };

  const handleSave = () => {
    onNotificationsChange(localNotifications);
    onClose();
  };

  const getEventTypeInfo = (type) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const getNotificationTypeInfo = (type) => {
    return notificationTypes.find(t => t.value === type) || notificationTypes[0];
  };

  const renderNotificationSummary = (notification) => {
    const eventInfo = getEventTypeInfo(notification.eventType);
    const typeInfo = getNotificationTypeInfo(notification.notificationType);
    const recipients = notification.recipients?.types || [];

    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {eventInfo.icon}
          <Typography variant="body1" fontWeight="medium">
            {eventInfo.label}
          </Typography>
          <Chip size="small" label={typeInfo.label} />
          {!notification.isActive && (
            <Chip size="small" label="Неактивно" color="default" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {eventInfo.description}
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {recipients.map(recipient => (
            <Chip 
              key={recipient} 
              size="small" 
              label={recipientTypes.find(r => r.value === recipient)?.label || recipient}
              variant="outlined"
            />
          ))}
        </Box>
      </Box>
    );
  };

  const renderTemplateConfigForm = () => {
    const config = notificationForm.templateConfig || {};

    switch (notificationForm.notificationType) {
      case 'email':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Тема письма"
                value={config.subject || ''}
                onChange={(e) => setNotificationForm(prev => ({
                  ...prev,
                  templateConfig: { ...prev.templateConfig, subject: e.target.value }
                }))}
                helperText="Используйте {{ticket.title}}, {{user.name}} для подстановки значений"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Текст сообщения"
                value={config.message || ''}
                onChange={(e) => setNotificationForm(prev => ({
                  ...prev,
                  templateConfig: { ...prev.templateConfig, message: e.target.value }
                }))}
                helperText="HTML разметка поддерживается"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Шаблон</InputLabel>
                <Select
                  value={config.template || 'default'}
                  onChange={(e) => setNotificationForm(prev => ({
                    ...prev,
                    templateConfig: { ...prev.templateConfig, template: e.target.value }
                  }))}
                  label="Шаблон"
                >
                  <MenuItem value="default">По умолчанию</MenuItem>
                  <MenuItem value="minimal">Минимальный</MenuItem>
                  <MenuItem value="detailed">Подробный</MenuItem>
                  <MenuItem value="custom">Пользовательский</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 'telegram':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Текст сообщения"
                value={config.message || ''}
                onChange={(e) => setNotificationForm(prev => ({
                  ...prev,
                  templateConfig: { ...prev.templateConfig, message: e.target.value }
                }))}
                helperText="Markdown разметка поддерживается"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.silent || false}
                    onChange={(e) => setNotificationForm(prev => ({
                      ...prev,
                      templateConfig: { ...prev.templateConfig, silent: e.target.checked }
                    }))}
                  />
                }
                label="Тихое уведомление"
              />
            </Grid>
          </Grid>
        );

      case 'webhook':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="URL"
                value={config.url || ''}
                onChange={(e) => setNotificationForm(prev => ({
                  ...prev,
                  templateConfig: { ...prev.templateConfig, url: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Метод</InputLabel>
                <Select
                  value={config.method || 'POST'}
                  onChange={(e) => setNotificationForm(prev => ({
                    ...prev,
                    templateConfig: { ...prev.templateConfig, method: e.target.value }
                  }))}
                  label="Метод"
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Заголовки (JSON)"
                value={JSON.stringify(config.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setNotificationForm(prev => ({
                      ...prev,
                      templateConfig: { ...prev.templateConfig, headers }
                    }));
                  } catch (err) {
                    // Ignore invalid JSON
                  }
                }}
              />
            </Grid>
          </Grid>
        );

      default:
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Текст уведомления"
            value={config.message || ''}
            onChange={(e) => setNotificationForm(prev => ({
              ...prev,
              templateConfig: { ...prev.templateConfig, message: e.target.value }
            }))}
          />
        );
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Настройки уведомлений для "{workflowType.displayName?.ru || workflowType.name}"
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNotification}
        >
          Добавить уведомление
        </Button>
      </Box>

      {localNotifications.length === 0 ? (
        <Alert severity="info">
          Уведомления не настроены. Добавьте первое уведомление для начала работы.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {localNotifications.map((notification) => (
            <Grid item xs={12} md={6} key={notification.id}>
              <Card>
                <CardContent>
                  {renderNotificationSummary(notification)}
                  <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditNotification(notification)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Сохранить настройки
        </Button>
      </Box>

      {/* Add/Edit Notification Dialog */}
      <Dialog open={notificationDialogOpen} onClose={() => setNotificationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingNotification ? 'Редактировать уведомление' : 'Добавить уведомление'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Событие</InputLabel>
                <Select
                  value={notificationForm.eventType}
                  onChange={(e) => setNotificationForm(prev => ({
                    ...prev,
                    eventType: e.target.value
                  }))}
                  label="Событие"
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип уведомления</InputLabel>
                <Select
                  value={notificationForm.notificationType}
                  onChange={(e) => setNotificationForm(prev => ({
                    ...prev,
                    notificationType: e.target.value
                  }))}
                  label="Тип уведомления"
                >
                  {notificationTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" mb={2}>
                Получатели уведомлений
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Типы получателей</InputLabel>
                <Select
                  multiple
                  value={notificationForm.recipients?.types || []}
                  onChange={(e) => setNotificationForm(prev => ({
                    ...prev,
                    recipients: { ...prev.recipients, types: e.target.value }
                  }))}
                  label="Типы получателей"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={recipientTypes.find(r => r.value === value)?.label || value} 
                          size="small" 
                        />
                      ))}
                    </Box>
                  )}
                >
                  {recipientTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography variant="body2">{type.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" mb={2}>
                Настройки шаблона
              </Typography>
              {renderTemplateConfigForm()}
            </Grid>

            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">
                    Дополнительные условия
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Статусы (через запятую)"
                        value={notificationForm.conditions?.statuses?.join(', ') || ''}
                        onChange={(e) => setNotificationForm(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            statuses: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                          }
                        }))}
                        helperText="Оставьте пустым для всех статусов"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Приоритеты (через запятую)"
                        value={notificationForm.conditions?.priorities?.join(', ') || ''}
                        onChange={(e) => setNotificationForm(prev => ({
                          ...prev,
                          conditions: {
                            ...prev.conditions,
                            priorities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                          }
                        }))}
                        helperText="Например: high, critical"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationForm.isActive}
                    onChange={(e) => setNotificationForm(prev => ({
                      ...prev,
                      isActive: e.target.checked
                    }))}
                  />
                }
                label="Активно"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSaveNotification} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowNotificationsEditor;