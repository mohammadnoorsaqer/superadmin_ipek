import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Paginated<T> = {
  results: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function emptyPage<T>(): Paginated<T> {
  return { results: [], page: 1, limit: 20, total: 0, totalPages: 0 };
}
