export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validatePagination(page: number, limit: number): { page: number; limit: number } {
  const validPage = Math.max(1, Math.floor(page) || 1);
  const validLimit = Math.min(100, Math.max(1, Math.floor(limit) || 10));
  return { page: validPage, limit: validLimit };
}
