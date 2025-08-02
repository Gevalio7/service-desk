import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Divider,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Modal,
  Backdrop,
  Fade,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Comment,
  AttachFile,
  Person,
  Schedule,
  PriorityHigh,
  Download,
  Delete,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  Description,
  Visibility
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';
import ConfirmDialog from '../components/ConfirmDialog';
import ImagePreview, { ImageThumbnail } from '../components/ImagePreview';
import WorkflowTransitions from '../components/WorkflowTransitions';
import WorkflowHistory from '../components/WorkflowHistory';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedTicket, setEditedTicket] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableAssignees, setAvailableAssignees] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigningTicket, setAssigningTicket] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    itemName: '',
    itemType: 'элемент'
  });
  const [imagePreview, setImagePreview] = useState({
    open: false,
    imageUrl: '',
    imageName: '',
    attachmentId: null,
    loading: false,
    error: false
  });

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Загрузка деталей тикета:', id);
      
      // Используем axios для получения деталей тикета
      const response = await axios.get(`/api/tickets/${id}`);
      
      console.log('Ответ сервера:', response.data);
      
      const ticketData = response.data.ticket;
      
      // Преобразуем данные в нужный формат
      const formattedTicket = {
        id: ticketData.id,
        ticketNumber: ticketData.ticketNumber,
        title: ticketData.title,
        description: ticketData.description,
        status: ticketData.status,
        priority: ticketData.priority,
        category: ticketData.category,
        type: ticketData.type,
        createdAt: ticketData.createdAt,
        updatedAt: ticketData.updatedAt,
        assignedTo: ticketData.assignedTo ? {
          id: ticketData.assignedTo.id,
          name: `${ticketData.assignedTo.firstName} ${ticketData.assignedTo.lastName}`,
          email: ticketData.assignedTo.email
        } : null,
        reporter: ticketData.createdBy ? {
          id: ticketData.createdBy.id,
          name: `${ticketData.createdBy.firstName} ${ticketData.createdBy.lastName}`,
          email: ticketData.createdBy.email
        } : null
      };
      
      // Преобразуем комментарии
      const formattedComments = (ticketData.Comments || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        author: {
          name: `${comment.User.firstName} ${comment.User.lastName}`,
          avatar: null
        },
        createdAt: comment.createdAt
      }));
      
      // Преобразуем прикрепленные файлы
      const formattedAttachments = (ticketData.Attachments || []).map(attachment => ({
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt
      }));
      
      setTicket(formattedTicket);
      setComments(formattedComments);
      setAttachments(formattedAttachments);
      setEditedTicket(formattedTicket);
      
      console.log('Тикет успешно загружен:', formattedTicket);
      
    } catch (err) {
      console.error('Ошибка загрузки деталей тикета:', err);
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка загрузки деталей тикета';
      
      if (err.response) {
        // Ошибка от сервера
        console.error('Ошибка сервера:', err.response.status, err.response.data);
        if (err.response.status === 404) {
          errorMessage = 'Тикет не найден';
        } else if (err.response.status === 403) {
          errorMessage = 'Нет доступа к тикету';
        } else if (err.response.status === 401) {
          errorMessage = 'Необходима авторизация';
        } else {
          errorMessage = `Ошибка сервера: ${err.response.status}`;
        }
      } else if (err.request) {
        // Ошибка сети
        console.error('Ошибка сети:', err.request);
        errorMessage = 'Ошибка соединения с сервером';
      } else {
        // Другие ошибки
        console.error('Неизвестная ошибка:', err.message);
        errorMessage = `Неизвестная ошибка: ${err.message}`;
      }
      
      setError(errorMessage);
      
      // Убираем fallback к мокковым данным - лучше показать ошибку
      setTicket(null);
      setComments([]);
      
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      console.log('Добавление комментария к тикету:', id);
      
      const response = await axios.post(`/api/tickets/${id}/comments`, {
        content: newComment
      });
      
      console.log('Комментарий добавлен:', response.data);
      
      const newCommentObj = {
        id: response.data.comment.id,
        content: response.data.comment.content,
        author: {
          name: `${response.data.comment.User.firstName} ${response.data.comment.User.lastName}`,
          avatar: null
        },
        createdAt: response.data.comment.createdAt
      };
      
      setComments([...comments, newCommentObj]);
      setNewComment('');
      
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      
      let errorMessage = 'Ошибка добавления комментария';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для добавления комментария';
      } else if (err.response?.status === 404) {
        errorMessage = 'Тикет не найден';
      }
      
      setError(errorMessage);
    }
  };

  // Функции для работы с файлами
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    try {
      setUploadingFiles(true);
      setError(null);
      
      // Дополнительная диагностика
      console.log('📎 ЗАГРУЗКА ФАЙЛОВ - Начало процесса', {
        ticketId: id,
        ticketIdType: typeof id,
        ticketIdLength: id ? id.length : 0,
        ticketIdRaw: JSON.stringify(id),
        filesCount: files.length,
        fileNames: files.map(f => f.name),
        url: `/api/tickets/${id}/attachments`,
        fullUrl: `${window.location.origin}/api/tickets/${id}/attachments`,
        currentPath: window.location.pathname,
        ticketFromParams: id
      });
      
      // Проверяем, что ID тикета корректный
      if (!id || id.trim() === '') {
        console.error('❌ ЗАГРУЗКА ФАЙЛОВ - Некорректный ID тикета:', {
          id: id,
          idType: typeof id,
          idLength: id ? id.length : 0,
          windowLocation: window.location.href,
          params: window.location.pathname.split('/')
        });
        setError('Некорректный ID тикета');
        return;
      }

      // Дополнительная проверка формата UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        console.error('❌ ЗАГРУЗКА ФАЙЛОВ - Некорректный формат UUID:', {
          id: id,
          isValidUUID: false
        });
        setError('Некорректный формат ID тикета');
        return;
      }
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      console.log('📤 ЗАГРУЗКА ФАЙЛОВ - Отправка запроса к серверу', {
        ticketId: id,
        url: `/api/tickets/${id}/attachments`,
        filesCount: files.length
      });
      
      const response = await axios.post(`/api/tickets/${id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Файлы успешно загружены:', response.data);
      
      // Обновляем список прикрепленных файлов
      const newAttachments = response.data.attachments.map(attachment => ({
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt
      }));
      
      setAttachments([...attachments, ...newAttachments]);
      
      // Очищаем input
      event.target.value = '';
      
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      
      let errorMessage = 'Ошибка загрузки файлов';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для загрузки файлов';
      } else if (err.response?.status === 404) {
        errorMessage = 'Тикет не найден';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setUploadingFiles(false);
    }
  };
  
  const handleFileDownload = async (attachmentId, originalName) => {
    try {
      console.log('Скачивание файла:', attachmentId, originalName);
      
      const response = await axios.get(`/api/tickets/${id}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('Файл успешно скачан:', originalName);
      
    } catch (err) {
      console.error('Ошибка скачивания файла:', err);
      
      let errorMessage = 'Ошибка скачивания файла';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для скачивания файла';
      } else if (err.response?.status === 404) {
        errorMessage = 'Файл не найден';
      }
      
      setError(errorMessage);
    }
  };
  
  const handleFileDelete = (attachmentId, originalName) => {
    setConfirmDialog({
      open: true,
      title: 'Удаление файла',
      message: `Файл будет удален безвозвратно.`,
      itemName: originalName,
      itemType: 'файл',
      onConfirm: () => confirmFileDelete(attachmentId, originalName)
    });
  };

  const confirmFileDelete = async (attachmentId, originalName) => {
    try {
      console.log('Удаление файла:', attachmentId, originalName);
      
      await axios.delete(`/api/tickets/${id}/attachments/${attachmentId}`);
      
      // Удаляем файл из списка
      setAttachments(attachments.filter(att => att.id !== attachmentId));
      
      console.log('Файл успешно удален:', originalName);
      
      // Закрываем диалог подтверждения
      setConfirmDialog({ ...confirmDialog, open: false });
      
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      
      let errorMessage = 'Ошибка удаления файла';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для удаления файла';
      } else if (err.response?.status === 404) {
        errorMessage = 'Файл не найден';
      }
      
      setError(errorMessage);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };
  
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <Image />;
    } else if (mimeType === 'application/pdf') {
      return <PictureAsPdf />;
    } else if (mimeType.includes('document') || mimeType.includes('text')) {
      return <Description />;
    } else {
      return <InsertDriveFile />;
    }
  };

  const isImageFile = (mimeType) => {
    return mimeType && mimeType.startsWith('image/');
  };

  const getImageUrl = async (attachmentId) => {
    try {
      const response = await axios.get(`/api/tickets/${id}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      return URL.createObjectURL(response.data);
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      throw error;
    }
  };

  const handleImagePreview = async (attachment) => {
    try {
      setImagePreview({
        open: true,
        imageUrl: '',
        imageName: attachment.originalName,
        attachmentId: attachment.id,
        loading: true
      });

      const imageUrl = await getImageUrl(attachment.id);
      
      setImagePreview(prev => ({
        ...prev,
        imageUrl: imageUrl,
        loading: false
      }));
    } catch (error) {
      console.error('Ошибка предпросмотра изображения:', error);
      setImagePreview(prev => ({
        ...prev,
        loading: false,
        error: true
      }));
      setError('Не удалось загрузить изображение для предпросмотра');
    }
  };

  const handleImageDownload = async (attachmentId, originalName) => {
    await handleFileDownload(attachmentId, originalName);
  };

  const closeImagePreview = () => {
    // Освобождаем blob URL если он был создан
    if (imagePreview.imageUrl && imagePreview.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview.imageUrl);
    }
    
    setImagePreview({
      open: false,
      imageUrl: '',
      imageName: '',
      attachmentId: null,
      loading: false,
      error: false
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false
    });
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpdateTicket = async () => {
    try {
      console.log('🔄 ОБНОВЛЕНИЕ ТИКЕТА - Начало процесса', {
        ticketId: id,
        currentStatus: ticket.status,
        newStatus: editedTicket.status,
        changes: {
          title: editedTicket.title,
          description: editedTicket.description,
          status: editedTicket.status,
          priority: editedTicket.priority
        }
      });
      
      const requestData = {
        title: editedTicket.title,
        description: editedTicket.description,
        status: editedTicket.status,
        priority: editedTicket.priority,
        type: editedTicket.type
      };
      
      console.log('📤 ОБНОВЛЕНИЕ ТИКЕТА - Отправка запроса', {
        url: `/api/tickets/${id}`,
        method: 'PUT',
        data: requestData
      });
      
      const response = await axios.put(`/api/tickets/${id}`, requestData);
      
      console.log('✅ ОБНОВЛЕНИЕ ТИКЕТА - Ответ сервера получен', {
        status: response.status,
        data: response.data
      });
      
      // Обновляем локальное состояние с данными от сервера
      const updatedTicket = {
        ...ticket,
        title: editedTicket.title,
        description: editedTicket.description,
        status: editedTicket.status,
        priority: editedTicket.priority,
        type: editedTicket.type,
        updatedAt: new Date().toISOString()
      };
      
      setTicket(updatedTicket);
      setEditedTicket(updatedTicket);
      setEditDialogOpen(false);
      setError(null);
      
      console.log('🎉 ОБНОВЛЕНИЕ ТИКЕТА - Локальное состояние обновлено', {
        oldStatus: ticket.status,
        newStatus: updatedTicket.status,
        updatedTicket: updatedTicket
      });
      
    } catch (err) {
      console.error('❌ ОБНОВЛЕНИЕ ТИКЕТА - Ошибка:', {
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
        ticketId: id,
        requestedStatus: editedTicket.status
      });
      
      let errorMessage = 'Ошибка обновления тикета';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для обновления тикета';
      } else if (err.response?.status === 404) {
        errorMessage = 'Тикет не найден';
      } else if (err.response?.status === 400) {
        errorMessage = `Ошибка валидации: ${err.response?.data?.message || 'Неверные данные'}`;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      
      // Показываем детальную ошибку в консоли
      if (err.response?.data) {
        console.error('📋 ОБНОВЛЕНИЕ ТИКЕТА - Детали ошибки сервера:', err.response.data);
      }
    }
  };

  // Функции для назначения тикетов
  const fetchAvailableAssignees = async () => {
    try {
      console.log('👥 Загрузка списка доступных исполнителей...');
      
      const response = await axios.get('/api/tickets/assignees/available');
      
      console.log('Список исполнителей получен:', response.data);
      
      setAvailableAssignees(response.data.assignees || []);
      
    } catch (err) {
      console.error('Ошибка загрузки списка исполнителей:', err);
      
      let errorMessage = 'Ошибка загрузки списка исполнителей';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для просмотра списка исполнителей';
      }
      
      setError(errorMessage);
    }
  };

  const handleOpenAssignDialog = async () => {
    setSelectedAssignee(ticket.assignedTo?.id || '');
    await fetchAvailableAssignees();
    setAssignDialogOpen(true);
  };

  const handleAssignTicket = async () => {
    try {
      setAssigningTicket(true);
      setError(null);
      
      console.log('🎯 Назначение тикета:', {
        ticketId: id,
        assignedToId: selectedAssignee || null
      });
      
      const response = await axios.put(`/api/tickets/${id}/assign`, {
        assignedToId: selectedAssignee || null
      });
      
      console.log('Тикет успешно назначен:', response.data);
      
      // Обновляем информацию о тикете
      const updatedTicket = response.data.ticket;
      setTicket({
        ...ticket,
        assignedTo: updatedTicket.assignedTo ? {
          id: updatedTicket.assignedTo.id,
          name: `${updatedTicket.assignedTo.firstName} ${updatedTicket.assignedTo.lastName}`,
          email: updatedTicket.assignedTo.email
        } : null
      });
      
      setAssignDialogOpen(false);
      
    } catch (err) {
      console.error('Ошибка назначения тикета:', err);
      
      let errorMessage = 'Ошибка назначения тикета';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для назначения тикета';
      } else if (err.response?.status === 404) {
        errorMessage = 'Тикет или пользователь не найден';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setAssigningTicket(false);
    }
  };

  const canAssignTicket = () => {
    return user && (user.role === 'admin' || user.role === 'agent');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'info';
      case 'assigned': return 'info';
      case 'in_progress': return 'warning';
      case 'on_hold': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
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

  const getStatusText = (status) => {
    switch (status) {
      case 'new': return 'Новая';
      case 'assigned': return 'Назначена';
      case 'in_progress': return 'В работе';
      case 'on_hold': return 'Приостановлена';
      case 'resolved': return 'Решена';
      case 'closed': return 'Закрыта';
      default: return status;
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

  const getTypeText = (type) => {
    switch (type) {
      case 'incident': return 'Инцидент';
      case 'service_request': return 'Запрос на обслуживание';
      case 'change_request': return 'Запрос на изменение';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'incident': return 'error';
      case 'service_request': return 'primary';
      case 'change_request': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setError(null);
                fetchTicketDetails();
              }}
            >
              Повторить
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box p={3}>
        <Alert severity="warning">Тикет не найден</Alert>
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
        <Typography variant="h4" component="h1" flexGrow={1}>
          Тикет #{ticket.ticketNumber || ticket.id.slice(0, 8)}
        </Typography>
        <Box display="flex" gap={1}>
          {/* Кнопка редактирования доступна только агентам и администраторам */}
          {user && (user.role === 'admin' || user.role === 'agent') && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setEditDialogOpen(true)}
            >
              Редактировать
            </Button>
          )}
          {canAssignTicket() && (
            <Button
              variant="outlined"
              startIcon={<Person />}
              onClick={handleOpenAssignDialog}
              color="primary"
            >
              Назначить
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="h5" component="h2" flexGrow={1}>
                  {ticket.title}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label={getStatusText(ticket.status)}
                    color={getStatusColor(ticket.status)}
                    size="small"
                  />
                  <Chip
                    label={getPriorityText(ticket.priority)}
                    color={getPriorityColor(ticket.priority)}
                    size="small"
                    icon={<PriorityHigh />}
                  />
                  {ticket.type && (
                    <Chip
                      label={getTypeText(ticket.type)}
                      color={getTypeColor(ticket.type)}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
              
              <Typography variant="body1" paragraph>
                {ticket.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Comments Section */}
              <Typography variant="h6" mb={2}>
                Комментарии
              </Typography>
              
              <List>
                {comments.map((comment) => (
                  <ListItem key={comment.id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        {comment.author.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={comment.author.name}
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(comment.createdAt).toLocaleString()}
                          </Typography>
                          <Typography variant="body1" sx={{ mt: 1 }}>
                            {comment.content}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              
              {/* Add Comment */}
              <Paper sx={{ p: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  startIcon={<Comment />}
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  Добавить комментарий
                </Button>
              </Paper>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Attachments Section */}
              <Typography variant="h6" mb={2}>
                Прикрепленные файлы
              </Typography>
              
              {/* File Upload */}
              <input
                accept="*/*"
                style={{ display: 'none' }}
                id="file-upload-details"
                multiple
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingFiles}
              />
              <label htmlFor="file-upload-details">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AttachFile />}
                  disabled={uploadingFiles}
                  sx={{ mb: 2 }}
                >
                  {uploadingFiles ? 'Загрузка...' : 'Прикрепить файлы'}
                </Button>
              </label>
              
              {/* Attachments List */}
              {attachments.length > 0 ? (
                <List>
                  {attachments.map((attachment) => (
                    <ListItem
                      key={attachment.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: 'background.paper'
                      }}
                    >
                      <ListItemAvatar>
                        {isImageFile(attachment.mimeType) ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <ImageThumbnail
                              src={`/api/tickets/${id}/attachments/${attachment.id}`}
                              alt={attachment.originalName}
                              onClick={() => handleImagePreview(attachment)}
                              size={50}
                              loading={false}
                            />
                          </Box>
                        ) : (
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getFileIcon(attachment.mimeType)}
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={attachment.originalName}
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {formatFileSize(attachment.size)} • {new Date(attachment.createdAt).toLocaleString()}
                            </Typography>
                            {isImageFile(attachment.mimeType) && (
                              <Typography variant="caption" color="primary">
                                Нажмите на изображение для просмотра
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Box display="flex" gap={1}>
                        {isImageFile(attachment.mimeType) && (
                          <Tooltip title="Просмотр изображения">
                            <IconButton
                              size="small"
                              onClick={() => handleImagePreview(attachment)}
                              color="primary"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Скачать файл">
                          <IconButton
                            size="small"
                            onClick={() => handleFileDownload(attachment.id, attachment.originalName)}
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить файл">
                          <IconButton
                            size="small"
                            onClick={() => handleFileDelete(attachment.id, attachment.originalName)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Файлы не прикреплены
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Информация о тикете
              </Typography>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Создан
                </Typography>
                <Box display="flex" alignItems="center">
                  <Schedule sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Обновлен
                </Typography>
                <Typography variant="body2">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {ticket.type && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Тип запроса
                  </Typography>
                  <Typography variant="body2">
                    {getTypeText(ticket.type)}
                  </Typography>
                </Box>
              )}
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Автор
                </Typography>
                <Box display="flex" alignItems="center">
                  <Person sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {ticket.reporter.name}
                  </Typography>
                </Box>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Исполнитель
                </Typography>
                <Box display="flex" alignItems="center">
                  <Person sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {ticket.assignedTo ? ticket.assignedTo.name : 'Не назначен'}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Прикрепленные файлы
                </Typography>
                <Box display="flex" alignItems="center">
                  <AttachFile sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {attachments.length > 0 ? `${attachments.length} файл(ов)` : 'Нет файлов'}
                  </Typography>
                </Box>
                {attachments.length > 0 && (
                  <Box mt={1}>
                    {attachments.slice(0, 3).map((attachment) => (
                      <Typography
                        key={attachment.id}
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        • {attachment.originalName}
                      </Typography>
                    ))}
                    {attachments.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        ... и еще {attachments.length - 3}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Workflow Transitions Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                <Box display="flex" alignItems="center">
                  <Box
                    component="i"
                    className="bi bi-arrow-right-circle"
                    sx={{ mr: 1, fontSize: 20 }}
                  />
                  Переходы статусов
                </Box>
              </Typography>
              
              <Box sx={{
                '& .workflow-transitions': {
                  '& .current-status': {
                    mb: 2
                  },
                  '& .available-transitions h6': {
                    fontSize: '1rem',
                    fontWeight: 600,
                    mb: 1.5
                  },
                  '& .transition-item': {
                    mb: 1
                  },
                  '& .transition-item button': {
                    textAlign: 'left',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease-in-out'
                  },
                  '& .no-transitions': {
                    textAlign: 'center',
                    py: 2,
                    color: 'text.secondary'
                  },
                  '& .workflow-info': {
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }
                }
              }}>
                <WorkflowTransitions
                  ticketId={id}
                  currentUser={user}
                  onTransitionExecuted={(result) => {
                    console.log('Переход выполнен:', result);
                    // Обновляем данные тикета после успешного перехода
                    fetchTicketDetails();
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Workflow History Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                <Box display="flex" alignItems="center">
                  <Box
                    component="i"
                    className="bi bi-clock-history"
                    sx={{ mr: 1, fontSize: 20 }}
                  />
                  История переходов
                </Box>
              </Typography>
              
              <Box sx={{
                '& .workflow-history': {
                  '& .history-timeline': {
                    '& .history-entry': {
                      position: 'relative',
                      '& .timeline-indicator': {
                        position: 'relative',
                        '& .timeline-dot': {
                          position: 'relative',
                          zIndex: 1
                        },
                        '& .timeline-line': {
                          position: 'absolute',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }
                      },
                      '& .status-transition': {
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mb: 1
                      },
                      '& .entry-meta': {
                        fontSize: '0.875rem',
                        color: 'text.secondary'
                      },
                      '& .details-content': {
                        backgroundColor: 'grey.50',
                        borderRadius: 1,
                        p: 1.5,
                        mt: 1,
                        '& pre': {
                          fontSize: '0.75rem',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }
                      }
                    }
                  },
                  '& .pagination': {
                    display: 'flex',
                    justifyContent: 'center',
                    '& ul': {
                      display: 'flex',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      gap: 0.5,
                      '& li': {
                        '& button': {
                          minWidth: 32,
                          height: 32,
                          padding: '4px 8px',
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: 'background.paper',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          },
                          '&:disabled': {
                            cursor: 'not-allowed',
                            opacity: 0.5
                          }
                        },
                        '&.active button': {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderColor: 'primary.main'
                        }
                      }
                    }
                  }
                }
              }}>
                <WorkflowHistory ticketId={id} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать тикет</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Заголовок"
            value={editedTicket.title || ''}
            onChange={(e) => setEditedTicket({ ...editedTicket, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание"
            value={editedTicket.description || ''}
            onChange={(e) => setEditedTicket({ ...editedTicket, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={editedTicket.status || ''}
              onChange={(e) => setEditedTicket({ ...editedTicket, status: e.target.value })}
            >
              <MenuItem value="new">Новая</MenuItem>
              <MenuItem value="assigned">Назначена</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="on_hold">Приостановлена</MenuItem>
              <MenuItem value="resolved">Решена</MenuItem>
              <MenuItem value="closed">Закрыта</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={editedTicket.priority || ''}
              onChange={(e) => setEditedTicket({ ...editedTicket, priority: e.target.value })}
            >
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="medium">Средний</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
              <MenuItem value="critical">Критический</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Тип запроса</InputLabel>
            <Select
              value={editedTicket.type || ''}
              onChange={(e) => setEditedTicket({ ...editedTicket, type: e.target.value })}
            >
              <MenuItem value="incident">Инцидент</MenuItem>
              <MenuItem value="service_request">Запрос на обслуживание</MenuItem>
              <MenuItem value="change_request">Запрос на изменение</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleUpdateTicket} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemType={confirmDialog.itemType}
        confirmText="Удалить"
        cancelText="Отмена"
        severity="error"
        confirmColor="error"
      />

      {/* Image Preview Dialog */}
      <ImagePreview
        open={imagePreview.open}
        onClose={closeImagePreview}
        imageUrl={imagePreview.imageUrl}
        imageName={imagePreview.imageName}
        loading={imagePreview.loading}
        onDownload={() => handleImageDownload(imagePreview.attachmentId, imagePreview.imageName)}
      />

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Назначить тикет</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Исполнитель</InputLabel>
            <Select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              disabled={assigningTicket}
            >
              <MenuItem value="">
                <em>Не назначен</em>
              </MenuItem>
              {availableAssignees.map((assignee) => (
                <MenuItem key={assignee.id} value={assignee.id}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                      {assignee.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {assignee.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignee.role === 'admin' ? 'Администратор' : 'Агент'} • {assignee.email}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {ticket.assignedTo && (
            <Box
              mt={2}
              p={2}
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
                borderRadius: 1
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Текущий исполнитель:
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {ticket.assignedTo.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2">
                    {ticket.assignedTo.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ticket.assignedTo.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAssignDialogOpen(false)}
            disabled={assigningTicket}
          >
            Отмена
          </Button>
          <Button
            onClick={handleAssignTicket}
            variant="contained"
            disabled={assigningTicket}
          >
            {assigningTicket ? 'Назначение...' : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketDetails;