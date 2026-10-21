import React from 'react';

interface SafeContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function SafeContainer({ children, className = '', fullWidth = false }: SafeContainerProps) {
  return (
    <div
      safe_top=""
      safe_bot=""
      className={`min-h-[100dvh] w-full flex flex-col ${
        fullWidth ? '' : 'items-center'
      }`}
    >
      <div
        className={`w-full ${
          fullWidth ? 'w-full' : 'max-w-md md:max-w-xl lg:max-w-2xl px-4 sm:px-6'
        } flex-1 flex flex-col ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
