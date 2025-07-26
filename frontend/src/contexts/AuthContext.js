import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../utils/axios';
import { jwtDecode } from 'jwt-decode';

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 AuthContext: Starting initialization...');
      
      try {
        const token = localStorage.getItem('token');
        console.log('🔑 AuthContext: Token from localStorage:', token ? 'exists' : 'not found');
        
        if (!token) {
          // No token found, user is not authenticated
          console.log('❌ AuthContext: No token, setting unauthenticated state');
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          console.log('✅ AuthContext: Initialization complete (no token)');
          return;
        }

        try {
          // Check if token is expired
          console.log('🔍 AuthContext: Checking token expiration...');
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token is expired
            console.log('⏰ AuthContext: Token expired, clearing auth state');
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            console.log('✅ AuthContext: Initialization complete (expired token)');
            return;
          }

          // Token is valid, try to get user profile
          console.log('📡 AuthContext: Fetching user profile...');
          const response = await axios.get('/api/auth/profile');
          
          if (response.data && response.data.user) {
            console.log('👤 AuthContext: Profile fetched successfully:', response.data.user.username);
            setUser(response.data.user);
            setIsAuthenticated(true);
            console.log('✅ AuthContext: Initialization complete (authenticated)');
          } else {
            throw new Error('Invalid response format');
          }
        } catch (profileError) {
          console.error('❌ AuthContext: Error fetching user profile:', profileError);
          
          // If it's a 401 error, token is invalid
          if (profileError.response?.status === 401) {
            console.log('🚫 AuthContext: Token invalid (401), clearing auth state');
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // For other errors, keep the token but set user as not authenticated
            // This prevents infinite loops while allowing retry later
            console.log('⚠️ AuthContext: Profile fetch failed, but keeping token for retry');
            setUser(null);
            setIsAuthenticated(false);
          }
          console.log('✅ AuthContext: Initialization complete (profile error)');
        }
      } catch (error) {
        console.error('💥 AuthContext: Auth initialization error:', error);
        // Clear everything on unexpected errors
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        console.log('✅ AuthContext: Initialization complete (unexpected error)');
      } finally {
        console.log('🏁 AuthContext: Setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);
  
  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await axios.post('/api/auth/login', { email, password });
      
      const { token, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          errorMessage = 'Неверный email или пароль';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Ошибка валидации данных';
        } else if (error.response.status === 500) {
          errorMessage = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
        } else {
          errorMessage = error.response.data.message || 'Произошла ошибка при входе в систему';
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await axios.post('/api/auth/register', userData);
      
      const { token, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Register error:', error);
      
      let errorMessage = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Ошибка валидации данных';
        } else if (error.response.status === 500) {
          errorMessage = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
        } else {
          errorMessage = error.response.data.message || 'Произошла ошибка при регистрации';
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await axios.put('/api/auth/profile', userData);
      
      setUser(response.data.user);
      
      return response.data.user;
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.response && error.response.data) {
        setError(error.response.data.message || 'Ошибка обновления профиля');
      } else {
        setError('Ошибка сервера. Пожалуйста, попробуйте позже.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await axios.put(`/api/users/${user.id}/password`, {
        currentPassword,
        newPassword
      });
      
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.response && error.response.data) {
        setError(error.response.data.message || 'Ошибка изменения пароля');
      } else {
        setError('Ошибка сервера. Пожалуйста, попробуйте позже.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if user has a specific role
  const hasRole = (roles) => {
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    
    return user.role === roles;
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;