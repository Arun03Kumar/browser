import { getQuickJS } from "quickjs-emscripten";

let quickJS = null;
let vm = null;

// Initialize QuickJS once
async function initQuickJS() {
  if (!quickJS) {
    quickJS = await getQuickJS();
    vm = quickJS.newContext();
  }
  return { quickJS, vm };
}

// Execute JavaScript code with DOM access
export async function executeJavaScript(code, domElements = new Map()) {
  try {
    const { vm } = await initQuickJS();

    // Clear previous execution state but keep globals
    vm.runtime.gc();

    // Set up DOM API
    setupDOMAPI(vm, domElements);

    // Execute the JavaScript code
    const result = vm.evalCode(code);

    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      console.error("JavaScript execution error:", error);
      return null;
    }

    const returnValue = vm.dump(result.value);
    result.value.dispose();

    return returnValue;
  } catch (error) {
    console.error("QuickJS execution error:", error);
    return null;
  }
}

// Set up DOM API for JavaScript access
function setupDOMAPI(vm, domElements) {
  // Console API
  const consoleObj = vm.newObject();
  vm.setProp(
    consoleObj,
    "log",
    vm.newFunction("log", (...args) => {
      const jsArgs = args.map((arg) => vm.dump(arg));
      console.log("JS:", ...jsArgs);
      args.forEach((arg) => arg.dispose());
    })
  );
  vm.setProp(
    consoleObj,
    "error",
    vm.newFunction("error", (...args) => {
      const jsArgs = args.map((arg) => vm.dump(arg));
      console.error("JS:", ...jsArgs);
      args.forEach((arg) => arg.dispose());
    })
  );
  vm.setProp(vm.global, "console", consoleObj);
  consoleObj.dispose();

  // Document API
  const documentObj = vm.newObject();

  // document.getElementById
  vm.setProp(
    documentObj,
    "getElementById",
    vm.newFunction("getElementById", (idHandle) => {
      const id = vm.dump(idHandle);
      idHandle.dispose();

      const element = domElements.get(id);
      if (!element) {
        return vm.null;
      }

      return createDOMElementWrapper(vm, element);
    })
  );

  // document.querySelector (basic support)
  vm.setProp(
    documentObj,
    "querySelector",
    vm.newFunction("querySelector", (selectorHandle) => {
      const selector = vm.dump(selectorHandle);
      selectorHandle.dispose();

      if (selector.startsWith("#")) {
        const id = selector.slice(1);
        const element = domElements.get(id);
        if (element) {
          return createDOMElementWrapper(vm, element);
        }
      }

      return vm.null;
    })
  );

  vm.setProp(vm.global, "document", documentObj);
  documentObj.dispose();

  // Window API
  const windowObj = vm.newObject();

  // window.alert
  vm.setProp(
    windowObj,
    "alert",
    vm.newFunction("alert", (messageHandle) => {
      const message = vm.dump(messageHandle);
      messageHandle.dispose();
      console.log("Alert:", message);
      // In a real implementation, you could show an actual alert dialog
    })
  );

  // window.setTimeout
  vm.setProp(
    windowObj,
    "setTimeout",
    vm.newFunction("setTimeout", (callbackHandle, delayHandle) => {
      const callback = callbackHandle; // Keep reference
      const delay = vm.dump(delayHandle);
      delayHandle.dispose();

      setTimeout(() => {
        try {
          const result = vm.callFunction(callback, vm.global);
          if (result.error) {
            console.error("setTimeout callback error:", vm.dump(result.error));
            result.error.dispose();
          } else {
            result.value.dispose();
          }
        } catch (error) {
          console.error("setTimeout execution error:", error);
        }
        callback.dispose();
      }, delay);

      return vm.newNumber(1); // Return a dummy timer ID
    })
  );

  vm.setProp(vm.global, "window", windowObj);
  windowObj.dispose();
}

