export function normalizeUrl(input) {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+\.[\w.-]+/.test(trimmed)) return "https://" + trimmed;
  // Otherwise, treat as search
  const query = encodeURIComponent(trimmed);
  return `https://www.google.com/search?q=${query}`;
}
