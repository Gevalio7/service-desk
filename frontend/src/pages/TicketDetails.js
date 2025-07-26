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
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Comment,
  AttachFile,
  Person,
  Schedule,
  PriorityHigh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedTicket, setEditedTicket] = useState({});

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      // Здесь будет API вызов для получения деталей тикета
      // Пока используем заглушку
      const mockTicket = {
        id: id,
        title: 'Проблема с входом в систему',
        description: 'Пользователь не может войти в систему после обновления пароля',
        status: 'open',
        priority: 'high',
        category: 'technical',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: {
          id: 1,
          name: 'Иван Петров',
          email: 'ivan@example.com'
        },
        reporter: {
          id: 2,
          name: 'Мария Сидорова',
          email: 'maria@example.com'
        }
      };
      
      const mockComments = [
        {
          id: 1,
          content: 'Проблема воспроизведена. Начинаю исследование.',
          author: {
            name: 'Иван Петров',
            avatar: null
          },
          createdAt: new Date().toISOString()
        }
      ];
      
      setTicket(mockTicket);
      setComments(mockComments);
      setEditedTicket(mockTicket);
    } catch (err) {
      setError('Ошибка загрузки деталей тикета');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      // Здесь будет API вызов для добавления комментария
      const newCommentObj = {
        id: comments.length + 1,
        content: newComment,
        author: {
          name: user.name,
          avatar: null
        },
        createdAt: new Date().toISOString()
      };
      
      setComments([...comments, newCommentObj]);
      setNewComment('');
    } catch (err) {
      setError('Ошибка добавления комментария');
    }
  };

  const handleUpdateTicket = async () => {
    try {
      // Здесь будет API вызов для обновления тикета
      setTicket(editedTicket);
      setEditDialogOpen(false);
    } catch (err) {
      setError('Ошибка обновления тикета');
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
        <Alert severity="error">{error}</Alert>
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
          Тикет #{ticket.id}
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