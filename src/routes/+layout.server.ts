import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('token');

	if (!token && url.pathname !== '/login') {
		throw redirect(302, '/login');
	}

	if (token && url.pathname === '/login') {
		throw redirect(302, '/friends');
	}
};
