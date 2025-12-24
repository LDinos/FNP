let messageSound: HTMLAudioElement | null = null;

export function playMessageSound() {
	if (!messageSound) {
		messageSound = new Audio('/sounds/message.ogg');
		messageSound.volume = 0.6;
	}

	// rewind so rapid messages still play
	messageSound.currentTime = 0;
	messageSound.play().catch(() => {
		// autoplay blocked or tab inactive — safe to ignore
	});
}
