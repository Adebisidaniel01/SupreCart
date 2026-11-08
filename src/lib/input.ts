function stripControlCharacters(value: string, keepLineBreaks: boolean) {
  let output = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const allowedLineBreak = keepLineBreaks && (code === 0x09 || code === 0x0a);
    if (code === 0x7f || (code < 0x20 && !allowedLineBreak)) continue;
    output += character;
  }
  return output;
}

export function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return stripControlCharacters(value, false).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function cleanMultiline(value: unknown, maxLength = 4000) {
  if (typeof value !== "string") return "";
  return stripControlCharacters(value.replace(/\r\n?/g, "\n"), true)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function cleanEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function cleanPhone(value: unknown) {
  return cleanText(value, 32)
    .replace(/[^\d+()\-\s]/g, "")
    .trim();
}

export function cleanSecret(value: unknown, maxLength = 256) {
  if (typeof value !== "string") return "";
  return stripControlCharacters(value, false).slice(0, maxLength);
}
