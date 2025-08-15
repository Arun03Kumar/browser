export function lex(html) {
  const tokens = [];
  let buffer = "";
  let inTag = false;
  for (let i = 0; i < html.length; i++) {
    const c = html[i];
    if (c === "<") {
      if (!inTag && buffer) {
        tokens.push({ type: "text", text: buffer });
        buffer = "";
      }
      inTag = true;
    } else if (c === ">") {
      if (inTag) {
        tokens.push({ type: "tag", name: buffer.trim().toLowerCase() });
        buffer = "";
        inTag = false;
      }
    } else {
      buffer += c;
    }
  }
  if (!inTag && buffer) tokens.push({ type: "text", text: buffer });
  return tokens;
}
