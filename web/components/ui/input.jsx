import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-[#2a2b31] bg-[#1b1b20] px-4 text-sm text-zinc-200 shadow-inner transition placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violetAccent focus-visible:ring-offset-2 focus-visible:ring-offset-night',
        className,
      )}
      {...props}
    />
  );
});
