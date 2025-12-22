import { writable } from 'svelte/store';

export type UserStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';

export const currentStatus = writable<UserStatus>('ONLINE');
