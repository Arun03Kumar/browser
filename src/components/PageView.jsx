import { useEffect, useRef } from "react";
import { lex } from "../engine/lexer";
import { layout, PAGE_WIDTH } from "../engine/layout";

export default function PageView({ tab, onUpdateTab }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!tab || !tab.html) return;
    let { tokens, displayList } = tab;
    if (!tokens) {
      tokens = lex(tab.html);
      displayList = layout(tokens);
      onUpdateTab(tab.id, { tokens, displayList });
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const height = (displayList.length
      ? Math.max(...displayList.map(d => d.y + 24))
      : 400);
    canvas.width = PAGE_WIDTH;
    canvas.height = height;
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e6e6e6";
    for (const item of displayList) {
      ctx.font = item.font;
      ctx.fillText(item.text, item.x, item.y);
    }
  }, [tab, onUpdateTab]);

  return (
    <div className="w-full h-full overflow-auto">
      <canvas ref={canvasRef} className="block mx-auto" />
    </div>
  );
}
