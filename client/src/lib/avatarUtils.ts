import { apiOrigin } from "./api";

// Avatar cache to prevent redundant API calls
const avatarCache = new Map<string, string>();
const defaultAvatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";

/**
 * Computes the correct avatar URL for display
 * @param raw - The raw avatar string from the database
 * @returns The properly formatted avatar URL
 */
export const computeAvatarUrl = (raw?: string): string => {
  if (!raw) return defaultAvatar;
  
  // Check cache first
  if (avatarCache.has(raw)) {
    return avatarCache.get(raw)!;
  }
  
  let avatarUrl: string;
  
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    avatarUrl = raw;
  } else {
    // In development, use relative URLs so Vite proxy can handle them
    // In production, use the full API origin
    const isDevelopment = import.meta.env.MODE === "development";
    
    if (raw.startsWith("/uploads")) {
      avatarUrl = isDevelopment ? raw : `${apiOrigin}${raw}`;
    } else if (raw.startsWith("uploads/")) {
      avatarUrl = isDevelopment ? `/${raw}` : `${apiOrigin}/${raw}`;
    } else if (!raw.includes("/")) {
      // If it's just a filename, assume it's in the uploads/avatars directory
      avatarUrl = isDevelopment ? `/uploads/avatars/${raw}` : `${apiOrigin}/uploads/avatars/${raw}`;
    } else {
      avatarUrl = raw;
    }
  }
  
  // Cache the result
  avatarCache.set(raw, avatarUrl);
  return avatarUrl;
};

/**
 * Batch fetch and cache multiple avatars
 * @param avatars - Array of raw avatar strings
 * @returns Map of raw avatar to computed URL
 */
export const batchComputeAvatarUrls = (avatars: (string | undefined)[]): Map<string, string> => {
  const result = new Map<string, string>();
  
  avatars.forEach(avatar => {
    if (avatar) {
      result.set(avatar, computeAvatarUrl(avatar));
    }
  });
  
  return result;
};

/**
 * Preload avatars to improve performance
 * @param avatars - Array of raw avatar strings
 */
export const preloadAvatars = async (avatars: (string | undefined)[]): Promise<void> => {
  const uniqueAvatars = [...new Set(avatars.filter(Boolean))];
  
  const preloadPromises = uniqueAvatars.map(avatar => {
    const url = computeAvatarUrl(avatar);
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Don't fail on error, just continue
      img.src = url;
    });
  });
  
  await Promise.all(preloadPromises);
};

/**
 * Get user avatar with fallback
 * @param avatar - Raw avatar string
 * @param fallback - Optional fallback URL
 * @returns Computed avatar URL
 */
export const getUserAvatar = (avatar?: string, fallback?: string): string => {
  if (avatar) {
    return computeAvatarUrl(avatar);
  }
  return fallback || defaultAvatar;
};

/**
 * Clear avatar cache (useful for testing or when avatars change)
 */
export const clearAvatarCache = (): void => {
  avatarCache.clear();
};
