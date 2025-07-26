import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  IconButton,
  Chip,
  Paper
} from '@mui/material';
import {
  ArrowBack,
  Add,
  AttachFile,
  Delete
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const validationSchema = yup.object({
  title: yup
    .string('Введите заголовок')
    .required('Заголовок обязателен')
    .min(5, 'Заголовок должен содержать минимум 5 символов')
    .max(200, 'Заголовок не должен превышать 200 символов'),
  description: yup
    .string('Введите описание')
    .required('Описание обязательно')
    .min(10, 'Описание должно содержать минимум 10 символов')
    .max(2000, 'Описание не должно превышать 2000 символов'),
  priority: yup
    .string('Выберите приоритет')
    .required('Приоритет обязателен')
    .oneOf(['low', 'medium', 'high', 'critical'], 'Неверный приоритет'),
  category: yup
    .string('Выберите категорию')
    .required('Категория обязательна')
    .oneOf(['technical', 'billing', 'general', 'feature_request'], 'Неверная категория'),
});

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        
        // Здесь будет API вызов для создания тикета
        const ticketData = {
          ...values,
          reporterId: user.id,
          attachments: attachments,
          status: 'open',
          createdAt: new Date().toISOString()
        };
        
        console.log('Creating ticket:', ticketData);
        
        // Имитация API вызова
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSuccess(true);
        
        // Перенаправление на список тикетов через 2 секунды
        setTimeout(() => {
          navigate('/tickets');
        }, 2000);
        
      } catch (err) {
        setError('Ошибка создания тикета. Пожалуйста, попробуйте еще раз.');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter(att => att.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getCategoryText = (category) => {
    switch (category) {
      case 'technical': return 'Техническая проблема';
      case 'billing': return 'Вопросы по оплате';
      case 'general': return 'Общие вопросы';
      case 'feature_request': return 'Запрос функции';
      default: return category;
    }
  };

  if (success) {
    return (
      <Box p={3}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Тикет успешно создан! Перенаправление на список тикетов...
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/tickets')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Создать новый тикет
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={3}>
                  Основная информация
                </Typography>

                <TextField
                  fullWidth
                  id="title"
                  name="title"
                  label="Заголовок тикета"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title}
                  sx={{ mb: 3 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  id="description"
                  name="description"
                  label="Описание проблемы"
                  placeholder="Опишите проблему подробно. Укажите шаги для воспроизведения, ожидаемый и фактический результат."
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                  sx={{ mb: 3 }}
                />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="priority-label">Приоритет</InputLabel>
                      <Select
                        labelId="priority-label"
                        id="priority"
                        name="priority"
                        value={formik.values.priority}
                        label="Приоритет"
                        onChange={formik.handleChange}
                        error={formik.touched.priority && Boolean(formik.errors.priority)}
                      >
                        <MenuItem value="low">Низкий</MenuItem>
                        <MenuItem value="medium">Средний</MenuItem>
                        <MenuItem value="high">Высокий</MenuItem>
                        <MenuItem value="critical">Критический</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="category-label">Категория</InputLabel>
                      <Select
                        labelId="category-label"
                        id="category"
                        name="category"
                        value={formik.values.category}
                        label="Категория"
                        onChange={formik.handleChange}
                        error={formik.touched.category && Boolean(formik.errors.category)}
                      >
                        <MenuItem value="technical">Техническая проблема</MenuItem>
                        <MenuItem value="billing">Вопросы по оплате</MenuItem>
                        <MenuItem value="general">Общие вопросы</MenuItem>
                        <MenuItem value="feature_request">Запрос функции</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Attachments */}
                <Box mt={3}>
                  <Typography variant="h6" mb={2}>
                    Вложения
                  </Typography>
                  
                  <input
                    accept="*/*"
                    style={{ display: 'none' }}
                    id="file-upload"
                    multiple
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFile />}
                      sx={{ mb: 2 }}
                    >
                      Прикрепить файлы
                    </Button>
                  </label>

                  {attachments.length > 0 && (
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" mb={1}>
                        Прикрепленные файлы:
                      </Typography>
                      {attachments.map((attachment) => (
                        <Box
                          key={attachment.id}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Box>
                            <Typography variant="body2">
                              {attachment.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(attachment.size)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Предварительный просмотр
                </Typography>

                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Заголовок:
                  </Typography>
                  <Typography variant="body2">
                    {formik.values.title || 'Не указан'}
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Приоритет:
                  </Typography>
                  <Chip
                    label={getPriorityText(formik.values.priority)}
                    size="small"
                    color={
                      formik.values.priority === 'critical' || formik.values.priority === 'high'
                        ? 'error'
                        : formik.values.priority === 'medium'
                        ? 'warning'
                        : 'success'
                    }
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Категория:
                  </Typography>
                  <Typography variant="body2">
                    {getCategoryText(formik.values.category)}
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Автор:
                  </Typography>
                  <Typography variant="body2">
                    {user?.name || 'Текущий пользователь'}
                  </Typography>
                </Box>

                {attachments.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Вложения:
                    </Typography>
                    <Typography variant="body2">
                      {attachments.length} файл(ов)
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box mt={2}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Add />}
                disabled={loading}
                sx={{ mb: 1 }}
              >
                {loading ? 'Создание...' : 'Создать тикет'}
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/tickets')}
                disabled={loading}
              >
                Отмена
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default CreateTicket;