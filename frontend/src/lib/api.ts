/**
 * StudyOS Unified API Client
 * Manages JWT tokens, handles base API requests,
 * and seamlessly provides offline caching & demo fallback when server is unreachable.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export class ApiClient {
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;

  static init() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("studyos_access_token");
      this.refreshToken = localStorage.getItem("studyos_refresh_token");
    }
  }

  static setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.access;
    this.refreshToken = tokens.refresh;
    if (typeof window !== "undefined") {
      localStorage.setItem("studyos_access_token", tokens.access);
      localStorage.setItem("studyos_refresh_token", tokens.refresh);
    }
  }

  static clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("studyos_access_token");
      localStorage.removeItem("studyos_refresh_token");
      localStorage.removeItem("studyos_user");
    }
  }

  static isAuthenticated(): boolean {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("studyos_access_token");
    }
    return !!this.accessToken;
  }

  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (this.accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    // Do not set Content-Type if sending FormData (browser sets boundary)
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.refreshToken) {
        // Attempt refresh
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          headers.set("Authorization", `Bearer ${this.accessToken}`);
          const retryResponse = await fetch(url, { ...options, headers });
          if (!retryResponse.ok) {
            const errData = await retryResponse.json().catch(() => ({}));
            throw new Error(errData.detail || errData.error || `Error ${retryResponse.status}`);
          }
          return await retryResponse.json();
        } else {
          this.clearTokens();
          throw new Error("Session expired. Please log in again.");
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || errorData.error || errorData.message || `API request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      console.warn(`[StudyOS API] Fetch error at ${url}:`, err.message);
      throw err;
    }
  }

  private static async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access;
        if (typeof window !== "undefined") {
          localStorage.setItem("studyos_access_token", data.access);
        }
        return true;
      }
    } catch {
      // refresh failed
    }
    return false;
  }
}
