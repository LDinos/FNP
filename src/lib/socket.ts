import { io, type Socket } from 'socket.io-client';
import { PUBLIC_API_URL } from '$env/static/public';

export const socket: Socket = io(`${PUBLIC_API_URL}`, {
	withCredentials: true,
	autoConnect: false,
	transports: ['websocket'] // important for reliability
});
