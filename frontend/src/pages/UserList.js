import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
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
  Menu,
  MenuItem as MenuItemComponent,
  Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  Person,
  Email,
  Phone,
  Block,
  CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const UserList = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUserId, setMenuUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Здесь будет API вызов для получения пользователей
      // Пока используем заглушку
      const mockUsers = [
        {
          id: 1,
          name: 'Иван Петров',
          email: 'ivan@example.com',
          phone: '+7 (999) 123-45-67',
          role: 'admin',
          status: 'active',
          createdAt: '2024-01-15T10:00:00Z',
          lastLogin: '2024-01-25T14:30:00Z',
          ticketsCount: 25
        },
        {
          id: 2,
          name: 'Мария Сидорова',
          email: 'maria@example.com',
          phone: '+7 (999) 234-56-78',
          role: 'agent',
          status: 'active',
          createdAt: '2024-01-20T09:00:00Z',
          lastLogin: '2024-01-25T16:45:00Z',
          ticketsCount: 42
        },
        {
          id: 3,
          name: 'Алексей Иванов',
          email: 'alexey@example.com',
          phone: '+7 (999) 345-67-89',
          role: 'user',
          status: 'active',
          createdAt: '2024-02-01T11:30:00Z',
          lastLogin: '2024-01-24T12:15:00Z',
          ticketsCount: 8
        },
        {
          id: 4,
          name: 'Елена Козлова',
          email: 'elena@example.com',
          phone: '+7 (999) 456-78-90',
          role: 'user',
          status: 'inactive',
          createdAt: '2024-01-10T08:00:00Z',
          lastLogin: '2024-01-20T10:00:00Z',
          ticketsCount: 3
        }
      ];
      
      setUsers(mockUsers);
    } catch (err) {
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, userId) => {
    setAnchorEl(event.currentTarget);
    setMenuUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUserId(null);
  };

  const handleEditUser = (userId) => {
    const userToEdit = users.find(u => u.id === userId);
    setSelectedUser(userToEdit);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteUser = (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    setSelectedUser(userToDelete);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleToggleStatus = async (userId) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      const newStatus = userToUpdate.status === 'active' ? 'inactive' : 'active';
      
      // Здесь будет API вызов для изменения статуса
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));
      
      handleMenuClose();
    } catch (err) {
      setError('Ошибка изменения статуса пользователя');
    }
  };

  const handleSaveUser = async () => {
    try {
      // Здесь будет API вызов для сохранения пользователя
      setUsers(users.map(u => 
        u.id === selectedUser.id ? selectedUser : u
      ));
      
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Ошибка сохранения пользователя');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      // Здесь будет API вызов для удаления пользователя
      setUsers(users.filter(u => u.id !== selectedUser.id));
      
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Ошибка удаления пользователя');
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'agent': return 'Агент';
      case 'user': return 'Пользователь';
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'agent': return 'warning';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    return status === 'active' ? 'Активен' : 'Неактивен';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'default';
  };

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns = [
    {
      field: 'avatar',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Avatar sx={{ width: 32, height: 32 }}>
          {params.row.name.charAt(0)}
        </Avatar>
      ),
    },
    {
      field: 'name',
      headerName: 'Имя',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Роль',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={getRoleText(params.value)}
          color={getRoleColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Статус',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={getStatusText(params.value)}
          color={getStatusColor(params.value)}
          size="small"
          icon={params.value === 'active' ? <CheckCircle /> : <Block />}
        />
      ),
    },
    {
      field: 'phone',
      headerName: 'Телефон',
      width: 150,
    },
    {
      field: 'ticketsCount',
      headerName: 'Тикеты',
      width: 100,
      type: 'number',
    },
    {
      field: 'lastLogin',
      headerName: 'Последний вход',
      width: 180,
      renderCell: (params) => (
        params.value ? new Date(params.value).toLocaleString() : 'Никогда'
      ),
    },
    {
      field: 'actions',
      headerName: 'Действия',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => handleMenuOpen(e, params.row.id)}
          disabled={!hasRole(['admin']) && params.row.id !== user.id}
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ];

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Пользователи
        </Typography>
        {hasRole(['admin']) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/users/create')}
          >
            Добавить пользователя
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              placeholder="Поиск по имени или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Роль</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Роль"
              >
                <MenuItem value="all">Все роли</MenuItem>
                <MenuItem value="admin">Администратор</MenuItem>
                <MenuItem value="agent">Агент</MenuItem>
                <MenuItem value="user">Пользователь</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Статус"
              >
                <MenuItem value="all">Все статусы</MenuItem>
                <MenuItem value="active">Активные</MenuItem>
                <MenuItem value="inactive">Неактивные</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          disableRowSelectionOnClick
          sx={{ border: 0 }}
        />
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={() => handleEditUser(menuUserId)}>
          <Edit sx={{ mr: 1 }} />
          Редактировать
        </MenuItemComponent>
        <MenuItemComponent onClick={() => handleToggleStatus(menuUserId)}>
          {users.find(u => u.id === menuUserId)?.status === 'active' ? (
            <>
              <Block sx={{ mr: 1 }} />
              Деактивировать
            </>
          ) : (
            <>
              <CheckCircle sx={{ mr: 1 }} />
              Активировать
            </>
          )}
        </MenuItemComponent>
        <Divider />
        <MenuItemComponent 
          onClick={() => handleDeleteUser(menuUserId)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Удалить
        </MenuItemComponent>
      </Menu>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать пользователя</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Имя"
                value={selectedUser.name || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={selectedUser.email || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Телефон"
                value={selectedUser.phone || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Роль</InputLabel>
                <Select
                  value={selectedUser.role || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  disabled={!hasRole(['admin'])}
                >
                  <MenuItem value="user">Пользователь</MenuItem>
                  <MenuItem value="agent">Агент</MenuItem>
                  <MenuItem value="admin">Администратор</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={selectedUser.status || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                  disabled={!hasRole(['admin'])}
                >
                  <MenuItem value="active">Активен</MenuItem>
                  <MenuItem value="inactive">Неактивен</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSaveUser} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить пользователя "{selectedUser?.name}"?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserList;