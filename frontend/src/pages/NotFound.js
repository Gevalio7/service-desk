import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper
} from '@mui/material';
import {
  Home,
  ArrowBack,
  SearchOff
} from '@mui/icons-material';

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            borderRadius: 3,
            maxWidth: 600,
            width: '100%'
          }}
        >
          {/* 404 Icon */}
          <SearchOff
            sx={{
              fontSize: 120,
              color: 'text.secondary',
              mb: 3
            }}
          />

          {/* Error Code */}
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '4rem', md: '6rem' },
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 2,
              lineHeight: 1
            }}
          >
            404
          </Typography>

          {/* Error Message */}
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 500,
              mb: 2
            }}
          >
            Страница не найдена
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: '1.1rem',
              mb: 4,
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            К сожалению, запрашиваемая страница не существует или была перемещена.
            Проверьте правильность введенного адреса или воспользуйтесь навигацией.
          </Typography>

          {/* Action Buttons */}
          <Box
            display="flex"
            gap={2}
            justifyContent="center"
            flexWrap="wrap"
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<Home />}
              onClick={handleGoHome}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem'
              }}
            >
              На главную
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<ArrowBack />}
              onClick={handleGoBack}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem'
              }}
            >
              Назад
            </Button>
          </Box>

          {/* Additional Help */}
          <Box mt={4}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Нужна помощь? Попробуйте:
            </Typography>

            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={1}
            >
              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/tickets')}
              >
                Перейти к тикетам
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/profile')}
              >
                Открыть профиль
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/settings')}
              >
                Настройки
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 4 }}
        >
          Если проблема повторяется, обратитесь к администратору системы
        </Typography>
      </Box>
    </Container>
  );
};

export default NotFound;