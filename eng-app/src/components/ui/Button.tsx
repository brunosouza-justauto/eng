import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';

// Define the variants, sizes, and colors available
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonColor = 'indigo' | 'green' | 'red' | 'gray';

// Props specific to our Button component
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

// Define props for when Button is rendered as a Link
export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
}

// Style maps for button variants
const variantStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
  primary: {
    indigo: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700',
    green: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700',
    red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700',
    gray: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700',
  },
  secondary: {
    indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
    green: 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-300 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50',
    red: 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-300 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
    gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
  },
  outline: {
    indigo: 'border border-indigo-500 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-300 dark:text-indigo-400 dark:border-indigo-600 dark:hover:bg-indigo-900/20',
    green: 'border border-green-500 text-green-600 hover:bg-green-50 focus:ring-green-300 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/20',
    red: 'border border-red-500 text-red-600 hover:bg-red-50 focus:ring-red-300 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20',
    gray: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700',
  },
  text: {
    indigo: 'text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-300 dark:text-indigo-400 dark:hover:bg-indigo-900/20',
    green: 'text-green-600 hover:bg-green-50 focus:ring-green-300 dark:text-green-400 dark:hover:bg-green-900/20',
    red: 'text-red-600 hover:bg-red-50 focus:ring-red-300 dark:text-red-400 dark:hover:bg-red-900/20',
    gray: 'text-gray-700 hover:bg-gray-50 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700',
  },
};

// Style maps for button sizes
const sizeStyles: Record<ButtonSize, string> = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-2.5 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

// Base styles applied to all buttons
const baseStyles = 'inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed';

// The Button component
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      color = 'indigo',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Build the button's classes
    const buttonClasses = [
      baseStyles,
      variantStyles[variant][color],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      disabled || loading ? 'opacity-70 cursor-not-allowed' : '',
      className
    ].join(' ').trim();

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="w-4 h-4 mr-2 -ml-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {icon && iconPosition === 'left' && !loading && <span className="mr-2">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
      </button>
    );
  }
);

// The ButtonLink component (renders as a react-router Link)
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      color = 'indigo',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled = false,
      to,
      ...props
    },
    ref
  ) => {
    // Build the button's classes
    const buttonClasses = [
      baseStyles,
      variantStyles[variant][color],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      disabled || loading ? 'opacity-70 pointer-events-none' : '',
      className
    ].join(' ').trim();

    if (disabled) {
      return (
        <span
          className={buttonClasses}
          aria-disabled="true"
        >
          {loading && (
            <svg className="w-4 h-4 mr-2 -ml-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {icon && iconPosition === 'left' && !loading && <span className="mr-2">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
        </span>
      );
    }

    return (
      <Link
        ref={ref}
        to={to}
        className={buttonClasses}
        {...props}
      >
        {loading && (
          <svg className="w-4 h-4 mr-2 -ml-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {icon && iconPosition === 'left' && !loading && <span className="mr-2">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
      </Link>
    );
  }
);

Button.displayName = 'Button';
ButtonLink.displayName = 'ButtonLink';

export default Button; 