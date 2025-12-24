import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true, // 👈 THIS is the key
		port: 5173,
		allowedHosts: ['ldinos.ddns.net']
	}
});
