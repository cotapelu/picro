/**
 * Reusable countdown timer for dialog components.
 *
 * Displays a countdown in seconds, updates every second,
 * and triggers a callback when the timer expires.
 */

export class CountdownTimer {
	private intervalId: ReturnType<typeof setInterval> | undefined;
	private remainingSeconds: number;

	constructor(
		timeoutMs: number,
		private onTick: (seconds: number) => void,
		private onExpire: () => void,
		private onRenderRequested?: () => void,
	) {
		this.remainingSeconds = Math.ceil(timeoutMs / 1000);
		this.onTick(this.remainingSeconds);

		this.intervalId = setInterval(() => {
			this.remainingSeconds--;
			this.onTick(this.remainingSeconds);
			onRenderRequested?.();

			if (this.remainingSeconds <= 0) {
				this.dispose();
				onExpire();
			}
		}, 1000);
	}

	dispose(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}
}
