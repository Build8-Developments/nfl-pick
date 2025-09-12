import React, { useState, useCallback } from 'react';
import { getUserAvatar } from '../../lib/avatarUtils';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onError?: () => void;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  className,
  onError,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const avatarUrl = getUserAvatar(src, fallback);
  const displayUrl = hasError ? getUserAvatar(fallback) : avatarUrl;

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {isLoading && (
        <div className={cn(
          'absolute inset-0 bg-gray-200 animate-pulse rounded-full',
          sizeClasses[size]
        )} />
      )}
      <img
        src={displayUrl}
        alt={alt}
        className={cn(
          'rounded-full object-cover border-2 border-gray-200 transition-opacity duration-200',
          sizeClasses[size],
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
};

export default Avatar;
