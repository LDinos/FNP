// src/lib/stores/dm.ts
import { writable } from 'svelte/store';
import type { Message } from '$lib/types/dm';
//import type { ConversationPreview } from '$lib/types/dm';

export const activeConversationId = writable<string | null>(null);

// Map<conversationId, Message[]>
export const messagesByConversation = writable<Map<string, Message[]>>(new Map());

export const messageCursors = writable<Map<string, string | null>>(new Map());

export const loadingOlderMessages = writable<Set<string>>(new Set());

// typing indicator
export const typingUsers = writable<Map<string, Set<string>>>(new Map());

//export const conversations = writable<ConversationPreview[]>([]);

export const unreadCounts = writable<Map<string, number>>(new Map());

export const friendConversationMap = writable<Map<string, string>>(new Map());

export const readMessages = writable<Set<string>>(new Set());
