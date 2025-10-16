import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-3xl border border-[#1f1f22] bg-slateNight/95 p-6 shadow-2xl shadow-black/30 backdrop-blur', className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('space-y-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-2xl font-semibold text-white', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-zinc-400', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('mt-6 space-y-4 text-sm text-zinc-300', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('mt-6 flex items-center justify-end gap-3', className)} {...props} />;
}
