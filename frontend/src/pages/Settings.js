import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import {
  Notifications,
  Language,
  Palette,
  Security,
  Storage,
  Email,
  Sms,
  VolumeUp,
  Delete,
  Backup,
  Download,
  Upload,
  RestartAlt,
  Warning
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
      sound: true,
      ticketUpdates: true,
      systemAlerts: true,
      weeklyReports: false
    },
    appearance: {
      theme: 'light',
      language: 'ru',
      compactMode: false,
      showAvatars: true
    },
    privacy: {
      profileVisibility: 'public',
      activityTracking: true,
      dataCollection: false
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionPeriod: '30',
      debugMode: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Здесь будет API вызов для загрузки настроек
      // Пока используем заглушку
      console.log('Loading settings...');
    } catch (err) {
      setError('Ошибка загрузки настроек');
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Здесь будет API вызов для сохранения настроек
      console.log('Saving settings:', settings);
      
      // Имитация API вызова
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Настройки успешно сохранены');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError('Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleResetSettings = async () => {
    try {
      setLoading(true);
      
      // Сброс к настройкам по умолчанию
      setSettings({
        notifications: {
          email: true,
          sms: false,
          push: true,
          sound: true,
          ticketUpdates: true,
          systemAlerts: true,
          weeklyReports: false
        },
        appearance: {
          theme: 'light',
          language: 'ru',
          compactMode: false,
          showAvatars: true
        },
        privacy: {
          profileVisibility: 'public',
          activityTracking: true,
          dataCollection: false
        },
        system: {
          autoBackup: true,
          backupFrequency: 'daily',
          retentionPeriod: '30',
          debugMode: false
        }
      });
      
      setResetDialogOpen(false);
      setSuccess('Настройки сброшены к значениям по умолчанию');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError('Ошибка сброса настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setExportDialogOpen(false);
    setSuccess('Настройки экспортированы');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Typography variant="h4" component="h1" mb={3}>
        Настройки
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Уведомления" icon={<Notifications />} />
          <Tab label="Внешний вид" icon={<Palette />} />
          <Tab label="Приватность" icon={<Security />} />
          {hasRole(['admin']) && <Tab label="Система" icon={<Storage />} />}
        </Tabs>
      </Box>

      {/* Notifications Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Настройки уведомлений
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText
                  primary="Email уведомления"
                  secondary="Получать уведомления на электронную почту"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.email}
                    onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Sms />
                </ListItemIcon>
                <ListItemText
                  primary="SMS уведомления"
                  secondary="Получать уведомления по SMS"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.sms}
                    onChange={(e) => handleSettingChange('notifications', 'sms', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText
                  primary="Push уведомления"
                  secondary="Показывать уведомления в браузере"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.push}
                    onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <VolumeUp />
                </ListItemIcon>
                <ListItemText
                  primary="Звуковые уведомления"
                  secondary="Воспроизводить звук при получении уведомлений"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.sound}
                    onChange={(e) => handleSettingChange('notifications', 'sound', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider sx={{ my: 2 }} />
              
              <ListItem>
                <ListItemText
                  primary="Обновления тикетов"
                  secondary="Уведомления об изменениях в тикетах"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.ticketUpdates}
                    onChange={(e) => handleSettingChange('notifications', 'ticketUpdates', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Системные оповещения"
                  secondary="Важные уведомления о работе системы"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.systemAlerts}
                    onChange={(e) => handleSettingChange('notifications', 'systemAlerts', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Еженедельные отчеты"
                  secondary="Сводка активности за неделю"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.weeklyReports}
                    onChange={(e) => handleSettingChange('notifications', 'weeklyReports', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Appearance Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Настройки внешнего вида
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Тема</InputLabel>
                  <Select
                    value={settings.appearance.theme}
                    onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                    label="Тема"
                  >
                    <MenuItem value="light">Светлая</MenuItem>
                    <MenuItem value="dark">Темная</MenuItem>
                    <MenuItem value="auto">Автоматически</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Язык</InputLabel>
                  <Select
                    value={settings.appearance.language}
                    onChange={(e) => handleSettingChange('appearance', 'language', e.target.value)}
                    label="Язык"
                  >
                    <MenuItem value="ru">Русский</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.appearance.compactMode}
                      onChange={(e) => handleSettingChange('appearance', 'compactMode', e.target.checked)}
                    />
                  }
                  label="Компактный режим"
                />
                <Typography variant="body2" color="text.secondary">
                  Уменьшить отступы и размеры элементов интерфейса
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.appearance.showAvatars}
                      onChange={(e) => handleSettingChange('appearance', 'showAvatars', e.target.checked)}
                    />
                  }
                  label="Показывать аватары"
                />
                <Typography variant="body2" color="text.secondary">
                  Отображать аватары пользователей в списках и комментариях
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Privacy Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Настройки приватности
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Видимость профиля</InputLabel>
                  <Select
                    value={settings.privacy.profileVisibility}
                    onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                    label="Видимость профиля"
                  >
                    <MenuItem value="public">Публичный</MenuItem>
                    <MenuItem value="team">Только команда</MenuItem>
                    <MenuItem value="private">Приватный</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy.activityTracking}
                      onChange={(e) => handleSettingChange('privacy', 'activityTracking', e.target.checked)}
                    />
                  }
                  label="Отслеживание активности"
                />
                <Typography variant="body2" color="text.secondary">
                  Сохранять историю действий для улучшения работы системы
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy.dataCollection}
                      onChange={(e) => handleSettingChange('privacy', 'dataCollection', e.target.checked)}
                    />
                  }
                  label="Сбор аналитических данных"
                />
                <Typography variant="body2" color="text.secondary">
                  Разрешить сбор анонимных данных для улучшения продукта
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* System Tab (Admin only) */}
      {activeTab === 3 && hasRole(['admin']) && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={3}>
              Системные настройки
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.autoBackup}
                      onChange={(e) => handleSettingChange('system', 'autoBackup', e.target.checked)}
                    />
                  }
                  label="Автоматическое резервное копирование"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Частота резервного копирования</InputLabel>
                  <Select
                    value={settings.system.backupFrequency}
                    onChange={(e) => handleSettingChange('system', 'backupFrequency', e.target.value)}
                    label="Частота резервного копирования"
                    disabled={!settings.system.autoBackup}
                  >
                    <MenuItem value="hourly">Каждый час</MenuItem>
                    <MenuItem value="daily">Ежедневно</MenuItem>
                    <MenuItem value="weekly">Еженедельно</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Период хранения (дни)"
                  type="number"
                  value={settings.system.retentionPeriod}
                  onChange={(e) => handleSettingChange('system', 'retentionPeriod', e.target.value)}
                  inputProps={{ min: 1, max: 365 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.debugMode}
                      onChange={(e) => handleSettingChange('system', 'debugMode', e.target.checked)}
                    />
                  }
                  label="Режим отладки"
                />
                <Typography variant="body2" color="text.secondary">
                  Включить подробное логирование для диагностики проблем
                </Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" mb={2}>
              Управление данными
            </Typography>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => setExportDialogOpen(true)}
              >
                Экспорт настроек
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Upload />}
                component="label"
              >
                Импорт настроек
                <input type="file" hidden accept=".json" />
              </Button>
              
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RestartAlt />}
                onClick={() => setResetDialogOpen(true)}
              >
                Сбросить настройки
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          size="large"
          onClick={saveSettings}
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </Box>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Warning color="warning" sx={{ mr: 1 }} />
            Сброс настроек
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleResetSettings} color="warning" variant="contained">
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Экспорт настроек</DialogTitle>
        <DialogContent>
          <Typography mb={2}>
            Настройки будут сохранены в JSON файл, который можно использовать для восстановления или переноса настроек.
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="body2" color="text.secondary">
              Файл будет содержать:
            </Typography>
            <Box mt={1}>
              <Chip label="Уведомления" size="small" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Внешний вид" size="small" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Приватность" size="small" sx={{ mr: 1, mb: 1 }} />
              {hasRole(['admin']) && <Chip label="Система" size="small" sx={{ mr: 1, mb: 1 }} />}
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleExportSettings} variant="contained">
            Экспортировать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;