// Create a JavaScript wrapper for DOM elements
function createDOMElementWrapper(vm, element) {
  const elementObj = vm.newObject();

  // Properties
  vm.setProp(
    elementObj,
    "tagName",
    vm.newString(element.tag?.toUpperCase() || "")
  );
  vm.setProp(elementObj, "id", vm.newString(element.attributes?.id || ""));
  vm.setProp(
    elementObj,
    "className",
    vm.newString(element.attributes?.class || "")
  );

  // textContent property
  const textContent = getTextContent(element);
  vm.setProp(elementObj, "textContent", vm.newString(textContent));

  // innerHTML property
  const innerHTML = getInnerHTML(element);
  vm.setProp(elementObj, "innerHTML", vm.newString(innerHTML));

  // getAttribute method
  vm.setProp(
    elementObj,
    "getAttribute",
    vm.newFunction("getAttribute", (nameHandle) => {
      const name = vm.dump(nameHandle);
      nameHandle.dispose();
      const value = element.attributes?.[name];
      return value ? vm.newString(value) : vm.null;
    })
  );

  // setAttribute method
  vm.setProp(
    elementObj,
    "setAttribute",
    vm.newFunction("setAttribute", (nameHandle, valueHandle) => {
      const name = vm.dump(nameHandle);
      const value = vm.dump(valueHandle);
      nameHandle.dispose();
      valueHandle.dispose();

      if (!element.attributes) element.attributes = {};
      element.attributes[name] = value;

      return vm.undefined;
    })
  );

  // addEventListener method
  vm.setProp(
    elementObj,
    "addEventListener",
    vm.newFunction("addEventListener", (eventHandle, callbackHandle) => {
      const eventType = vm.dump(eventHandle);
      eventHandle.dispose();

      if (!element.eventListeners) element.eventListeners = {};
      if (!element.eventListeners[eventType])
        element.eventListeners[eventType] = [];

      // Store the callback function reference
      element.eventListeners[eventType].push({
        quickjsCallback: callbackHandle,
        vm: vm,
      });

      return vm.undefined;
    })
  );

  // click method
  vm.setProp(
    elementObj,
    "click",
    vm.newFunction("click", () => {
      triggerEvent(element, "click");
      return vm.undefined;
    })
  );

  // Custom property to update textContent
  vm.setProp(
    elementObj,
    "updateTextContent",
    vm.newFunction("updateTextContent", (textHandle) => {
      const text = vm.dump(textHandle);
      textHandle.dispose();

      // Update the element's text content
      element.children = [{ type: "text", text: text }];

      // Trigger a re-render (you may need to implement this based on your architecture)
      if (element.onUpdate) {
        element.onUpdate();
      }

      return vm.undefined;
    })
  );

  return elementObj;
}

// Helper function to get text content from an element
function getTextContent(element) {
  if (!element.children) return "";
  return element.children
    .map((child) => {
      if (child.type === "text") return child.text;
      return getTextContent(child);
    })
    .join("");
}

// Helper function to get innerHTML from an element
function getInnerHTML(element) {
  if (!element.children) return "";
  return element.children
    .map((child) => {
      if (child.type === "text") return child.text;
      if (child.tag) {
        const attrs = Object.entries(child.attributes || {})
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");
        return `<${child.tag}${attrs ? " " + attrs : ""}>${getInnerHTML(
          child
        )}</${child.tag}>`;
      }
      return "";
    })
    .join("");
}

// Trigger events on DOM elements
export function triggerEvent(element, eventType) {
  if (element.eventListeners && element.eventListeners[eventType]) {
    for (const listener of element.eventListeners[eventType]) {
      try {
        const { quickjsCallback, vm } = listener;

        // Create event object
        const eventObj = vm.newObject();
        vm.setProp(eventObj, "type", vm.newString(eventType));
        vm.setProp(eventObj, "target", createDOMElementWrapper(vm, element));

        // Call the callback
        const result = vm.callFunction(quickjsCallback, vm.global, eventObj);

        if (result.error) {
          console.error("Event callback error:", vm.dump(result.error));
          result.error.dispose();
        } else {
          result.value.dispose();
        }

        eventObj.dispose();
      } catch (error) {
        console.error("Event trigger error:", error);
      }
    }
  }
}

// Clean up QuickJS resources
export function cleanup() {
  if (vm) {
    vm.dispose();
    vm = null;
  }
  if (quickJS) {
    quickJS.dispose();
    quickJS = null;
  }
}
