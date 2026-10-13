// ---------- Get elements from the page ----------
const currentEl = document.getElementById("current");
const previousEl = document.getElementById("previous");
const buttonsEl = document.querySelector(".buttons");

// ---------- Calculator state (the "memory" of the calculator) ----------
let current = "0";          // number being typed (kept as text)
let previous = "";          // first number of an operation
let operator = null;        // "+", "-", "*", "/" or null
let overwrite = false;      // true = next digit starts a new number
let hasError = false;       // true while an error message is showing
let lastExpression = "";    // e.g. "8 × 2 =" shown after pressing equals

const MAX_DIGITS = 15;
const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

// ---------- Helpers ----------

// Fix floating point problems: 0.1 + 0.2 becomes 0.3
function roundResult(number) {
  return parseFloat(number.toPrecision(12));
}

// Add commas to big numbers: 1234567 -> 1,234,567
function formatNumber(text) {
  if (hasError || text.includes("e")) return text;

  const isNegative = text.startsWith("-");
  const unsigned = isNegative ? text.slice(1) : text;
  const [integerPart, decimalPart] = unsigned.split(".");

  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let result = withCommas;
  if (decimalPart !== undefined) result += "." + decimalPart;

  return isNegative ? "-" + result : result;
}

// Update what the user sees on screen
function updateDisplay() {
  const text = formatNumber(current);
  currentEl.textContent = text;

  currentEl.classList.toggle("error", hasError);
  currentEl.classList.toggle("small", !hasError && text.length > 9 && text.length <= 13);
  currentEl.classList.toggle("smaller", !hasError && text.length > 13);

  if (operator) {
    previousEl.textContent = `${formatNumber(previous)} ${SYMBOLS[operator]}`;
  } else {
    previousEl.textContent = lastExpression;
  }
}

function showError(message) {
  current = message;
  previous = "";
  operator = null;
  lastExpression = "";
  hasError = true;
  overwrite = true;
}

// ---------- Calculator actions ----------

function clearAll() {
  current = "0";
  previous = "";
  operator = null;
  overwrite = false;
  hasError = false;
  lastExpression = "";
}

function appendDigit(digit) {
  if (hasError) clearAll();
  lastExpression = "";

  if (overwrite) {
    current = "0";
    overwrite = false;
  }

  if (current === "0") {
    current = digit;
  } else if (current === "-0") {
    current = "-" + digit;
  } else if (current.replace(/[-.]/g, "").length < MAX_DIGITS) {
    current += digit;
  }
}

function appendDecimal() {
  if (hasError) clearAll();
  lastExpression = "";

  if (overwrite) {
    current = "0";
    overwrite = false;
  }

  if (!current.includes(".")) {
    current += ".";
  }
}

function deleteLast() {
  if (hasError) {
    clearAll();
    return;
  }
  if (overwrite) return; // do not delete a finished result

  current = current.slice(0, -1);
  if (current === "" || current === "-") current = "0";
}

function toggleSign() {
  if (hasError) return;

  // After choosing an operator, ± starts a new negative number
  if (overwrite && operator) {
    current = "-0";
    overwrite = false;
    return;
  }

  if (current === "0") return;
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
}

function percent() {
  if (hasError) return;
  const value = parseFloat(current);
  current = String(roundResult(value / 100));
  overwrite = true;
}

// Does the maths. Returns the result as text, or null if there was an error.
function calculate() {
  const a = parseFloat(previous);
  const b = parseFloat(current);
  let result;

  switch (operator) {
    case "+": result = a + b; break;
    case "-": result = a - b; break;
    case "*": result = a * b; break;
    case "/":
      if (b === 0) {
        showError("Cannot divide by 0");
        return null;
      }
      result = a / b;
      break;
    default:
      return current;
  }

  if (!Number.isFinite(result)) {
    showError("Error");
    return null;
  }

  return String(roundResult(result));
}

function chooseOperator(op) {
  if (hasError) return;
  lastExpression = "";

  // If an operator is already waiting and a second number was typed,
  // calculate first (so 2 + 3 + 4 works step by step)
  if (operator && !overwrite) {
    const result = calculate();
    if (result === null) return;
    current = result;
  }

  previous = current;
  operator = op;
  overwrite = true;
}

function equals() {
  if (hasError || !operator) return;

  const expression = `${formatNumber(previous)} ${SYMBOLS[operator]} ${formatNumber(current)} =`;
  const result = calculate();
  if (result === null) return;

  current = result;
  previous = "";
  operator = null;
  lastExpression = expression;
  overwrite = true;
}

// ---------- Button clicks ----------
buttonsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { action, value } = button.dataset;

  switch (action) {
    case "digit":    appendDigit(value);    break;
    case "decimal":  appendDecimal();       break;
    case "operator": chooseOperator(value); break;
    case "equals":   equals();              break;
    case "clear":    clearAll();            break;
    case "delete":   deleteLast();          break;
    case "percent":  percent();             break;
    case "sign":     toggleSign();          break;
  }

  updateDisplay();
});

// ---------- Keyboard support ----------
function findButton(action, value) {
  const selector = value
    ? `[data-action="${action}"][data-value="${value}"]`
    : `[data-action="${action}"]`;
  return document.querySelector(selector);
}

function flashButton(button) {
  if (!button) return;
  button.classList.add("pressed");
  setTimeout(() => button.classList.remove("pressed"), 120);
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return; // keep browser shortcuts

  const key = event.key;
  let button = null;

  if (key >= "0" && key <= "9") {
    button = findButton("digit", key);
  } else if (key === "." || key === ",") {
    button = findButton("decimal");
  } else if (["+", "-", "*", "/"].includes(key)) {
    button = findButton("operator", key);
  } else if (key === "Enter" || key === "=") {
    button = findButton("equals");
  } else if (key === "Backspace") {
    button = findButton("delete");
  } else if (key === "Escape" || key === "Delete") {
    button = findButton("clear");
  } else if (key === "%") {
    button = findButton("percent");
  }

  if (button) {
    event.preventDefault(); // stops "/" quick-find and Enter re-clicking a focused button
    button.click();
    flashButton(button);
  }
});

// Show the starting display
updateDisplay();