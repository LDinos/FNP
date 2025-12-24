import { PUBLIC_API_URL } from '$env/static/public';

export function formatAvatarUrl(avatarUrl: string): string {
    if (!avatarUrl) {
        return '/avatar-placeholder.png';
    }
	return `${PUBLIC_API_URL}${avatarUrl}`;
}

export function formatMessageTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();

	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const startOfYesterday = new Date(startOfToday);
	startOfYesterday.setDate(startOfYesterday.getDate() - 1);

	const time = date.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit'
	});

	if (date >= startOfToday) {
		return `Today ${time}`;
	}

	if (date >= startOfYesterday) {
		return `Yesterday ${time}`;
	}

	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();

	return `${day}/${month}/${year} ${time}`;
}
