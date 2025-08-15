// Chapter 5 style block + inline layout engine (simplified for canvas rendering)
// Uses the DOM tree produced by HTMLParser (ElementNode/TextNode) from lexer.js

import { ElementNode, TextNode } from "./lexer";
import { applyStyles } from "./style.js";

export const PAGE_WIDTH = 900;
export const HSTEP = 16;
export const VSTEP = 18;

const INPUT_WIDTH_PX = 200;
const INPUT_HEIGHT_PX = 24;

function fontString(size, weight, style) {
  return `${style === "italic" ? "italic" : "normal"} ${
    weight === "bold" ? "bold" : "normal"
  } ${size}px system-ui`;
}

export class DocumentLayoutNode {
  constructor(tree) {
    this.node = tree;
    this.parent = null;
    this.children = [];
    this.x = HSTEP;
    this.y = VSTEP;
    this.width = PAGE_WIDTH - 2 * HSTEP;
    this.height = 0;
  }

  layout(containerWidth = PAGE_WIDTH) {
    this.width = containerWidth - 2 * HSTEP;
    this.x = HSTEP;
    this.y = VSTEP;

    const child = new BlockLayoutNode(this.node, this, null);
    this.children = [child];
    child.layout();
    this.height = child.height;
    return this;
  }

  paint() {
    return [];
  }
}

export class BlockLayoutNode {
  constructor(node, parent, previous) {
    this.node = node;
    this.parent = parent;
    this.previous = previous;
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }

  layout() {
    this.x = this.parent.x;
    this.width = this.parent.width;

    if (this.previous) {
      this.y = this.previous.y + this.previous.height;
    } else {
      this.y = this.parent.y;
    }

    const mode = this.layoutMode();
    if (mode === "block") {
      let previous = null;
      for (const child of this.node.children) {
        const next = new BlockLayoutNode(child, this, previous);
        this.children.push(next);
        previous = next;
      }
    } else {
      this.newLine();
      this.recurse(this.node);
    }

    for (const child of this.children) {
      child.layout();
    }

    this.height = this.children.reduce((sum, child) => sum + child.height, 0);

    // Add margins
    if (this.node.style && this.node.style["margin-top"]) {
      const marginTop = parseFloat(this.node.style["margin-top"]);
      if (!isNaN(marginTop)) {
        this.y += marginTop;
      }
    }
  }

  layoutMode() {
    if (this.node.type === "text") {
      return "inline";
    }

    const hasBlockChildren = this.node.children.some(
      (child) => child.type === "element" && this.isBlockElement(child.tag)
    );

    if (hasBlockChildren) {
      return "block";
    }

    if (this.node.children.length > 0 || this.isInlineElement(this.node.tag)) {
      return "inline";
    }

    return "block";
  }

  isBlockElement(tag) {
    return [
      "html",
      "body",
      "div",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "form",
      "fieldset",
    ].includes(tag);
  }

  isInlineElement(tag) {
    return ["span", "a", "strong", "em", "input", "button", "label"].includes(
      tag
    );
  }

  newLine() {
    this.cursorX = 0;
    const lastLine = this.children[this.children.length - 1];
    const newLine = new LineLayoutNode(this.node, this, lastLine);
    this.children.push(newLine);
  }

  recurse(node) {
    if (node.type === "text") {
      const words = node.text.split(/\s+/).filter((w) => w.length > 0);
      for (const word of words) {
        this.word(node, word);
      }
    } else if (node.tag === "br") {
      this.newLine();
    } else if (node.tag === "input" || node.tag === "button") {
      this.input(node);
    } else {
      for (const child of node.children) {
        this.recurse(child);
      }
    }
  }

  word(node, word) {
    const fontSize = parseFloat(node.style?.["font-size"]) || 16;
    const fontWeight = node.style?.["font-weight"] || "normal";
    const fontStyle = node.style?.["font-style"] || "normal";
    const font = fontString(fontSize, fontWeight, fontStyle);

    // Create a canvas to measure text
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const w = ctx.measureText(word).width;

    if (this.cursorX + w > this.width) {
      this.newLine();
    }

    const line = this.children[this.children.length - 1];
    const previousWord = line.children[line.children.length - 1] || null;
    const textLayout = new TextLayoutNode(node, word, line, previousWord);
    line.children.push(textLayout);

    const spaceWidth = ctx.measureText(" ").width;
    this.cursorX += w + spaceWidth;
  }

  input(node) {
    const w = INPUT_WIDTH_PX;
    if (this.cursorX + w > this.width) {
      this.newLine();
    }

    const line = this.children[this.children.length - 1];
    const previousWord = line.children[line.children.length - 1] || null;
    const input = new InputLayoutNode(node, line, previousWord);
    line.children.push(input);

    const fontSize = parseFloat(node.style?.["font-size"]) || 16;
    const font = fontString(fontSize, "normal", "normal");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const spaceWidth = ctx.measureText(" ").width;

    this.cursorX += w + spaceWidth;
  }

  paint() {
    const cmds = [];
    const bgcolor = this.node.style?.["background-color"];
    if (bgcolor && bgcolor !== "transparent") {
      cmds.push({
        type: "rect",
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        color: bgcolor,
      });
    }
    return cmds;
  }
}

export class LineLayoutNode {
  constructor(node, parent, previous) {
    this.node = node;
    this.parent = parent;
    this.previous = previous;
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }

