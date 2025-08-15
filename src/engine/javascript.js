// JavaScript Tokenizer
export class JSTokenizer {
  constructor(text) {
    this.text = text;
    this.i = 0;
  }

  tokenize() {
    const tokens = [];
    while (this.i < this.text.length) {
      this.skipWhitespace();
      if (this.i >= this.text.length) break;

      const char = this.text[this.i];

      if (char === '"' || char === "'") {
        tokens.push(this.readString());
      } else if (this.isDigit(char)) {
        tokens.push(this.readNumber());
      } else if (this.isAlpha(char) || char === "_" || char === "$") {
        tokens.push(this.readIdentifier());
      } else if (char === "=" && this.text[this.i + 1] === "=") {
        tokens.push({ type: "EQUALS", value: "==" });
        this.i += 2;
      } else if (char === "!" && this.text[this.i + 1] === "=") {
        tokens.push({ type: "NOT_EQUALS", value: "!=" });
        this.i += 2;
      } else if (char === "+" && this.text[this.i + 1] === "+") {
        tokens.push({ type: "INCREMENT", value: "++" });
        this.i += 2;
      } else if (char === "-" && this.text[this.i + 1] === "-") {
        tokens.push({ type: "DECREMENT", value: "--" });
        this.i += 2;
      } else if ("(){}[];,=+-*/<>!".includes(char)) {
        const type = this.getOperatorType(char);
        tokens.push({ type, value: char });
        this.i++;
      } else {
        this.i++; // Skip unknown characters
      }
    }
    return tokens;
  }

  readString() {
    const quote = this.text[this.i];
    this.i++; // Skip opening quote
    let value = "";

    while (this.i < this.text.length && this.text[this.i] !== quote) {
      if (this.text[this.i] === "\\") {
        this.i++; // Skip escape character
        if (this.i < this.text.length) {
          const escaped = this.text[this.i];
          value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
        }
      } else {
        value += this.text[this.i];
      }
      this.i++;
    }

    if (this.i < this.text.length) this.i++; // Skip closing quote
    return { type: "STRING", value };
  }

  readNumber() {
    let value = "";
    while (
      this.i < this.text.length &&
      (this.isDigit(this.text[this.i]) || this.text[this.i] === ".")
    ) {
      value += this.text[this.i];
      this.i++;
    }
    return { type: "NUMBER", value: parseFloat(value) };
  }

  readIdentifier() {
    let value = "";
    while (
      this.i < this.text.length &&
      (this.isAlnum(this.text[this.i]) ||
        this.text[this.i] === "_" ||
        this.text[this.i] === "$")
    ) {
      value += this.text[this.i];
      this.i++;
    }

    // Check if it's a keyword
    const keywords = [
      "var",
      "let",
      "const",
      "function",
      "if",
      "else",
      "for",
      "while",
      "return",
      "true",
      "false",
      "null",
      "undefined",
    ];
    const type = keywords.includes(value) ? "KEYWORD" : "IDENTIFIER";

    return { type, value };
  }

  skipWhitespace() {
    while (this.i < this.text.length && /\s/.test(this.text[this.i])) {
      this.i++;
    }
  }

  getOperatorType(char) {
    const operators = {
      "(": "LPAREN",
      ")": "RPAREN",
      "{": "LBRACE",
      "}": "RBRACE",
      "[": "LBRACKET",
      "]": "RBRACKET",
      ";": "SEMICOLON",
      ",": "COMMA",
      "=": "ASSIGN",
      "+": "PLUS",
      "-": "MINUS",
      "*": "MULTIPLY",
      "/": "DIVIDE",
      "<": "LESS_THAN",
      ">": "GREATER_THAN",
      "!": "NOT",
    };
    return operators[char] || "UNKNOWN";
  }

  isDigit(char) {
    return /\d/.test(char);
  }

  isAlpha(char) {
    return /[a-zA-Z]/.test(char);
  }

  isAlnum(char) {
    return /[a-zA-Z0-9]/.test(char);
  }
}

