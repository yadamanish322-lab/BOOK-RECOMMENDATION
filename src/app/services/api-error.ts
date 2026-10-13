import { HttpErrorResponse } from "@angular/common/http";

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return "The server could not be reached. Start the project server and try again.";
    }
    const serverMessage = typeof error.error?.error === "string" ? error.error.error : "";
    return serverMessage || `The request failed (${error.status}).`;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
