import { ENV } from "@/config/env";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          data: null,
          message: `API Error ${response.status}: ${response.statusText}`,
        };
      }

      const responseData = await response.json();
      return {
        success: responseData?.success ?? true,
        data: (responseData && Object.prototype.hasOwnProperty.call(responseData, "data") ? responseData.data : responseData) as T,
        message: responseData?.message || "Success",
      };
    } catch (err: unknown) {
      return {
        success: false,
        data: null,
        message: err instanceof Error ? err.message : "An unexpected error occurred",
      };
    }
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          data: null,
          message: `API Error ${response.status}: ${response.statusText}`,
        };
      }

      const responseData = await response.json();
      return {
        success: responseData?.success ?? true,
        data: (responseData && Object.prototype.hasOwnProperty.call(responseData, "data") ? responseData.data : responseData) as T,
        message: responseData?.message || "Success",
      };
    } catch (err: unknown) {
      return {
        success: false,
        data: null,
        message: err instanceof Error ? err.message : "An unexpected error occurred",
      };
    }
  }
}

export const stakingApi = new ApiClient(ENV.STAKING_API_URL);
