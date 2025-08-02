import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppearanceProvider } from './contexts/AppearanceContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetails from './pages/TicketDetails';
import CreateTicket from './pages/CreateTicket';
import UserList from './pages/UserList';
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import WorkflowAdmin from './pages/WorkflowAdmin';

// Theme configuration
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.2)',
        },
      },
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  console.log('🛡️ ProtectedRoute: State check -', {
    isLoading,
    isAuthenticated,
    user: user ? user.username : 'null',
    requiredRoles
  });
  
  // Show loading while auth is being initialized
  if (isLoading) {
    console.log('⏳ ProtectedRoute: Showing loading screen');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Загрузка...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    console.log('⛔ ProtectedRoute: Insufficient role, redirecting to dashboard');
    return <Navigate to="/dashboard" />;
  }
  
  console.log('✅ ProtectedRoute: Access granted, rendering children');
  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  
  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);
  
  // Toggle theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };
  
  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppearanceProvider>
          <Router>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
            
            {/* Dashboard routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/tickets" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <TicketList />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/tickets/create" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <CreateTicket />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/tickets/:id" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <TicketDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute requiredRoles={['admin', 'agent']}>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <UserList />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <UserProfile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRoles={['admin', 'agent']}>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/notifications" element={
              <ProtectedRoute>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <Notifications />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/workflow-admin" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <DashboardLayout darkMode={darkMode} toggleTheme={toggleTheme}>
                  <WorkflowAdmin />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Router>
        </AppearanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;