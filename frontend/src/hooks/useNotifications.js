import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Получить уведомления пользователя
  const fetchNotifications = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const { page = 1, limit = 10, unreadOnly = false } = options;
      
      const response = await axios.get('/api/notifications', {
        params: { page, limit, unreadOnly }
      });
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        return response.data.data;
      } else {
        throw new Error('Ошибка получения уведомлений');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Ошибка загрузки уведомлений');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Получить количество непрочитанных уведомлений
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count');
      
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
        return response.data.data.count;
      } else {
        throw new Error('Ошибка получения количества уведомлений');
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
      // Не показываем ошибку пользователю для счетчика
      setUnreadCount(0);
      return 0;
    }
  }, []);

  // Отметить уведомление как прочитанное
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await axios.put(`/api/notifications/${notificationId}/read`);
      
      if (response.data.success) {
        // Обновить локальное состояние
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        );
        
        // Обновить счетчик непрочитанных
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        return response.data.data;
      } else {
        throw new Error('Ошибка отметки уведомления');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err.response?.data?.message || 'Ошибка отметки уведомления');
      throw err;
    }
  }, []);

  // Отметить все уведомления как прочитанные
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await axios.put('/api/notifications/read-all');
      
      if (response.data.success) {
        // Обновить локальное состояние
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        
        // Сбросить счетчик
        setUnreadCount(0);
        
        return true;
      } else {
        throw new Error('Ошибка отметки всех уведомлений');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err.response?.data?.message || 'Ошибка отметки всех уведомлений');
      throw err;
    }
  }, []);

  // Автоматически загружать счетчик непрочитанных при монтировании
  useEffect(() => {
    fetchUnreadCount();
  }, []); // Убираем зависимость fetchUnreadCount

  // Периодически обновлять счетчик непрочитанных (каждые 30 секунд)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []); // Убираем зависимость fetchUnreadCount

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    setError // Для сброса ошибок
  };
};

export default useNotifications;