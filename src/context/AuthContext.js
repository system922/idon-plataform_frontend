import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SessionTimeoutModal from '../components/SessionTimeoutModal';
import { authService } from '../services/authService';
import TokenManager from '../utils/tokenManager';

const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();

  const PUBLIC_PATHS = ['/terms-and-conditions', '/privacy-policy', '/login', '/register'];

  // Check token/user on mount and on token change
  useEffect(() => {
    const storedUser = TokenManager.getUser();
    const storedToken = TokenManager.getToken();
    if (storedUser) setUser(storedUser);
    if (storedToken) setToken(storedToken);
    setLoading(false);
  }, []);

  // Session timeout logic
  useEffect(() => {
    if (!token || !user) {
      setShowTimeoutModal(false);
      if (!PUBLIC_PATHS.includes(location.pathname)) {
        navigate('/login');
      }
      return;
    }

    // Check if token is expired
    if (TokenManager.isTokenExpired(token)) {
      logout();
      navigate('/login');
      return;
    }

    const timeRemaining = TokenManager.getTokenTimeRemaining(token);
    const TWO_MINUTES = 2 * 60 * 1000;

    // Show modal 2 min before expiration
    if (timeRemaining < TWO_MINUTES) {
      setSecondsLeft(Math.floor(timeRemaining / 1000));
      setShowTimeoutModal(true);
    } else {
      setShowTimeoutModal(false);
    }

    // Timer to update seconds left
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const timeRemaining = TokenManager.getTokenTimeRemaining(token);

      if (timeRemaining <= 0) {
        setShowTimeoutModal(false);
        logout();
        clearInterval(timerRef.current);
        if (!PUBLIC_PATHS.includes(location.pathname)) {
          navigate('/login');
        }
      } else if (timeRemaining < TWO_MINUTES) {
        setSecondsLeft(Math.floor(timeRemaining / 1000));
        setShowTimeoutModal(true);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [token, user]);

  // Handler: extend session (simulate refresh)
  const handleExtendSession = async () => {
    setShowTimeoutModal(false);
    window.location.reload();
  };

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    // Unir first_name y last_name si existen
    if (result.user) {
      let fullName = result.user.name;
      if (!fullName && result.user.first_name && result.user.last_name) {
        fullName = `${result.user.first_name} ${result.user.last_name}`.trim();
      }
      result.user.name = fullName || result.user.email || '';
      // Parche: Forzar userType para usuarios admin si falta
      if (!result.user.userType && (result.user.role === 'super_admin' || result.user.role === 'admin' || result.user.is_admin)) {
        result.user.userType = 'admin_idon';
      }
      TokenManager.setUser(result.user);
    }
    TokenManager.setToken(result.token);
    setUser(result.user);
    setToken(result.token);
    return result;
  };

  const loginBusiness = async (email, password, businessSlug) => {
    const result = await authService.loginBusiness(email, password, businessSlug);
    // Unir first_name y last_name si existen
    if (result.user) {
      let fullName = result.user.name;
      if (!fullName && result.user.first_name && result.user.last_name) {
        fullName = `${result.user.first_name} ${result.user.last_name}`.trim();
      }
      result.user.name = fullName || result.user.email || '';
      // Parche: Forzar userType para usuarios admin si falta
      if (!result.user.userType && (result.user.role === 'super_admin' || result.user.role === 'admin' || result.user.is_admin)) {
        result.user.userType = 'admin_idon';
      }
      TokenManager.setUser(result.user);
    }
    TokenManager.setToken(result.token);
    setUser(result.user);
    setToken(result.token);
    return result;
  };

  const logout = () => {
    authService.logout();
    TokenManager.clear();
    setUser(null);
    setToken(null);
    setShowTimeoutModal(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginBusiness, logout }}>
      {children}
      {showTimeoutModal && (
        <SessionTimeoutModal
          onExtend={handleExtendSession}
          onLogout={logout}
          secondsLeft={secondsLeft}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
