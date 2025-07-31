import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Chip
} from '@mui/material';
import {
  ArrowBack,
  Add
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';
import FileDropZone from '../components/FileDropZone';
import ImagePreview from '../components/ImagePreview';

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
  type: yup
    .string('Выберите тип запроса')
    .required('Тип запроса обязателен')
    .oneOf(['incident', 'service_request', 'change_request'], 'Неверный тип запроса'),
});

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [imagePreview, setImagePreview] = useState({
    open: false,
    imageUrl: '',
    imageName: '',
    loading: false
  });
  const descriptionRef = useRef(null);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
      type: 'incident',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        
        // Подготовка данных для отправки на сервер
        const ticketData = {
          title: values.title,
          description: values.description,
          category: values.category,
          priority: values.priority,
          type: values.type,
          source: 'web'
        };
        
        console.log('Creating ticket:', ticketData);
        
        // Реальный API вызов для создания тикета
        const response = await axios.post('/api/tickets', ticketData);
        
        console.log('Ticket created successfully:', response.data);
        
        const ticketId = response.data.ticket.id;
        
        // Загружаем файлы, если они есть
        if (attachments.length > 0) {
          try {
            console.log('Uploading attachments for ticket:', ticketId);
            
            const formData = new FormData();
            attachments.forEach(attachment => {
              formData.append('files', attachment.file);
            });
            
            const uploadResponse = await axios.post(`/api/tickets/${ticketId}/attachments`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            
            console.log('Attachments uploaded successfully:', uploadResponse.data);
          } catch (uploadErr) {
            console.error('Error uploading attachments:', uploadErr);
            // Не прерываем процесс создания тикета из-за ошибки загрузки файлов
            setError('Тикет создан, но произошла ошибка при загрузке файлов');
          }
        }
        
        setSuccess(true);
        
        // Перенаправление на список тикетов через 2 секунды
        setTimeout(() => {
          navigate('/tickets');
        }, 2000);
        
      } catch (err) {
        console.error('Error creating ticket:', err);
        const errorMessage = err.response?.data?.message || 'Ошибка создания тикета. Пожалуйста, попробуйте еще раз.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  // Константы для ограничений файлов
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ
  const MAX_FILES = 10;

  // Обработчики для работы с файлами
  const handleFilesChange = useCallback((newFiles) => {
    setAttachments(newFiles);
  }, []);

  const handleImagePreview = useCallback((file) => {
    if (file.preview) {
      setImagePreview({
        open: true,
        imageUrl: file.preview,
        imageName: file.name,
        loading: false
      });
    }
  }, []);

  const closeImagePreview = useCallback(() => {
    setImagePreview({
      open: false,
      imageUrl: '',
      imageName: '',
      loading: false
    });
  }, []);

  // Функция для обработки вставки из буфера обмена
  const handlePaste = useCallback((event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files = [];
    const textItems = [];
    let hasFiles = false;
    let hasText = false;

    // Проверяем, что есть в буфере обмена
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        hasFiles = true;
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        hasText = true;
        textItems.push(item);
      }
    }

    // Если есть файлы, обрабатываем их и предотвращаем стандартное поведение
    if (hasFiles && files.length > 0) {
      event.preventDefault();
      event.stopPropagation();

      // Проверяем ограничения
      if (attachments.length + files.length > MAX_FILES) {
        setError(`Максимальное количество файлов: ${MAX_FILES}. Попытка добавить: ${attachments.length + files.length}`);
        return;
      }

      const newAttachments = files.map(file => {
        // Проверяем размер файла
        if (file.size > MAX_FILE_SIZE) {
          setError(`Файл "${file.name}" превышает максимальный размер ${formatFileSize(MAX_FILE_SIZE)}`);
          return null;
        }

        return {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        };
      }).filter(Boolean);

      if (newAttachments.length > 0) {
        setAttachments([...attachments, ...newAttachments]);
        // Показываем уведомление о добавлении файлов
        const fileNames = newAttachments.map(f => f.name).join(', ');
        console.log(`Файлы добавлены из буфера обмена: ${fileNames}`);
        
        // Показываем пользователю уведомление
        setError(null); // Очищаем предыдущие ошибки
        setSuccessMessage(`Успешно добавлено ${newAttachments.length} файл(ов) из буфера обмена`);
        
        // Автоматически скрываем уведомление через 3 секунды
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
      return;
    }

    // Если есть только текст, проверяем его содержимое
    if (hasText && textItems.length > 0) {
      // Проверяем каждый текстовый элемент асинхронно
      textItems.forEach(item => {
        item.getAsString((text) => {
          // Если текст содержит служебные данные (например, recent:// или другие системные префиксы),
          // предотвращаем его вставку
          if (text && (
            text.startsWith('recent://') ||
            text.startsWith('file://') ||
            text.match(/^[a-f0-9]{32,}$/) || // Хеши
            text.includes('://') && text.length < 100 && !text.includes(' ') // Подозрительные URL-подобные строки
          )) {
            console.log('Предотвращена вставка служебного текста:', text);
            // Не вставляем служебный текст, но не показываем ошибку пользователю
            return;
          }
        });
      });
    }

    // Для обычного текста позволяем стандартному поведению
  }, [attachments, MAX_FILES, MAX_FILE_SIZE]);

  // Добавляем обработчик paste к текстовому полю описания
  // ВРЕМЕННО ОТКЛЮЧЕНО: проблема с вставкой служебного текста
  // useEffect(() => {
  //   const descriptionElement = descriptionRef.current;
  //   if (descriptionElement) {
  //     const textArea = descriptionElement.querySelector('textarea');
  //     if (textArea) {
  //       textArea.addEventListener('paste', handlePaste);
  //       return () => {
  //         textArea.removeEventListener('paste', handlePaste);
  //       };
  //     }
  //   }
  // }, [handlePaste]);

  const removeAttachment = (id) => {
    const updatedAttachments = attachments.filter(att => att.id !== id);
    // Освобождаем URL объекты для изображений
    const removedFile = attachments.find(att => att.id === id);
    if (removedFile && removedFile.preview) {
      URL.revokeObjectURL(removedFile.preview);
    }
    setAttachments(updatedAttachments);
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

  const getTypeText = (type) => {
    switch (type) {
      case 'incident': return 'Инцидент';
      case 'service_request': return 'Запрос на обслуживание';
      case 'change_request': return 'Запрос на изменение';
      default: return type;
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

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
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
                  ref={descriptionRef}
                  sx={{ mb: 3 }}
                />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel id="type-label">Тип запроса</InputLabel>
                      <Select
                        labelId="type-label"
                        id="type"
                        name="type"
                        value={formik.values.type}
                        label="Тип запроса"
                        onChange={formik.handleChange}
                        error={formik.touched.type && Boolean(formik.errors.type)}
                      >
                        <MenuItem value="incident">Инцидент</MenuItem>
                        <MenuItem value="service_request">Запрос на обслуживание</MenuItem>
                        <MenuItem value="change_request">Запрос на изменение</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
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

                  <Grid item xs={12} sm={4}>
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
                  
                  <FileDropZone
                    files={attachments}
                    onFilesChange={handleFilesChange}
                    maxFiles={MAX_FILES}
                    maxFileSize={MAX_FILE_SIZE}
                    acceptedTypes="*/*"
                    disabled={loading}
                    showPreview={true}
                    onImagePreview={handleImagePreview}
                  />
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💡 Совет: Перетащите файлы в область выше или нажмите для выбора файлов
                  </Typography>
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
                    Тип запроса:
                  </Typography>
                  <Chip
                    label={getTypeText(formik.values.type)}
                    size="small"
                    color={
                      formik.values.type === 'incident'
                        ? 'error'
                        : formik.values.type === 'service_request'
                        ? 'primary'
                        : 'info'
                    }
                  />
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

      {/* Image Preview Dialog */}
      <ImagePreview
        open={imagePreview.open}
        onClose={closeImagePreview}
        imageUrl={imagePreview.imageUrl}
        imageName={imagePreview.imageName}
        loading={imagePreview.loading}
      />
    </Box>
  );
};

export default CreateTicket;