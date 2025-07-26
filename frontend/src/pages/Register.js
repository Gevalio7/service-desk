import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Phone,
  Lock,
  PersonAdd
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const validationSchema = yup.object({
  name: yup
    .string('Введите имя')
    .required('Имя обязательно')
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов'),
  email: yup
    .string('Введите email')
    .email('Введите корректный email')
    .required('Email обязателен'),
  phone: yup
    .string('Введите телефон')
    .matches(/^\+?[1-9]\d{1,14}$/, 'Введите корректный номер телефона')
    .required('Телефон обязателен'),
  password: yup
    .string('Введите пароль')
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'
    )
    .required('Пароль обязателен'),
  confirmPassword: yup
    .string('Подтвердите пароль')
    .oneOf([yup.ref('password'), null], 'Пароли должны совпадать')
    .required('Подтверждение пароля обязательно'),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], 'Необходимо согласиться с условиями использования'),
});

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        
        const userData = {
          username: values.email, // Используем email как username
          email: values.email,
          firstName: values.name.split(' ')[0] || values.name,
          lastName: values.name.split(' ').slice(1).join(' ') || '',
          password: values.password,
          role: 'client' // По умолчанию новые пользователи имеют роль 'client'
        };
        
        await register(userData);
        
        // Перенаправление на главную страницу после успешной регистрации
        navigate('/dashboard');
        
      } catch (err) {
        setError(err.message || 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Регистрация
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Создайте новый аккаунт для доступа к системе
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            {/* Name Field */}
            <TextField
              fullWidth
              id="name"
              name="name"
              label="Полное имя"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />

            {/* Email Field */}
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />

            {/* Phone Field */}
            <TextField
              fullWidth
              id="phone"
              name="phone"
              label="Телефон"
              placeholder="+7 (999) 123-45-67"
              value={formik.values.phone}
              onChange={formik.handleChange}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Field */}
            <TextField
              fullWidth
              id="password"
              name="password"
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password Field */}
            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Подтвердите пароль"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Terms Agreement */}
            <FormControlLabel
              control={
                <Checkbox
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formik.values.agreeToTerms}
                  onChange={formik.handleChange}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  Я согласен с{' '}
                  <Link to="/terms" style={{ color: 'inherit' }}>
                    условиями использования
                  </Link>{' '}
                  и{' '}
                  <Link to="/privacy" style={{ color: 'inherit' }}>
                    политикой конфиденциальности
                  </Link>
                </Typography>
              }
              sx={{ mb: 2 }}
            />
            
            {formik.touched.agreeToTerms && formik.errors.agreeToTerms && (
              <Typography variant="caption" color="error" display="block" sx={{ mb: 2 }}>
                {formik.errors.agreeToTerms}
              </Typography>
            )}

            {/* Submit Button */}
            <Button
              color="primary"
              variant="contained"
              fullWidth
              type="submit"
              size="large"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                или
              </Typography>
            </Divider>

            {/* Login Link */}
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Уже есть аккаунт?{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Войти
                </Link>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;