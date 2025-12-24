<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let username = '';
  let error: string | null = null;

  function submit() {
    if (!username.trim()) {
      error = 'Username is required';
      return;
    }

    error = null;
    dispatch('submit', username.trim());
  }

  export function setError(message: string) {
    error = message;
  }

  function close() {
    dispatch('close');
  }
</script>

<div class="modal-backdrop" on:click={close}>
  <div class="modal" on:click|stopPropagation>
    <button class="close" on:click={close}>✕</button>

    <h3>Add Friend</h3>

    <input
      placeholder="Username"
      bind:value={username}
      on:keydown={(e) => e.key === 'Enter' && submit()}
    />

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button class="primary" on:click={submit}>
      Add
    </button>
  </div>
</div>

<style>
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
</style>
