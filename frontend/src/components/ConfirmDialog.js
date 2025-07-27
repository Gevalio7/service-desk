import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Box,
  Typography,
  Alert
} from '@mui/material';
import {
  Warning,
  Delete,
  Cancel
} from '@mui/icons-material';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Подтверждение действия',
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  severity = 'warning',
  confirmColor = 'error',
  loading = false,
  itemName = null,
  itemType = 'элемент'
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onClose();
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'error':
        return <Delete color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <Warning color="warning" />;
    }
  };

  const defaultMessage = itemName 
    ? `Вы уверены, что хотите удалить ${itemType} "${itemName}"?`
    : `Вы уверены, что хотите выполнить это действие?`;

  return (
    <Dialog
      open={open}
      onClose={!loading ? handleCancel : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {getSeverityIcon()}
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText component="div">
          {message || defaultMessage}
        </DialogContentText>
        
        {severity === 'error' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Это действие нельзя отменить!
          </Alert>
        )}
        
        {severity === 'warning' && itemType === 'файл' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Файл будет удален безвозвратно.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleCancel}
          disabled={loading}
          startIcon={<Cancel />}
          variant="outlined"
        >
          {cancelText}
        </Button>
        
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading}
          startIcon={<Delete />}
          sx={{
            minWidth: 120
          }}
        >
          {loading ? 'Удаление...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;