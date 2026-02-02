export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  public status: number;
  public code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toErrorResponse(err: unknown): { status: number; body: any } {
  if (err instanceof ApiError) {
    return { status: err.status, body: { error: { code: err.code, message: err.message } } };
  }

  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "Internal server error" } }
  };
}
