import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Pagination,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as ReadIcon,
  RadioButtonUnchecked as UnreadIcon,
  Refresh as RefreshIcon,
  DoneAll as MarkAllReadIcon
} from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    setError
  } = useNotifications();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const limit = 20;

  // Загрузка уведомлений
  const loadNotifications = async (currentPage = page, unreadOnly = showUnreadOnly) => {
    try {
      const data = await fetchNotifications({
        page: currentPage,
        limit,
        unreadOnly
      });
      setTotalPages(Math.ceil(data.total / limit));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Обновление уведомлений
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  // Обработка клика по уведомлению
  const handleNotificationClick = async (notification) => {
    try {
      // Отмечаем как прочитанное, если не прочитано
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      // Переходим к связанной заявке, если есть данные
      if (notification.data?.ticketId) {
        navigate(`/tickets/${notification.data.ticketId}`);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Обработка изменения страницы
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    loadNotifications(newPage);
  };

  // Обработка переключения фильтра
  const handleUnreadOnlyChange = (event) => {
    const unreadOnly = event.target.checked;
    setShowUnreadOnly(unreadOnly);
    setPage(1);
    loadNotifications(1, unreadOnly);
  };

  // Обработка отметки всех как прочитанные
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      await loadNotifications(); // Перезагружаем список
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Загрузка при монтировании компонента
  useEffect(() => {
    loadNotifications();
  }, []);

  // Очистка ошибки при размонтировании
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, [setError]);

  // Форматирование типа уведомления
  const getNotificationTypeLabel = (type) => {
    const types = {
      'ticket_created': 'Создана заявка',
      'ticket_updated': 'Обновлена заявка',
      'ticket_assigned': 'Назначена заявка',
      'ticket_closed': 'Закрыта заявка',
      'comment_added': 'Добавлен комментарий',
      'system': 'Системное'
    };
    return types[type] || type;
  };

  // Получение цвета для типа уведомления
  const getNotificationTypeColor = (type) => {
    const colors = {
      'ticket_created': 'success',
      'ticket_updated': 'info',
      'ticket_assigned': 'warning',
      'ticket_closed': 'default',
      'comment_added': 'primary',
      'system': 'secondary'
    };
    return colors[type] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <NotificationsIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Уведомления
        </Typography>
        <Tooltip title="Обновить">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
        {unreadCount > 0 && (
          <Tooltip title="Отметить все как прочитанные">
            <Button
              variant="outlined"
              startIcon={<MarkAllReadIcon />}
              onClick={handleMarkAllAsRead}
              sx={{ ml: 1 }}
            >
              Отметить все как прочитанные ({unreadCount})
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Фильтры */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showUnreadOnly}
                onChange={handleUnreadOnlyChange}
                color="primary"
              />
            }
            label="Показать только непрочитанные"
          />
          <Typography variant="body2" color="text.secondary">
            {showUnreadOnly 
              ? `Непрочитанных: ${unreadCount}`
              : `Всего уведомлений на странице: ${notifications.length}`
            }
          </Typography>
        </Box>
      </Paper>

      {/* Ошибка */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Список уведомлений */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length > 0 ? (
          <>
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected'
                      },
                      borderLeft: notification.isRead ? 'none' : '4px solid',
                      borderLeftColor: 'primary.main'
                    }}
                  >
                    <ListItemIcon>
                      {notification.isRead ? (
                        <ReadIcon color="action" />
                      ) : (
                        <UnreadIcon color="primary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: notification.isRead ? 'normal' : 'bold',
                              flexGrow: 1
                            }}
                          >
                            {notification.title}
                          </Typography>
                          <Chip
                            label={getNotificationTypeLabel(notification.type)}
                            size="small"
                            color={getNotificationTypeColor(notification.type)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 0.5 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notification.createdAt).toLocaleString('ru-RU')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {/* Пагинация */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {showUnreadOnly ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {showUnreadOnly 
                ? 'Все уведомления прочитаны'
                : 'Уведомления будут появляться здесь'
              }
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

// CSS для анимации обновления
const styles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Добавляем стили в head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default Notifications;