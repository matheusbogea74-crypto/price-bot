/**
 * Resolves after `ms` milliseconds. Used to space out sequential
 * scrapes/sends so they don't fire in a tight, bot-like burst.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random delay in milliseconds within [min, max), for jittering
 * the spacing between sequential operations.
 */
export function randomDelayMs(min, max) {
  return min + Math.random() * (max - min);
}
