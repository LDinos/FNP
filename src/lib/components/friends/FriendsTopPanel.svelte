<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Bell, UserPlus } from 'lucide-svelte';

  export let search = '';
  export let notificationCount = 0;

  const dispatch = createEventDispatcher();

  function onSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    dispatch('search', value);
  }

  function openNotifications() {
    dispatch('notifications');
  }

  function openAddFriend() {
    dispatch('addfriend');
  }
</script>

<div class="panel-header">
  <input
    class="search"
    placeholder="Search friends..."
    value={search}
    on:input={onSearchInput}
  />

  <div class="panel-actions">
    <button class="icon-btn bell" on:click={openNotifications}>
      <Bell size={18} />

      {#if notificationCount > 0}
        <span class="badge">{notificationCount}</span>
      {/if}
    </button>

    <button class="icon-btn" on:click={openAddFriend}>
      <UserPlus size={18} />
    </button>
  </div>
</div>

<style>
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
</style>