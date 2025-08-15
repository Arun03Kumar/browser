// Constants akin to WIDTH, HSTEP, VSTEP
export const PAGE_WIDTH = 900;
export const HSTEP = 16;
export const VSTEP = 18;

function fontString(size, weight, style) {
  return `${style === "italic" ? "italic" : "normal"} ${
    weight === "bold" ? "bold" : "normal"
  } ${size}px system-ui`;
}

export function layout(tokens) {
  // Offscreen canvas for metrics
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let cursorX = HSTEP;
  let cursorY = VSTEP;
  let weight = "normal";
  let style = "roman";
  let size = 12;

  let line = [];
  const displayList = [];

  function flush() {
    if (!line.length) return;
    const asc = Math.max(...line.map((i) => i.m.actualBoundingBoxAscent));
    const desc = Math.max(...line.map((i) => i.m.actualBoundingBoxDescent));
    const baseline = cursorY + asc;
    for (const w of line) {
      displayList.push({
        x: w.x,
        y: baseline - w.m.actualBoundingBoxAscent,
        text: w.text,
        font: w.font,
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
    if (cursorX + m.width > PAGE_WIDTH - HSTEP) flush();
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
