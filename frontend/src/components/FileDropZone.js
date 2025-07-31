import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Avatar,
  Alert,
  Chip,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  AttachFile,
  Delete,
  Image,
  PictureAsPdf,
  Description,
  InsertDriveFile,
  Visibility
} from '@mui/icons-material';

const FileDropZone = ({
  files = [],
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10 MB
  acceptedTypes = '*/*',
  disabled = false,
  showPreview = true,
  onImagePreview
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState([]);

  const validateFile = (file) => {
    const errors = [];
    
    // Проверка размера файла
    if (file.size > maxFileSize) {
      errors.push(`Файл "${file.name}" превышает максимальный размер ${formatFileSize(maxFileSize)}`);
    }
    
    // Проверка типа файла (если указаны ограничения)
    if (acceptedTypes !== '*/*') {
      const acceptedTypesArray = acceptedTypes.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const mimeType = file.type;
      
      const isAccepted = acceptedTypesArray.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return mimeType.startsWith(baseType);
        }
        return mimeType === type;
      });
      
      if (!isAccepted) {
        errors.push(`Тип файла "${file.name}" не поддерживается`);
      }
    }
    
    return errors;
  };

  const processFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = [];
    const allErrors = [];

    // Проверка общего количества файлов
    if (files.length + fileArray.length > maxFiles) {
      allErrors.push(`Максимальное количество файлов: ${maxFiles}. Выбрано: ${files.length + fileArray.length}`);
      setErrors(allErrors);
      return;
    }

    // Валидация каждого файла
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length === 0) {
        // Проверяем, не добавлен ли уже такой файл
        const isDuplicate = files.some(existingFile => 
          existingFile.name === file.name && 
          existingFile.size === file.size &&
          existingFile.lastModified === file.lastModified
        );
        
        if (!isDuplicate) {
          validFiles.push({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
          });
        } else {
          allErrors.push(`Файл "${file.name}" уже добавлен`);
        }
      } else {
        allErrors.push(...fileErrors);
      }
    });

    setErrors(allErrors);

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, maxFiles, maxFileSize, acceptedTypes, onFilesChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Очищаем input для возможности повторного выбора того же файла
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((fileId) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    // Освобождаем URL объекты для изображений
    const removedFile = files.find(file => file.id === fileId);
    if (removedFile && removedFile.preview) {
      URL.revokeObjectURL(removedFile.preview);
    }
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: dragOver ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            bgcolor: disabled ? 'background.paper' : 'action.hover'
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Перетащите файлы сюда или нажмите для выбора
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Максимум {maxFiles} файлов, до {formatFileSize(maxFileSize)} каждый
        </Typography>

        <input
          accept={acceptedTypes}
          style={{ display: 'none' }}
          id="file-upload-dropzone"
          multiple
          type="file"
          onChange={handleFileSelect}
          disabled={disabled}
        />
        <label htmlFor="file-upload-dropzone">
          <Button
            variant="outlined"
            component="span"
            startIcon={<AttachFile />}
            disabled={disabled}
          >
            Выбрать файлы
          </Button>
        </label>
      </Paper>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={clearErrors}
        >
          <Typography variant="subtitle2" gutterBottom>
            Ошибки при загрузке файлов:
          </Typography>
          {errors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* File List */}
      {showPreview && files.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle1">
              Прикрепленные файлы ({files.length}/{maxFiles})
            </Typography>
            <Chip 
              label={`${formatFileSize(files.reduce((total, file) => total + file.size, 0))}`}
              size="small"
              variant="outlined"
            />
          </Box>
          
          <List dense>
            {files.map((file) => (
              <ListItem
                key={file.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.paper'
                }}
              >
                <ListItemAvatar>
                  {isImageFile(file.type) && file.preview ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        component="img"
                        src={file.preview}
                        alt={file.name}
                        onClick={() => onImagePreview && onImagePreview(file)}
                        sx={{
                          width: 50,
                          height: 50,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: onImagePreview ? 'pointer' : 'default',
                          transition: 'transform 0.2s ease-in-out',
                          '&:hover': onImagePreview ? {
                            transform: 'scale(1.05)',
                            boxShadow: 2
                          } : {}
                        }}
                      />
                    </Box>
                  ) : (
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getFileIcon(file.type)}
                    </Avatar>
                  )}
                </ListItemAvatar>
                
                <ListItemText
                  primary={file.name}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                      {isImageFile(file.type) && onImagePreview && (
                        <Typography variant="caption" color="primary">
                          Нажмите на изображение для просмотра
                        </Typography>
                      )}
                    </>
                  }
                />
                
                <Box display="flex" gap={1}>
                  {isImageFile(file.type) && onImagePreview && (
                    <Tooltip title="Просмотр изображения">
                      <IconButton
                        size="small"
                        onClick={() => onImagePreview(file)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <Tooltip title="Удалить файл">
                    <IconButton
                      size="small"
                      onClick={() => removeFile(file.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default FileDropZone;