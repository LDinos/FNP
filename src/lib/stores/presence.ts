import { writable } from 'svelte/store';

export const onlineUsers = writable<Set<string>>(new Set());
