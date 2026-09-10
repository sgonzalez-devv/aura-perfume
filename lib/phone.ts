/**
 * Formats a DR phone number as +1 (8X9) XXX-XXXX while the user types.
 * Strips non-digits, removes leading country code if present, caps at 10 digits.
 */
export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1)
  digits = digits.slice(0, 10)

  if (digits.length === 0) return ''
  if (digits.length <= 3) return `+1 (${digits}`
  if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
