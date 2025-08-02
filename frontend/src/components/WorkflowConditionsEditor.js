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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Code,
  Schedule,
  Person,
  Assignment,
  Security,
  Settings
} from '@mui/icons-material';

const WorkflowConditionsEditor = ({ conditions = [], onConditionsChange, onClose }) => {
  const [localConditions, setLocalConditions] = useState(conditions);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [conditionForm, setConditionForm] = useState({
    conditionType: 'field',
    fieldName: '',
    operator: 'equals',
    expectedValue: '',
    conditionGroup: 1,
    isActive: true
  });

  const conditionTypes = [
    { value: 'field', label: 'Поле тикета', icon: <Settings /> },
    { value: 'role', label: 'Роль пользователя', icon: <Person /> },
    { value: 'time', label: 'Время', icon: <Schedule /> },
    { value: 'sla', label: 'SLA', icon: <Assignment /> },
    { value: 'assignment', label: 'Назначение', icon: <Security /> },
    { value: 'custom', label: 'Пользовательский код', icon: <Code /> }
  ];

  const operators = {
    field: [
      { value: 'equals', label: 'Равно' },
      { value: 'not_equals', label: 'Не равно' },
      { value: 'greater_than', label: 'Больше' },
      { value: 'less_than', label: 'Меньше' },
      { value: 'greater_or_equal', label: 'Больше или равно' },
      { value: 'less_or_equal', label: 'Меньше или равно' },
      { value: 'contains', label: 'Содержит' },
      { value: 'not_contains', label: 'Не содержит' },
      { value: 'starts_with', label: 'Начинается с' },
      { value: 'ends_with', label: 'Заканчивается на' },
      { value: 'is_empty', label: 'Пустое' },
      { value: 'is_not_empty', label: 'Не пустое' },
      { value: 'in', label: 'В списке' },
      { value: 'not_in', label: 'Не в списке' },
      { value: 'regex', label: 'Регулярное выражение' }
    ],
    role: [
      { value: 'equals', label: 'Равно' },
      { value: 'in', label: 'В списке' },
      { value: 'not_in', label: 'Не в списке' }
    ],
    time: [
      { value: 'greater_than', label: 'Больше (минут)' },
      { value: 'less_than', label: 'Меньше (минут)' }
    ],
    sla: [
      { value: 'equals', label: 'Нарушен/Не нарушен' },
      { value: 'greater_than', label: 'Просрочен' },
      { value: 'less_than', label: 'До просрочки' }
    ],
    assignment: [
      { value: 'is_empty', label: 'Не назначен' },
      { value: 'is_not_empty', label: 'Назначен' },
      { value: 'equals', label: 'Назначен конкретному' }
    ],
    custom: [
      { value: 'custom', label: 'Пользовательская логика' }
    ]
  };

  const fieldNames = [
    { value: 'title', label: 'Заголовок' },
    { value: 'description', label: 'Описание' },
    { value: 'priority', label: 'Приоритет' },
    { value: 'category', label: 'Категория' },
    { value: 'assignedToId', label: 'Назначен' },
    { value: 'createdById', label: 'Создатель' },
    { value: 'createdAt', label: 'Дата создания' },
    { value: 'updatedAt', label: 'Дата обновления' },
    { value: 'dueDate', label: 'Срок выполнения' },
    { value: 'tags', label: 'Теги' }
  ];

  useEffect(() => {
    setLocalConditions(conditions);
  }, [conditions]);

  const handleAddCondition = () => {
    setEditingCondition(null);
    setConditionForm({
      conditionType: 'field',
      fieldName: '',
      operator: 'equals',
      expectedValue: '',
      conditionGroup: Math.max(...localConditions.map(c => c.conditionGroup || 1), 0) + 1,
      isActive: true
    });
    setConditionDialogOpen(true);
  };

  const handleEditCondition = (condition) => {
    setEditingCondition(condition);
    setConditionForm({
      conditionType: condition.conditionType,
      fieldName: condition.fieldName || '',
      operator: condition.operator,
      expectedValue: condition.expectedValue || '',
      conditionGroup: condition.conditionGroup || 1,
      isActive: condition.isActive !== false
    });
    setConditionDialogOpen(true);
  };

  const handleSaveCondition = () => {
    const newCondition = {
      id: editingCondition?.id || `condition-${Date.now()}`,
      ...conditionForm
    };

    let updatedConditions;
    if (editingCondition) {
      updatedConditions = localConditions.map(c => 
        c.id === editingCondition.id ? newCondition : c
      );
    } else {
      updatedConditions = [...localConditions, newCondition];
    }

    setLocalConditions(updatedConditions);
    setConditionDialogOpen(false);
  };

  const handleDeleteCondition = (conditionId) => {
    const updatedConditions = localConditions.filter(c => c.id !== conditionId);
    setLocalConditions(updatedConditions);
  };

  const handleSave = () => {
    onConditionsChange(localConditions);
    onClose();
  };

  const getConditionTypeInfo = (type) => {
    return conditionTypes.find(t => t.value === type) || conditionTypes[0];
  };

  const getOperatorLabel = (type, operator) => {
    const typeOperators = operators[type] || operators.field;
    const operatorInfo = typeOperators.find(o => o.value === operator);
    return operatorInfo?.label || operator;
  };

  const groupedConditions = localConditions.reduce((groups, condition) => {
    const group = condition.conditionGroup || 1;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(condition);
    return groups;
  }, {});

  const renderConditionValue = (condition) => {
    if (condition.conditionType === 'custom') {
      return (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Пользовательский код:
          </Typography>
          <Box
            sx={{
              backgroundColor: '#f5f5f5',
              p: 1,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              maxHeight: 100,
              overflow: 'auto'
            }}
          >
            {condition.expectedValue || 'return true;'}
          </Box>
        </Box>
      );
    }

    if (condition.operator === 'in' || condition.operator === 'not_in') {
      try {
        const values = JSON.parse(condition.expectedValue || '[]');
        return (
          <Box sx={{ mt: 1 }}>
            {values.map((value, index) => (
              <Chip key={index} label={value} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
            ))}
          </Box>
        );
      } catch {
        return condition.expectedValue;
      }
    }

    return condition.expectedValue;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Условия выполнения перехода
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddCondition}
        >
          Добавить условие
        </Button>
      </Box>

      {localConditions.length === 0 ? (
        <Alert severity="info">
          Условия не заданы. Переход будет доступен всегда.
        </Alert>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Условия в одной группе связаны логикой ИЛИ, группы между собой - логикой И.
          </Alert>

          {Object.entries(groupedConditions).map(([groupId, groupConditions]) => (
            <Card key={groupId} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" mb={2}>
                  Группа условий #{groupId}
                  <Chip 
                    size="small" 
                    label={`${groupConditions.length} условий`} 
                    sx={{ ml: 1 }} 
                  />
                </Typography>

                <List>
                  {groupConditions.map((condition, index) => {
                    const typeInfo = getConditionTypeInfo(condition.conditionType);
                    return (
                      <React.Fragment key={condition.id}>
                        <ListItem>
                          <Box display="flex" alignItems="center" mr={2}>
                            {typeInfo.icon}
                          </Box>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1">
                                  {typeInfo.label}
                                </Typography>
                                {condition.fieldName && (
                                  <Chip size="small" label={condition.fieldName} />
                                )}
                                <Typography variant="body2" color="text.secondary">
                                  {getOperatorLabel(condition.conditionType, condition.operator)}
                                </Typography>
                                {!condition.isActive && (
                                  <Chip size="small" label="Неактивно" color="default" />
                                )}
                              </Box>
                            }
                            secondary={renderConditionValue(condition)}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleEditCondition(condition)}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleDeleteCondition(condition.id)}
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < groupConditions.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Сохранить условия
        </Button>
      </Box>

      {/* Add/Edit Condition Dialog */}
      <Dialog open={conditionDialogOpen} onClose={() => setConditionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCondition ? 'Редактировать условие' : 'Добавить условие'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип условия</InputLabel>
                <Select
                  value={conditionForm.conditionType}
                  onChange={(e) => setConditionForm(prev => ({
                    ...prev,
                    conditionType: e.target.value,
                    fieldName: '',
                    operator: operators[e.target.value]?.[0]?.value || 'equals',
                    expectedValue: ''
                  }))}
                  label="Тип условия"
                >
                  {conditionTypes.map(type => (
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
                label="Группа условий"
                value={conditionForm.conditionGroup}
                onChange={(e) => setConditionForm(prev => ({
                  ...prev,
                  conditionGroup: parseInt(e.target.value) || 1
                }))}
                helperText="Условия в одной группе связаны логикой ИЛИ"
              />
            </Grid>

            {conditionForm.conditionType === 'field' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Поле</InputLabel>
                  <Select
                    value={conditionForm.fieldName}
                    onChange={(e) => setConditionForm(prev => ({
                      ...prev,
                      fieldName: e.target.value
                    }))}
                    label="Поле"
                  >
                    {fieldNames.map(field => (
                      <MenuItem key={field.value} value={field.value}>
                        {field.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Оператор</InputLabel>
                <Select
                  value={conditionForm.operator}
                  onChange={(e) => setConditionForm(prev => ({
                    ...prev,
                    operator: e.target.value
                  }))}
                  label="Оператор"
                >
                  {(operators[conditionForm.conditionType] || operators.field).map(op => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {conditionForm.operator !== 'is_empty' && conditionForm.operator !== 'is_not_empty' && (
              <Grid item xs={12}>
                {conditionForm.conditionType === 'custom' ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="JavaScript код"
                    value={conditionForm.expectedValue}
                    onChange={(e) => setConditionForm(prev => ({
                      ...prev,
                      expectedValue: e.target.value
                    }))}
                    helperText="Функция должна возвращать true или false. Доступны переменные: ticket, user, context"
                    placeholder="return ticket.priority === 'high' && user.role === 'admin';"
                  />
                ) : conditionForm.operator === 'in' || conditionForm.operator === 'not_in' ? (
                  <TextField
                    fullWidth
                    label="Значения (JSON массив)"
                    value={conditionForm.expectedValue}
                    onChange={(e) => setConditionForm(prev => ({
                      ...prev,
                      expectedValue: e.target.value
                    }))}
                    helperText='Например: ["high", "critical"] или ["admin", "agent"]'
                    placeholder='["значение1", "значение2"]'
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Ожидаемое значение"
                    value={conditionForm.expectedValue}
                    onChange={(e) => setConditionForm(prev => ({
                      ...prev,
                      expectedValue: e.target.value
                    }))}
                    helperText={
                      conditionForm.conditionType === 'time' ? 'Время в минутах' :
                      conditionForm.conditionType === 'sla' ? 'true для нарушенного SLA, false для не нарушенного' :
                      'Значение для сравнения'
                    }
                  />
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={conditionForm.isActive}
                    onChange={(e) => setConditionForm(prev => ({
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
          <Button onClick={() => setConditionDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSaveCondition} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowConditionsEditor;