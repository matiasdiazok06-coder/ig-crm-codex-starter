'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violetAccent focus-visible:ring-offset-2 focus-visible:ring-offset-night disabled:pointer-events-none disabled:opacity-60';

const variantStyles = {
  default: 'bg-charcoal text-zinc-100 hover:bg-[#32333a]',
  primary: 'bg-violetAccent text-white shadow-glow hover:bg-[#732aa7]',
  outline: 'border border-[#2f2f35] bg-transparent text-zinc-300 hover:bg-[#1f1f25]',
  ghost: 'bg-transparent text-zinc-300 hover:bg-[#1f1f25]',
};

const sizeStyles = {
  default: 'h-11 px-6 text-sm',
  sm: 'h-9 px-4 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'h-11 w-11 p-0',
};

export const Button = React.forwardRef(function Button(
  { className, variant = 'default', size = 'default', asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(baseStyles, variantStyles[variant] ?? variantStyles.default, sizeStyles[size] ?? sizeStyles.default, className)}
      {...props}
    />
  );
});
