import React from 'react';

export interface AlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
};

const variantIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅',
};

export const Alert: React.FC<AlertProps> = ({ variant = 'info', children, className = '' }) => {
  return (
    <div className={`p-3 border rounded-lg flex items-start gap-2 ${variantStyles[variant]} ${className}`}>
      <span className="text-lg flex-shrink-0">{variantIcons[variant]}</span>
      <div className="text-sm flex-1">{children}</div>
    </div>
  );
};
