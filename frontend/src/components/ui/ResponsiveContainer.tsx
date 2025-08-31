import React from 'react';
import { useResponsive, Breakpoint } from '../../hooks/useResponsive';
import { classNames } from '../../utils/classNames';

export interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: Breakpoint | 'none' | 'full';
  padding?: boolean | Breakpoint;
  margin?: boolean | Breakpoint;
  center?: boolean;
  fluid?: boolean;
  children: React.ReactNode;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  maxWidth = 'lg',
  padding = true,
  margin = false,
  center = true,
  fluid = false,
  className,
  children,
  ...props
}) => {
  const { isMobile, isTablet } = useResponsive();

  const getMaxWidthClass = () => {
    if (fluid) return 'w-full';
    
    switch (maxWidth) {
      case 'xs':
        return 'max-w-xs';
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-4xl';
      case 'xl':
        return 'max-w-5xl';
      case '2xl':
        return 'max-w-7xl';
      case 'full':
        return 'max-w-full';
      case 'none':
        return '';
      default:
        return 'max-w-4xl';
    }
  };

  const getPaddingClass = () => {
    if (padding === false) return '';
    
    if (padding === true) {
      if (isMobile) return 'px-4 py-4';
      if (isTablet) return 'px-6 py-6';
      return 'px-8 py-8';
    }
    
    switch (padding) {
      case 'xs':
        return 'px-2 py-2';
      case 'sm':
        return 'px-4 py-4';
      case 'md':
        return 'px-6 py-6';
      case 'lg':
        return 'px-8 py-8';
      case 'xl':
        return 'px-10 py-10';
      case '2xl':
        return 'px-12 py-12';
      default:
        return 'px-4 py-4';
    }
  };

  const getMarginClass = () => {
    if (margin === false) return '';
    
    if (margin === true) {
      return 'mx-auto';
    }
    
    switch (margin) {
      case 'xs':
        return 'mx-2';
      case 'sm':
        return 'mx-4';
      case 'md':
        return 'mx-6';
      case 'lg':
        return 'mx-8';
      case 'xl':
        return 'mx-10';
      case '2xl':
        return 'mx-12';
      default:
        return 'mx-auto';
    }
  };

  return (
    <div
      className={classNames(
        'w-full',
        getMaxWidthClass(),
        getPaddingClass(),
        center && getMarginClass(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Grid responsive component
export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  children: React.ReactNode;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = { xs: 4, sm: 6 },
  className,
  children,
  ...props
}) => {
  const getGridClasses = () => {
    const classes = ['grid'];
    
    // Add column classes
    if (columns.xs) classes.push(`grid-cols-${columns.xs}`);
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
    if (columns['2xl']) classes.push(`2xl:grid-cols-${columns['2xl']}`);
    
    // Add gap classes
    if (gap.xs) classes.push(`gap-${gap.xs}`);
    if (gap.sm) classes.push(`sm:gap-${gap.sm}`);
    if (gap.md) classes.push(`md:gap-${gap.md}`);
    if (gap.lg) classes.push(`lg:gap-${gap.lg}`);
    if (gap.xl) classes.push(`xl:gap-${gap.xl}`);
    if (gap['2xl']) classes.push(`2xl:gap-${gap['2xl']}`);
    
    return classes.join(' ');
  };

  return (
    <div
      className={classNames(getGridClasses(), className)}
      {...props}
    >
      {children}
    </div>
  );
};

// Show/Hide based on breakpoint
export interface ResponsiveShowProps {
  above?: Breakpoint;
  below?: Breakpoint;
  only?: Breakpoint[];
  children: React.ReactNode;
}

export const ResponsiveShow: React.FC<ResponsiveShowProps> = ({
  above,
  below,
  only,
  children,
}) => {
  const { breakpoint } = useResponsive();
  
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  let shouldShow = true;
  
  if (above) {
    const aboveIndex = breakpointOrder.indexOf(above);
    shouldShow = shouldShow && currentIndex >= aboveIndex;
  }
  
  if (below) {
    const belowIndex = breakpointOrder.indexOf(below);
    shouldShow = shouldShow && currentIndex <= belowIndex;
  }
  
  if (only) {
    shouldShow = shouldShow && only.includes(breakpoint);
  }
  
  if (!shouldShow) return null;
  
  return <>{children}</>;
};

// Responsive text component
export interface ResponsiveTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  size?: {
    xs?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
    sm?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
    md?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
    lg?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
    xl?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
    '2xl'?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  };
  weight?: {
    xs?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
    sm?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
    md?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
    lg?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
    xl?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
    '2xl'?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
  };
  children: React.ReactNode;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  as: Component = 'div',
  size,
  weight,
  className,
  children,
  ...props
}) => {
  const getTextClasses = () => {
    const classes = [];
    
    // Add size classes
    if (size?.xs) classes.push(`text-${size.xs}`);
    if (size?.sm) classes.push(`sm:text-${size.sm}`);
    if (size?.md) classes.push(`md:text-${size.md}`);
    if (size?.lg) classes.push(`lg:text-${size.lg}`);
    if (size?.xl) classes.push(`xl:text-${size.xl}`);
    if (size?.['2xl']) classes.push(`2xl:text-${size['2xl']}`);
    
    // Add weight classes
    if (weight?.xs) classes.push(`font-${weight.xs}`);
    if (weight?.sm) classes.push(`sm:font-${weight.sm}`);
    if (weight?.md) classes.push(`md:font-${weight.md}`);
    if (weight?.lg) classes.push(`lg:font-${weight.lg}`);
    if (weight?.xl) classes.push(`xl:font-${weight.xl}`);
    if (weight?.['2xl']) classes.push(`2xl:font-${weight['2xl']}`);
    
    return classes.join(' ');
  };

  return React.createElement(
    Component,
    {
      className: classNames(getTextClasses(), className),
      ...props,
    },
    children
  );
};

export default ResponsiveContainer;