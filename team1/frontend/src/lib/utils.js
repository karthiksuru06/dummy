import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn-style class combiner: merges conditional classes and de-dupes
// conflicting Tailwind utilities (last-wins).
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
