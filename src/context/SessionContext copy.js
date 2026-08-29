// ========== src/context/SessionContext.jsx ==========
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  api, 
  setAuthToken, 
  removeAuthToken, 
  setBusinessContext,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  getCurrentToken,
  getBusinessContext,
} from '../config/api';

const SessionContext = createContext(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [requiresBusinessSelection, setRequiresBusinessSelection] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const refreshTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);

  // ─── Limpiar sesión ──────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setBusinesses([]);
    setSelectedBusiness(null);
    setIsAuthenticated(false);
    removeAuthToken();
    clearRefreshToken();
    setBusinessContext(null, null);
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    sessionStorage.removeItem('business_id');
    sessionStorage.removeItem('schema_name');
    sessionStorage.removeItem('lastRoute');
  }, []);

  // ─── Función auxiliar para cargar negocios ──────────────────────────
  const loadBusinesses = useCallback(async (userData) => {
    // SI ES ADMIN, NO CARGAR NEGOCIOS (EVITA ERROR 500)
    if (userData?.role === 'admin' || 
        userData?.role === 'superadmin' || 
        userData?.role === 'super_admin' ||
        userData?.userType === 'admin_idon') {
      setRequiresBusinessSelection(false);
      setSelectedBusiness(null);
      return;
    }

    // Si el usuario ya tiene un businessId, usarlo directamente
    if (userData?.businessId) {
      let schemaName = userData.schemaName;
      if (!schemaName) {
        schemaName = sessionStorage.getItem('schema_name') || null;
      }
      const biz = { 
        id: userData.businessId, 
        schemaName: schemaName 
      };
      setSelectedBusiness(biz);
      setBusinessContext(userData.businessId, schemaName);
      setRequiresBusinessSelection(false);
      return;
    }

    // SOLO si NO tiene businessId, intentar cargar la lista
    try {
      const bizResponse = await api.get('/auth/businesses');
      if (bizResponse.data?.ok && bizResponse.data?.data) {
        const bizList = bizResponse.data.data || [];
        setBusinesses(bizList);
        const hasMultiple = bizList.length > 1;
        setRequiresBusinessSelection(hasMultiple);
        if (bizList.length === 1) {
          const singleBiz = bizList[0];
          const biz = { 
            id: singleBiz.id, 
            schemaName: singleBiz.schemaName || singleBiz.schema_name 
          };
          setSelectedBusiness(biz);
          setBusinessContext(singleBiz.id, biz.schemaName);
        }
      }
    } catch (error) {
      console.warn('No se pudieron cargar los negocios:', error.message);
    }
  }, []);

  // ─── Schedule refresh ──────────────────────────────────────────────────
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      await refreshToken();
    }, 15 * 60 * 1000);
  }, []);

  // ─── Refresh token ──────────────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      const storedRefreshToken = getRefreshToken();
      
      if (!storedRefreshToken) return;
      
      const response = await api.post('/auth/refresh', { 
        refreshToken: storedRefreshToken 
      });
      
      if (response.data?.ok && response.data?.data) {
        const newToken = response.data.data.token;
        const newRefreshToken = response.data.data.refreshToken;
        
        setToken(newToken);
        setAuthToken(newToken);
        
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }
        
        scheduleTokenRefresh();
      }
    } catch {
      // Silently handle
    } finally {
      isRefreshingRef.current = false;
    }
  }, [scheduleTokenRefresh]);

  // ─── Cargar sesión ──────────────────────────────────────────────
  const loadSession = useCallback(async () => {
    setLoading(true);
    
    try {
      const storedToken = getCurrentToken();
      const storedRefreshToken = getRefreshToken();
      const { businessId, schemaName } = getBusinessContext();
      
      if (storedToken) {
        try {
          const userResponse = await api.get('/auth/me');
          
          if (userResponse.data?.ok && userResponse.data?.data) {
            const userData = userResponse.data.data;
            
            let roleFromToken = null;
            if (storedToken) {
              try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                roleFromToken = payload.roleCode || payload.role || payload.userType;
              } catch {
                // Silently handle
              }
            }
            
            const userRole = roleFromToken || 
                             userData.roleCode ||
                             userData.role || 
                             userData.role_name || 
                             userData.roleName || 
                             userData.rol ||
                             userData.userType ||
                             'user';

            const isAdmin = userRole === 'admin' || userRole === 'superadmin';
            const userType = isAdmin ? 'admin_idon' : (userData.userType || userRole);

            setUser({
              ...userData,
              role: userRole,
              userType: userType,
              roleCode: userRole
            });
            
            setToken(storedToken);
            setIsAuthenticated(true);
            
            // Si no tiene businessId pero hay uno en sessionStorage, usarlo
            if (!userData.businessId && businessId) {
              userData.businessId = businessId;
              userData.schemaName = schemaName;
            }
            
            await loadBusinesses(userData);
            scheduleTokenRefresh();
            
            setLoading(false);
            return true;
          }
        } catch {
          sessionStorage.removeItem('auth_token');
        }
      }

      if (storedRefreshToken) {
        try {
          const refreshResponse = await api.post('/auth/refresh', { 
            refreshToken: storedRefreshToken 
          });
                    
          if (refreshResponse.data?.ok && refreshResponse.data?.data) {
            const newToken = refreshResponse.data.data.token;
            const newRefreshToken = refreshResponse.data.data.refreshToken;
            
            if (newToken) {
              setToken(newToken);
              setAuthToken(newToken);
              
              if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
              }
              
              const userResponse = await api.get('/auth/me');
              
              if (userResponse.data?.ok && userResponse.data?.data) {
                const userData = userResponse.data.data;
                
                let roleFromToken = null;
                if (newToken) {
                  try {
                    const payload = JSON.parse(atob(newToken.split('.')[1]));
                    roleFromToken = payload.roleCode || payload.role || payload.userType;
                  } catch {
                    // Silently handle
                  }
                }
                
                const userRole = roleFromToken || 
                                 userData.roleCode ||
                                 userData.role || 
                                 userData.role_name || 
                                 userData.roleName || 
                                 userData.rol ||
                                 userData.userType ||
                                 'user';

                const isAdmin = userRole === 'admin' || userRole === 'superadmin';
                const userType = isAdmin ? 'admin_idon' : (userData.userType || userRole);

                setUser({
                  ...userData,
                  role: userRole,
                  userType: userType,
                  roleCode: userRole
                });
                
                setIsAuthenticated(true);
                
                // Si no tiene businessId pero hay uno en sessionStorage, usarlo
                if (!userData.businessId && businessId) {
                  userData.businessId = businessId;
                  userData.schemaName = schemaName;
                }
                
                await loadBusinesses(userData);
                scheduleTokenRefresh();
                
                setLoading(false);
                return true;
              }
            }
          }
        } catch {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
        }
      }
      
      clearSession();
      setLoading(false);
      return false;
      
    } catch {
      clearSession();
      setLoading(false);
      return false;
    }
  }, [clearSession, scheduleTokenRefresh, loadBusinesses]);

  // ─── LOGIN ──────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data?.success === true && response.data?.data) {
        const { 
          token: newToken, 
          user: userData, 
          businesses: bizList, 
          requiresBusinessSelection,
          refreshToken: rt
        } = response.data.data;
                
        let roleFromToken = null;
        if (newToken) {
          try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            roleFromToken = payload.roleCode || payload.role || payload.userType;
          } catch {
            // Silently handle
          }
        }
        
        const userRole = roleFromToken || 
                         userData.roleCode ||
                         userData.role || 
                         userData.role_name || 
                         userData.roleName || 
                         userData.rol ||
                         userData.userType ||
                         'user';

        const isAdmin = userRole === 'admin' || userRole === 'superadmin';
        const userType = isAdmin ? 'admin_idon' : (userData.userType || userRole);

        setUser({
          ...userData,
          role: userRole,
          userType: userType,
          roleCode: userRole
        });
        
        setToken(newToken);
        setAuthToken(newToken);
        
        if (rt) {
          setRefreshToken(rt);
        }
        
        setIsAuthenticated(true);
        
        const businessList = bizList || [];
        setBusinesses(businessList);

        
        const hasMultipleBusinesses = businessList.length > 1;
        const finalRequiresSelection = requiresBusinessSelection || hasMultipleBusinesses;
        
        setRequiresBusinessSelection(finalRequiresSelection);
        
        if (userData.businessId) {
          const schemaName = userData.schemaName || sessionStorage.getItem('schema_name');
          setBusinessContext(userData.businessId, schemaName);
          setSelectedBusiness({
            id: userData.businessId,
            schemaName: schemaName
          });
        }
        
        scheduleTokenRefresh();
        
        return { 
          success: true, 
          user: { ...userData, requiresBusinessSelection: finalRequiresSelection },
          businesses: businessList,
          requiresBusinessSelection: finalRequiresSelection
        };
      }
      
      return { success: false, error: 'Formato de respuesta inválido' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.response?.data?.error || error.message || 'Error en el login' 
      };
    }
  };

  // ─── LOGOUT ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Silently handle
    } finally {
      clearSession();
      window.location.href = '/login';
    }
  }, [clearSession]);

  // ─── SELECT BUSINESS ────────────────────────────────────────────────────
  const selectBusiness = useCallback(async (businessId) => {
    try {
      const token = getCurrentToken();
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const response = await api.post('/auth/select-business', { businessId }, { headers });
      
      if (response.data?.success === true && response.data?.data) {
        const { token: newToken, user: userData, refreshToken: rt } = response.data.data;
        
        let roleFromToken = null;
        if (newToken) {
          try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            roleFromToken = payload.roleCode || payload.role || payload.userType;
          } catch {
            // Silently handle
          }
        }
        
        const userRole = roleFromToken || userData.role || userData.userType || 'user';
        const isAdmin = userRole === 'admin' || userRole === 'superadmin';
        const userType = isAdmin ? 'admin_idon' : (userData.userType || userRole);

        setToken(newToken);
        setAuthToken(newToken);
        
        if (rt) {
          setRefreshToken(rt);
        }
        
        setUser({
          ...userData,
          role: userRole,
          userType: userType,
          roleCode: userRole
        });
        
        setRequiresBusinessSelection(false);
        
        if (userData.businessId) {
          setBusinessContext(userData.businessId, userData.schemaName);
          setSelectedBusiness({ id: userData.businessId, schemaName: userData.schemaName });
        }
        
        return { success: true, user: userData };
      }

      return { success: false, error: 'Formato de respuesta inválido' };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Error seleccionando negocio';
      return { success: false, error: message };
    }
  }, []);

  // ─── Inicializar al montar ───────────────────────────────────────────
  useEffect(() => {
    const savedBusinessId = sessionStorage.getItem('business_id');
    const savedSchemaName = sessionStorage.getItem('schema_name');
    
    if (savedBusinessId) {
      setSelectedBusiness({
        id: savedBusinessId,
        schemaName: savedSchemaName
      });
      setBusinessContext(savedBusinessId, savedSchemaName);
    }
    
    loadSession();
    const handleAuthLogout = () => {
      clearSession();
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadSession, clearSession]);

  // ─── VALUE ──────────────────────────────────────────────────────────────
  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    businesses,
    requiresBusinessSelection,
    selectedBusiness,
    login,
    logout,
    selectBusiness,
    refreshToken,
    getToken: () => getCurrentToken(),
    setUser,
    setSelectedBusiness: (business) => {
      setSelectedBusiness(business);
      if (business && business.id) {
        setBusinessContext(business.id, business.schemaName || business.schema_name);
      } else {
        setBusinessContext(null, null);
      }
    },
    checkSession: async () => {
      try {
        const response = await api.get('/auth/me');
        return response.data?.ok === true;
      } catch {
        return false;
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#ff8c42',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
          Restaurando sesión...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};