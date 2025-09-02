// Centralized API client for frontend
// Base URL depends on NODE_ENV

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiClientOptions = {
  baseUrl?: string;
  getToken?: () => string | null | undefined;
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
  // Per requirement: use http://localhost:3000/api/v1/ for both dev and prod for now
  const devUrl = "http://localhost:3000/api/v1/";
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
  private getToken?: ApiClientOptions["getToken"];
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.getToken = options.getToken;
    this.defaultHeaders = options.defaultHeaders ?? {
      "Content-Type": "application/json",
    };
  }

  async request<TResponse = unknown>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<TResponse> {
    const url = this.composeUrl(path, options.query);
    const token = this.getToken?.();
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const method: HttpMethod = options.method ?? "GET";
    const fetchInit: RequestInit = {
      method,
      headers,
      signal: options.signal,
    };
    if (options.body !== undefined && method !== "GET") {
      fetchInit.body =
        headers["Content-Type"] === "application/json"
          ? JSON.stringify(options.body)
          : (options.body as BodyInit);
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

    return (
      isJson ? await res.json() : ((await res.text()) as unknown)
    ) as TResponse;
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
  getToken: () => {
    try {
      const raw = localStorage.getItem("auth-token");
      return raw ?? null;
    } catch {
      return null;
    }
  },
});
