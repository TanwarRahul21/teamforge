export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly fieldErrors: Record<string, string[]>;

  constructor({
    status,
    code,
    message,
    fieldErrors,
  }: {
    status: number;
    code?: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors ?? {};
  }
}

export class NetworkError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}
