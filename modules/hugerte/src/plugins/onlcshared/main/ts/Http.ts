import { Obj, Type } from '@ephox/katamari';

/**
 * Minimal json/multipart http client shared by the ONLC plugins.
 * It is deliberately based on `fetch` only, so that the plugins stay dependency free.
 */

export interface HttpRequest {
  readonly url: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string | number | boolean | undefined>;
  readonly body?: Record<string, unknown> | FormData;
  readonly credentials?: RequestCredentials;
  readonly signal?: AbortSignal;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  public constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

const appendParams = (url: string, params: Record<string, string | number | boolean | undefined> | undefined): string => {
  if (!Type.isNonNullable(params)) {
    return url;
  }
  const search: string[] = [];
  Obj.each(params, (value, key) => {
    if (Type.isNonNullable(value)) {
      search.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  });
  if (search.length === 0) {
    return url;
  }
  return url + (url.indexOf('?') === -1 ? '?' : '&') + search.join('&');
};

const isFormData = (body: unknown): body is FormData =>
  Type.isNonNullable(body) && typeof FormData !== 'undefined' && body instanceof FormData;

const readPayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.indexOf('json') !== -1) {
    return response.json().catch(() => null);
  } else {
    return response.text().catch(() => null);
  }
};

const errorMessage = (payload: unknown, status: number): string => {
  if (Type.isObject(payload)) {
    const record = payload as Record<string, unknown>;
    const error = record.error;
    if (Type.isString(record.message)) {
      return record.message;
    } else if (Type.isString(error)) {
      return error;
    } else if (Type.isObject(error) && Type.isString((error as Record<string, unknown>).message)) {
      return (error as Record<string, unknown>).message as string;
    }
  } else if (Type.isString(payload) && payload.length > 0 && payload.length < 400) {
    return payload;
  }
  return `Requête refusée (${status})`;
};

/**
 * Performs a request and resolves with the parsed json body. Rejects with an `HttpError`
 * carrying the status and the payload returned by the server.
 */
const request = async <T>(spec: HttpRequest): Promise<T> => {
  const headers: Record<string, string> = { Accept: 'application/json', ...spec.headers };
  const hasJsonBody = Type.isNonNullable(spec.body) && !isFormData(spec.body);

  if (hasJsonBody && !Obj.has(headers, 'Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(appendParams(spec.url, spec.params), {
    method: spec.method ?? 'GET',
    headers,
    credentials: spec.credentials ?? 'same-origin',
    signal: spec.signal,
    body: isFormData(spec.body) ? spec.body : (hasJsonBody ? JSON.stringify(spec.body) : undefined)
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new HttpError(errorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
};

export {
  appendParams,
  request
};
