import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

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
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          // Check if token is expired
          const decodedToken = jwt_decode(token);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token is expired
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // Set auth header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Get user profile
            const response = await axios.get('/api/auth/profile');
            
            setUser(response.data.user);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
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
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response && error.response.data) {
        setError(error.response.data.message || 'Ошибка входа в систему');
      } else {
        setError('Ошибка сервера. Пожалуйста, попробуйте позже.');
      }
      
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
      
      // Set auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Register error:', error);
      
      if (error.response && error.response.data) {
        setError(error.response.data.message || 'Ошибка регистрации');
      } else {
        setError('Ошибка сервера. Пожалуйста, попробуйте позже.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
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