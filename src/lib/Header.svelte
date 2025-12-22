<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/user';
	import { currentStatus } from '$lib/stores/status';

	$: path = $page.url.pathname;
	let showStatusMenu = false;
	const tabs = [
		{
			label: 'PROFILE',
			path: '/'
		},
		{
			label: 'SERVERS',
			path: '/servers'
		},
		{
			label: 'FRIENDS',
			path: '/friends'
		}
	];

	async function setStatus(status) {
		currentStatus.set(status);

		await fetch('http://localhost:3001/user/status', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				status
			})
		});
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
</script>

<header class="header">
	<!-- LEFT: user info -->
	{#if $currentUser}
		<div class="header-user" on:click={() => (showStatusMenu = !showStatusMenu)}>
			<div class="avatar-wrapper">
				<img src="/avatar-placeholder.png" alt="Profile" />
				<span class="status-dot" style="background: {statusColor($currentStatus)}" />
			</div>

			<span class="username">{$currentUser.username}</span>

			{#if showStatusMenu}
				<div class="status-menu" on:click|stopPropagation>
					<button on:click={() => setStatus('ONLINE')}>🟢 Online</button>
					<button on:click={() => setStatus('AWAY')}>🟡 Away</button>
					<button on:click={() => setStatus('BUSY')}>🔴 Busy</button>
					<button on:click={() => setStatus('OFFLINE')}>⚪ Offline</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- CENTER: navigation -->
	<nav class="nav">
		{#each tabs as tab}
			<button class="tab {path === tab.path ? 'active' : ''}" on:click={() => goto(tab.path)}>
				{tab.label}
			</button>
		{/each}

		{#if $currentUser}
			<span
				class="underline"
				style="transform: translateX({tabs.findIndex((t) => t.path === path) * 100}%);"
			/>
		{/if}
	</nav>

	<!-- RIGHT: spacer for symmetry -->
	<div class="right"></div>
</header>

<style>
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;

		height: 64px;
		padding: 0 20px;

		display: flex;
		align-items: center;
		justify-content: space-between;

		background: linear-gradient(to bottom, #121212, #0f0f0f);

		z-index: 100;
	}

	.header-user {
		display: flex;
		align-items: center;
		gap: 10px;
		position: relative;
		padding: 6px 10px;
		border-radius: 12px;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.header-user:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	/* Avatar */
	.avatar-wrapper {
		position: relative;
		width: 36px;
		height: 36px;
	}

	.avatar-wrapper img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	/* Status dot */
	.status-dot {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid #121212;
		/* matches dark background */
	}

	.status-menu {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;

		background: #1c1c1c;
		border-radius: 12px;
		padding: 6px;
		min-width: 160px;

		display: flex;
		flex-direction: column;
		gap: 4px;

		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
		z-index: 200;
	}

	.status-menu button {
		background: none;
		border: none;
		color: white;
		padding: 8px 10px;
		text-align: left;
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
	}

	.status-menu button:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	/* Username */
	.username {
		font-size: 14px;
		font-weight: 500;
		color: white;
		white-space: nowrap;
	}

	/* ───────── LEFT USER CHIP ───────── */

	.user-profile {
		display: flex;
		align-items: center;
	}

	.user-chip {
		display: flex;
		align-items: center;
		gap: 10px;
		background: #1f1f1f;
		padding: 6px 10px;
		border-radius: 14px;
		border: 1px solid #222;
	}

	.user-chip img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-chip span {
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
	}

	/* ───────── CENTER NAV ───────── */

	.nav {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		width: 100%;
		max-width: 420px;
		height: 100%;
	}

	.tab {
		background: none;
		border: none;
		color: var(--muted);
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.08em;
		cursor: pointer;
	}

	.tab.active {
		color: var(--text);
	}

	.underline {
		position: absolute;
		bottom: 0;
		width: 33.333%;
		height: 3px;
		background: var(--accent);
		transition: transform 0.3s ease;
	}

	/* ───────── RIGHT SPACER ───────── */

	.right {
		height: 1px;
	}
</style>
