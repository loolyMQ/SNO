import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({
  className = '',
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const baseClasses = 'bg-white rounded-lg';
  
  const variantClasses = {
    default: 'shadow-sm border border-gray-200',
    outlined: 'border-2 border-gray-300',
    elevated: 'shadow-lg border border-gray-100',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}