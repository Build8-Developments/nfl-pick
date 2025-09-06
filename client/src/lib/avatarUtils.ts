import { apiOrigin } from "./api";

/**
 * Computes the correct avatar URL for display
 * @param raw - The raw avatar string from the database
 * @returns The properly formatted avatar URL
 */
export const computeAvatarUrl = (raw?: string): string => {
  const placeholder = "https://placehold.co/64x64";
  if (!raw) return placeholder;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  
  // In development, use relative URLs so Vite proxy can handle them
  // In production, use the full API origin
  const isDevelopment = import.meta.env.MODE === "development";
  
  if (raw.startsWith("/uploads")) {
    return isDevelopment ? raw : `${apiOrigin}${raw}`;
  }
  if (raw.startsWith("uploads/")) {
    return isDevelopment ? `/${raw}` : `${apiOrigin}/${raw}`;
  }
  // If it's just a filename, assume it's in the uploads/avatars directory
  if (!raw.includes("/")) {
    return isDevelopment ? `/uploads/avatars/${raw}` : `${apiOrigin}/uploads/avatars/${raw}`;
  }
  return raw;
};
