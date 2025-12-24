<script lang="ts">
    import { formatAvatarUrl } from '$lib/utils';

    export let user;
</script>

<div class="profile-card">
  <img
    src={formatAvatarUrl(user?.avatarUrl)}
    alt="avatar"
  />

  <div class="info">
    <h2>{user?.username}</h2>
  </div>
</div>

<style>
    .profile-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px;
        border-radius: 16px;
        background: #161616;
    }

    .profile-card img {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    }

    .profile-card h2 {
    margin: 0;
    color: white;
    }
</style>