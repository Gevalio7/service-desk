import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Upload,
  AccountTree,
  Settings,
  PlayArrow,
  Stop,
  History,
  ColorLens,
  Notifications,
  Code,
  Save,
  Cancel,
  ArrowForward,
  Timeline
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';
import WorkflowEditor from '../components/WorkflowEditor';
import WorkflowConditionsEditor from '../components/WorkflowConditionsEditor';
import WorkflowActionsEditor from '../components/WorkflowActionsEditor';

const WorkflowAdmin = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [workflowTypes, setWorkflowTypes] = useState([]);
  const [selectedWorkflowType, setSelectedWorkflowType] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialogs
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);
  const [editTypeDialogOpen, setEditTypeDialogOpen] = useState(false);
  const [createStatusDialogOpen, setCreateStatusDialogOpen] = useState(false);
  const [editStatusDialogOpen, setEditStatusDialogOpen] = useState(false);
  const [createTransitionDialogOpen, setCreateTransitionDialogOpen] = useState(false);
  const [editTransitionDialogOpen, setEditTransitionDialogOpen] = useState(false);
  const [conditionsDialogOpen, setConditionsDialogOpen] = useState(false);
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Form states
  const [typeForm, setTypeForm] = useState({
    name: '',
    displayName: { ru: '', en: '' },
    description: { ru: '', en: '' },
    icon: 'ticket',
    color: '#007bff',
    isActive: true,
    isDefault: false
  });
  
  const [statusForm, setStatusForm] = useState({
    name: '',
    displayName: { ru: '', en: '' },
    description: { ru: '', en: '' },
    icon: 'circle',
    color: '#6c757d',
    category: 'active',
    isInitial: false,
    isFinal: false,
    sortOrder: 0,
    slaHours: null,
    responseHours: null,
    autoAssign: false,
    notifyOnEnter: true,
    notifyOnExit: false,
    isActive: true
  });

  const [transitionForm, setTransitionForm] = useState({
    name: '',
    displayName: { ru: '', en: '' },
    description: { ru: '', en: '' },
    fromStatusId: '',
    toStatusId: '',
    icon: 'arrow-right',
    color: '#007bff',
    isAutomatic: false,
    requiresComment: false,
    requiresAssignment: false,
    allowedRoles: [],
    sortOrder: 0,
    isActive: true
  });

  useEffect(() => {
    loadWorkflowTypes();
  }, []);

  useEffect(() => {
    if (selectedWorkflowType) {
      loadWorkflowData(selectedWorkflowType.id);
    }
  }, [selectedWorkflowType]);

  const loadWorkflowTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/workflow/types');
      setWorkflowTypes(response.data.workflowTypes || []);
      if (response.data.workflowTypes?.length > 0 && !selectedWorkflowType) {
        setSelectedWorkflowType(response.data.workflowTypes[0]);
      }
    } catch (err) {
      setError('Ошибка загрузки типов workflow');
      console.error('Error loading workflow types:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowData = async (workflowTypeId) => {
    try {
      setLoading(true);
      const [statusesResponse, transitionsResponse] = await Promise.all([
        axios.get(`/api/workflow/types/${workflowTypeId}/statuses`),
        axios.get(`/api/workflow/types/${workflowTypeId}/transitions`)
      ]);
      
      setStatuses(statusesResponse.data.statuses || []);
      setTransitions(transitionsResponse.data.transitions || []);
    } catch (err) {
      setError('Ошибка загрузки данных workflow');
      console.error('Error loading workflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransition = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/workflow/types/${selectedWorkflowType.id}/transitions`,
        transitionForm
      );
      setTransitions(prev => [...prev, response.data.transition]);
      setCreateTransitionDialogOpen(false);
      setTransitionForm({
        name: '',
        displayName: { ru: '', en: '' },
        description: { ru: '', en: '' },
        fromStatusId: '',
        toStatusId: '',
        icon: 'arrow-right',
        color: '#007bff',
        isAutomatic: false,
        requiresComment: false,
        requiresAssignment: false,
        allowedRoles: [],
        sortOrder: 0,
        isActive: true
      });
      setSuccess('Переход успешно создан');
    } catch (err) {
      setError('Ошибка создания перехода');
      console.error('Error creating transition:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkflowEditor = async (workflowData) => {
    try {
      setLoading(true);
      // Здесь будет логика сохранения данных из визуального редактора
      console.log('Saving workflow data:', workflowData);
      setSuccess('Workflow успешно сохранен');
    } catch (err) {
      setError('Ошибка сохранения workflow');
      console.error('Error saving workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConditionsChange = async (conditions) => {
    if (!selectedTransition) return;
    
    try {
      setLoading(true);
      // Здесь будет API вызов для сохранения условий
      console.log('Saving conditions for transition:', selectedTransition.id, conditions);
      setSuccess('Условия успешно сохранены');
    } catch (err) {
      setError('Ошибка сохранения условий');
      console.error('Error saving conditions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionsChange = async (actions) => {
    if (!selectedTransition) return;
    
    try {
      setLoading(true);
      // Здесь будет API вызов для сохранения действий
      console.log('Saving actions for transition:', selectedTransition.id, actions);
      setSuccess('Действия успешно сохранены');
    } catch (err) {
      setError('Ошибка сохранения действий');
      console.error('Error saving actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflowType = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/workflow/types', typeForm);
      setWorkflowTypes(prev => [...prev, response.data.workflowType]);
      setCreateTypeDialogOpen(false);
      setTypeForm({
        name: '',
        displayName: { ru: '', en: '' },
        description: { ru: '', en: '' },
        icon: 'ticket',
        color: '#007bff',
        isActive: true,
        isDefault: false
      });
      setSuccess('Тип workflow успешно создан');
    } catch (err) {
      setError('Ошибка создания типа workflow');
      console.error('Error creating workflow type:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/api/workflow/types/${selectedWorkflowType.id}/statuses`,
        statusForm
      );
      setStatuses(prev => [...prev, response.data.status]);
      setCreateStatusDialogOpen(false);
      setStatusForm({
        name: '',
        displayName: { ru: '', en: '' },
        description: { ru: '', en: '' },
        icon: 'circle',
        color: '#6c757d',
        category: 'active',
        isInitial: false,
        isFinal: false,
        sortOrder: 0,
        slaHours: null,
        responseHours: null,
        autoAssign: false,
        notifyOnEnter: true,
        notifyOnExit: false,
        isActive: true
      });
      setSuccess('Статус успешно создан');
    } catch (err) {
      setError('Ошибка создания статуса');
      console.error('Error creating status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportWorkflow = async () => {
    try {
      const response = await axios.get(
        `/api/workflow/types/${selectedWorkflowType.id}/export`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `workflow-${selectedWorkflowType.name}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Конфигурация workflow экспортирована');
    } catch (err) {
      setError('Ошибка экспорта workflow');
      console.error('Error exporting workflow:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusCategoryColor = (category) => {
    const colors = {
      open: '#2196f3',
      active: '#ff9800',
      pending: '#9c27b0',
      resolved: '#4caf50',
      closed: '#757575'
    };
    return colors[category] || '#757575';
  };

  const getStatusCategoryLabel = (category) => {
    const labels = {
      open: 'Открыт',
      active: 'Активен',
      pending: 'Ожидание',
      resolved: 'Решен',
      closed: 'Закрыт'
    };
    return labels[category] || category;
  };

  if (!hasRole(['admin'])) {
    return (
      <Box p={3}>
        <Alert severity="error">
          У вас нет прав доступа к администрированию workflow
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Администрирование Workflow
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Импорт
          </Button>
          {selectedWorkflowType && (
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportWorkflow}
            >
              Экспорт
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateTypeDialogOpen(true)}
          >
            Новый Workflow
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Workflow Type Selector */}
      {workflowTypes.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Выберите тип Workflow
            </Typography>
            <Grid container spacing={2}>
              {workflowTypes.map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type.id}>
                  <Card
                    variant={selectedWorkflowType?.id === type.id ? "outlined" : "elevation"}
                    sx={{
                      cursor: 'pointer',
                      border: selectedWorkflowType?.id === type.id ? 2 : 1,
                      borderColor: selectedWorkflowType?.id === type.id ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setSelectedWorkflowType(type)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: type.color,
                            mr: 1
                          }}
                        />
                        <Typography variant="h6">
                          {type.displayName?.ru || type.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {type.description?.ru || 'Без описания'}
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          size="small"
                          label={type.isActive ? 'Активен' : 'Неактивен'}
                          color={type.isActive ? 'success' : 'default'}
                        />
                        {type.isDefault && (
                          <Chip
                            size="small"
                            label="По умолчанию"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {selectedWorkflowType && (
        <>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Статусы" icon={<Settings />} />
              <Tab label="Переходы" icon={<AccountTree />} />
              <Tab label="Визуальный редактор" icon={<Edit />} />
              <Tab label="Уведомления" icon={<Notifications />} />
              <Tab label="Статистика" icon={<History />} />
            </Tabs>
          </Box>

          {/* Statuses Tab */}
          {activeTab === 0 && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Статусы для "{selectedWorkflowType.displayName?.ru || selectedWorkflowType.name}"
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateStatusDialogOpen(true)}
                  >
                    Добавить статус
                  </Button>
                </Box>

                <List>
                  {statuses.map((status, index) => (
                    <React.Fragment key={status.id}>
                      <ListItem>
                        <Box display="flex" alignItems="center" mr={2}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: status.color,
                              mr: 1
                            }}
                          />
                          <Typography variant="body1" fontWeight="medium">
                            {status.displayName?.ru || status.name}
                          </Typography>
                        </Box>
                        <ListItemText
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {status.description?.ru || 'Без описания'}
                              </Typography>
                              <Box mt={1}>
                                <Chip
                                  size="small"
                                  label={getStatusCategoryLabel(status.category)}
                                  sx={{
                                    backgroundColor: getStatusCategoryColor(status.category),
                                    color: 'white',
                                    mr: 1
                                  }}
                                />
                                {status.isInitial && (
                                  <Chip size="small" label="Начальный" color="primary" sx={{ mr: 1 }} />
                                )}
                                {status.isFinal && (
                                  <Chip size="small" label="Финальный" color="secondary" sx={{ mr: 1 }} />
                                )}
                                {status.slaHours && (
                                  <Chip size="small" label={`SLA: ${status.slaHours}ч`} variant="outlined" />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Редактировать">
                            <IconButton edge="end" onClick={() => {
                              setStatusForm(status);
                              setEditStatusDialogOpen(true);
                            }}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton edge="end" color="error">
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < statuses.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {statuses.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body1" color="text.secondary">
                      Статусы не найдены. Создайте первый статус для начала работы.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transitions Tab */}
          {activeTab === 1 && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Переходы для "{selectedWorkflowType.displayName?.ru || selectedWorkflowType.name}"
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateTransitionDialogOpen(true)}
                    disabled={statuses.length < 2}
                  >
                    Добавить переход
                  </Button>
                </Box>

                {statuses.length < 2 && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    Для создания переходов необходимо минимум 2 статуса.
                    Сначала создайте статусы на вкладке "Статусы".
                  </Alert>
                )}

                <List>
                  {transitions.map((transition, index) => (
                    <React.Fragment key={transition.id}>
                      <ListItem>
                        <Box display="flex" alignItems="center" mr={2}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: transition.color || '#007bff',
                              mr: 1
                            }}
                          />
                          <Typography variant="body1" fontWeight="medium">
                            {transition.displayName?.ru || transition.name}
                          </Typography>
                        </Box>
                        <ListItemText
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" mb={1}>
                                {transition.description?.ru || 'Без описания'}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                {transition.fromStatus ? (
                                  <Chip
                                    size="small"
                                    label={transition.fromStatus.displayName?.ru || transition.fromStatus.name}
                                    sx={{
                                      backgroundColor: transition.fromStatus.color,
                                      color: 'white'
                                    }}
                                  />
                                ) : (
                                  <Chip size="small" label="Любой статус" variant="outlined" />
                                )}
                                <ArrowForward fontSize="small" color="action" />
                                <Chip
                                  size="small"
                                  label={transition.toStatus?.displayName?.ru || transition.toStatus?.name || 'Неизвестно'}
                                  sx={{
                                    backgroundColor: transition.toStatus?.color || '#6c757d',
                                    color: 'white'
                                  }}
                                />
                              </Box>
                              <Box>
                                {transition.isAutomatic && (
                                  <Chip size="small" label="Автоматический" color="info" sx={{ mr: 1 }} />
                                )}
                                {transition.requiresComment && (
                                  <Chip size="small" label="Требует комментарий" color="warning" sx={{ mr: 1 }} />
                                )}
                                {transition.requiresAssignment && (
                                  <Chip size="small" label="Требует назначение" color="secondary" sx={{ mr: 1 }} />
                                )}
                                {transition.allowedRoles && transition.allowedRoles.length > 0 && (
                                  <Chip
                                    size="small"
                                    label={`Роли: ${transition.allowedRoles.join(', ')}`}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Настроить условия">
                            <IconButton
                              edge="end"
                              onClick={() => {
                                setSelectedTransition(transition);
                                setConditionsDialogOpen(true);
                              }}
                            >
                              <Code />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Настроить действия">
                            <IconButton
                              edge="end"
                              onClick={() => {
                                setSelectedTransition(transition);
                                setActionsDialogOpen(true);
                              }}
                            >
                              <Settings />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Редактировать">
                            <IconButton edge="end" onClick={() => {
                              setTransitionForm({
                                ...transition,
                                allowedRoles: transition.allowedRoles || []
                              });
                              setEditTransitionDialogOpen(true);
                            }}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton edge="end" color="error">
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < transitions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {transitions.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body1" color="text.secondary" mb={2}>
                      Переходы не найдены. Создайте первый переход для начала работы.
                    </Typography>
                    {statuses.length >= 2 && (
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setCreateTransitionDialogOpen(true)}
                      >
                        Создать переход
                      </Button>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Visual Editor Tab */}
          {activeTab === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" mb={3}>
                  Визуальный редактор Workflow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Drag-and-drop редактор будет реализован в следующем этапе
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 3 && (
            <Card>
              <CardContent>
                <Typography variant="h6" mb={3}>
                  Настройки уведомлений
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Настройки уведомлений будут реализованы в следующем этапе
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Statistics Tab */}
          {activeTab === 4 && (
            <Card>
              <CardContent>
                <Typography variant="h6" mb={3}>
                  Статистика Workflow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Статистика будет реализована в следующем этапе
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Workflow Type Dialog */}
      <Dialog open={createTypeDialogOpen} onClose={() => setCreateTypeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать новый тип Workflow</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Системное имя"
                value={typeForm.name}
                onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                helperText="Только латинские буквы и цифры"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Иконка"
                value={typeForm.icon}
                onChange={(e) => setTypeForm(prev => ({ ...prev, icon: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название (Русский)"
                value={typeForm.displayName.ru}
                onChange={(e) => setTypeForm(prev => ({
                  ...prev,
                  displayName: { ...prev.displayName, ru: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название (English)"
                value={typeForm.displayName.en}
                onChange={(e) => setTypeForm(prev => ({
                  ...prev,
                  displayName: { ...prev.displayName, en: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Описание (Русский)"
                value={typeForm.description.ru}
                onChange={(e) => setTypeForm(prev => ({
                  ...prev,
                  description: { ...prev.description, ru: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Описание (English)"
                value={typeForm.description.en}
                onChange={(e) => setTypeForm(prev => ({
                  ...prev,
                  description: { ...prev.description, en: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="color"
                label="Цвет"
                value={typeForm.color}
                onChange={(e) => setTypeForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={typeForm.isActive}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Активен"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={typeForm.isDefault}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                  />
                }
                label="По умолчанию"
                sx={{ ml: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTypeDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreateWorkflowType} variant="contained" disabled={loading}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Status Dialog */}
      <Dialog open={createStatusDialogOpen} onClose={() => setCreateStatusDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать новый статус</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Системное имя"
                value={statusForm.name}
                onChange={(e) => setStatusForm(prev => ({ ...prev, name: e.target.value }))}
                helperText="Только латинские буквы и цифры"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={statusForm.category}
                  onChange={(e) => setStatusForm(prev => ({ ...prev, category: e.target.value }))}
                  label="Категория"
                >
                  <MenuItem value="open">Открыт</MenuItem>
                  <MenuItem value="active">Активен</MenuItem>
                  <MenuItem value="pending">Ожидание</MenuItem>
                  <MenuItem value="resolved">Решен</MenuItem>
                  <MenuItem value="closed">Закрыт</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название (Русский)"
                value={statusForm.displayName.ru}
                onChange={(e) => setStatusForm(prev => ({
                  ...prev,
                  displayName: { ...prev.displayName, ru: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название (English)"
                value={statusForm.displayName.en}
                onChange={(e) => setStatusForm(prev => ({
                  ...prev,
                  displayName: { ...prev.displayName, en: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Иконка"
                value={statusForm.icon}
                onChange={(e) => setStatusForm(prev => ({ ...prev, icon: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="color"
                label="Цвет"
                value={statusForm.color}
                onChange={(e) => setStatusForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="SLA (часы)"
                value={statusForm.slaHours || ''}
                onChange={(e) => setStatusForm(prev => ({ 
                  ...prev, 
                  slaHours: e.target.value ? parseInt(e.target.value) : null 
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Время ответа (часы)"
                value={statusForm.responseHours || ''}
                onChange={(e) => setStatusForm(prev => ({ 
                  ...prev, 
                  responseHours: e.target.value ? parseInt(e.target.value) : null 
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={statusForm.isInitial}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, isInitial: e.target.checked }))}
                  />
                }
                label="Начальный статус"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={statusForm.isFinal}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, isFinal: e.target.checked }))}
                  />
                }
                label="Финальный статус"
                sx={{ ml: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={statusForm.notifyOnEnter}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, notifyOnEnter: e.target.checked }))}
                  />
                }
                label="Уведомлять при входе"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={statusForm.notifyOnExit}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, notifyOnExit: e.target.checked }))}
                  />
                }
                label="Уведомлять при выходе"
                sx={{ ml: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateStatusDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreateStatus} variant="contained" disabled={loading}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Transition Dialog */}
      <Dialog open={createTransitionDialogOpen} onClose={() => setCreateTransitionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Создать новый переход</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Системное имя"
                value={transitionForm.name}
                onChange={(e) => setTransitionForm(prev => ({ ...prev, name: e.target.value }))}
                helperText="Только латинские буквы и цифры"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Иконка"
                value={transitionForm.icon}
                onChange={(e) => setTransitionForm(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="arrow-right"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название (Русский)"
                value={transitionForm.displayName.ru}
                onChange={(e) => setTransitionForm(prev => ({
                  ...prev,
                  displayName: { ...prev.displayName, ru: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название (English)"
                value={transitionForm.displayName.en}
                onChange={(e) => setTransitionForm(prev => ({
                  ...prev,
                  displayName: { ...prev.displayName, en: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Из статуса</InputLabel>
                <Select
                  value={transitionForm.fromStatusId}
                  onChange={(e) => setTransitionForm(prev => ({ ...prev, fromStatusId: e.target.value }))}
                  label="Из статуса"
                >
                  <MenuItem value="">Любой статус</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status.id} value={status.id}>
                      {status.displayName?.ru || status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>В статус</InputLabel>
                <Select
                  value={transitionForm.toStatusId}
                  onChange={(e) => setTransitionForm(prev => ({ ...prev, toStatusId: e.target.value }))}
                  label="В статус"
                >
                  {statuses.map((status) => (
                    <MenuItem key={status.id} value={status.id}>
                      {status.displayName?.ru || status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="color"
                label="Цвет"
                value={transitionForm.color}
                onChange={(e) => setTransitionForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Порядок сортировки"
                value={transitionForm.sortOrder}
                onChange={(e) => setTransitionForm(prev => ({
                  ...prev,
                  sortOrder: parseInt(e.target.value) || 0
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Описание (Русский)"
                value={transitionForm.description.ru}
                onChange={(e) => setTransitionForm(prev => ({
                  ...prev,
                  description: { ...prev.description, ru: e.target.value }
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={transitionForm.isAutomatic}
                    onChange={(e) => setTransitionForm(prev => ({ ...prev, isAutomatic: e.target.checked }))}
                  />
                }
                label="Автоматический переход"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={transitionForm.requiresComment}
                    onChange={(e) => setTransitionForm(prev => ({ ...prev, requiresComment: e.target.checked }))}
                  />
                }
                label="Требует комментарий"
                sx={{ ml: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={transitionForm.requiresAssignment}
                    onChange={(e) => setTransitionForm(prev => ({ ...prev, requiresAssignment: e.target.checked }))}
                  />
                }
                label="Требует назначение исполнителя"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Разрешенные роли</InputLabel>
                <Select
                  multiple
                  value={transitionForm.allowedRoles}
                  onChange={(e) => setTransitionForm(prev => ({ ...prev, allowedRoles: e.target.value }))}
                  label="Разрешенные роли"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="admin">Администратор</MenuItem>
                  <MenuItem value="agent">Агент</MenuItem>
                  <MenuItem value="client">Клиент</MenuItem>
                  <MenuItem value="system">Система</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTransitionDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreateTransition} variant="contained" disabled={loading}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conditions Dialog */}
      {conditionsDialogOpen && selectedTransition && (
        <Dialog open={conditionsDialogOpen} onClose={() => setConditionsDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Условия для перехода "{selectedTransition.displayName?.ru || selectedTransition.name}"
          </DialogTitle>
          <DialogContent>
            <WorkflowConditionsEditor
              transitionId={selectedTransition.id}
              conditions={selectedTransition.WorkflowConditions || []}
              onChange={handleConditionsChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConditionsDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Actions Dialog */}
      {actionsDialogOpen && selectedTransition && (
        <Dialog open={actionsDialogOpen} onClose={() => setActionsDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Действия для перехода "{selectedTransition.displayName?.ru || selectedTransition.name}"
          </DialogTitle>
          <DialogContent>
            <WorkflowActionsEditor
              transitionId={selectedTransition.id}
              actions={selectedTransition.WorkflowActions || []}
              onChange={handleActionsChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionsDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default WorkflowAdmin;