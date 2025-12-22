import { io, type Socket } from 'socket.io-client';

export const socket: Socket = io('http://localhost:3001', {
	withCredentials: true,
	autoConnect: false,
	transports: ['websocket'] // important for reliability
});
