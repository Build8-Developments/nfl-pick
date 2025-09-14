import { useCallback, useEffect, useState } from "react";
import {
  getUserAvatar,
  preloadAvatars,
  batchComputeAvatarUrls,
} from "../lib/avatarUtils";

/**
 * Custom hook for managing avatars with caching and preloading
 */
export const useAvatarService = () => {
  const [avatarCache, setAvatarCache] = useState<Map<string, string>>(
    new Map()
  );
  const [preloadedAvatars, setPreloadedAvatars] = useState<Set<string>>(
    new Set()
  );

  /**
   * Get avatar URL with caching
   */
  const getAvatar = useCallback(
    (avatar?: string, fallback?: string): string => {
      if (!avatar) return fallback || getUserAvatar();

      if (avatarCache.has(avatar)) {
        return avatarCache.get(avatar)!;
      }

      const url = getUserAvatar(avatar, fallback);
      setAvatarCache((prev) => new Map(prev).set(avatar, url));
      return url;
    },
    [avatarCache]
  );

  /**
   * Batch preload avatars
   */
  const preloadAvatarsBatch = useCallback(
    async (avatars: (string | undefined)[]): Promise<void> => {
      const uniqueAvatars = [...new Set(avatars.filter(Boolean))];
      const notPreloaded = uniqueAvatars.filter(
        (avatar) => !preloadedAvatars.has(avatar!)
      );

      if (notPreloaded.length === 0) return;

      try {
        await preloadAvatars(notPreloaded);
        setPreloadedAvatars(
          (prev) =>
            new Set([...prev, ...notPreloaded.filter(Boolean)]) as Set<string>
        );

        // Update cache with preloaded avatars
        const newCache = batchComputeAvatarUrls(notPreloaded);
        setAvatarCache((prev) => new Map([...prev, ...newCache]));
      } catch (error) {
        console.error("Error preloading avatars:", error);
      }
    },
    [preloadedAvatars]
  );

  /**
   * Get multiple avatars efficiently
   */
  const getAvatars = useCallback(
    (avatars: (string | undefined)[]): Map<string, string> => {
      const result = new Map<string, string>();

      avatars.forEach((avatar) => {
        if (avatar) {
          result.set(avatar, getAvatar(avatar));
        }
      });

      return result;
    },
    [getAvatar]
  );

  /**
   * Clear cache (useful for testing or when avatars change)
   */
  const clearCache = useCallback(() => {
    setAvatarCache(new Map());
    setPreloadedAvatars(new Set());
  }, []);

  return {
    getAvatar,
    preloadAvatarsBatch,
    getAvatars,
    clearCache,
    isPreloaded: (avatar: string) => preloadedAvatars.has(avatar),
    cacheSize: avatarCache.size,
  };
};

/**
 * Hook for managing user avatars specifically
 */
export const useUserAvatars = (users: Array<{ avatar?: string }>) => {
  const avatarService = useAvatarService();

  // Preload avatars when users change
  useEffect(() => {
    if (users.length > 0) {
      const avatars = users.map((user) => user.avatar);
      avatarService.preloadAvatarsBatch(avatars);
    }
  }, [users, avatarService]);

  const getUserAvatar = useCallback(
    (avatar?: string) => {
      return avatarService.getAvatar(avatar);
    },
    [avatarService]
  );

  return {
    getUserAvatar,
    preloadAvatars: avatarService.preloadAvatarsBatch,
    clearCache: avatarService.clearCache,
    isPreloaded: avatarService.isPreloaded,
    cacheSize: avatarService.cacheSize,
  };
};
