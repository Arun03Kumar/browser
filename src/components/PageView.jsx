import { useEffect, useRef, useState } from "react";
import { lex } from "../engine/lexer";
import { layout, layoutFromTree, PAGE_WIDTH } from "../engine/layout";
import { HTMLParser } from "../engine/lexer";
import { computeBlockLayout } from "../engine/blockLayout";
import { executeJavaScript, triggerEvent } from "../engine/quickjs-engine";

export default function PageView({ tab, onUpdateTab, onNavigate }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const hitListRef = useRef([]);
  const [focusedElement, setFocusedElement] = useState(null);
  const [jsInterpreter, setJsInterpreter] = useState(null);

  useEffect(() => {
    if (!tab || !tab.html) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const containerWidth = containerRef.current?.clientWidth || PAGE_WIDTH;

      let { tree, displayList } = tab;

      // Parse HTML if tree doesn't exist
      if (!tree) {
        const parser = new HTMLParser(tab.html);
        tree = parser.parse();

        // Execute JavaScript if present
        if (tree.scripts && tree.scripts.length > 0) {
          console.log("Executing JavaScript:", tree.scripts);

          // Create DOM element map for JavaScript access
          const domElements = new Map();
          function buildDOMMap(node) {
            if (node.type === "element" && node.attributes.id) {
              domElements.set(node.attributes.id, node);
            }
            if (node.children) {
              node.children.forEach(buildDOMMap);
            }
          }
          buildDOMMap(tree);

          // Execute each script asynchronously
          (async () => {
            for (const script of tree.scripts) {
              try {
                await executeJavaScript(script, domElements);
              } catch (error) {
                console.error("Script execution error:", error);
              }
            }
          })();
        }

        displayList = computeBlockLayout(tree, containerWidth);
        onUpdateTab(tab.id, { tree, displayList });
      }

      if (!displayList) {
        displayList = [];
      }

      if (displayList.length === 0) {
        displayList = computeBlockLayout(tree, containerWidth);
        if (displayList.length > 0) {
          onUpdateTab(tab.id, { displayList });
        }
      }

      // Set canvas dimensions
      const height = Math.max(
        displayList.length > 0
          ? Math.max(
              ...displayList.map((item) => (item.y || 0) + (item.height || 20))
            ) + 40
          : 600,
        400
      );

      canvas.width = containerWidth;
      canvas.height = height;

      // Clear canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Build hit list for click detection
      const hitList = [];

      // Render display list
      for (const item of displayList) {
        if (item.type === "text") {
          ctx.fillStyle = item.color || "#000000";
          ctx.font = item.font || "16px system-ui";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(item.text, item.x, item.y);

          // Add to hit list if it's a link
          if (
            item.node &&
            item.node.linkNode &&
            item.node.linkNode.attributes.href
          ) {
            const metrics = ctx.measureText(item.text);
            hitList.push({
              x: item.x,
              y: item.y - 12,
              width: metrics.width,
              height: 16,
              node: item.node.linkNode,
              type: "link",
            });
          }

          // Add to hit list if it's an input or button
          if (
            item.node &&
            (item.node.tag === "input" || item.node.tag === "button")
          ) {
            hitList.push({
              x: item.x - 4,
              y: item.y - 16,
              width: 200,
              height: 24,
              node: item.node,
              type: item.node.tag,
            });
          }
        } else if (item.type === "rect") {
          ctx.fillStyle = item.color;
          ctx.fillRect(item.x, item.y, item.width, item.height);
        } else if (item.type === "border") {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.thickness;
          ctx.strokeRect(item.x, item.y, item.width, item.height);
        } else if (item.type === "cursor") {
          ctx.fillStyle = item.color;
          ctx.fillRect(item.x, item.y, item.width, item.height);
        }
      }

      hitListRef.current = hitList;
    } catch (error) {
      console.error("PageView rendering error:", error);
    }
  }, [tab.id, tab.html, tab.tree, tab.displayList, focusedElement]);

  // Handle keyboard input
  useEffect(() => {
    function handleKeyDown(e) {
      if (focusedElement && focusedElement.tag === "input") {
        e.preventDefault();

        let value = focusedElement.attributes.value || "";

        if (e.key === "Backspace") {
          value = value.slice(0, -1);
        } else if (e.key.length === 1) {
          value += e.key;
        }

        // Update the focused element's value
        focusedElement.attributes.value = value;

        // Trigger JavaScript input event using QuickJS
        triggerEvent(focusedElement, "input");

        // Update tab to trigger re-render
        onUpdateTab(tab.id, {
          tree: { ...tab.tree }, // Force new reference
          displayList: null, // Force re-layout
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedElement, tab.id, tab.tree, onUpdateTab]);

  // Handle canvas clicks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleClick(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log(`Canvas click: ${x.toFixed(2)}, ${y.toFixed(2)}`);
      console.log(`Available hit targets: ${hitListRef.current.length}`);

      // Clear previous focus
      if (focusedElement) {
        focusedElement.isFocused = false;
      }
      setFocusedElement(null);

      // Find clicked element
      const hitTarget = hitListRef.current.find(
        (target) =>
          x >= target.x &&
          x <= target.x + target.width &&
          y >= target.y &&
          y <= target.y + target.height
      );

      if (hitTarget) {
        console.log(`Hit found:`, hitTarget);

        // Trigger JavaScript click event using QuickJS
        triggerEvent(hitTarget.node, "click");

        if (hitTarget.type === "link") {
          const href = hitTarget.node.attributes.href;
          console.log(`Following link: ${href}`);

          // Resolve URL
          let finalUrl;
          if (href.startsWith("http://") || href.startsWith("https://")) {
            finalUrl = href;
          } else if (href.startsWith("/")) {
            const currentUrl = new URL(tab.url);
            finalUrl = `${currentUrl.protocol}//${currentUrl.host}${href}`;
          } else if (href.includes("://")) {
            finalUrl = href;
          } else {
            const currentUrl = new URL(tab.url);
            const basePath =
              currentUrl.pathname.split("/").slice(0, -1).join("/") || "/";
            finalUrl = `${currentUrl.protocol}//${currentUrl.host}${basePath}/${href}`;
          }

          onNavigate(finalUrl);
        } else if (hitTarget.type === "input") {
          console.log("Focusing input element");
          hitTarget.node.isFocused = true;
          setFocusedElement(hitTarget.node);

          // Trigger re-render to show focus
          onUpdateTab(tab.id, {
            tree: { ...tab.tree },
            displayList: null,
          });
        } else if (hitTarget.type === "button") {
          console.log("Button clicked");

          // Find parent form
          let formNode = hitTarget.node.parent;
          while (formNode && formNode.tag !== "form") {
            formNode = formNode.parent;
          }

          if (formNode && formNode.attributes.action) {
            console.log("Submitting form");

            // Collect form data
            const inputs = [];
            function collectInputs(node) {
              if (node.tag === "input" && node.attributes.name) {
                inputs.push(node);
              }
              if (node.children) {
                node.children.forEach(collectInputs);
              }
            }
            collectInputs(formNode);

            // Build form data
            const formData = new URLSearchParams();
            for (const input of inputs) {
              const name = input.attributes.name;
              const value = input.attributes.value || "";
              formData.append(name, value);
            }

            // Submit form
            const actionUrl = formNode.attributes.action;
            const method = (formNode.attributes.method || "GET").toUpperCase();

            let finalUrl;
            if (
              actionUrl.startsWith("http://") ||
              actionUrl.startsWith("https://")
            ) {
              finalUrl = actionUrl;
            } else {
              const currentUrl = new URL(tab.url);
              finalUrl = `${currentUrl.protocol}//${currentUrl.host}${actionUrl}`;
            }

            if (method === "POST") {
              onNavigate(finalUrl, "POST", formData.toString());
            } else {
              const url = new URL(finalUrl);
              url.search = formData.toString();
              onNavigate(url.toString());
            }
          }
        }
      } else {
        console.log("Hit found: false");
      }
    }

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [onNavigate, focusedElement, tab.id, tab.url, onUpdateTab]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto">
      <canvas
        ref={canvasRef}
        className="block mx-auto cursor-default"
        tabIndex={0}
        style={{ outline: "none" }}
      />
    </div>
  );
}
