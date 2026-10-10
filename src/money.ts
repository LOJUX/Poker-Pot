/**
 * Parse a user-entered amount in major units (e.g. "2.50", "£2.50", "2,50") into integer minor units.
 * Rejects amounts finer than one minor unit, e.g. "0.5" when playing with whole chips.
 */
export function parseAmount(text: string, unitScale: number): number {
  const cleaned = text.trim().replace(/[£$€\s]/g, '').replace(',', '.');
  const n = Number(cleaned);
  if (cleaned === '' || !Number.isFinite(n) || n < 0) throw new Error(`"${text}" is not a valid amount`);
  const minor = n * unitScale;
  if (Math.abs(minor - Math.round(minor)) > 1e-9) {
    throw new Error(unitScale === 1 ? `Chip amounts must be whole numbers ("${text}")` : `"${text}" has too many decimal places`);
  }
  return Math.round(minor);
}

/** Validate a small/big blind pair, with a specific message for each problem. */
export function checkBlinds(smallBlind: number, bigBlind: number) {
  if (smallBlind <= 0) throw new Error('Small blind must be more than zero');
  if (bigBlind < smallBlind) throw new Error('Big blind must be at least the small blind');
}

/** Integer minor units to a plain editable string in major units. */
export function toInput(amount: number, unitScale: number): string {
  return String(amount / unitScale);
}
