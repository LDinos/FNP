<script lang="ts">
	import ProfileCard from '$lib/components/profile/ProfileCard.svelte';
	import AvatarEditor from '$lib/components/profile/AvatarEditor.svelte';
	import { currentUser } from '$lib/stores/user';
	import { PUBLIC_API_URL } from '$env/static/public';

	async function updateAvatar(file: File) {
		const form = new FormData();
		form.append('avatar', file);

		const res = await fetch(`${PUBLIC_API_URL}/profile/avatar`, {
			method: 'POST',
			credentials: 'include',
			body: form
		});

		const updated = await res.json();
		currentUser.update(u => ({ ...u, avatarUrl: updated.avatarUrl }));
	}
</script>

<div class="profile-page">
  <ProfileCard user={$currentUser} />
  <AvatarEditor
    avatarUrl={$currentUser?.avatarUrl}
    on:save={(e) => updateAvatar(e.detail)}
  />
</div>

<style>
	.profile-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
</style>