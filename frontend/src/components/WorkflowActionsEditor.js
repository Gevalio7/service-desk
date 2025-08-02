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
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  PlayArrow,
  Notifications,
  Email,
  Sms,
  Assignment,
  Code,
  Webhook,
  Update,
  Comment,
  TrendingUp,
  Event,
  DragHandle
} from '@mui/icons-material';

const WorkflowActionsEditor = ({ actions = [], onActionsChange, onClose }) => {
  const [localActions, setLocalActions] = useState(actions);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [actionForm, setActionForm] = useState({
    actionType: 'notify',
    actionConfig: {},
    executionOrder: 0,
    isActive: true
  });

  const actionTypes = [
    { 
      value: 'assign', 
      label: 'Назначить исполнителя', 
      icon: <Assignment />,
      description: 'Автоматически назначить тикет пользователю'
    },
    { 
      value: 'notify', 
      label: 'Отправить уведомление', 
      icon: <Notifications />,
      description: 'Отправить уведомление пользователям'
    },
    { 
      value: 'update_field', 
      label: 'Обновить поле', 
      icon: <Update />,
      description: 'Изменить значение поля тикета'
    },
    { 
      value: 'create_comment', 
      label: 'Добавить комментарий', 
      icon: <Comment />,
      description: 'Автоматически добавить комментарий'
    },
    { 
      value: 'send_email', 
      label: 'Отправить email', 
      icon: <Email />,
      description: 'Отправить email уведомление'
    },
    { 
      value: 'send_telegram', 
      label: 'Отправить в Telegram', 
      icon: <Sms />,
      description: 'Отправить сообщение в Telegram'
    },
    { 
      value: 'webhook', 
      label: 'Вызвать webhook', 
      icon: <Webhook />,
      description: 'Отправить HTTP запрос на внешний сервис'
    },
    { 
      value: 'escalate', 
      label: 'Эскалировать', 
      icon: <TrendingUp />,
      description: 'Эскалировать тикет на следующий уровень'
    },
    { 
      value: 'update_sla', 
      label: 'Обновить SLA', 
      icon: <Event />,
      description: 'Изменить параметры SLA'
    },
    { 
      value: 'script', 
      label: 'Выполнить скрипт', 
      icon: <Code />,
      description: 'Выполнить пользовательский JavaScript код'
    },
    { 
      value: 'log_event', 
      label: 'Записать в лог', 
      icon: <Event />,
      description: 'Добавить запись в системный лог'
    }
  ];

  const assigneeRules = [
    { value: 'round_robin', label: 'По кругу' },
    { value: 'least_assigned', label: 'Наименее загруженный' },
    { value: 'creator', label: 'Создатель тикета' },
    { value: 'current_user', label: 'Текущий пользователь' },
    { value: 'specific_user', label: 'Конкретный пользователь' }
  ];

  const notificationTypes = [
    { value: 'email', label: 'Email' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'in_app', label: 'В приложении' },
    { value: 'webhook', label: 'Webhook' }
  ];

  const recipientTypes = [
    { value: 'assignee', label: 'Исполнитель' },
    { value: 'creator', label: 'Создатель' },
    { value: 'watchers', label: 'Наблюдатели' },
    { value: 'role', label: 'По роли' },
    { value: 'specific', label: 'Конкретные пользователи' }
  ];

  useEffect(() => {
    setLocalActions(actions.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)));
  }, [actions]);

  const handleAddAction = () => {
    setEditingAction(null);
    setActionForm({
      actionType: 'notify',
      actionConfig: {},
      executionOrder: Math.max(...localActions.map(a => a.executionOrder || 0), -1) + 1,
      isActive: true
    });
    setActionDialogOpen(true);
  };

  const handleEditAction = (action) => {
    setEditingAction(action);
    setActionForm({
      actionType: action.actionType,
      actionConfig: action.actionConfig || {},
      executionOrder: action.executionOrder || 0,
      isActive: action.isActive !== false
    });
    setActionDialogOpen(true);
  };

  const handleSaveAction = () => {
    const newAction = {
      id: editingAction?.id || `action-${Date.now()}`,
      ...actionForm
    };

    let updatedActions;
    if (editingAction) {
      updatedActions = localActions.map(a => 
        a.id === editingAction.id ? newAction : a
      );
    } else {
      updatedActions = [...localActions, newAction];
    }

    setLocalActions(updatedActions.sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0)));
    setActionDialogOpen(false);
  };

  const handleDeleteAction = (actionId) => {
    const updatedActions = localActions.filter(a => a.id !== actionId);
    setLocalActions(updatedActions);
  };

  const handleMoveAction = (actionId, direction) => {
    const actionIndex = localActions.findIndex(a => a.id === actionId);
    if (actionIndex === -1) return;

    const newActions = [...localActions];
    const targetIndex = direction === 'up' ? actionIndex - 1 : actionIndex + 1;

    if (targetIndex >= 0 && targetIndex < newActions.length) {
      [newActions[actionIndex], newActions[targetIndex]] = [newActions[targetIndex], newActions[actionIndex]];
      
      // Update execution order
      newActions.forEach((action, index) => {
        action.executionOrder = index;
      });

      setLocalActions(newActions);
    }
  };

  const handleSave = () => {
    onActionsChange(localActions);
    onClose();
  };

  const getActionTypeInfo = (type) => {
    return actionTypes.find(t => t.value === type) || actionTypes[0];
  };

  const renderActionConfig = (action) => {
    const config = action.actionConfig || {};

    switch (action.actionType) {
      case 'assign':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Правило назначения: {assigneeRules.find(r => r.value === config.assigneeRule)?.label || config.assigneeRule}
            </Typography>
            {config.assigneeId && (
              <Typography variant="body2" color="text.secondary">
                Пользователь ID: {config.assigneeId}
              </Typography>
            )}
          </Box>
        );

      case 'notify':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Получатели: {config.recipients?.join(', ') || 'Не указаны'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Тип: {config.notificationType || 'email'}
            </Typography>
          </Box>
        );

      case 'update_field':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Поле: {config.fieldName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Значение: {config.fieldValue}
            </Typography>
          </Box>
        );

      case 'create_comment':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Содержание: {config.content?.substring(0, 100)}...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Внутренний: {config.isInternal ? 'Да' : 'Нет'}
            </Typography>
          </Box>
        );

      case 'webhook':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              URL: {config.url}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Метод: {config.method || 'POST'}
            </Typography>
          </Box>
        );

      case 'script':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Пользовательский JavaScript код
            </Typography>
          </Box>
        );

      default:
        return (
          <Typography variant="body2" color="text.secondary">
            {JSON.stringify(config, null, 2).substring(0, 100)}...
          </Typography>
        );
    }
  };

  const renderActionConfigForm = () => {
    const config = actionForm.actionConfig || {};

    switch (actionForm.actionType) {
      case 'assign':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Правило назначения</InputLabel>
                <Select
                  value={config.assigneeRule || 'round_robin'}
                  onChange={(e) => setActionForm(prev => ({
                    ...prev,
                    actionConfig: { ...prev.actionConfig, assigneeRule: e.target.value }
                  }))}
                  label="Правило назначения"
                >
                  {assigneeRules.map(rule => (
                    <MenuItem key={rule.value} value={rule.value}>
                      {rule.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {config.assigneeRule === 'specific_user' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ID пользователя"
                  value={config.assigneeId || ''}
                  onChange={(e) => setActionForm(prev => ({
                    ...prev,
                    actionConfig: { ...prev.actionConfig, assigneeId: e.target.value }
                  }))}
                />
              </Grid>
            )}
          </Grid>
        );

      case 'notify':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип уведомления</InputLabel>
                <Select
                  value={config.notificationType || 'email'}
                  onChange={(e) => setActionForm(prev => ({
                    ...prev,
                    actionConfig: { ...prev.actionConfig, notificationType: e.target.value }
                  }))}
                  label="Тип уведомления"
                >
                  {notificationTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Получатели</InputLabel>
                <Select
                  multiple
                  value={config.recipients || []}
                  onChange={(e) => setActionForm(prev => ({
                    ...prev,
                    actionConfig: { ...prev.actionConfig, recipients: e.target.value }
                  }))}
                  label="Получатели"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={recipientTypes.find(r => r.value === value)?.label || value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {recipientTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Шаблон сообщения"
                multiline
                rows={3}
                value={config.template?.message || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: {
                    ...prev.actionConfig,
                    template: { ...prev.actionConfig.template, message: e.target.value }
                  }
                }))}
                helperText="Используйте {{ticket.title}}, {{user.name}} для подстановки значений"
              />
            </Grid>
          </Grid>
        );

      case 'update_field':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Имя поля"
                value={config.fieldName || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, fieldName: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Новое значение"
                value={config.fieldValue || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, fieldValue: e.target.value }
                }))}
                helperText="Используйте {{}} для динамических значений"
              />
            </Grid>
          </Grid>
        );

      case 'create_comment':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Содержание комментария"
                value={config.content || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, content: e.target.value }
                }))}
                helperText="Используйте {{}} для подстановки значений"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.isInternal || false}
                    onChange={(e) => setActionForm(prev => ({
                      ...prev,
                      actionConfig: { ...prev.actionConfig, isInternal: e.target.checked }
                    }))}
                  />
                }
                label="Внутренний комментарий"
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
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, url: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Метод</InputLabel>
                <Select
                  value={config.method || 'POST'}
                  onChange={(e) => setActionForm(prev => ({
                    ...prev,
                    actionConfig: { ...prev.actionConfig, method: e.target.value }
                  }))}
                  label="Метод"
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
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
                    setActionForm(prev => ({
                      ...prev,
                      actionConfig: { ...prev.actionConfig, headers }
                    }));
                  } catch (err) {
                    // Ignore invalid JSON
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Таймаут (мс)"
                value={config.timeout || 10000}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, timeout: parseInt(e.target.value) }
                }))}
              />
            </Grid>
          </Grid>
        );

      case 'script':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="JavaScript код"
                value={config.script || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, script: e.target.value }
                }))}
                helperText="Доступны переменные: ticket, user, context, require"
                placeholder="// Пример: обновить приоритет тикета\nticket.priority = 'high';\nawait ticket.save();\nreturn { success: true, message: 'Приоритет обновлен' };"
              />
            </Grid>
          </Grid>
        );

      case 'log_event':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Событие"
                value={config.event || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, event: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Сообщение"
                value={config.message || ''}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  actionConfig: { ...prev.actionConfig, message: e.target.value }
                }))}
              />
            </Grid>
          </Grid>
        );

      default:
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Конфигурация (JSON)"
            value={JSON.stringify(config, null, 2)}
            onChange={(e) => {
              try {
                const newConfig = JSON.parse(e.target.value);
                setActionForm(prev => ({ ...prev, actionConfig: newConfig }));
              } catch (err) {
                // Ignore invalid JSON
              }
            }}
          />
        );
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Действия при выполнении перехода
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddAction}
        >
          Добавить действие
        </Button>
      </Box>

      {localActions.length === 0 ? (
        <Alert severity="info">
          Действия не заданы. При выполнении перехода будет изменен только статус.
        </Alert>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Действия выполняются в указанном порядке. Используйте стрелки для изменения порядка.
          </Alert>

          <List>
            {localActions.map((action, index) => {
              const typeInfo = getActionTypeInfo(action.actionType);
              return (
                <React.Fragment key={action.id}>
                  <Card sx={{ mb: 1 }}>
                    <CardContent>
                      <ListItem sx={{ px: 0 }}>
                        <Box display="flex" alignItems="center" mr={2}>
                          <Box display="flex" flexDirection="column" alignItems="center" mr={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleMoveAction(action.id, 'up')}
                              disabled={index === 0}
                            >
                              <DragHandle />
                            </IconButton>
                            <Typography variant="caption" color="text.secondary">
                              {action.executionOrder || index}
                            </Typography>
                          </Box>
                          {typeInfo.icon}
                        </Box>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body1" fontWeight="medium">
                                {typeInfo.label}
                              </Typography>
                              {!action.isActive && (
                                <Chip size="small" label="Неактивно" color="default" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box mt={1}>
                              <Typography variant="body2" color="text.secondary" mb={1}>
                                {typeInfo.description}
                              </Typography>
                              {renderActionConfig(action)}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditAction(action)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleDeleteAction(action.id)}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </CardContent>
                  </Card>
                </React.Fragment>
              );
            })}
          </List>
        </Box>
      )}

      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Сохранить действия
        </Button>
      </Box>

      {/* Add/Edit Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAction ? 'Редактировать действие' : 'Добавить действие'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип действия</InputLabel>
                <Select
                  value={actionForm.actionType}
                  onChange={(e) => setActionForm(prev => ({
                    ...prev,
                    actionType: e.target.value,
                    actionConfig: {}
                  }))}
                  label="Тип действия"
                >
                  {actionTypes.map(type => (
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
              <TextField
                fullWidth
                type="number"
                label="Порядок выполнения"
                value={actionForm.executionOrder}
                onChange={(e) => setActionForm(prev => ({
                  ...prev,
                  executionOrder: parseInt(e.target.value) || 0
                }))}
                helperText="Меньшие числа выполняются раньше"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" mb={2}>
                Конфигурация действия
              </Typography>
              {renderActionConfigForm()}
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={actionForm.isActive}
                    onChange={(e) => setActionForm(prev => ({
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
          <Button onClick={() => setActionDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSaveAction} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowActionsEditor;