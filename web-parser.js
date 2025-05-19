let grammar = [];
let NT = []; // Non-Terminals
let T = [];  // Terminals
let LL1Table = {};
let FIRST = {};
let FOLLOW = {};

// Adds a production rule to the grammar
function addProduction() {
    const productionInput = document.getElementById("production-input").value.trim();
    if (productionInput === "") {
        alert("Please enter a production rule!");
        return;
    }

    grammar.push(productionInput);
    document.getElementById("production-input").value = "";
    alert("Production rule added!");
}

// Displays the current grammar
function showGrammar() {
    if (grammar.length === 0) {
        alert("No grammar rules added yet!");
        return;
    }

    const grammarDisplay = document.getElementById("grammar-display");
    grammarDisplay.innerHTML = `<h3>Grammar Rules</h3>${grammar.map(rule => `<p>${rule}</p>`).join("")}`;
}

// Generates FIRST and FOLLOW sets, parsing table, and displays them
function startParsing() {
    if (grammar.length === 0) {
        alert("Please add some grammar rules first!");
        return;
    }

    extractTerminalsAndNonTerminals();
    computeFirstSets();
    computeFollowSets();
    generateParsingTable();
    displayFirstAndFollow();
    displayParsingTable();

    // Show the parsing input section
    document.getElementById("parsing-input").classList.remove("hidden");
}

// Extracts terminals and non-terminals from the grammar
function extractTerminalsAndNonTerminals() {
    NT = [];
    T = [];

    grammar.forEach(rule => {
        const [lhs, rhs] = rule.split("->");
        if (!NT.includes(lhs)) {
            NT.push(lhs);
        }
        rhs.split("").forEach(char => {
            if (!/[A-Z]/.test(char) && char !== '|' && char !== '!' && !T.includes(char)) {
                T.push(char);
            }
        });
    });

    T.push("$"); // Add end-of-input symbol
}

// Computes FIRST sets for all non-terminals
function computeFirstSets() {
    FIRST = {};
    NT.forEach(nt => FIRST[nt] = new Set());

    let changed = true;
    while (changed) {
        changed = false;

        grammar.forEach(rule => {
            const [lhs, rhs] = rule.split("->");
            const productions = rhs.split("|");

            productions.forEach(production => {
                let i = 0;
                let canBeEpsilon = true;

                while (i < production.length && canBeEpsilon) {
                    const symbol = production[i];

                    if (T.includes(symbol)) {
                        if (!FIRST[lhs].has(symbol)) {
                            FIRST[lhs].add(symbol);
                            changed = true;
                        }
                        canBeEpsilon = false;
                        break;
                    } else if (NT.includes(symbol)) {
                        const beforeSize = FIRST[lhs].size;
                        FIRST[symbol].forEach(s => {
                            if (s !== "!") FIRST[lhs].add(s);
                        });
                        if (!FIRST[symbol].has("!")) {
                            canBeEpsilon = false;
                        }
                        if (FIRST[lhs].size > beforeSize) changed = true;
                    }

                    i++;
                }

                if (canBeEpsilon) {
                    if (!FIRST[lhs].has("!")) {
                        FIRST[lhs].add("!");
                        changed = true;
                    }
                }
            });
        });
    }
}


// Generates the LL(1) parsing table
function computeFollowSets() {
    FOLLOW = {};
    NT.forEach(nt => (FOLLOW[nt] = new Set()));
    FOLLOW[NT[0]].add("$"); // Add $ to FOLLOW of start symbol

    let changed;
    do {
        changed = false;
        grammar.forEach(rule => {
            const [lhs, rhs] = rule.split("->");
            const productions = rhs.split("|");

            productions.forEach(production => {
                for (let i = 0; i < production.length; i++) {
                    const symbol = production[i];
                    if (NT.includes(symbol)) {
                        let followAdded = false;
                        let j = i + 1;

                        while (j < production.length) {
                            const next = production[j];

                            if (T.includes(next)) {
                                if (!FOLLOW[symbol].has(next)) {
                                    FOLLOW[symbol].add(next);
                                    changed = true;
                                }
                                followAdded = true;
                                break;
                            } else if (NT.includes(next)) {
                                const beforeSize = FOLLOW[symbol].size;
                                FIRST[next].forEach(item => {
                                    if (item !== "!") FOLLOW[symbol].add(item);
                                });
                                if (FOLLOW[symbol].size > beforeSize) changed = true;

                                if (!FIRST[next].has("!")) {
                                    followAdded = true;
                                    break;
                                }
                            }
                            j++;
                        }

                        if (!followAdded && symbol !== lhs) {
                            const beforeSize = FOLLOW[symbol].size;
                            FOLLOW[lhs].forEach(sym => FOLLOW[symbol].add(sym));
                            if (FOLLOW[symbol].size > beforeSize) changed = true;
                        }
                    }
                }
            });
        });
    } while (changed);
}

