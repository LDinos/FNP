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
	import { PUBLIC_API_URL } from '$env/static/public';

	onMount(async () => {
		const { pathname } = get(page).url;
		const prime = () => {
			const audio = new Audio();
			audio.play().catch(() => {});
			window.removeEventListener('click', prime);
		};

		window.addEventListener('click', prime);

		// Do NOT run auth logic on login page
		if (pathname === '/login') return;

		try {
			const res = await fetch(`${PUBLIC_API_URL}/auth/me`, {
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
	:global(::-webkit-scrollbar) {
		width: 10px;
	}

	:global(::-webkit-scrollbar-thumb) {
		background: #4b5563;
		border-radius: 8px;
	}
	.app-shell {
		padding-top: 64px; /* header height */
		height: 100vh;
		overflow: hidden;
	}
</style>
