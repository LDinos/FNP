<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let notifications: {
    id: string;
    from: { username: string };
  }[] = [];

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function accept(id: string) {
    dispatch('respond', { id, accept: true });
  }

  function decline(id: string) {
    dispatch('respond', { id, accept: false });
  }
</script>

<div class="modal-backdrop" on:click={close}>
  <div class="modal" on:click|stopPropagation>
    <button class="close" on:click={close}>✕</button>

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
            <button class="accept" on:click={() => accept(n.id)}>
              Accept
            </button>

            <button class="decline" on:click={() => decline(n.id)}>
              Decline
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
<style>
    .empty {
		color: #aaa;
		font-size: 14px;
		text-align: center;
		margin-top: 12px;
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