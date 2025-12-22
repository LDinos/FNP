<script>
	let mode = 'login'; // 'login' | 'register'

	let email = '';
	let username = '';
	let password = '';
	let confirmPassword = '';

	let error = '';
	let success = '';
	let loading = false;

	function resetMessages() {
		error = '';
		success = '';
	}

	async function login() {
		resetMessages();

		if (!email || !password) {
			error = 'Please enter email and password';
			return;
		}

		loading = true;

		try {
			const res = await fetch('http://localhost:3001/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password })
			});

			if (!res.ok) {
				error = await res.text();
				loading = false;
				return;
			}

			window.location.href = '/friends';
		} catch {
			error = 'Server not reachable';
		} finally {
			loading = false;
		}
	}

	async function register() {
		resetMessages();

		if (!email || !username || !password || !confirmPassword) {
			error = 'Please fill in all fields';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			const res = await fetch('http://localhost:3001/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, username, password })
			});

			if (!res.ok) {
				error = await res.text();
				loading = false;
				return;
			}

			success = 'Account created! You can now log in.';
			mode = 'login';

			// Clear sensitive fields
			password = '';
			confirmPassword = '';
		} catch {
			error = 'Server not reachable';
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-page">
	<div class="login-card">
		<h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>

		<input placeholder="Email" type="email" bind:value={email} autocomplete="email" />

		{#if mode === 'register'}
			<input placeholder="Username" bind:value={username} />
		{/if}

		<input
			placeholder="Password"
			type="password"
			bind:value={password}
			autocomplete="current-password"
		/>

		{#if mode === 'register'}
			<input placeholder="Confirm password" type="password" bind:value={confirmPassword} />
		{/if}

		{#if error}
			<p class="error">{error}</p>
		{/if}

		{#if success}
			<p class="success">{success}</p>
		{/if}

		{#if mode === 'login'}
			<button on:click={login} disabled={loading}>
				{loading ? 'Logging in…' : 'Login'}
			</button>

			<p class="switch">
				No account?
				<span
					on:click={() => {
						mode = 'register';
						resetMessages();
					}}
				>
					Register here
				</span>
			</p>
		{:else}
			<button on:click={register} disabled={loading}>
				{loading ? 'Creating account…' : 'Register'}
			</button>

			<p class="switch">
				Already have an account?
				<span
					on:click={() => {
						mode = 'login';
						resetMessages();
					}}
				>
					Login here
				</span>
			</p>
		{/if}
	</div>
</div>

<style>
	.login-page {
		height: 100vh;
		display: grid;
		place-items: center;
		background: #121212;
	}

	.login-card {
		width: 340px;
		padding: 24px;
		background: #1c1c1c;
		border-radius: 18px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
	}

	h1 {
		text-align: center;
		font-size: 20px;
		margin-bottom: 6px;
	}

	input {
		padding: 12px;
		border-radius: 10px;
		border: none;
		background: #2a2a2a;
		color: white;
		font-size: 14px;
	}

	input:focus {
		outline: 2px solid #a855f7;
	}

	button {
		margin-top: 6px;
		padding: 12px;
		border-radius: 12px;
		background: #a855f7;
		color: white;
		border: none;
		font-weight: 600;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: #ef4444;
		font-size: 14px;
		text-align: center;
	}

	.success {
		color: #22c55e;
		font-size: 14px;
		text-align: center;
	}

	.switch {
		font-size: 13px;
		text-align: center;
		color: #aaa;
	}

	.switch span {
		color: #a855f7;
		cursor: pointer;
		margin-left: 4px;
	}

	.switch span:hover {
		text-decoration: underline;
	}
</style>
