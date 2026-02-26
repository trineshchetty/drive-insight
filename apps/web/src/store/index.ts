// Jotai store - Example atoms for state management
// Add your application state atoms here

import { atom } from 'jotai';

// Example: User state atom
export const userAtom = atom<{ id: string; email: string } | null>(null);

// Example: Theme atom
export const themeAtom = atom<'light' | 'dark'>('light');

// Example: Loading state atom
export const loadingAtom = atom(false);
