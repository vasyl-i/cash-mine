import { ApiError } from '@/api/client';

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong.';
  switch (error.code) {
    case 'NETWORK':
      return 'Network error — check your connection.';
    case 'RATE_LIMITED':
      return 'Too many requests — please wait a moment.';
    case 'UNAUTHORIZED':
      return 'Your token is missing, invalid or expired.';
    case 'TIMEOUT':
      return 'The server took too long to respond.';
    case 'INVALID_RESPONSE':
      return 'Unexpected response from the server.';
    case 'SERVER':
      return 'Temporary server error.';
    default:
      return error.message;
  }
}

export const formatTime = (date: Date): string =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
