import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export function Input({
  className = '',
  variant = 'default',
  size = 'md',
  ...props
}: InputProps) {
  const baseClasses = 'border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  
  const variantClasses = {
    default: 'border-gray-300',
    error: 'border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:ring-green-500',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  return (
    <input
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}