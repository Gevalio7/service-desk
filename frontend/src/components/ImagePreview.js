import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Card,
  CardMedia,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close,
  ZoomIn,
  ZoomOut,
  Download,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material';

const ImagePreview = ({
  open,
  onClose,
  imageUrl,
  imageName,
  onDownload,
  loading = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleClose = () => {
    setZoom(1);
    setIsFullscreen(false);
    setImageError(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={isFullscreen ? false : 'lg'}
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: {
          borderRadius: isFullscreen ? 0 : 2,
          maxHeight: isFullscreen ? '100vh' : '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="span" noWrap>
            {imageName || 'Просмотр изображения'}
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Увеличить">
              <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Уменьшить">
              <IconButton onClick={handleZoomOut} disabled={zoom <= 0.25}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Сбросить масштаб">
              <Button
                size="small"
                onClick={handleResetZoom}
                disabled={zoom === 1}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                {Math.round(zoom * 100)}%
              </Button>
            </Tooltip>
            
            <Tooltip title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}>
              <IconButton onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
            
            {onDownload && (
              <Tooltip title="Скачать">
                <IconButton onClick={onDownload} disabled={loading}>
                  <Download />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Закрыть">
              <IconButton onClick={handleClose}>
                <Close />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          backgroundColor: 'rgba(0, 0, 0, 0.05)'
        }}
      >
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={4}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Загрузка изображения...
            </Typography>
          </Box>
        ) : imageError || (!imageUrl && !loading) ? (
          <Box p={4}>
            <Alert severity="error">
              Не удалось загрузить изображение
            </Alert>
          </Box>
        ) : imageUrl ? (
          <Box
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
              width: '100%'
            }}
          >
            <img
              src={imageUrl}
              alt={imageName || 'Предварительный просмотр'}
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{
                maxWidth: '100%',
                maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '70vh',
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease-in-out',
                cursor: zoom > 1 ? 'grab' : 'default',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            />
          </Box>
        ) : (
          <Box p={4}>
            <Typography variant="body2" color="text.secondary" align="center">
              Изображение не загружено
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      {!isFullscreen && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Закрыть
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// Компонент для миниатюры изображения с поддержкой авторизации
export const ImageThumbnail = ({
  src,
  alt,
  onClick,
  size = 60,
  borderRadius = 1,
  loading = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(null);

  React.useEffect(() => {
    if (!src || loading) return;

    const loadImage = async () => {
      try {
        setImageLoading(true);
        setImageError(false);
        
        // Импортируем axios динамически, чтобы избежать циклических зависимостей
        const axios = (await import('../utils/axios')).default;
        
        const response = await axios.get(src, {
          responseType: 'blob'
        });
        
        const imageUrl = URL.createObjectURL(response.data);
        setImageSrc(imageUrl);
        setImageLoading(false);
      } catch (error) {
        console.error('Ошибка загрузки миниатюры:', error);
        setImageError(true);
        setImageLoading(false);
      }
    };

    loadImage();

    // Очистка blob URL при размонтировании
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, loading]);

  if (loading || imageLoading) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.100',
          borderRadius
        }}
      >
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (imageError || !imageSrc) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.100',
          borderRadius,
          border: '1px solid',
          borderColor: 'grey.300'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Ошибка
        </Typography>
      </Box>
    );
  }

  return (
    <Card
      sx={{
        width: size,
        height: size,
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: 4
        }
      }}
      onClick={onClick}
    >
      <CardMedia
        component="img"
        image={imageSrc}
        alt={alt}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius
        }}
      />
    </Card>
  );
};

export default ImagePreview;