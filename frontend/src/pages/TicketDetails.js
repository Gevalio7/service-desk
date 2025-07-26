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
  Fade
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
  Description
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';

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
        filesCount: files.length,
        fileNames: files.map(f => f.name),
        url: `/api/tickets/${id}/attachments`
      });
      
      // Проверяем, что ID тикета корректный
      if (!id || id.trim() === '') {
        console.error('❌ ЗАГРУЗКА ФАЙЛОВ - Некорректный ID тикета:', id);
        setError('Некорректный ID тикета');
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
  
  const handleFileDelete = async (attachmentId, originalName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить файл "${originalName}"?`)) {
      return;
    }
    
    try {
      console.log('Удаление файла:', attachmentId, originalName);
      
      await axios.delete(`/api/tickets/${id}/attachments/${attachmentId}`);
      
      // Удаляем файл из списка
      setAttachments(attachments.filter(att => att.id !== attachmentId));
      
      console.log('Файл успешно удален:', originalName);
      
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      
      let errorMessage = 'Ошибка удаления файла';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для удаления файла';
      } else if (err.response?.status === 404) {
        errorMessage = 'Файл не найден';
      }
      
      setError(errorMessage);
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
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpdateTicket = async () => {
    try {
      console.log('Обновление тикета:', id, editedTicket);
      
      const response = await axios.put(`/api/tickets/${id}`, {
        title: editedTicket.title,
        description: editedTicket.description,
        status: editedTicket.status,
        priority: editedTicket.priority
      });
      
      console.log('Тикет обновлен:', response.data);
      
      setTicket(editedTicket);
      setEditDialogOpen(false);
      setError(null);
      
    } catch (err) {
      console.error('Ошибка обновления тикета:', err);
      
      let errorMessage = 'Ошибка обновления тикета';
      if (err.response?.status === 403) {
        errorMessage = 'Нет доступа для обновления тикета';
      } else if (err.response?.status === 404) {
        errorMessage = 'Тикет не найден';
      }
      
      setError(errorMessage);
    }
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
      case 'open': return 'Открыт';
      case 'in_progress': return 'В работе';
      case 'resolved': return 'Решен';
      case 'closed': return 'Закрыт';
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
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
        >
          Редактировать
        </Button>
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
                <Box display="flex" gap={1}>
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
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getFileIcon(attachment.mimeType)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={attachment.originalName}
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {formatFileSize(attachment.size)} • {new Date(attachment.createdAt).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleFileDownload(attachment.id, attachment.originalName)}
                          title="Скачать файл"
                        >
                          <Download />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleFileDelete(attachment.id, attachment.originalName)}
                          title="Удалить файл"
                          color="error"
                        >
                          <Delete />
                        </IconButton>
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
              <MenuItem value="open">Открыт</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="resolved">Решен</MenuItem>
              <MenuItem value="closed">Закрыт</MenuItem>
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
    </Box>
  );
};

export default TicketDetails;