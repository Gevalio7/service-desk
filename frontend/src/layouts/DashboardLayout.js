import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  useMediaQuery,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Assessment as ReportIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  AccountTree as WorkflowIcon
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const DashboardLayout = ({ children, darkMode, toggleTheme }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  
  // Хук для работы с уведомлениями
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  
  // Close drawer on mobile
  React.useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);
  
  const handleDrawerOpen = () => {
    setOpen(true);
  };
  
  const handleDrawerClose = () => {
    setOpen(false);
  };
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleNotificationsOpen = async (event) => {
    setNotificationsAnchorEl(event.currentTarget);
    // Загружаем последние уведомления при открытии меню
    try {
      await fetchNotifications({ limit: 5 });
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };
  
  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };
  
  const handleNotificationClick = async (notification) => {
    try {
      // Отмечаем уведомление как прочитанное
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      
      // Переходим к связанной заявке, если есть данные
      if (notification.data?.ticketId) {
        navigate(`/tickets/${notification.data.ticketId}`);
      }
      
      handleNotificationsClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Функция для получения метки типа уведомления
  const getNotificationTypeLabel = (type) => {
    const types = {
      'ticket_created': 'Создана',
      'ticket_updated': 'Обновлена',
      'ticket_assigned': 'Назначена',
      'ticket_closed': 'Закрыта',
      'comment_added': 'Комментарий',
      'system': 'Система'
    };
    return types[type] || type;
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const menuItems = [
    {
      text: 'Дашборд',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['admin', 'agent', 'client']
    },
    {
      text: 'Заявки',
      icon: <TicketIcon />,
      path: '/tickets',
      roles: ['admin', 'agent', 'client']
    },
    {
      text: 'Создать заявку',
      icon: <AddIcon />,
      path: '/tickets/create',
      roles: ['admin', 'agent', 'client']
    },
    {
      text: 'Пользователи',
      icon: <PeopleIcon />,
      path: '/users',
      roles: ['admin', 'agent']
    },
    {
      text: 'Отчеты',
      icon: <ReportIcon />,
      path: '/reports',
      roles: ['admin', 'agent']
    },
    {
      text: 'Workflow',
      icon: <WorkflowIcon />,
      path: '/workflow-admin',
      roles: ['admin']
    },
    {
      text: 'Настройки',
      icon: <SettingsIcon />,
      path: '/settings',
      roles: ['admin', 'agent', 'client']
    }
  ];
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Service Desk
          </Typography>
          
          {/* Theme toggle */}
          <Tooltip title={darkMode ? 'Светлая тема' : 'Темная тема'}>
            <IconButton color="inherit" onClick={toggleTheme}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip title="Уведомления">
            <IconButton
              color="inherit"
              onClick={handleNotificationsOpen}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {notificationsLoading ? (
              <MenuItem>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Загрузка уведомлений...</Typography>
                </Box>
              </MenuItem>
            ) : notifications.length > 0 ? (
              <>
                {notifications.slice(0, 5).map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                      borderLeft: notification.isRead ? 'none' : '4px solid',
                      borderLeftColor: 'primary.main',
                      position: 'relative',
                      '&:hover': {
                        backgroundColor: notification.isRead ? 'action.hover' : 'rgba(25, 118, 210, 0.12)'
                      }
                    }}
                  >
                    {/* Индикатор непрочитанного уведомления */}
                    {!notification.isRead && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          zIndex: 1
                        }}
                      />
                    )}
                    
                    <Box sx={{ width: '100%', pr: notification.isRead ? 0 : 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.isRead ? 'normal' : 'bold',
                            color: notification.isRead ? 'text.primary' : 'primary.main',
                            flexGrow: 1,
                            mr: 1
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {notification.type && (
                          <Chip
                            label={getNotificationTypeLabel(notification.type)}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.65rem',
                              height: 18,
                              '& .MuiChip-label': { px: 0.5 }
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%'
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {new Date(notification.createdAt).toLocaleString('ru-RU')}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                <Divider />
                {unreadCount > 0 && (
                  <MenuItem onClick={handleMarkAllAsRead}>
                    <Typography variant="body2" color="primary">
                      Отметить все как прочитанные
                    </Typography>
                  </MenuItem>
                )}
                <MenuItem onClick={() => { handleNotificationsClose(); navigate('/notifications'); }}>
                  <Typography variant="body2" color="primary">
                    Показать все уведомления
                  </Typography>
                </MenuItem>
              </>
            ) : (
              <MenuItem>
                <Typography variant="body2" color="text.secondary">
                  Нет уведомлений
                </Typography>
              </MenuItem>
            )}
          </Menu>
          
          {/* User profile */}
          <Tooltip title="Профиль">
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ p: 0, ml: 2 }}
            >
              <Avatar alt={user?.firstName} src="/static/images/avatar/1.jpg" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Мой профиль</Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Настройки</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Выйти</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBarStyled>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
      >
        <DrawerHeader>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Service Desk
          </Typography>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => (
            item.roles.includes(user?.role) && (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) {
                      handleDrawerClose();
                    }
                  }}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Роль: {translateRole(user?.role)}
          </Typography>
        </Box>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
};

// Helper function to translate role
const translateRole = (role) => {
  switch (role) {
    case 'admin':
      return 'Администратор';
    case 'agent':
      return 'Агент';
    case 'client':
      return 'Клиент';
    default:
      return role;
  }
};

export default DashboardLayout;