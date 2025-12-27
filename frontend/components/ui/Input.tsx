import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-2.5 border-2 rounded-lg bg-input text-foreground font-medium
          placeholder:text-muted-foreground placeholder:font-normal
          focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
          disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground
          transition-colors
          ${error ? 'border-destructive focus:ring-destructive' : 'border-input-border'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
