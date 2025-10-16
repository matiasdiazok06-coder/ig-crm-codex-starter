import * as React from 'react';
import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-3xl border border-[#2a2b31] bg-[#1b1b20] px-4 py-3 text-sm text-zinc-200 transition placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violetAccent focus-visible:ring-offset-2 focus-visible:ring-offset-night',
        className,
      )}
      {...props}
    />
  );
});
