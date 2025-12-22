<script>
	import { Mic, MicOff, Headphones, Phone, ScreenShare, ChevronDown } from 'lucide-svelte';

	let muted = false;
	let deafened = false;
	let minimized = false;

	function toggleMute() {
		muted = !muted;
	}

	function toggleDeafen() {
		deafened = !deafened;
	}

	function toggleMinimize() {
		minimized = !minimized;
	}
</script>

<div class="footer-wrapper">
	<div class="footer {minimized ? 'minimized' : ''}">
		<!-- Top minimize bar -->
		<button class="minimize-bar" on:click={toggleMinimize} aria-label="Minimize call controls">
			<ChevronDown size={18} />
		</button>

		<!-- Controls -->
		<div class="controls">
			<button class="icon-btn {muted ? 'danger' : ''}" on:click={toggleMute} aria-label="Mute">
				{#if muted}
					<MicOff size={22} />
				{:else}
					<Mic size={22} />
				{/if}
			</button>

			<button
				class="icon-btn {deafened ? 'danger' : ''}"
				on:click={toggleDeafen}
				aria-label="Deafen"
			>
				<Headphones size={22} />
			</button>

			<button class="icon-btn disabled" disabled>
				<ScreenShare size={22} />
			</button>

			<button class="icon-btn disabled" disabled>
				<Phone size={22} />
			</button>
		</div>
	</div>
</div>

<style>
	.footer-wrapper {
		position: fixed;
		bottom: 24px;
		left: 24px;
		right: auto;
		display: flex;
		justify-content: flex-start;
		pointer-events: none;
		z-index: 100;
	}

	.footer {
		pointer-events: auto;
		width: fit-content;
		background: var(--surface);
		border-radius: 16px;
		border: 1px solid #222;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		overflow: hidden;
	}

	/* ───────── Minimize bar ───────── */

	.minimize-bar {
		width: 100%;
		height: 20px;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	.minimize-bar:hover {
		background: rgba(255, 255, 255, 0.03);
		color: var(--text);
	}

	.minimize-bar svg {
		transition: transform 0.25s ease;
	}

	.footer.minimized .minimize-bar svg {
		transform: rotate(180deg);
	}

	/* ───────── Controls ───────── */

	.controls {
		display: flex;
		gap: 16px;
		padding: 14px 20px;
		justify-content: center;
		align-items: center;
		transition:
			max-height 0.3s ease,
			opacity 0.2s ease,
			padding 0.25s ease;
		max-height: 100px;
		opacity: 1;
	}

	.footer.minimized .controls {
		max-height: 0;
		opacity: 0;
		padding-top: 0;
		padding-bottom: 0;
		pointer-events: none;
	}

	/* ───────── Icons ───────── */

	.icon-btn {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		background: #222;
		border: none;
		color: var(--text);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			background 0.2s ease,
			color 0.2s ease,
			transform 0.1s ease;
	}

	.icon-btn:hover:not(.disabled) {
		background: #2a2a2a;
	}

	.icon-btn:active:not(.disabled) {
		transform: scale(0.95);
	}

	.icon-btn.danger {
		color: #ff4d4d;
	}

	.icon-btn.disabled {
		color: #666;
		background: #1a1a1a;
		cursor: not-allowed;
	}
</style>