// JavaScript Parser
export class JSParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  parse() {
    const statements = [];
    while (this.current < this.tokens.length) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    return { type: "Program", body: statements };
  }

  parseStatement() {
    if (
      this.match("KEYWORD", "var") ||
      this.match("KEYWORD", "let") ||
      this.match("KEYWORD", "const")
    ) {
      return this.parseVariableDeclaration();
    } else if (this.match("KEYWORD", "function")) {
      return this.parseFunctionDeclaration();
    } else if (this.match("KEYWORD", "if")) {
      return this.parseIfStatement();
    } else if (this.match("KEYWORD", "for")) {
      return this.parseForStatement();
    } else if (this.match("KEYWORD", "return")) {
      return this.parseReturnStatement();
    } else {
      return this.parseExpressionStatement();
    }
  }

  parseVariableDeclaration() {
    const kind = this.advance().value; // var, let, const
    const id = this.consume("IDENTIFIER").value;
    let init = null;

    if (this.match("ASSIGN")) {
      this.advance(); // consume =
      init = this.parseExpression();
    }

    this.consume("SEMICOLON");
    return { type: "VariableDeclaration", kind, id, init };
  }

  parseFunctionDeclaration() {
    this.advance(); // consume 'function'
    const name = this.consume("IDENTIFIER").value;
    this.consume("LPAREN");

    const params = [];
    while (!this.check("RPAREN")) {
      params.push(this.consume("IDENTIFIER").value);
      if (this.match("COMMA")) this.advance();
    }

    this.consume("RPAREN");
    this.consume("LBRACE");

    const body = [];
    while (!this.check("RBRACE")) {
      body.push(this.parseStatement());
    }

    this.consume("RBRACE");
    return { type: "FunctionDeclaration", name, params, body };
  }

  parseIfStatement() {
    this.advance(); // consume 'if'
    this.consume("LPAREN");
    const test = this.parseExpression();
    this.consume("RPAREN");

    const consequent = this.parseStatement();
    let alternate = null;

    if (this.match("KEYWORD", "else")) {
      this.advance();
      alternate = this.parseStatement();
    }

    return { type: "IfStatement", test, consequent, alternate };
  }

  parseForStatement() {
    this.advance(); // consume 'for'
    this.consume("LPAREN");

    const init = this.parseStatement();
    const test = this.parseExpression();
    this.consume("SEMICOLON");
    const update = this.parseExpression();

    this.consume("RPAREN");
    const body = this.parseStatement();

    return { type: "ForStatement", init, test, update, body };
  }

  parseReturnStatement() {
    this.advance(); // consume 'return'
    let argument = null;

    if (!this.check("SEMICOLON")) {
      argument = this.parseExpression();
    }

    this.consume("SEMICOLON");
    return { type: "ReturnStatement", argument };
  }

  parseExpressionStatement() {
    const expression = this.parseExpression();
    if (this.check("SEMICOLON")) this.advance();
    return { type: "ExpressionStatement", expression };
  }

  parseExpression() {
    return this.parseAssignment();
  }

  parseAssignment() {
    const expr = this.parseEquality();

    if (this.match("ASSIGN")) {
      this.advance();
      const right = this.parseAssignment();
      return { type: "AssignmentExpression", left: expr, right };
    }

    return expr;
  }

  parseEquality() {
    let expr = this.parseComparison();

    while (this.match("EQUALS") || this.match("NOT_EQUALS")) {
      const operator = this.advance().value;
      const right = this.parseComparison();
      expr = { type: "BinaryExpression", left: expr, operator, right };
    }

    return expr;
  }

  parseComparison() {
    let expr = this.parseAddition();

    while (this.match("LESS_THAN") || this.match("GREATER_THAN")) {
      const operator = this.advance().value;
      const right = this.parseAddition();
      expr = { type: "BinaryExpression", left: expr, operator, right };
    }

    return expr;
  }

  parseAddition() {
    let expr = this.parseMultiplication();

    while (this.match("PLUS") || this.match("MINUS")) {
      const operator = this.advance().value;
      const right = this.parseMultiplication();
      expr = { type: "BinaryExpression", left: expr, operator, right };
    }

    return expr;
  }

  parseMultiplication() {
    let expr = this.parseUnary();

    while (this.match("MULTIPLY") || this.match("DIVIDE")) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      expr = { type: "BinaryExpression", left: expr, operator, right };
    }

    return expr;
  }

  parseUnary() {
    if (this.match("NOT") || this.match("MINUS")) {
      const operator = this.advance().value;
      const argument = this.parseUnary();
      return { type: "UnaryExpression", operator, argument };
    }

    return this.parseCall();
  }

  parseCall() {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match("LPAREN")) {
        this.advance();
        const args = [];

        while (!this.check("RPAREN")) {
          args.push(this.parseExpression());
          if (this.match("COMMA")) this.advance();
        }

        this.consume("RPAREN");
        expr = { type: "CallExpression", callee: expr, arguments: args };
      } else if (this.match("LBRACKET")) {
        this.advance();
        const property = this.parseExpression();
        this.consume("RBRACKET");
        expr = {
          type: "MemberExpression",
          object: expr,
          property,
          computed: true,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  parsePrimary() {
    if (this.match("NUMBER")) {
      return { type: "Literal", value: this.advance().value };
    }

    if (this.match("STRING")) {
      return { type: "Literal", value: this.advance().value };
    }

    if (this.match("KEYWORD", "true")) {
      this.advance();
      return { type: "Literal", value: true };
    }

    if (this.match("KEYWORD", "false")) {
      this.advance();
      return { type: "Literal", value: false };
    }

    if (this.match("KEYWORD", "null")) {
      this.advance();
      return { type: "Literal", value: null };
    }

    if (this.match("IDENTIFIER")) {
      return { type: "Identifier", name: this.advance().value };
    }

    if (this.match("LPAREN")) {
      this.advance();
      const expr = this.parseExpression();
      this.consume("RPAREN");
      return expr;
    }

    throw new Error(`Unexpected token: ${this.peek()?.value}`);
  }

  match(type, value = null) {
    const token = this.peek();
    return (
      token && token.type === type && (value === null || token.value === value)
    );
  }

  check(type) {
    return this.peek()?.type === type;
  }

  advance() {
    if (this.current < this.tokens.length) {
      return this.tokens[this.current++];
    }
    return null;
  }

  peek() {
    return this.tokens[this.current] || null;
  }

  consume(type) {
    if (this.check(type)) {
      return this.advance();
    }
    throw new Error(`Expected ${type}, got ${this.peek()?.type}`);
  }
}

// JavaScript Interpreter
export class JSInterpreter {
  constructor(domElements = new Map()) {
    this.globals = new Map();
    this.domElements = domElements;
    this.setupBuiltins();
  }

  setupBuiltins() {
    // Console object
    this.globals.set("console", {
      log: (...args) => {
        console.log("JS:", ...args.map((arg) => this.toString(arg)));
      },
      error: (...args) => {
        console.error("JS:", ...args.map((arg) => this.toString(arg)));
      },
    });

    // Document object with basic DOM methods
    this.globals.set("document", {
      getElementById: (id) => {
        const element = this.domElements.get(id);
        return element ? this.createDOMWrapper(element) : null;
      },
      querySelector: (selector) => {
        // Simple selector support (just ID for now)
        if (selector.startsWith("#")) {
          const id = selector.slice(1);
          const element = this.domElements.get(id);
          return element ? this.createDOMWrapper(element) : null;
        }
        return null;
      },
      createElement: (tagName) => {
        return this.createDOMWrapper({
          tag: tagName.toLowerCase(),
          attributes: {},
          children: [],
          style: {},
        });
      },
    });

    // Window object
    this.globals.set("window", {
      alert: (message) => {
        console.log("Alert:", this.toString(message));
      },
      setTimeout: (callback, delay) => {
        setTimeout(() => {
          if (typeof callback === "function") {
            this.callFunction(callback, []);
          }
        }, delay);
      },
    });
  }

  createDOMWrapper(element) {
    return {
      tagName: element.tag?.toUpperCase(),
      id: element.attributes?.id || "",
      className: element.attributes?.class || "",
      innerHTML: this.getInnerHTML(element),
      textContent: this.getTextContent(element),
      style: element.style || {},

      getAttribute: (name) => element.attributes?.[name] || null,
      setAttribute: (name, value) => {
        if (!element.attributes) element.attributes = {};
        element.attributes[name] = value;
      },

      addEventListener: (event, callback) => {
        if (!element.eventListeners) element.eventListeners = {};
        if (!element.eventListeners[event]) element.eventListeners[event] = [];
        element.eventListeners[event].push(callback);
      },

      click: () => {
        this.triggerEvent(element, "click");
      },
    };
  }

  getInnerHTML(element) {
    if (!element.children) return "";
    return element.children
      .map((child) => {
        if (child.type === "text") return child.text;
        return `<${child.tag}>${this.getInnerHTML(child)}</${child.tag}>`;
      })
      .join("");
  }

  getTextContent(element) {
    if (!element.children) return "";
    return element.children
      .map((child) => {
        if (child.type === "text") return child.text;
        return this.getTextContent(child);
      })
      .join("");
  }

  triggerEvent(element, eventType) {
    if (element.eventListeners && element.eventListeners[eventType]) {
      for (const callback of element.eventListeners[eventType]) {
        if (typeof callback === "function") {
          this.callFunction(callback, [{ type: eventType, target: element }]);
        }
      }
    }
  }

  interpret(ast) {
    return this.execute(ast);
  }

  execute(node) {
    switch (node.type) {
      case "Program":
        let result = null;
        for (const statement of node.body) {
          result = this.execute(statement);
          if (result && result.type === "return") {
            return result.value;
          }
        }
        return result;

      case "VariableDeclaration":
        const value = node.init ? this.execute(node.init) : undefined;
        this.globals.set(node.id, value);
        return value;

      case "FunctionDeclaration":
        this.globals.set(node.name, {
          type: "function",
          params: node.params,
          body: node.body,
          closure: new Map(this.globals),
        });
        return null;

      case "IfStatement":
        const testValue = this.execute(node.test);
        if (this.isTruthy(testValue)) {
          return this.execute(node.consequent);
        } else if (node.alternate) {
          return this.execute(node.alternate);
        }
        return null;

      case "ForStatement":
        this.execute(node.init);
        while (this.isTruthy(this.execute(node.test))) {
          const result = this.execute(node.body);
          if (result && result.type === "return") return result;
          this.execute(node.update);
        }
        return null;

      case "ReturnStatement":
        return {
          type: "return",
          value: node.argument ? this.execute(node.argument) : undefined,
        };

      case "ExpressionStatement":
        return this.execute(node.expression);

      case "AssignmentExpression":
        const assignValue = this.execute(node.right);
        if (node.left.type === "Identifier") {
          this.globals.set(node.left.name, assignValue);
        }
        return assignValue;

      case "BinaryExpression":
        const left = this.execute(node.left);
        const right = this.execute(node.right);
        return this.evaluateBinaryExpression(node.operator, left, right);

      case "UnaryExpression":
        const argument = this.execute(node.argument);
        return this.evaluateUnaryExpression(node.operator, argument);

      case "CallExpression":
        const callee = this.execute(node.callee);
        const args = node.arguments.map((arg) => this.execute(arg));
        return this.callFunction(callee, args);

      case "MemberExpression":
        const object = this.execute(node.object);
        const property = node.computed
          ? this.execute(node.property)
          : node.property.name;
        return object && object[property];

      case "Identifier":
        return this.globals.get(node.name);

      case "Literal":
        return node.value;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  evaluateBinaryExpression(operator, left, right) {
    switch (operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "==":
        return left == right;
      case "!=":
        return left != right;
      case "<":
        return left < right;
      case ">":
        return left > right;
      default:
        throw new Error(`Unknown binary operator: ${operator}`);
    }
  }

  evaluateUnaryExpression(operator, argument) {
    switch (operator) {
      case "!":
        return !this.isTruthy(argument);
      case "-":
        return -argument;
      default:
        throw new Error(`Unknown unary operator: ${operator}`);
    }
  }

  callFunction(func, args) {
    if (typeof func === "function") {
      return func(...args);
    }

    if (func && func.type === "function") {
      const oldGlobals = new Map(this.globals);

      // Set up parameters
      for (let i = 0; i < func.params.length; i++) {
        this.globals.set(func.params[i], args[i]);
      }

      // Execute function body
      let result = null;
      for (const statement of func.body) {
        result = this.execute(statement);
        if (result && result.type === "return") {
          this.globals = oldGlobals;
          return result.value;
        }
      }

      this.globals = oldGlobals;
      return result;
    }

    throw new Error(`Cannot call non-function: ${func}`);
  }

  isTruthy(value) {
    return Boolean(value);
  }

  toString(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    return String(value);
  }
}

// Main function to execute JavaScript
export function executeJavaScript(code, domElements = new Map()) {
  try {
    const tokenizer = new JSTokenizer(code);
    const tokens = tokenizer.tokenize();

    const parser = new JSParser(tokens);
    const ast = parser.parse();

    const interpreter = new JSInterpreter(domElements);
    return interpreter.interpret(ast);
  } catch (error) {
    console.error("JavaScript execution error:", error);
    return null;
  }
}
