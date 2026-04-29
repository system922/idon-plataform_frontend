import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SessionTimeoutModal from '../components/SessionTimeoutModal';
import { authService } from '../services/authService';

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

  // Helper: decode JWT and get exp
  function getTokenExpiration(token) {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  // Check token/user on mount and on token change
  useEffect(() => {
    const storedUser = localStorage.getItem('idonUser');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser) setUser(JSON.parse(storedUser));
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
    const exp = getTokenExpiration(token);
    if (!exp) {
      setShowTimeoutModal(false);
      if (!PUBLIC_PATHS.includes(location.pathname)) {
        navigate('/login');
      }
      return;
    }
    const now = Date.now();
    const msLeft = exp - now;
    if (msLeft <= 0) {
      setShowTimeoutModal(false);
      logout();
      navigate('/login');
      return;
    }
    // Show modal 2 min before expiration
    if (msLeft < 2 * 60 * 1000) {
      setSecondsLeft(Math.floor(msLeft / 1000));
      setShowTimeoutModal(true);
    } else {
      setShowTimeoutModal(false);
    }
    // Timer to update seconds left
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now2 = Date.now();
      const msLeft2 = exp - now2;
      if (msLeft2 <= 0) {
        setShowTimeoutModal(false);
        logout();
        clearInterval(timerRef.current);
        if (!PUBLIC_PATHS.includes(location.pathname)) {
          navigate('/login');
        }
      } else if (msLeft2 < 2 * 60 * 1000) {
        setSecondsLeft(Math.floor(msLeft2 / 1000));
        setShowTimeoutModal(true);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [token, user]);

  // Handler: extend session (simulate refresh)
  const handleExtendSession = async () => {
    // You should call a refresh endpoint here. For now, just reload the page or re-login.
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
      localStorage.setItem('idonUser', JSON.stringify(result.user));
    }
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
      localStorage.setItem('idonUser', JSON.stringify(result.user));
    }
    setUser(result.user);
    setToken(result.token);
    return result;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    setShowTimeoutModal(false);
    localStorage.removeItem('idonUser');
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
