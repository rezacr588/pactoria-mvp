import React from 'react';
import { classNames } from '../../../utils/classNames';
import { SkeletonProps } from './types';
import { baseClasses, animationClasses, variantClasses, defaultSizes, getSizeStyles } from './utils';

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  animation = 'pulse',
  width,
  height,
  lines = 1,
}) => {
  const sizeStyles = getSizeStyles(width, height);

  if (variant === 'text' && lines > 1) {
    return (
      <div className={classNames('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={classNames(
              baseClasses,
              animationClasses[animation],
              variantClasses[variant],
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={{
              height: height ? (typeof height === 'number' ? `${height}px` : height) : '1rem',
              width: index === lines - 1 ? '75%' : (width ? (typeof width === 'number' ? `${width}px` : width) : undefined)
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={classNames(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={{
        ...defaultSizes[variant],
        ...sizeStyles
      }}
    />
  );
};

export default Skeleton;