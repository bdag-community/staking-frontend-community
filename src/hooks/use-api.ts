"use client";

import { useCallback } from "react";
import { apiMethods } from "@/config/apiEndpoints";

import { ENV_CONSTANTS } from "@/utils/constants";
import { networkParamsTypes } from "@/utils/interface";

// Read endpoints perform paced, validated chain queries; writes retain their
// shorter deadline and are never automatically resubmitted.
const READ_REQUEST_TIMEOUT_MS = 25000;
const WRITE_REQUEST_TIMEOUT_MS = 8000;
const MAX_REQUEST_ATTEMPTS = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getRetryDelay = (attempt: number) => {
  const baseDelay = Math.min(1000 * 2 ** attempt, 10000);
  return baseDelay + Math.floor(Math.random() * 500);
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const isRetryableError = (error: unknown) =>
  isAbortError(error) || error instanceof TypeError;

const shouldRetryRequest = (
  method: string,
  attempt: number,
  response?: Response,
  error?: unknown,
) => {
  if (attempt >= MAX_REQUEST_ATTEMPTS - 1) return false;

  const isReadOnlyMethod = method === apiMethods.GET;
  if (!isReadOnlyMethod) return false;

  if (response) return RETRYABLE_STATUS_CODES.has(response.status);
  return isRetryableError(error);
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const useNetworkRequest = () => {
  const requestApi = useCallback(
    async ({ endpoint, method, body, headers, url }: networkParamsTypes) => {
      const finalHeaders = {
        ...headers,
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      const requestMethod = method || apiMethods.GET;
      const requestUrl = url || ENV_CONSTANTS.apiBaseUrl + endpoint;

      for (let attempt = 0; attempt < MAX_REQUEST_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          requestMethod === apiMethods.GET
            ? READ_REQUEST_TIMEOUT_MS
            : WRITE_REQUEST_TIMEOUT_MS,
        );

        try {
          const response = await fetch(requestUrl, {
            method: requestMethod,
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
          const responseData = await parseResponseBody(response);

          if (!response.ok) {
            if (shouldRetryRequest(requestMethod, attempt, response)) {
              await sleep(getRetryDelay(attempt));
              continue;
            }

            return {
              success: false,
              message: `Error ${response.status}: ${
                typeof responseData === "object" && responseData?.message
                  ? responseData.message
                  : response.statusText || "Internal Server Error"
              }`,
            };
          }

          return {
            success: responseData?.success ?? true,
            data: (responseData && Object.prototype.hasOwnProperty.call(responseData, "data") ? responseData.data : responseData),
            headers: { totalCount: response.headers.get("total") },
            message: responseData?.message || "Success",
          };
        } catch (error: unknown) {
          if (shouldRetryRequest(requestMethod, attempt, undefined, error)) {
            await sleep(getRetryDelay(attempt));
            continue;
          }

          let errorMessage;

          if (isAbortError(error)) {
            errorMessage =
              "The staking service is still catching up. Please try again shortly.";
          } else if (error instanceof Error) {
            errorMessage = error.message;
          } else {
            errorMessage = "An unexpected error occurred";
          }

          return {
            success: false,
            message: errorMessage,
          };
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      return {
        success: false,
        message:
          "The staking service is taking longer than expected. Please try again shortly.",
      };
    },
    [],
  );

  return requestApi;
};

export default useNetworkRequest;
