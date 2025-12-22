<script>
	import '../app.css';
	import Header from '$lib/Header.svelte';
	import CallFooter from '$lib/CallFooter.svelte';
	import { onMount } from 'svelte';
	import { socket } from '$lib/socket';
	import { currentUser } from '$lib/stores/user';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { onlineUsers } from '$lib/stores/presence';
	import { currentStatus } from '$lib/stores/status';

	onMount(async () => {
		const { pathname } = get(page).url;

		// 🚫 Do NOT run auth logic on login page
		if (pathname === '/login') return;

		try {
			const res = await fetch('http://localhost:3001/auth/me', {
				credentials: 'include'
			});

			if (!res.ok) {
				// Server-side redirect handles unauthorized access
				return;
			}

			const user = await res.json();
			console.log(JSON.stringify(user, null, 2));
			currentUser.set(user);
			currentStatus.set(user.status);

			// Connect socket AFTER identity is known
			socket.connect();
		} catch (e) {
			console.error('Auth check failed', e);
		}
	});

	socket.on('presence:init', ({ onlineUsers: users }) => {
		onlineUsers.set(new Set(users));
	});

	socket.on('presence:update', ({ userId, online }) => {
		onlineUsers.update((set) => {
			const next = new Set(set);
			if (online) {
				next.add(userId);
			} else {
				next.delete(userId);
			}
			return next;
		});
	});
</script>

<Header />

<div class="app-shell">
	<slot />
</div>

<CallFooter />

<style>
	.app-shell {
		padding-top: 64px; /* header height */
		height: 100vh;
		overflow: hidden;
	}
</style>
