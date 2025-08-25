'use client';

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-24 w-24'
};

function cn(...inputs: (string | undefined)[]) {
  return twMerge(clsx(inputs));
}

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <div className={cn('relative', sizes[size], className)}>
      <img
        src="/logo.png"
        alt="JobBot"
        className="w-full h-full object-contain"
      />
    </div>
  );
}