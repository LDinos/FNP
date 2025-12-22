// src/lib/types/dm.ts

export type Conversation = {
	id: string;
	participants: {
		userId: string;
	}[];
};

export type Message = {
	id: string;
	conversationId: string;
	content: string;
	createdAt: string;
	sender: {
		id: string;
		username: string;
	};
};
