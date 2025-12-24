<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatAvatarUrl } from '$lib/utils';

  export let avatarUrl: string | null = null;
  const dispatch = createEventDispatcher();

  let file: File | null = null;
  let preview = formatAvatarUrl(avatarUrl);

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    file = input.files[0];
    preview = URL.createObjectURL(file);
  }

  function save() {
    if (!file) return;
    dispatch('save', file);
  }
</script>

<div class="avatar-editor">
  <h3>Profile Picture</h3>

  <div class="editor-row">
    <img src={preview} alt="preview" />

    <div class="controls">
      <input type="file" accept="image/*" on:change={onFileChange} />
      <button on:click={save} disabled={!file}>
        Save
      </button>
    </div>
  </div>
</div>

<style>
    .avatar-editor {
        padding: 20px;
        border-radius: 16px;
        background: #161616;
    }

    .avatar-editor h3 {
        margin-bottom: 16px;
        color: white;
    }

    .editor-row {
        display: flex;
        gap: 20px;
        align-items: center;
    }

    .editor-row img {
        width: 80px;
        height: 80px;
        border-radius: 50%;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .controls input {
        padding: 8px 12px;
        border-radius: 10px;
        border: none;
        background: #0f0f0f;
        color: white;
    }

    .controls button {
        align-self: flex-start;
        padding: 8px 14px;
        border-radius: 10px;
        background: #7c3aed;
        color: white;
        border: none;
        cursor: pointer;
    }
</style>