  layout() {
    this.width = this.parent.width;
    this.x = this.parent.x;

    if (this.previous) {
      this.y = this.previous.y + this.previous.height;
    } else {
      this.y = this.parent.y;
    }

    for (const word of this.children) {
      word.layout();
    }

    if (this.children.length === 0) {
      this.height = 0;
      return;
    }

    // Calculate baseline
    const maxAscent = Math.max(
      ...this.children.map((child) => {
        if (child.font) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          ctx.font = child.font;
          const metrics = ctx.measureText("M");
          return metrics.actualBoundingBoxAscent || 12;
        }
        return INPUT_HEIGHT_PX * 0.8; // For input elements
      })
    );

    const baseline = this.y + 1.25 * maxAscent;

    for (const word of this.children) {
      if (word.font) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.font = word.font;
        const metrics = ctx.measureText("M");
        const ascent = metrics.actualBoundingBoxAscent || 12;
        word.y = baseline - ascent;
      } else {
        // Input elements
        word.y = baseline - INPUT_HEIGHT_PX * 0.8;
      }
    }

    const maxDescent = Math.max(
      ...this.children.map((child) => {
        if (child.font) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          ctx.font = child.font;
          const metrics = ctx.measureText("M");
          return metrics.actualBoundingBoxDescent || 4;
        }
        return INPUT_HEIGHT_PX * 0.2;
      })
    );

    this.height = 1.25 * (maxAscent + maxDescent);
  }

  paint() {
    return [];
  }
}

export class TextLayoutNode {
  constructor(node, word, parent, previous) {
    this.node = node;
    this.word = word;
    this.parent = parent;
    this.previous = previous;
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.font = null;
  }

  layout() {
    const fontSize = parseFloat(this.node.style?.["font-size"]) || 16;
    const fontWeight = this.node.style?.["font-weight"] || "normal";
    const fontStyle = this.node.style?.["font-style"] || "normal";
    this.font = fontString(fontSize, fontWeight, fontStyle);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = this.font;
    this.width = ctx.measureText(this.word).width;

    if (this.previous) {
      const spaceWidth = ctx.measureText(" ").width;
      this.x = this.previous.x + this.previous.width + spaceWidth;
    } else {
      this.x = this.parent.x;
    }

    this.height = fontSize * 1.2; // Line height
  }

  paint() {
    const color = this.node.style?.color || "#000000";
    return [
      {
        type: "text",
        x: this.x,
        y: this.y,
        text: this.word,
        font: this.font,
        color: color,
        node: this.node,
      },
    ];
  }
}

export class InputLayoutNode {
  constructor(node, parent, previous) {
    this.node = node;
    this.parent = parent;
    this.previous = previous;
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.width = INPUT_WIDTH_PX;
    this.height = INPUT_HEIGHT_PX;
    this.font = null;
  }

  layout() {
    const fontSize = parseFloat(this.node.style?.["font-size"]) || 16;
    const fontWeight = this.node.style?.["font-weight"] || "normal";
    const fontStyle = this.node.style?.["font-style"] || "normal";
    this.font = fontString(fontSize, fontWeight, fontStyle);

    if (this.previous) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.font = this.font;
      const spaceWidth = ctx.measureText(" ").width;
      this.x = this.previous.x + this.previous.width + spaceWidth;
    } else {
      this.x = this.parent.x;
    }
  }

  paint() {
    const cmds = [];

    // Background
    const bgcolor = this.node.style?.["background-color"] || "#ffffff";
    cmds.push({
      type: "rect",
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: bgcolor,
    });

    // Border
    cmds.push({
      type: "border",
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.node.isFocused ? "#0066cc" : "#cccccc",
      thickness: this.node.isFocused ? 2 : 1,
    });

    // Text content
    let text = "";
    if (this.node.tag === "input") {
      text =
        this.node.attributes.value || this.node.attributes.placeholder || "";
    } else if (this.node.tag === "button") {
      text =
        this.node.children.find((child) => child.type === "text")?.text ||
        "Button";
    }

    const color = this.node.style?.color || "#000000";
    cmds.push({
      type: "text",
      x: this.x + 4, // Padding
      y: this.y + this.height / 2 + 6, // Center vertically
      text: text,
      font: this.font,
      color: color,
      node: this.node,
    });

    // Cursor for focused input
    if (this.node.isFocused && this.node.tag === "input") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.font = this.font;
      const textWidth = ctx.measureText(text).width;

      cmds.push({
        type: "cursor",
        x: this.x + 4 + textWidth,
        y: this.y + 2,
        width: 1,
        height: this.height - 4,
        color: "#000000",
      });
    }

    return cmds;
  }
}

export function computeBlockLayout(tree, containerWidth = PAGE_WIDTH) {
  if (!tree) return [];

  try {
    applyStyles(tree);
    const document = new DocumentLayoutNode(tree);
    document.layout(containerWidth);

    const displayList = [];
    function paintTree(layoutObject) {
      if (layoutObject.paint) {
        displayList.push(...layoutObject.paint());
      }
      if (layoutObject.children) {
        for (const child of layoutObject.children) {
          paintTree(child);
        }
      }
    }

    paintTree(document);
    return displayList;
  } catch (error) {
    console.error("Block layout error:", error);
    return [];
  }
}
