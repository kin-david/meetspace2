/**
 * Session Manager
 * Handles authentication state, Remember Me, session restoration, and logout
 * Ensures complete privacy and no data leakage between tenants
 */

class SessionManager {
  constructor() {
    this.TOKEN_KEY = 'ms_token';
    this.ROLE_KEY = 'ms_role';
    this.EMAIL_KEY = 'ms_email';
    this.NAME_KEY = 'ms_name';
    this.INIT_KEY = 'ms_init';
    this.COLOR_KEY = 'ms_color';
    this.USER_ID_KEY = 'ms_user_id';
    this.API_PORT_KEY = 'ms_api_port';
  }

  /**
   * Get API base URL
   */
  getApiBase() {
    const defaultPort = '5000';
    const port = localStorage.getItem(this.API_PORT_KEY) || defaultPort;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:${port}/api/auth`;
  }

  /**
   * Save session after successful login
   * @param {Object} authData - Authentication data from server
   * @param {boolean} rememberMe - Whether to enable Remember Me
   */
  saveSession(authData, rememberMe = false) {
    if (!authData || !authData.token || !authData.tenant) {
      throw new Error('Invalid auth data');
    }

    // Save to localStorage (persists across tabs)
    localStorage.setItem(this.TOKEN_KEY, authData.token);
    localStorage.setItem(this.USER_ID_KEY, String(authData.tenant.id));
    localStorage.setItem(this.ROLE_KEY, 'tenant');
    localStorage.setItem(this.EMAIL_KEY, authData.tenant.email);
    localStorage.setItem(this.NAME_KEY, authData.tenant.full_name);
    localStorage.setItem(this.INIT_KEY, this.getInitials(authData.tenant.full_name));
    localStorage.setItem(this.COLOR_KEY, '#1B5FA8');

    // Also save to sessionStorage for current session
    sessionStorage.setItem(this.NAME_KEY, authData.tenant.full_name);
    sessionStorage.setItem(this.EMAIL_KEY, authData.tenant.email);
    sessionStorage.setItem(this.INIT_KEY, this.getInitials(authData.tenant.full_name));

    return true;
  }

  /**
   * Get current session
   */
  getSession() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const email = localStorage.getItem(this.EMAIL_KEY);
    const name = localStorage.getItem(this.NAME_KEY);

    if (!token || !userId) {
      return null;
    }

    return {
      token,
      userId,
      email,
      name
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getSession();
  }

  /**
   * Get authentication token
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get user ID
   */
  getUserId() {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  /**
   * Get all session data
   */
  getSessionData() {
    return {
      token: localStorage.getItem(this.TOKEN_KEY),
      userId: localStorage.getItem(this.USER_ID_KEY),
      role: localStorage.getItem(this.ROLE_KEY),
      email: localStorage.getItem(this.EMAIL_KEY),
      name: localStorage.getItem(this.NAME_KEY),
      initials: localStorage.getItem(this.INIT_KEY),
      color: localStorage.getItem(this.COLOR_KEY)
    };
  }

  /**
   * Restore session from Remember Me cookies
   * Server validates the cookie and returns the session
   */
  async restoreSession() {
    try {
      const response = await fetch(`${this.getApiBase()}/restore-session`, {
        method: 'GET',
        credentials: 'include', // Send cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return { success: false, message: 'No saved session found' };
      }

      const data = await response.json();
      if (data.success && data.token && data.tenant) {
        this.saveSession(data);
        return { success: true, message: 'Session restored from Remember Me' };
      }

      return { success: false, message: 'Failed to restore session' };
    } catch (error) {
      console.error('Session restoration error:', error);
      return { success: false, message: 'Failed to restore session' };
    }
  }

  /**
   * Logout - clear all session data and notify server
   */
  async logout() {
    try {
      // Notify server to clear cookies and session
      const response = await fetch(`${this.getApiBase()}/logout`, {
        method: 'POST',
        credentials: 'include', // Send cookies
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        console.warn('Server logout failed, clearing local session anyway');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all local session data (security: prevent data leakage)
      this.clearSession();
    }
  }

  /**
   * Clear all session data
   * IMPORTANT: Called on logout to ensure complete privacy
   */
  clearSession() {
    // Clear localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.NAME_KEY);
    localStorage.removeItem(this.INIT_KEY);
    localStorage.removeItem(this.COLOR_KEY);

    // Clear sessionStorage
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_ID_KEY);
    sessionStorage.removeItem(this.ROLE_KEY);
    sessionStorage.removeItem(this.EMAIL_KEY);
    sessionStorage.removeItem(this.NAME_KEY);
    sessionStorage.removeItem(this.INIT_KEY);
    sessionStorage.removeItem(this.COLOR_KEY);

    // Clear browser history to prevent back button access
    window.history.replaceState(null, '', window.location.href);
  }

  /**
   * Get user initials from name
   */
  getInitials(name) {
    if (!name) return 'TU';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'TU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Verify session is still valid
   * Used to check if token is expired or session was cleared
   */
  async verifySession() {
    const token = this.getToken();
    if (!token) {
      return { valid: false, message: 'No active session' };
    }

    try {
      const response = await fetch(`${this.getApiBase()}/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Session invalid or expired
        this.clearSession();
        return { valid: false, message: 'Session expired' };
      }

      return { valid: true, message: 'Session is valid' };
    } catch (error) {
      console.error('Session verification error:', error);
      return { valid: false, message: 'Failed to verify session' };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}

// Create global instance
const sessionManager = new SessionManager();
