/**
 * Token Manager - Centralizado
 * 
 * Maneja TODAS las operaciones de tokens.
 * Usa UNA SOLA clave: 'authToken'
 * 
 * Esto reemplaza:
 * - idonToken
 * - token
 * - access_token
 * - authToken
 */

const TOKEN_KEY = 'authToken';
const USER_KEY = 'idonUser';
const BUSINESS_KEY = 'selectedBusiness';

export const TokenManager = {
  // ── GETTER ──
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  getBusiness() {
    try {
      const business = localStorage.getItem(BUSINESS_KEY);
      return business ? JSON.parse(business) : null;
    } catch {
      return null;
    }
  },

  // ── SETTER ──
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },

  setBusiness(business) {
    if (business) {
      localStorage.setItem(BUSINESS_KEY, JSON.stringify(business));
    } else {
      localStorage.removeItem(BUSINESS_KEY);
    }
  },

  // ── CLEAR ──
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(BUSINESS_KEY);
  },

  // ── VERIFICACIÓN ──
  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  },

  // ── JWT DECODE ──
  decodeToken(token) {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  },

  getTokenExpiration(token) {
    const payload = this.decodeToken(token);
    if (!payload?.exp) return null;
    return payload.exp * 1000; // Convert to milliseconds
  },

  isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return false;
    return Date.now() >= expiration;
  },

  getTokenTimeRemaining(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return 0;
    return Math.max(0, expiration - Date.now());
  },
};

export default TokenManager;
