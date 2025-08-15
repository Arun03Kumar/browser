// Simple token lexer (Chapter 2/3 style) retained for fallback / tests.
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

// ---- Chapter 4: DOM tree construction (minimal) ----

export class TextNode {
  constructor(text, parent) {
    this.type = "text";
    this.text = text;
    this.parent = parent || null;
    this.children = [];
    this.style = {};
    this.is_focused = false;
  }
}

export class ElementNode {
  constructor(tag, attributes, parent) {
    this.type = "element";
    this.tag = tag;
    this.attributes = attributes || {};
    this.parent = parent || null;
    this.children = [];
    this.style = {};
    this.is_focused = false;
  }
}

const SELF_CLOSING = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const HEAD_TAGS = new Set([
  "base",
  "basefont",
  "bgsound",
  "noscript",
  "link",
  "meta",
  "title",
  "style",
  "script",
]);

export class HTMLParser {
  constructor(html) {
    this.html = html;
    this.unfinished = [];
  }

  parse() {
    let text = "";
    let inTag = false;
    for (let i = 0; i < this.html.length; i++) {
      const c = this.html[i];
      if (c === "<") {
        if (text) this.addText(text);
        text = "";
        inTag = true;
      } else if (c === ">") {
        this.addTag(text);
        text = "";
        inTag = false;
      } else {
        text += c;
      }
    }
    if (!inTag && text) this.addText(text);
    return this.finish();
  }

  addText(text) {
    if (text.trim() === "") return;
    this.implicitTags(null);
    const parent = this.unfinished[this.unfinished.length - 1];
    const node = new TextNode(text, parent || null);
    if (parent) parent.children.push(node);
    else this.unfinished.push(node); // edge case: stray text
  }

  addTag(raw) {
    const { tag, attrs } = this.getTagAndAttrs(raw);
    if (!tag) return;
    if (tag.startsWith("!")) return; // comments / doctype ignore
    this.implicitTags(tag);
    if (tag.startsWith("/")) {
      if (this.unfinished.length <= 1) return; // ignore extra close
      const node = this.unfinished.pop();
      const parent = this.unfinished[this.unfinished.length - 1];
      if (parent) parent.children.push(node);
    } else if (SELF_CLOSING.has(tag)) {
      const parent = this.unfinished[this.unfinished.length - 1] || null;
      const node = new ElementNode(tag, attrs, parent);
      if (parent) parent.children.push(node);
      else this.unfinished.push(node); // root self closing (rare)
    } else {
      const parent = this.unfinished[this.unfinished.length - 1] || null;
      const node = new ElementNode(tag, attrs, parent);
      this.unfinished.push(node);
    }
  }

  getTagAndAttrs(raw) {
    const parts = raw.trim().split(/\s+/);
    if (!parts[0]) return { tag: null, attrs: {} };
    const tag = parts[0].toLowerCase();
    const attrs = {};
    for (let i = 1; i < parts.length; i++) {
      const seg = parts[i];
      const eq = seg.indexOf("=");
      if (eq === -1) {
        attrs[seg.toLowerCase()] = "";
      } else {
        const k = seg.slice(0, eq).toLowerCase();
        let v = seg.slice(eq + 1);
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        attrs[k] = v;
      }
    }
    return { tag, attrs };
  }

  implicitTags(nextTag) {
    while (true) {
      const open = this.unfinished.map((n) => n.tag).filter(Boolean);
      if (open.length === 0 && nextTag !== "html") {
        this.addTag("html");
      } else if (
        open.length === 1 &&
        open[0] === "html" &&
        !["head", "body", "/html"].includes(nextTag || "")
      ) {
        if (HEAD_TAGS.has(nextTag)) this.addTag("head");
        else this.addTag("body");
      } else if (
        open.length === 2 &&
        open[0] === "html" &&
        open[1] === "head" &&
        !["/head", ...HEAD_TAGS].includes(nextTag || "")
      ) {
        this.addTag("/head");
      } else {
        break;
      }
    }
  }

  finish() {
    if (!this.unfinished.length) this.implicitTags(null);
    while (this.unfinished.length > 1) {
      const node = this.unfinished.pop();
      const parent = this.unfinished[this.unfinished.length - 1];
      if (parent) parent.children.push(node);
    }
    return this.unfinished.pop();
  }
}