function generateParsingTable() {
    LL1Table = {};
    NT.forEach(nt => (LL1Table[nt] = {}));

    grammar.forEach(rule => {
        const [lhs, rhs] = rule.split("->");
        const productions = rhs.split("|");

        productions.forEach(production => {
            const firstSet = new Set();
            let containsEpsilon = true;

            for (const char of production) {
                if (T.includes(char)) {
                    firstSet.add(char);
                    containsEpsilon = false;
                    break;
                } else if (NT.includes(char)) {
                    [...FIRST[char]].forEach(sym => firstSet.add(sym));
                    if (!FIRST[char].has("!")) {
                        containsEpsilon = false;
                        break;
                    }
                }
            }

            firstSet.forEach(sym => {
                if (sym !== "!") LL1Table[lhs][sym] = production;
            });

            if (containsEpsilon) {
                FOLLOW[lhs].forEach(sym => {
                    LL1Table[lhs][sym] = production;
                });
            }
        });
    });
}


// Displays FIRST and FOLLOW sets
function displayFirstAndFollow() {
    const firstFollowDisplay = document.getElementById("first-follow-display");
    const firstHtml = Object.entries(FIRST)
        .map(([nt, set]) => `<p>FIRST(${nt}): { ${[...set].join(", ")} }</p>`)
        .join("");
    const followHtml = Object.entries(FOLLOW)
        .map(([nt, set]) => `<p>FOLLOW(${nt}): { ${[...set].join(", ")} }</p>`)
        .join("");

    firstFollowDisplay.innerHTML = `<h3>FIRST & FOLLOW Sets</h3>${firstHtml}${followHtml}`;
}

// Displays the parsing table
function displayParsingTable() {
    const parsingTable = document.getElementById("parsing-table");
    let tableHtml = "<table border='1'><thead><tr><th>Non-Terminal</th>";

    T.forEach(term => (tableHtml += `<th>${term}</th>`));
    tableHtml += "</tr></thead><tbody>";

    Object.entries(LL1Table).forEach(([nt, row]) => {
        tableHtml += `<tr><td>${nt}</td>`;
        T.forEach(term => {
            tableHtml += `<td>${row[term] || ""}</td>`;
        });
        tableHtml += "</tr>";
    });

    tableHtml += "</tbody></table>";
    parsingTable.innerHTML = `<h3>Parsing Table</h3>${tableHtml}`;
}

// Parses a string using the LL(1) parsing table
function parseString() {
    const inputString = document.getElementById("string-input").value.trim() + "$";
    if (!inputString) {
        alert("Please enter a string to parse!");
        return;
    }

    let stack = ["$", NT[0]]; // Start with the start symbol and end-of-input symbol
    let pointer = 0;          // Pointer for input string
    const steps = [];         // Record parsing steps for visualization
    let success = true;

    while (stack.length > 0) {
        const top = stack.pop();       // Top of the stack
        const current = inputString[pointer]; // Current input symbol

        if (T.includes(top)) {
            // If top is a terminal, it must match the current input symbol
            if (top === current) {
                pointer++;
            } else {
                success = false;
                break;
            }
        } else if (NT.includes(top)) {
            // If top is a non-terminal, look up the parsing table
            const production = LL1Table[top][current];
            if (production) {
                // Push the production in reverse order onto the stack
                stack.push(...production.split("").reverse().filter(sym => sym !== "!"));
            } else {
                success = false;
                break;
            }
        } else {
            // If top is invalid, parsing fails
            success = false;
            break;
        }

        // Record the stack and remaining input
        steps.push(`Stack: ${stack.join("")}, Input: ${inputString.slice(pointer)}`);
    }

    // Display parsing steps and result
    document.getElementById("parsing-steps").innerHTML = success
        ? `<h3>Parsing Successful</h3><p>${steps.join("<br>")}</p>`
        : `<h3>Parsing Failed</h3><p>${steps.join("<br>")}</p>`;
}

