import React from 'react';
import { Box, Container, Paper, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center' }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: theme.palette.primary.main,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            Service Desk
          </Typography>
          
          {children}
        </Paper>
      </Container>
      
      {/* Background decoration */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: { xs: 0, md: '50%' },
          backgroundImage: 'url(/static/images/auth-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: { xs: 'none', md: 'block' },
          zIndex: -1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
          }}
        >
          <Typography
            variant="h3"
            component="div"
            align="center"
            sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}
          >
            Добро пожаловать в Service Desk
          </Typography>
          <Typography
            variant="h6"
            component="div"
            align="center"
            sx={{ color: 'white', maxWidth: '600px' }}
          >
            Система обработки заявок и инцидентов с SLA-трекингом и интеграцией с Telegram
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;