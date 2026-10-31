export type ApiErrorCode = 'offline' | 'server' | 'timeout' | 'not_found' | 'validation' | 'out_of_stock' | 'aborted'

/** Error shape every API call rejects with — UI maps `code` to a message + recovery action. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly retryable: boolean
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ApiError'
    this.code = code
    this.retryable = code === 'server' || code === 'timeout'
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError
