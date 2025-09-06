// Centralized API client for frontend
// Base URL depends on NODE_ENV

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiClientOptions = {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
};

export type ApiRequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
};

const resolveBaseUrl = (override?: string) => {
  if (override) return ensureTrailingSlash(override);
  const env = import.meta.env.MODE || process.env.NODE_ENV || "development";
  // Use Vite proxy in development, direct URL in production
  const devUrl = "/api/v1/"; // Vite proxy will handle this
  const prodUrl = "https://api.blockhaven.net/api/v1/";
  return ensureTrailingSlash(env === "development" ? devUrl : prodUrl);
};

const ensureTrailingSlash = (url: string) =>
  url.endsWith("/") ? url : `${url}/`;

const buildQueryString = (query?: ApiRequestOptions["query"]) => {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.defaultHeaders = options.defaultHeaders ?? {
      "Content-Type": "application/json",
    };
  }

  async request<TResponse = unknown>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<TResponse> {
    const url = this.composeUrl(path, options.query);
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers ?? {}),
    };

    const method: HttpMethod = options.method ?? "GET";
    const fetchInit: RequestInit = {
      method,
      headers,
      signal: options.signal,
      credentials: "include", // Include cookies in requests
    };
    if (options.body !== undefined && method !== "GET") {
      // If body is FormData, let the browser set the correct Content-Type with boundary
      const isFormData =
        typeof FormData !== "undefined" && options.body instanceof FormData;
      if (isFormData) {
        // Remove any explicit content-type header to avoid boundary issues
        if (headers["Content-Type"]) {
          delete headers["Content-Type"];
        }
        fetchInit.headers = headers;
        fetchInit.body = options.body as BodyInit;
      } else {
        fetchInit.body =
          headers["Content-Type"] === "application/json"
            ? JSON.stringify(options.body)
            : (options.body as BodyInit);
      }
    }

    const res = await fetch(url, fetchInit);
    const isJson = res.headers
      .get("content-type")
      ?.includes("application/json");
    if (!res.ok) {
      const errorPayload = isJson
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");
      const message =
        typeof errorPayload === "string" && errorPayload
          ? errorPayload
          : errorPayload?.message ?? `Request failed with status ${res.status}`;
      const error = new Error(message) as Error & {
        status?: number;
        details?: unknown;
      };
      error.status = res.status;
      error.details = errorPayload;
      throw error;
    }

    const responseData = isJson
      ? await res.json()
      : ((await res.text()) as unknown);
    // Only log errors or when debugging is needed
    // console.log("[API CLIENT] Raw response data:", responseData);
    return responseData as TResponse;
  }

  async get<TResponse = unknown>(
    path: string,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    const data = await this.request<TResponse>(path, {
      ...options,
      method: "GET",
    });
    return data;
  }

  post<TResponse = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return this.request<TResponse>(path, { ...options, method: "POST", body });
  }

  put<TResponse = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return this.request<TResponse>(path, { ...options, method: "PUT", body });
  }

  patch<TResponse = unknown>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return this.request<TResponse>(path, { ...options, method: "PATCH", body });
  }

  delete<TResponse = unknown>(
    path: string,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) {
    return this.request<TResponse>(path, { ...options, method: "DELETE" });
  }

  private composeUrl(path: string, query?: ApiRequestOptions["query"]) {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}${cleanPath}${buildQueryString(query)}`;
  }
}

// Singleton instance for app usage
export const apiClient = new ApiClient({
  // No need for token-based auth since we're using session cookies
});

// Origin (protocol + host + port) of the API, useful for resolving absolute asset URLs
export const apiOrigin: string = (() => {
  const baseUrl = resolveBaseUrl();
  // If it's a relative URL (starts with /), use window.location.origin
  if (baseUrl.startsWith('/')) {
    return window.location.origin;
  }
  // If it's an absolute URL, extract the origin
  return new URL(baseUrl).origin;
})();

// Dashboard-specific API functions
export const dashboardApi = {
  // Get dashboard summary data
  getSummary: () =>
    apiClient.get<{
      success: boolean;
      data: {
        totalUsers: number;
        totalPicks: number;
        upcomingGames: Array<{
          gameID: string;
          gameWeek: string;
          home: string;
          away: string;
          gameDate: string;
          gameTime: string;
        }>;
      };
    }>("dashboard"),

  // Get user's pick for a specific week
  getMyPick: (week: number) =>
    apiClient.get<{
      success: boolean;
      data: {
        selections: Record<string, string>;
        lockOfWeek?: string;
        touchdownScorer?: string;
        touchdownScorerName?: string;
        propBet?: string;
        isFinalized?: boolean;
      } | null;
    }>(`picks/${week}`),

  // Get leaderboard data
  getLeaderboard: () =>
    apiClient.get<{
      success: boolean;
      data: Array<{
        user: string;
        wins: number;
        losses: number;
        winPct: number;
      }>;
    }>("leaderboard"),

  // Get all picks for a specific week (for admin or public viewing)
  getAllPicksForWeek: (week: number) =>
    apiClient.get<{
      success: boolean;
      data: Array<{
        user: string;
        selections: Record<string, string>;
        lockOfWeek?: string;
        touchdownScorer?: string;
        propBet?: string;
        isFinalized?: boolean;
      }>;
    }>(`picks/all/${week}`),

  // Get weeks with finalized picks
  getWeeksWithFinalizedPicks: () =>
    apiClient.get<{ success: boolean; data: number[] }>("picks/weeks"),

  // Get player info by ID
  getPlayerById: (playerId: string) =>
    apiClient.get<{
      success: boolean;
      data: {
        playerID: string;
        longName: string;
        espnName: string;
        cbsLongName: string;
        team: string;
        pos: string;
      } | null;
    }>(`players/${playerId}`),
};
