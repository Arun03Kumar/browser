// Enhanced block + inline layout engine with proper CSS styling support
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

// Parse CSS dimension values
function parseDimension(value, defaultValue = 0) {
  if (!value || value === "auto") return defaultValue;
  if (typeof value === "number") return value;
  const match = String(value).match(/^(\d+(?:\.\d+)?)(px|em|%)?$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2] || "px";
    if (unit === "px") return num;
    if (unit === "em") return num * 16; // Assume 16px base font size
    if (unit === "%") return num; // Return percentage as-is
  }
  return defaultValue;
}

// Get margin/padding values from CSS
function getSpacing(style, property) {
  const value = style[property] || "0px";
  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    const val = parseDimension(parts[0]);
    return { top: val, right: val, bottom: val, left: val };
  } else if (parts.length === 2) {
    const vertical = parseDimension(parts[0]);
    const horizontal = parseDimension(parts[1]);
    return {
      top: vertical,
      right: horizontal,
      bottom: vertical,
      left: horizontal,
    };
  } else if (parts.length === 4) {
    return {
      top: parseDimension(parts[0]),
      right: parseDimension(parts[1]),
      bottom: parseDimension(parts[2]),
      left: parseDimension(parts[3]),
    };
  }

  return { top: 0, right: 0, bottom: 0, left: 0 };
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
    this.height = child.height + VSTEP; // Add bottom margin
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

    // CSS properties
    this.margin = { top: 0, right: 0, bottom: 0, left: 0 };
    this.padding = { top: 0, right: 0, bottom: 0, left: 0 };
    this.border = { top: 0, right: 0, bottom: 0, left: 0 };

    // Cursor for inline layout
    this.cursorX = 0;
  }

  layout() {
    // Calculate margins and padding from CSS
    if (this.node.style) {
      this.margin = getSpacing(this.node.style, "margin");
      this.padding = getSpacing(this.node.style, "padding");

      // Simple border handling
      const borderWidth = parseDimension(
        this.node.style["border-width"] || "0px"
      );
      this.border = {
        top: borderWidth,
        right: borderWidth,
        bottom: borderWidth,
        left: borderWidth,
      };
    }

    // Position calculation with proper spacing
    this.x = this.parent.x + this.margin.left;
    this.width = this.parent.width - this.margin.left - this.margin.right;

    if (this.previous) {
      this.y =
        this.previous.y +
        this.previous.height +
        this.previous.margin.bottom +
        this.margin.top;
    } else {
      this.y = this.parent.y + this.margin.top;
    }

    const mode = this.layoutMode();

    if (mode === "block") {
      this.layoutBlockChildren();
    } else {
      this.layoutInlineChildren();
    }

    this.calculateHeight();
  }

  layoutBlockChildren() {
    let previous = null;
    for (const child of this.node.children) {
      const next = new BlockLayoutNode(child, this, previous);
      this.children.push(next);
      next.layout();
      previous = next;
    }
  }

  layoutInlineChildren() {
    this.newLine();
    this.recurse(this.node);

    // Layout all line children
    for (const child of this.children) {
      child.layout();
    }
  }

  calculateHeight() {
    if (this.children.length === 0) {
      // Minimum height for empty elements
      const fontSize = parseDimension(this.node.style?.["font-size"] || "16px");
      this.height =
        Math.max(fontSize * 1.2, 20) + this.padding.top + this.padding.bottom;
    } else {
      const childrenHeight = this.children.reduce((total, child) => {
        return Math.max(total, child.y + child.height - this.y);
      }, 0);
      this.height = childrenHeight + this.padding.top + this.padding.bottom;
    }

    // Add border to height
    this.height += this.border.top + this.border.bottom;
  }

  layoutMode() {
    if (this.node.type === "text") {
      return "inline";
    }

    // Check CSS display property
    const display = this.node.style?.display;
    if (display === "block") return "block";
    if (display === "inline") return "inline";
    if (display === "none") return "none";

    // Default behavior based on tag
    const hasBlockChildren = this.node.children?.some(
      (child) => child.type === "element" && this.isBlockElement(child.tag)
    );

    if (hasBlockChildren) {
      return "block";
    }

    if (this.node.children?.length > 0 || this.isInlineElement(this.node.tag)) {
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
      "ul",
      "ol",
      "li",
      "header",
      "footer",
      "section",
      "article",
    ].includes(tag);
  }

  isInlineElement(tag) {
    return [
      "span",
      "a",
      "strong",
      "em",
      "input",
      "button",
      "label",
      "code",
      "small",
    ].includes(tag);
  }

  newLine() {
    this.cursorX = this.padding.left;
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
      for (const child of node.children || []) {
        this.recurse(child);
      }
    }
  }

  word(node, word) {
    const fontSize = parseDimension(node.style?.["font-size"] || "16px");
    const fontWeight = node.style?.["font-weight"] || "normal";
    const fontStyle = node.style?.["font-style"] || "normal";
    const font = fontString(fontSize, fontWeight, fontStyle);

    // Create a canvas to measure text
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const w = ctx.measureText(word).width;

    if (this.cursorX + w > this.width - this.padding.right) {
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
    if (this.cursorX + w > this.width - this.padding.right) {
      this.newLine();
    }

    const line = this.children[this.children.length - 1];
    const previousWord = line.children[line.children.length - 1] || null;
    const input = new InputLayoutNode(node, line, previousWord);
    line.children.push(input);

    const fontSize = parseDimension(node.style?.["font-size"] || "16px");
    const font = fontString(fontSize, "normal", "normal");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const spaceWidth = ctx.measureText(" ").width;

    this.cursorX += w + spaceWidth;
  }

  paint() {
    const cmds = [];

    // Paint background
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

    // Paint border
    if (this.border.top > 0) {
      const borderColor = this.node.style?.["border-color"] || "#000000";
      cmds.push({
        type: "border",
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        color: borderColor,
        thickness: this.border.top,
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
  if (!tree) {
    return [];
  }

  try {
    applyStyles(tree);
    const document = new DocumentLayoutNode(tree);
    document.layout(containerWidth);

    const displayList = [];
    function paintTree(layoutObject) {
      if (layoutObject.paint) {
        const paintCommands = layoutObject.paint();
        displayList.push(...paintCommands);
      }
      if (layoutObject.children) {
        for (const child of layoutObject.children) {
          paintTree(child);
        }
      }
    }

    paintTree(document);

    if (displayList.length === 0) {
      console.log("No display commands generated");
      console.log("Tree structure:", JSON.stringify(tree, null, 2));
    } else {
      console.log("Generated", displayList.length, "display commands");
    }

    return displayList;
  } catch (error) {
    console.error("Block layout error:", error);
    return [];
  }
}
