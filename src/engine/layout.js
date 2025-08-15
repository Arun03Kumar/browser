// Constants akin to WIDTH, HSTEP, VSTEP
export const PAGE_WIDTH = 900;
export const HSTEP = 16;
export const VSTEP = 18;

function fontString(size, weight, style) {
  return `${style === "italic" ? "italic" : "normal"} ${
    weight === "bold" ? "bold" : "normal"
  } ${size}px system-ui`;
}

// Token-based layout (legacy / fallback)
export function layout(tokens, { width = PAGE_WIDTH } = {}) {
  // Offscreen canvas for metrics
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let cursorX = HSTEP;
  let cursorY = VSTEP;
  let weight = "normal";
  let style = "roman";
  let size = 16; // browser-like default base font size

  let line = [];
  const displayList = [];

  function flush() {
    if (!line.length) return;
    const asc = Math.max(...line.map((i) => i.m.actualBoundingBoxAscent));
    const desc = Math.max(...line.map((i) => i.m.actualBoundingBoxDescent));
    const baseline = cursorY + asc;
    for (const w of line) {
      displayList.push({
        type: "text",
        x: w.x,
        y: baseline - w.m.actualBoundingBoxAscent,
        text: w.text,
        font: w.font,
        color: "#e6e6e6",
        width: w.m.width,
        height: w.m.actualBoundingBoxAscent + w.m.actualBoundingBoxDescent,
      });
    }
    cursorY += asc + desc + 6;
    cursorX = HSTEP;
    line = [];
  }

  function addWord(word) {
    const font = fontString(size, weight, style);
    ctx.font = font;
    const m = ctx.measureText(word);
    if (cursorX + m.width > width - HSTEP) flush();
    line.push({ x: cursorX, text: word, font, m });
    cursorX += m.width + ctx.measureText(" ").width;
  }

  for (const t of tokens) {
    if (t.type === "text") {
      t.text.split(/\s+/).filter(Boolean).forEach(addWord);
    } else {
      switch (t.name) {
        case "b":
          weight = "bold";
          break;
        case "/b":
          weight = "normal";
          break;
        case "i":
          style = "italic";
          break;
        case "/i":
          style = "roman";
          break;
        case "small":
          size = Math.max(6, size - 2);
          break;
        case "/small":
          size += 2;
          break;
        case "big":
          size += 4;
          break;
        case "/big":
          size = Math.max(6, size - 4);
          break;
        case "br":
          flush();
          break;
        case "/p":
          flush();
          cursorY += VSTEP;
          break;
        default:
          break;
      }
    }
  }
  flush();
  return displayList;
}

// Tree-based layout (Chapter 4 style) expects a root node with children.
export function layoutFromTree(root, { width = PAGE_WIDTH } = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let cursorX = HSTEP;
  let cursorY = VSTEP;
  let weight = "normal";
  let style = "roman";
  let size = 16; // browser-like default base font size
  let line = [];
  const displayList = [];

  function flush() {
    if (!line.length) return;
    const asc = Math.max(...line.map((i) => i.m.actualBoundingBoxAscent));
    const desc = Math.max(...line.map((i) => i.m.actualBoundingBoxDescent));
    const baseline = cursorY + asc;
    for (const w of line) {
      displayList.push({
        type: "text",
        x: w.x,
        y: baseline - w.m.actualBoundingBoxAscent,
        text: w.text,
        font: w.font,
        color: "#e6e6e6",
        width: w.m.width,
        height: w.m.actualBoundingBoxAscent + w.m.actualBoundingBoxDescent,
      });
    }
    cursorY += asc + desc + 6;
    cursorX = HSTEP;
    line = [];
  }

  function addWord(word) {
    const font = fontString(size, weight, style);
    ctx.font = font;
    const m = ctx.measureText(word);
    if (cursorX + m.width > width - HSTEP) flush();
    line.push({ x: cursorX, text: word, font, m });
    cursorX += m.width + ctx.measureText(" ").width;
  }

  function openTag(tag) {
    switch (tag) {
      case "i":
        style = "italic";
        break;
      case "b":
        weight = "bold";
        break;
      case "small":
        size = Math.max(6, size - 2);
        break;
      case "big":
        size += 4;
        break;
      case "br":
        flush();
        break;
    }
  }
  function closeTag(tag) {
    switch (tag) {
      case "i":
        style = "roman";
        break;
      case "b":
        weight = "normal";
        break;
      case "small":
        size += 2;
        break;
      case "big":
        size = Math.max(6, size - 4);
        break;
      case "p":
        flush();
        cursorY += VSTEP;
        break;
    }
  }

  function recurse(node) {
    if (!node) return;
    if (node.type === "text") {
      node.text.split(/\s+/).filter(Boolean).forEach(addWord);
    } else if (node.type === "element") {
      openTag(node.tag);
      for (const child of node.children) recurse(child);
      closeTag(node.tag);
    }
  }

  recurse(root);
  flush();
  return displayList;
}
