<script lang="ts">
	import { MoreVertical, X } from 'lucide-svelte';
	import { onlineUsers } from '$lib/stores/presence';
	import { socket } from '$lib/socket';
	import { onMount, onDestroy } from 'svelte';
	import {
		activeConversationId,
		messagesByConversation,
		typingUsers,
		unreadCounts,
		friendConversationMap
	} from '$lib/stores/dm';
	import type { Message } from '$lib/types/dm';
	import { currentUser } from '$lib/stores/user';
	import { browser } from '$app/environment';
	import { readMessages, messageCursors, loadingOlderMessages } from '$lib/stores/dm';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { playMessageSound } from '$lib/sounds';
	import { formatAvatarUrl, formatMessageTime } from '$lib/utils';

	// Components
	import AddFriendModal from '$lib/components/friends/AddFriendModal.svelte';
	let addFriendModalRef: AddFriendModal;
	import NotificationsModal from '$lib/components/friends/NotificationsModal.svelte';
	import FriendsTopPanel from '$lib/components/friends/FriendsTopPanel.svelte';


	let presenceInterval: any;
	let messageInput = '';
	let chatContainer: HTMLDivElement;
	let selectedFriend = null;
	let search = '';
	let openMenuFor = null;
	// Friend add
	let showAddFriend = false;
	// Bell icon notifications
	let notifications = [];
	let showNotifications = false;
	let friends = [];
	let isAtBottom = true;
	let typingTimeout: any;

	$: sortedFriends = friends
	.filter(f =>
		f.username.toLowerCase().includes(search.toLowerCase())
	)
	.sort((a, b) => {
		const convoA = $friendConversationMap.get(a.id);
		const convoB = $friendConversationMap.get(b.id);

		const timeA = convoA ? lastMessageByConversation.get(convoA) ?? 0 : 0;
		const timeB = convoB ? lastMessageByConversation.get(convoB) ?? 0 : 0;

		// newest first
		if (timeA !== timeB) {
		return timeB - timeA;
		}

		// fallback: alphabetical
		return a.username.localeCompare(b.username);
	});
	$: lastMessageByConversation = new Map<string, number>();

	
	for (const [convoId, messages] of $messagesByConversation.entries()) {
	if (messages.length > 0) {
		lastMessageByConversation.set(
		convoId,
		new Date(messages[messages.length - 1].createdAt).getTime()
		);
	}
	}

	onMount(async () => {
		if (!browser) return;
		const stored = localStorage.getItem('unreadCounts');
		if (stored) {
			unreadCounts.set(new Map(JSON.parse(stored)));
		}

		const unsubscribe = unreadCounts.subscribe((_map) => {
			localStorage.setItem('unreadCounts', JSON.stringify(Array.from(_map.entries())));
		});
		const res = await fetch(`${PUBLIC_API_URL}/friends/requests`, {
			credentials: 'include'
		});
		notifications = await res.json();
		const res2 = await fetch(`${PUBLIC_API_URL}/friends`, {
			credentials: 'include'
		});
		friends = await res2.json();
		console.log('Loaded friends:', friends);

		document.addEventListener('click', closeMenus);
		await loadConversations();
		pollPresence(); // initial
		presenceInterval = setInterval(pollPresence, 5000); // every 5s
		return () => document.removeEventListener('click', closeMenus);
	});

	async function loadConversations() {
		const res = await fetch(`${PUBLIC_API_URL}/dm/conversations`, {
			credentials: 'include'
		});

		const conversations = await res.json();

		const map = new Map<string, string>();
		const lastMap = new Map<string, number>();

		for (const convo of conversations) {
			const other = convo.participants.find(p => p.userId !== $currentUser.id);
			if (!other) continue;

			map.set(other.userId, convo.id);

			if (convo.messages.length > 0) {
			lastMap.set(
				convo.id,
				new Date(convo.messages[0].createdAt).getTime()
			);
			}
		}

		friendConversationMap.set(map);
		lastMessageByConversation.set(lastMap);
	}

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

	function closeConversation() {
		selectedFriend = null;
		activeConversationId.set(null);
	}

	async function pollPresence() {
		try {
			const res = await fetch(`${PUBLIC_API_URL}/presence`, {
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
		const res = await fetch(`${PUBLIC_API_URL}/friends/delete`, {
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

	async function sendFriendRequest(username: string) {

		if (!username) {
			addFriendModalRef?.setError('Please enter a username');
			return;
		}

		const res = await fetch(`${PUBLIC_API_URL}/friends/request`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				username
			})
		});

		if (!res.ok) {
			addFriendModalRef?.setError(await res.text());
			return;
		}

		showAddFriend = false;
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
			unreadCounts.update((_map) => {
				const next = new Map(_map);
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
		const isFromMe = message.sender.id === $currentUser.id;
		const isActiveConversation = message.conversationId === $activeConversationId;

		if (!isFromMe && !isActiveConversation) {
			playMessageSound();
		}

		chatContainer.scrollTop = chatContainer.scrollHeight;
		//scrollToBottom(true);
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
			const res = await fetch(`${PUBLIC_API_URL}/friends/respond`, {
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
		const res = await fetch(`${PUBLIC_API_URL}/friends`, {
			credentials: 'include'
		});

		friends = await res.json();
	}

	async function openDM(friend) {
		selectedFriend = friend;

		const res = await fetch(`${PUBLIC_API_URL}/dm/conversation`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ friendId: friend.id })
		});

		const convo = await res.json();
		const convoId = convo.id;
		if (!convoId) return;
		activeConversationId.set(convoId);

		const msgRes = await fetch(`${PUBLIC_API_URL}/dm/${convoId}/messages?limit=20`, {
			credentials: 'include'
		});

		const { messages, nextCursor } = await msgRes.json();

		 messagesByConversation.update(map => {
			const next = new Map(map);
			next.set(convoId, messages);
			return next;
		});

		messageCursors.update(map => {
			const next = new Map(map);
			next.set(convoId, nextCursor);
			return next;
		});

		// unreadCounts.update((_map) => {
		// 	const next = new Map(_map);
		// 	next.delete(convoId);
		// 	return next;
		// });

		// await fetch(`${PUBLIC_API_URL}/dm/read`, {
		// 	method: 'POST',
		// 	headers: { 'Content-Type': 'application/json' },
		// 	credentials: 'include',
		// 	body: JSON.stringify({ conversationId: convo.id })
		// });

		// const readRes = await fetch(
		// 	`${PUBLIC_API_URL}/dm/${convo.id}/reads`,
		// 	{ credentials: 'include' }
		// );

		// const readMessageIds: string[] = await readRes.json();
		// readMessages.set(new Set(readMessageIds));

		requestAnimationFrame(() => {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		});
		//scrollToBottom(true);
	}

	async function sendMessage() {
		if (!messageInput.trim()) return;

		const content = messageInput;
		messageInput = '';

		await fetch(`${PUBLIC_API_URL}/dm/message`, {
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

	async function handleScroll() {
		if (!chatContainer) return;
		if (chatContainer.scrollTop > 50) return;

		const convoId = $activeConversationId;
		if (!convoId) return;

		const cursor = $messageCursors.get(convoId);
		if (!cursor) return; // no more messages

		if ($loadingOlderMessages.has(convoId)) return;

		loadingOlderMessages.update(s => new Set(s).add(convoId));

		const previousHeight = chatContainer.scrollHeight;

		const res = await fetch(
			`${PUBLIC_API_URL}/dm/${convoId}/messages?limit=20&cursor=${cursor}`,
			{ credentials: 'include' }
		);

		const { messages, nextCursor } = await res.json();

		messagesByConversation.update(map => {
			const next = new Map(map);
			next.set(convoId, [...messages, ...(next.get(convoId) ?? [])]);
			return next;
		});

		messageCursors.update(map => {
			const next = new Map(map);
			next.set(convoId, nextCursor);
			return next;
		});

		// preserve scroll position
		requestAnimationFrame(() => {
			chatContainer.scrollTop =
			chatContainer.scrollHeight - previousHeight;
		});

		loadingOlderMessages.update(s => {
			const next = new Set(s);
			next.delete(convoId);
			return next;
		});
		const threshold = 80;
		isAtBottom =
			chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < threshold;
	}
</script>

{#if showAddFriend}
  <AddFriendModal
    bind:this={addFriendModalRef}
    on:submit={(e) => sendFriendRequest(e.detail)}
    on:close={() => (showAddFriend = false)}
  />
{/if}

{#if showNotifications}
  <NotificationsModal
    {notifications}
    on:close={() => (showNotifications = false)}
    on:respond={(e) => respond(e.detail.id, e.detail.accept)}
  />
{/if}


<div class="friends-layout">
	<!-- LEFT PANEL -->
	<aside class="friends-panel">
		<FriendsTopPanel
			{search}
			notificationCount={notifications.length}
			on:search={(e) => (search = e.detail)}
			on:notifications={() => (showNotifications = true)}
			on:addfriend={() => (showAddFriend = true)}
		/>
		<div class="friends-list">
			{#each sortedFriends as friend}
				{@const convoId = $friendConversationMap.get(friend.id)}
				{@const unread = convoId ? $unreadCounts.get(convoId) : 0}

				<div class="friend-bubble {convoId === $activeConversationId ? 'active' : ''}" on:click={() => openDM(friend)}>
					<div class="avatar-wrapper">
						<img src={formatAvatarUrl(friend.avatarUrl)} alt="" />

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
					<button class="close-chat" on:click={closeConversation}>
					<X size={18} />
				</button>
					<img src={formatAvatarUrl(selectedFriend.avatarUrl)} />
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
								src={formatAvatarUrl(msg.sender.avatarUrl)}
								alt="avatar"
							/>
							{/if}
							<div class="message {msg.sender.id === $currentUser.id ? 'me' : ''}">
								<div class="bubble">
									<span class="content">{msg.content}</span>
									<span class="time">{formatMessageTime(msg.createdAt)}</span>
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

	.friend-bubble.active {
		background: var(--gray-600);
		outline: 1px solid var(--purple-500);
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
	.close-chat {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 6px;
		border-radius: var(--radius-sm);
		transition: background var(--ease-fast), color var(--ease-fast);
	}

	.close-chat:hover {
		background: var(--gray-700);
		color: var(--text-primary);
	}

	.chat-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: var(--gray-800);
		border-bottom: 1px solid var(--gray-700);
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

	.badge {
		position: absolute;
		right: 2px;
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
</style>
