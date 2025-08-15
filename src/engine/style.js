// Simple CSS parsing & style cascade (Chapter 6 inspired)
// Supports: tag selectors, descendant selectors, inline style attribute,
// inherited properties: font-size, font-style, font-weight, color, background-color.

import { ElementNode } from "./lexer";

const INHERITED = {
  "font-size": "16px",
  "font-style": "normal",
  "font-weight": "normal",
  color: "#000000",
};

const NON_INHERITED_DEFAULTS = {
  "background-color": "transparent",
  margin: "0px",
  padding: "0px",
  border: "none",
  "text-decoration": "none",
  display: "inline",
};

// Default browser stylesheet
const DEFAULT_STYLESHEET = `
body {
  margin: 8px;
  font-family: Times, serif;
  font-size: 16px;
  color: #000000;
  background-color: #ffffff;
}

h1 {
  font-size: 32px;
  font-weight: bold;
  margin: 21px 0;
  display: block;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  margin: 19px 0;
  display: block;
}

h3 {
  font-size: 19px;
  font-weight: bold;
  margin: 16px 0;
  display: block;
}

h4 {
  font-size: 16px;
  font-weight: bold;
  margin: 14px 0;
  display: block;
}

h5 {
  font-size: 13px;
  font-weight: bold;
  margin: 12px 0;
  display: block;
}

h6 {
  font-size: 11px;
  font-weight: bold;
  margin: 10px 0;
  display: block;
}

p {
  margin: 16px 0;
  display: block;
}

a {
  color: #0000ee;
  text-decoration: underline;
}

a:visited {
  color: #551a8b;
}

strong, b {
  font-weight: bold;
}

em, i {
  font-style: italic;
}

div {
  display: block;
}

br {
  display: block;
}

ul, ol {
  margin: 16px 0;
  padding-left: 40px;
  display: block;
}

li {
  display: list-item;
  margin: 8px 0;
}

blockquote {
  margin: 16px 40px;
  display: block;
}

pre {
  margin: 16px 0;
  font-family: monospace;
  white-space: pre;
  display: block;
}

code {
  font-family: monospace;
}

input {
  border: 2px inset #cccccc;
  padding: 2px;
  background-color: white;
  color: black;
  font-family: inherit;
  font-size: inherit;
  display: inline-block;
}

button {
  border: 2px outset #cccccc;
  padding: 2px 6px;
  background-color: #f0f0f0;
  color: black;
  font-family: inherit;
  font-size: inherit;
  display: inline-block;
}

form {
  display: block;
}

fieldset {
  border: 2px groove #cccccc;
  padding: 8px;
  margin: 16px 0;
  display: block;
}

legend {
  font-weight: bold;
  padding: 0 4px;
}
`;

export class TagSelector {
  constructor(tag) {
    this.tag = tag;
    this.priority = 1;
  }
  matches(node) {
    return node instanceof ElementNode && node.tag === this.tag;
  }
}
export class DescendantSelector {
  constructor(ancestor, descendant) {
    this.ancestor = ancestor;
    this.descendant = descendant;
    this.priority = ancestor.priority + descendant.priority;
  }
  matches(node) {
    if (!this.descendant.matches(node)) return false;
    let cur = node.parent;
    while (cur) {
      if (this.ancestor.matches(cur)) return true;
      cur = cur.parent;
    }
    return false;
  }
}

