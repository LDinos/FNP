<script lang="ts">
	import { Bell, UserPlus, MoreVertical } from 'lucide-svelte';
	import { onlineUsers } from '$lib/stores/presence';
	import { socket } from '$lib/socket';
	import { onMount, onDestroy } from 'svelte';
	import {
		activeConversationId,
		messagesByConversation,
		typingUsers,
		conversations,
		unreadCounts,
		friendConversationMap
	} from '$lib/stores/dm';
	import type { Message } from '$lib/types/dm';
	import { currentUser } from '$lib/stores/user';
	import { browser } from '$app/environment';
	import { readMessages } from '$lib/stores/dm';

	let presenceInterval: any;
	let messageInput = '';
	let chatContainer: HTMLDivElement;
	let selectedFriend = null;
	let search = '';
	let openMenuFor = null;
	// Friend add
	let showAddFriend = false;
	let addUsername = '';
	let addError = '';
	// Bell icon notifications
	let notifications = [];
	let showNotifications = false;
	let friends = [];
	let isAtBottom = true;
	let typingTimeout: any;

	$: filteredFriends = friends.filter((f) =>
		f.username.toLowerCase().includes(search.toLowerCase())
	);

	onMount(async () => {
		if (!browser) return;
		const stored = localStorage.getItem('unreadCounts');
		if (stored) {
			unreadCounts.set(new Map(JSON.parse(stored)));
		}

		const unsubscribe = unreadCounts.subscribe((map) => {
			localStorage.setItem('unreadCounts', JSON.stringify(Array.from(map.entries())));
		});
		const res = await fetch('http://localhost:3001/friends/requests', {
			credentials: 'include'
		});
		notifications = await res.json();
		const res2 = await fetch('http://localhost:3001/friends', {
			credentials: 'include'
		});
		friends = await res2.json();
		document.addEventListener('click', closeMenus);
		//loadConversations();
		pollPresence(); // initial
		presenceInterval = setInterval(pollPresence, 5000); // every 5s
		return () => document.removeEventListener('click', closeMenus);
	});

	onDestroy(() => {
		clearInterval(presenceInterval);
	});

	function effectiveStatus(friend) {
		return friend.status;
	}

	function getUsername(userId: string) {
		if (selectedFriend?.id === userId) {
			return selectedFriend.username;
		}
		return 'Someone';
	}

	function statusColor(status: string) {
		return (
			{
				ONLINE: '#22c55e',
				AWAY: '#eab308',
				BUSY: '#ef4444',
				OFFLINE: '#6b7280'
			}[status] || '#6b7280'
		);
	}

	function closeMenus() {
		openMenuFor = null;
	}

	async function loadConversations() {
		const res = await fetch('http://localhost:3001/dm/conversations', {
			credentials: 'include'
		});

		const convos = await res.json();
		conversations.set(convos);

		// build friend → conversation map
		friendConversationMap.set(
			new Map(
				convos.map((convo) => {
					const other = convo.participants.find((p) => p.user.id !== $currentUser.id)?.user;
					return [other.id, convo.id];
				})
			)
		);
	}

	async function pollPresence() {
		try {
			const res = await fetch('http://localhost:3001/presence', {
				credentials: 'include'
			});

			const data = await res.json(); // returns a map id => status called statusMap
			onlineUsers.set(new Set(data.onlineUserIds));
			friends = friends.map((f) => {
				const isOnline = data.onlineUserIds.includes(f.id);
				return {
					...f,
					status: isOnline ? data.statusMap[f.id] : 'OFFLINE'
				};
			});
		} catch (e) {
			console.error('Presence poll failed', e);
		}
	}

	async function deleteFriend(friendId) {
		const res = await fetch('http://localhost:3001/friends/delete', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				friendId
			})
		});

		if (!res.ok) {
			console.error(await res.text());
			return;
		}

		// Remove from UI immediately
		friends = friends.filter((f) => f.id !== friendId);
		openMenuFor = null;
	}

	async function sendFriendRequest() {
		addError = '';

		if (!addUsername) {
			addError = 'Please enter a username';
			return;
		}

		const res = await fetch('http://localhost:3001/friends/request', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				username: addUsername
			})
		});

		if (!res.ok) {
			addError = await res.text();
			return;
		}

		showAddFriend = false;
		addUsername = '';
	}

	socket.on('dm:typing', ({ conversationId, userId }) => {
		if (conversationId !== $activeConversationId) return;

		typingUsers.update((map) => {
			const newMap = new Map(map);
			const set = newMap.get(conversationId) ?? new Set();

			set.add(userId);
			newMap.set(conversationId, set);

			return newMap;
		});

		// auto-remove after delay
		setTimeout(() => {
			typingUsers.update((map) => {
				const newMap = new Map(map);
				const set = newMap.get(conversationId);

				if (!set) return map;

				set.delete(userId);
				if (set.size === 0) newMap.delete(conversationId);

				return newMap;
			});
		}, 1500);
	});

	socket.on('dm:message', (message) => {
		if (message.conversationId !== $activeConversationId) {
			unreadCounts.update((map) => {
				const next = new Map(map);
				next.set(message.conversationId, (next.get(message.conversationId) ?? 0) + 1);
				return next;
			});
		}
		messagesByConversation.update((map) => {
			const msgs = map.get(message.conversationId) ?? [];
			if (msgs.some((m) => m.id === message.id)) return map;

			const next = new Map(map);
			next.set(message.conversationId, [...msgs, message]);
			return next;
		});

		conversations.update((list) => {
			const idx = list.findIndex((c) => c.id === message.conversationId);
			if (idx === -1) return list;

			const convo = list[idx];

			const updated = {
				...convo,
				messages: [message]
			};

			return [updated, ...list.filter((c) => c.id !== message.conversationId)];
		});

		scrollToBottom(true);
	});

	socket.on('friend:request', (request) => {
		notifications = [...notifications, request];
	});

	socket.on('friend:accepted', (friend) => {
		// prevent duplicates
		if (!friends.some((f) => f.id === friend.id)) {
			friends = [...friends, friend];
		}
	});

	socket.on('friend:deleted', ({ userId }) => {
		friends = friends.filter((f) => f.id !== userId);
	});

	socket.on('status:update', ({ userId, status }) => {
		updateFriendStatus(userId, status);
	});

	socket.on('dm:read', ({ messageIds }) => {
		readMessages.update(set => {
			const next = new Set(set);
			messageIds.forEach(id => next.add(id));
			return next;
		});
	});

	function updateFriendStatus(friendId, status) {
		friends = friends.map((f) =>
			f.id === friendId
				? {
						...f,
						status
					}
				: f
		);
	}

	async function respond(requestId: string, accept: boolean) {
		try {
			const res = await fetch('http://localhost:3001/friends/respond', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					requestId,
					accept
				})
			});

			if (!res.ok) {
				console.error(await res.text());
				return;
			}

			// Remove the notification immediately
			notifications = notifications.filter((n) => n.id !== requestId);

			if (accept) {
				// Reload friends list for receiver
				await loadFriends();
			}
		} catch (err) {
			console.error('Failed to respond to friend request', err);
		}
	}

	async function loadFriends() {
		const res = await fetch('http://localhost:3001/friends', {
			credentials: 'include'
		});

		friends = await res.json();
	}

	async function openDM(friend) {
		selectedFriend = friend;

		const res = await fetch('http://localhost:3001/dm/conversation', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ friendId: friend.id })
		});

		const convo = await res.json();
		activeConversationId.set(convo.id);

		const msgRes = await fetch(`http://localhost:3001/dm/${convo.id}/messages`, {
			credentials: 'include'
		});

		const messages: Message[] = await msgRes.json();

		messagesByConversation.update((_map) => {
			_map.set(convo.id, messages);
			return new Map(_map);
		});
		const convoId = $friendConversationMap.get(friend.id);
		if (!convoId) return;
		unreadCounts.update((map) => {
			const next = new Map(map);
			next.delete(convoId);
			return next;
		});
		await fetch('http://localhost:3001/dm/read', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ conversationId: convo.id })
		});

		const readRes = await fetch(
			`http://localhost:3001/dm/${convo.id}/reads`,
			{ credentials: 'include' }
		);

		const readMessageIds: string[] = await readRes.json();
		readMessages.set(new Set(readMessageIds));

		scrollToBottom(true);
	}

	async function sendMessage() {
		if (!messageInput.trim()) return;

		const content = messageInput;
		messageInput = '';

		await fetch('http://localhost:3001/dm/message', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				conversationId: $activeConversationId,
				content
			})
		});

		scrollToBottom(true);
	}

	function emitTyping() {
		if (!$activeConversationId) return;

		socket.emit('dm:typing', {
			conversationId: $activeConversationId
		});

		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => {
			typingUsers.update((map) => {
				const newMap = new Map(map);
				newMap.delete($activeConversationId);
				return newMap;
			});
		}, 1500);
	}

	function scrollToBottom(force = false) {
		if (!chatContainer) return;
		if (!force && !isAtBottom) return;

		chatContainer.scrollTo({
			top: chatContainer.scrollHeight,
			behavior: 'auto'
		});
	}

	function handleScroll() {
		if (!chatContainer) return;
		const threshold = 80;
		isAtBottom =
			chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < threshold;
	}

	function formatTime(date: string) {
		return new Date(date).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

{#if showAddFriend}
	<div class="modal-backdrop" on:click={() => (showAddFriend = false)}>
		<div class="modal" on:click|stopPropagation>
			<button class="close" on:click={() => (showAddFriend = false)}>✕</button>

			<h3>Add Friend</h3>

			<input placeholder="Username" bind:value={addUsername} />

			{#if addError}
				<p class="error">{addError}</p>
			{/if}

			<button class="primary" on:click={sendFriendRequest}> Add </button>
		</div>
	</div>
{/if}

{#if showNotifications}
	<div class="modal-backdrop">
		<div class="modal">
			<button class="close" on:click={() => (showNotifications = false)}>✕</button>

			<h3>Friend Requests</h3>

			{#if notifications.length === 0}
				<p class="empty">No pending requests</p>
			{:else}
				{#each notifications as n}
					<div class="notification">
						<span>
							<strong>{n.from.username}</strong> sent you a friend request
						</span>

						<div class="actions">
							<button class="accept" on:click={() => respond(n.id, true)}> Accept </button>

							<button class="decline" on:click={() => respond(n.id, false)}> Decline </button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<div class="friends-layout">
	<!-- LEFT PANEL -->
	<aside class="friends-panel">
		<div class="panel-header">
			<input class="search" placeholder="Search friends..." bind:value={search} />

			<div class="panel-actions">
				<button class="icon-btn bell" on:click={() => (showNotifications = true)}>
					<Bell size={18} />

					{#if notifications.length > 0}
						<span class="badge">{notifications.length}</span>
					{/if}
				</button>
				<button class="icon-btn" on:click={() => (showAddFriend = true)}>
					<UserPlus size={18} />
				</button>
			</div>
		</div>

		<div class="friends-list">
			{#each filteredFriends as friend}
				{@const convoId = $friendConversationMap.get(friend.id)}
				{@const unread = convoId ? $unreadCounts.get(convoId) : 0}

				<div class="friend-bubble" on:click={() => openDM(friend)}>
					<div class="avatar-wrapper">
						<img src="/avatar-placeholder.png" alt="" />

						<span class="status-dot" style="background: {statusColor(effectiveStatus(friend))}" />
					</div>

					<span class="name">{friend.username}</span>

					{#if unread}
						<span class="badge">{unread}</span>
					{/if}

					<div class="menu-wrapper" on:click|stopPropagation>
						<button
							class="more-btn"
							on:click={() => (openMenuFor = openMenuFor === friend.id ? null : friend.id)}
						>
							<MoreVertical size={16} />
						</button>

						{#if openMenuFor === friend.id}
							<div class="context-menu">
								<button>Mute</button>
								<button>Block</button>
								<button class="danger" on:click={() => deleteFriend(friend.id)}> Delete </button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</aside>

	<!-- RIGHT PANEL -->
	<section class="chat-panel">
		{#if selectedFriend}
			{@const msgs = $messagesByConversation.get($activeConversationId) ?? []}
			{@const lastMsg = msgs[msgs.length - 1]}
			<div class="dm-panel">
				<!-- HEADER -->
				<div class="dm-header">
					<img src="/avatar-placeholder.png" />
					<div class="info">
						<div class="name">{selectedFriend.username}</div>
						<div class="status">
							{effectiveStatus(selectedFriend)}
						</div>
					</div>
				</div>

				<!-- MESSAGES -->				
				<div class="dm-messages" bind:this={chatContainer} on:scroll={handleScroll}>
					{#each $messagesByConversation.get($activeConversationId) ?? [] as msg}
						<div class="message-row {msg.sender.id === $currentUser.id ? 'me' : 'them'}">
							{#if msg.sender.id !== $currentUser.id}
							<img
								class="message-avatar"
								src="/avatar-placeholder.png"
								alt="avatar"
							/>
							{/if}
							<div class="message {msg.sender.id === $currentUser.id ? 'me' : ''}">
								<div class="bubble">
									<span class="content">{msg.content}</span>
									<span class="time">{formatTime(msg.createdAt)}</span>
								</div>
							</div>
						</div>
					{/each}
					{#if lastMsg && lastMsg.sender.id === $currentUser.id}
						{#if $readMessages.has(lastMsg.id)}
							<div class="seen-indicator">Seen</div>
						{/if}
					{/if}
				</div>
				{#if $typingUsers.get($activeConversationId)?.size}
					{@const users = Array.from($typingUsers.get($activeConversationId))}

					<div class="typing-indicator">
						{users.length === 1
							? `${getUsername(users[0])} is typing…`
							: `Multiple people are typing…`}
					</div>
				{/if}

				<!-- INPUT -->
				<form class="dm-input" on:submit|preventDefault={sendMessage}>
					<input placeholder="Type a message..." bind:value={messageInput} on:input={emitTyping} />
					<button type="submit">Send</button>
				</form>
			</div>
		{/if}
	</section>
</div>

<style>
	.friends-layout {
		display: grid;
		grid-template-columns: 360px 1fr;
		height: 100%;
		/* calc(100vh - 64px);*/
		overflow: hidden;
	}

	/* ───────── LEFT PANEL ───────── */

	.friends-panel {
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border-right: 1px solid #222;
		min-height: 0;
	}

	.panel-header {
		padding: 12px;
		border-bottom: 1px solid #222;
		flex-shrink: 0;
	}

	.search {
		width: 100%;
		margin-bottom: 8px;
		background: #1a1a1a;
		border: 1px solid #222;
		border-radius: 10px;
		padding: 8px 10px;
		color: var(--text);
	}

	.panel-actions {
		display: flex;
		gap: 8px;
	}

	.icon-btn {
		position: relative;
		/* 👈 REQUIRED */
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: #222;
		border: none;
		color: var(--text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.icon-btn:hover {
		background: #2a2a2a;
	}

	.badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		background: #ef4444;
		color: white;
		font-size: 11px;
		font-weight: 600;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.friends-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	/* ───────── FRIEND BUBBLES ───────── */

	.friend-bubble {
		position: relative;
		padding: 12px 14px;
		height: 64px;
		background: #1f1f1f;
		border-radius: 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
	}

	.friend-bubble.active {
		border: 1px solid var(--accent);
		background: #2a2435;
	}

	.friend-bubble .avatar-wrapper {
		position: relative;
		width: 42px;
		height: 42px;
	}

	.friend-bubble .status-dot {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid #121212;
	}

	.friend-bubble img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.friend-bubble:hover .more-btn {
		opacity: 1;
	}

	.menu-wrapper {
		position: relative;
	}

	.more-btn {
		background: transparent;
		border: none;
		color: var(--muted);
		opacity: 0;
		cursor: pointer;
	}

	.context-menu {
		position: absolute;
		right: 0;
		top: 24px;
		background: var(--surface);
		border: 1px solid #222;
		border-radius: 10px;
		overflow: hidden;
		z-index: 10;
		min-width: 120px;
	}

	.context-menu button {
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}

	.context-menu button:hover {
		background: #2a2a2a;
	}

	.context-menu .danger {
		color: #ff4d4d;
	}

	/* ───────── CHAT PANEL ───────── */

	.chat-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.chat-header {
		flex-shrink: 0;
		padding: 14px 16px;
		border-bottom: 1px solid #222;
	}

	.chat-user {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.chat-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #2a2a2a;
		overflow: hidden;
		flex-shrink: 0;
	}

	.chat-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.chat-header h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	.chat-input {
		flex-shrink: 0;
		padding: 12px;
		border-top: 1px solid #222;
	}

	.chat-input input {
		width: 100%;
		background: #1a1a1a;
		border: 1px solid #222;
		border-radius: 12px;
		padding: 10px 12px;
		color: var(--text);
	}

	.avatar {
		position: relative;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		overflow: hidden;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.name {
		flex: 1;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.notification {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		background: #1f1f1f;
		border-radius: 12px;
		margin-bottom: 8px;
	}

	.notification span {
		font-size: 14px;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.accept {
		background: #22c55e;
		border: none;
		border-radius: 8px;
		padding: 6px 10px;
		color: black;
		cursor: pointer;
	}

	.decline {
		background: #ef4444;
		border: none;
		border-radius: 8px;
		padding: 6px 10px;
		color: white;
		cursor: pointer;
	}

	.online-dot {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: 10px;
		height: 10px;
		background: #22c55e;
		border-radius: 50%;
		border: 2px solid #1f1f1f;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		display: grid;
		place-items: center;
		z-index: 1000;
	}

	.modal {
		width: 320px;
		background: #1c1c1c;
		border-radius: 16px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		position: relative;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
	}

	.modal h3 {
		margin: 0;
	}

	.modal input {
		background: #2a2a2a;
		border: none;
		border-radius: 10px;
		padding: 10px;
		color: white;
	}

	.modal input:focus {
		outline: 2px solid var(--accent);
	}

	.modal .primary {
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 10px;
		padding: 10px;
		font-weight: 600;
		cursor: pointer;
	}

	.modal .close {
		position: absolute;
		top: 10px;
		right: 10px;
		background: none;
		border: none;
		color: #aaa;
		font-size: 18px;
		cursor: pointer;
	}

	.modal .close:hover {
		color: white;
	}

	.empty {
		color: #aaa;
		font-size: 14px;
		text-align: center;
		margin-top: 12px;
	}

	.context-menu .danger {
		color: #ef4444;
	}

	.context-menu .danger:hover {
		background: rgba(239, 68, 68, 0.15);
	}

	.dm-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%; /* 👈 critical */
		min-height: 0;
		overflow: hidden;
	}

	/* HEADER */
	.dm-header {
		display: flex;
		gap: 12px;
		padding: 12px 16px;
		background: #161616;
		align-items: center;
	}

	.dm-header img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}

	.dm-header .name {
		font-weight: 600;
		color: white;
	}

	.dm-header .status {
		font-size: 12px;
		color: #9ca3af;
	}

	/* MESSAGES */
	.dm-messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 0;
	}

	.message {
		display: flex;
		max-width: 100%;
		width: 40%;
	}

	.message.me {
		justify-content: flex-end;
	}

	.message-row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		width: 100%;
	}

	.message-row.me {
		justify-content: flex-end;
	}

		/* Avatar next to friend messages */
	.message-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.message .bubble {
		max-width: 80%;
		padding: 10px 14px;
		border-radius: 14px;
		background: #1f1f1f;
		color: white;
		word-wrap: break-word;
  		overflow-wrap: break-word;
	}

	.content {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.message.me .bubble {
		background: #7c3aed;
	}

	.message-row.them .bubble {
		max-width: 85%;
	}

	.bubble {
		position: relative;
	}

	.time {
		display: block;
		margin-top: 4px;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.5);
		text-align: right;
	}

	/* INPUT */
	.dm-input {
		flex-shrink: 0;
		display: flex;
		gap: 10px;
		padding: 12px;
		background: #161616;
	}

	.dm-input input {
		flex: 1;
		padding: 10px 14px;
		border-radius: 14px;
		border: none;
		background: #0f0f0f;
		color: white;
	}

	.dm-input button {
		padding: 10px 16px;
		border-radius: 12px;
		background: #7c3aed;
		border: none;
		color: white;
		cursor: pointer;
	}

	.conversation-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 12px;
	}

	.conversation-item {
		display: flex;
		gap: 10px;
		padding: 10px;
		border-radius: 12px;
		cursor: pointer;
		transition: background 0.15s;
	}

	.conversation-item:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.conversation-item.active {
		background: rgba(124, 58, 237, 0.25);
	}

	.conversation-item img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}

	.conversation-item .meta {
		flex: 1;
		overflow: hidden;
	}

	.conversation-item .name {
		font-weight: 500;
		color: white;
	}

	.conversation-item .preview {
		font-size: 12px;
		color: #9ca3af;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.typing-indicator {
		font-size: 12px;
		color: #9ca3af;
		margin-top: 6px;
		font-style: italic;
	}

	.seen-indicator {
		font-size: 11px;
		color: #9ca3af;
		margin-top: 4px;
		text-align: right;
	}
</style>
