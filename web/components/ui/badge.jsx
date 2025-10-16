import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-[#1f1f25] text-zinc-200',
    outline: 'border border-[#2f2f35] text-zinc-300',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
        variants[variant] ?? variants.default,
        className,
      )}
      {...props}
    />
  );
}
