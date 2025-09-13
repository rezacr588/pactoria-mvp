export const baseClasses = 'bg-neutral-200 dark:bg-secondary-700';

export const animationClasses = {
  pulse: 'animate-pulse',
  wave: 'animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-secondary-700 dark:via-secondary-600 dark:to-secondary-700 bg-[length:400%_100%]',
  none: ''
};

export const variantClasses = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: '',
  rounded: 'rounded-lg'
};

export const defaultSizes = {
  text: { height: '1rem' },
  circular: { width: '2rem', height: '2rem' },
  rectangular: { width: '100%', height: '8rem' },
  rounded: { width: '100%', height: '8rem' }
};

export const getSizeStyles = (width?: string | number, height?: string | number) => ({
  width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
  height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
});