export class CSSParser {
  constructor(text) {
    this.s = text;
    this.i = 0;
  }
  whitespace() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }
  literal(ch) {
    if (this.s[this.i] !== ch) throw new Error("CSS parse error");
    this.i++;
  }
  word() {
    const start = this.i;
    while (this.i < this.s.length && /[a-zA-Z0-9#_.%-]/.test(this.s[this.i]))
      this.i++;
    if (this.i === start) throw new Error("CSS parse error");
    return this.s.slice(start, this.i);
  }
  ignoreUntil(chars) {
    while (this.i < this.s.length) {
      if (chars.includes(this.s[this.i])) return this.s[this.i];
      this.i++;
    }
    return null;
  }
  body() {
    const decls = {};
    while (this.i < this.s.length && this.s[this.i] !== "}") {
      try {
        const prop = this.word().toLowerCase();
        this.whitespace();
        this.literal(":");
        this.whitespace();
        const val = this.word();
        decls[prop] = val;
        this.whitespace();
        if (this.s[this.i] === ";") {
          this.literal(";");
          this.whitespace();
        }
      } catch {
        const why = this.ignoreUntil(";}");
        if (why === ";") {
          this.literal(";");
          this.whitespace();
        } else break;
      }
    }
    return decls;
  }
  selector() {
    let first = new TagSelector(this.word().toLowerCase());
    this.whitespace();
    while (this.i < this.s.length && this.s[this.i] !== "{") {
      const next = new TagSelector(this.word().toLowerCase());
      first = new DescendantSelector(first, next);
      this.whitespace();
    }
    return first;
  }
  parse() {
    const rules = [];
    while (this.i < this.s.length) {
      try {
        this.whitespace();
        const sel = this.selector();
        this.literal("{");
        this.whitespace();
        const body = this.body();
        this.literal("}");
        rules.push([sel, body]);
      } catch {
        const why = this.ignoreUntil("}");
        if (why === null) break;
        if (this.s[this.i] === "}") {
          this.i++;
        }
      }
    }
    return rules;
  }
}

export function collectNodes(root) {
  const list = [];
  (function walk(n) {
    list.push(n);
    if (n.children) n.children.forEach(walk);
  })(root);
  return list;
}

function mergeStyles(node, rulesSorted) {
  // Start with inherited
  node.style = {};
  for (const prop of Object.keys(INHERITED)) {
    node.style[prop] =
      node.parent && node.parent.style
        ? node.parent.style[prop]
        : INHERITED[prop];
  }
  for (const prop of Object.keys(NON_INHERITED_DEFAULTS)) {
    node.style[prop] = NON_INHERITED_DEFAULTS[prop];
  }
  // Apply matching rules
  for (const [sel, body] of rulesSorted) {
    if (sel.matches && sel.matches(node)) {
      for (const [p, v] of Object.entries(body)) node.style[p] = v;
    }
  }
  // Inline style attribute quick parse (prop:value;...)
  if (node.attributes && node.attributes.style) {
    const parts = node.attributes.style.split(";");
    for (const part of parts) {
      if (!part.trim()) continue;
      const [p, ...rest] = part.split(":");
      if (!rest.length) continue;
      node.style[p.trim().toLowerCase()] = rest.join(":").trim();
    }
  }
  // Normalize font-size percentages
  if (node.style["font-size"] && node.style["font-size"].endsWith("%")) {
    const pct = parseFloat(node.style["font-size"]);
    const parentPx =
      parseFloat(
        (node.parent && node.parent.style
          ? node.parent.style["font-size"]
          : INHERITED["font-size"]
        ).replace("px", "")
      ) || 16;
    node.style["font-size"] = (parentPx * pct) / 100 + "px";
  }
  // Recurse
  node.children && node.children.forEach((ch) => mergeStyles(ch, rulesSorted));
}

export function applyStyles(root, { authorCSS = "", userCSS = "" } = {}) {
  // Start with default browser stylesheet
  let allCSS = DEFAULT_STYLESHEET;

  // Extract <style> embedded sheets
  let embedded = "";
  function extract(node) {
    if (node instanceof ElementNode && node.tag === "style") {
      node.children.forEach((ch) => {
        if (ch.text) embedded += ch.text;
      });
    }
    node.children && node.children.forEach(extract);
  }
  extract(root);

  // Combine all stylesheets in order
  allCSS += "\n" + embedded + "\n" + authorCSS + "\n" + userCSS;

  let rules = [];
  try {
    rules = new CSSParser(allCSS).parse();
  } catch (e) {
    console.warn("CSS parsing error:", e);
    rules = [];
  }
  const sorted = rules.sort((a, b) => a[0].priority - b[0].priority);
  if (root) mergeStyles(root, sorted);
  return rules;
}
