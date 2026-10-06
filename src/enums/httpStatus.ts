/**
 * Enum per i codici di stato HTTP (HTTP Status Codes).
 * Elimina i "magic numbers" (es. 200, 201, 400, ecc.) nei controller e nei middleware.
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

// Alias comune
export const HttpStatusCode = HttpStatus;
export type HttpStatusCode = HttpStatus;
