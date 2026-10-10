/** Parse a user-entered amount in major units (e.g. "2.50") into integer minor units. */
export function parseAmount(text: string, unitScale: number): number {
  const n = Number(text.trim());
  if (!Number.isFinite(n) || n < 0) throw new Error(`"${text}" is not a valid amount`);
  return Math.round(n * unitScale);
}

/** Integer minor units to a plain editable string in major units. */
export function toInput(amount: number, unitScale: number): string {
  return String(amount / unitScale);
}
