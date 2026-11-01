/** Formats money in pounds with a thousands separator, such as "£1,200". */
export function formatMoney(amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
