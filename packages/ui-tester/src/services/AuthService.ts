interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Service for handling authentication and JWT tokens
 */
export class AuthService {
  private static instance: AuthService;
  private token: AuthToken | null = null;

  // Use session storage to avoid XSS vulnerabilities with localStorage
  private readonly TOKEN_KEY = 'auth_token';

  private constructor() {
    this.loadTokenFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Set the authentication token
   */
  public setToken(token: AuthToken): void {
    this.token = token;

    // Save to session storage
    sessionStorage.setItem(this.TOKEN_KEY, JSON.stringify(token));
  }

  /**
   * Get the current authentication token
   */
  public getToken(): AuthToken | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    if (!this.token) {
      return false;
    }

    // Check token expiration if available
    if (this.token.expiresAt && this.token.expiresAt < Date.now()) {
      this.clearToken();
      return false;
    }

    return true;
  }

  /**
   * Clear authentication token (logout)
   */
  public clearToken(): void {
    this.token = null;
    sessionStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Get the Authorization header
   */
  public getAuthHeader(): Record<string, string> {
    if (!this.isAuthenticated() || !this.token) {
      return {};
    }

    return {
      'Authorization': `Bearer ${this.token.accessToken}`
    };
  }

  /**
   * Load token from session storage
   */
  private loadTokenFromStorage(): void {
    const tokenStr = sessionStorage.getItem(this.TOKEN_KEY);
    if (tokenStr) {
      try {
        this.token = JSON.parse(tokenStr);
      } catch (error) {
        console.error('Failed to parse token from session storage:', error);
        this.clearToken();
      }
    }
  }

  /**
   * Process login response and extract token
   */
  public processLoginResponse(response: any): AuthToken | null {
    // Check if response contains a token
    if (!response || !response.data || !response.data.accessToken) {
      return null;
    }

    const token: AuthToken = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: response.data.expiresIn
        ? Date.now() + (response.data.expiresIn * 1000)
        : undefined
    };

    this.setToken(token);
    return token;
  }
}
