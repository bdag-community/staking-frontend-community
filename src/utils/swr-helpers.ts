export interface PaginatedResponse {
  nextCursor?: string | null;
}

const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_SWR_RETRY_INTERVAL_MS = 30000;

export const isRetryableRequestError = (error: unknown) => {
  if (!(error instanceof Error)) return false;

  const statusMatch = error.message.match(/^Error (\d{3}):/);
  if (!statusMatch) return true;

  return RETRYABLE_HTTP_STATUS_CODES.has(Number(statusMatch[1]));
};

export const resilientSWRConfig = {
  revalidateOnFocus: false,
  shouldRetryOnError: true,
  onErrorRetry: (
    error: unknown,
    _key: unknown,
    _config: unknown,
    revalidate: (opts: { retryCount: number }) => void,
    opts: { retryCount: number },
  ) => {
    if (!isRetryableRequestError(error) || opts.retryCount > 2) return;

    const retryDelay = Math.min(
      5000 * 2 ** opts.retryCount,
      MAX_SWR_RETRY_INTERVAL_MS,
    );

    setTimeout(() => revalidate({ retryCount: opts.retryCount }), retryDelay);
  },
};

export const getCursorKey = (
  pageIndex: number,
  previousPageData: PaginatedResponse | null,
  baseEndpoint: string | null,
) => {
  if (!baseEndpoint) return null;

  if (previousPageData && !previousPageData.nextCursor) return null;

  if (pageIndex === 0) return baseEndpoint;

  const separator = baseEndpoint.includes("?") ? "&" : "?";
  return `${baseEndpoint}${separator}cursor=${previousPageData?.nextCursor}`;
};

type RequestApi<T> = (request: { endpoint: string }) => Promise<{
  success: boolean;
  data?: T;
  message: string;
}>;

export const swrFetcher = async <T>(requestApi: RequestApi<T>, endpoint: string) => {
  const { success, data, message } = await requestApi({ endpoint });
  if (!success) throw new Error(message);
  return data;
};

export const flattenPages = <T>(
  data: Array<object> | undefined,
  key: string,
): T[] => {
  return data
    ? data.reduce<T[]>((acc, page) => {
        const entries: unknown = Reflect.get(page, key);
        return Array.isArray(entries) ? [...acc, ...(entries as T[])] : acc;
      }, [])
    : [];
};
