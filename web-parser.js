class TreeNode {
    constructor(value) {
        this.value = value;
        this.children = [];
        this.level = 0;
    }

    addChild(node) {
        node.level = this.level + 1;
        this.children.push(node);
    }
}
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
    // Initialize parsing table
    LL1Table = {};
    NT.forEach(nt => (LL1Table[nt] = {}));

    grammar.forEach(rule => {
        const [lhs, rhs] = rule.split("->");
        const productions = rhs.split("|");

        productions.forEach(production => {
            // For each production, find its FIRST set
            const productionFirstSet = new Set();
            let allCanBeEpsilon = true;
            let i = 0;

            while (i < production.length && allCanBeEpsilon) {
                const symbol = production[i];

                if (T.includes(symbol)) {
                    productionFirstSet.add(symbol);
                    allCanBeEpsilon = false;
                } else if (NT.includes(symbol)) {
                    // Add all non-epsilon symbols from FIRST(symbol)
                    FIRST[symbol].forEach(s => {
                        if (s !== "!") productionFirstSet.add(s);
                    });

                    // If symbol cannot derive epsilon, stop here
                    if (!FIRST[symbol].has("!")) {
                        allCanBeEpsilon = false;
                    }
                }
                i++;
            }

            // Add entries to parsing table
            productionFirstSet.forEach(terminal => {
                if (LL1Table[lhs][terminal]) {
                    console.warn(`Grammar is not LL(1): Multiple entries for [${lhs}, ${terminal}]`);
                }
                LL1Table[lhs][terminal] = production;
            });

            // If the entire production can derive epsilon, add entries for FOLLOW(lhs)
            if (allCanBeEpsilon || production === "!") {
                FOLLOW[lhs].forEach(terminal => {
                    if (LL1Table[lhs][terminal]) {
                        console.warn(`Grammar is not LL(1): Multiple entries for [${lhs}, ${terminal}]`);
                    }
                    LL1Table[lhs][terminal] = production;
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
    let tableHtml = `
        <div class="parsing-table-header">LL(1) Parsing Table</div>
        <table>
            <thead>
                <tr>
                    <th>Non-Terminal</th>
                    ${T.map(term => `<th>${term}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${Object.entries(LL1Table).map(([nt, row]) => `
                    <tr>
                        <td>${nt}</td>
                        ${T.map(term => `<td>${row[term] || ''}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    parsingTable.innerHTML = tableHtml;
}

function parseString() {
    const rawInput = document.getElementById("string-input").value.trim();
    if (!rawInput) {
        alert("Please enter a string to parse!");
        return;
    }
    const inputString = rawInput + "$";

    let stack = ["$", NT[0]]; // Parsing stack with end-of-input and start symbol
    let pointer = 0;          // Input string pointer
    const steps = [];         // Parsing steps for visualization
    let success = true;

    // Create the root of the parse tree
    const parseTree = new TreeNode(NT[0]);
    const nodeStack = [parseTree]; // Stack for tree nodes

    while (stack.length > 0 && pointer < inputString.length) {
        const top = stack[stack.length - 1];
        const currentSymbol = inputString[pointer];

        steps.push(`Stack: ${stack.join(" ")} | Input: ${inputString.slice(pointer)}`);

        if (T.includes(top)) {
            // If top is a terminal
            if (top === currentSymbol) {
                stack.pop();
                const currentNode = nodeStack.pop();
                if (top !== "$") {
                    currentNode.addChild(new TreeNode(top));
                }
                pointer++;
            } else {
                success = false;
                break;
            }
        } else if (NT.includes(top)) {
            // If top is a non-terminal
            const production = LL1Table[top]?.[currentSymbol];
            if (production) {
                stack.pop();
                const currentNode = nodeStack.pop();
                const symbols = production.split("").filter(sym => sym !== "!");

                // Add symbols to stack in reverse order
                for (let i = symbols.length - 1; i >= 0; i--) {
                    const sym = symbols[i];
                    const newNode = new TreeNode(sym);
                    currentNode.addChild(newNode);
                    if (NT.includes(sym)) {
                        nodeStack.push(newNode);
                        stack.push(sym);
                    } else if (T.includes(sym)) {
                        nodeStack.push(newNode);
                        stack.push(sym);
                    }
                }
            } else {
                success = false;
                break;
            }
        } else {
            success = false;
            break;
        }
    }

    // Check if parsing completed successfully
    success = success && pointer >= inputString.length - 1 && stack.length <= 1;

    // Display parsing steps
    document.getElementById("parsing-steps").innerHTML = success
        ? `<h3>Parsing Successful</h3><p>${steps.join("<br>")}</p>`
        : `<h3>Parsing Failed</h3><p>${steps.join("<br>")}</p>`;

    // Display parse tree if parsing is successful
    if (success) {
        displayParseTree(parseTree);
    }
}
function displayParseTree(tree) {
    const renderTree = (node) => {
        const isLeaf = node.children.length === 0;
        const nodeClass = isLeaf ? 'leaf-node' : 'internal-node';

        if (isLeaf) {
            return `<li><div class="${nodeClass}">${node.value}</div></li>`;
        }
        return `
            <li>
                <div class="${nodeClass}">${node.value}</div>
                <ul>${node.children.map(renderTree).join("")}</ul>
            </li>`;
    };

    document.getElementById("parse-tree").innerHTML = `
        <h3>Parse Tree</h3>
        <div class="tree">
            <ul class="root">${renderTree(tree)}</ul>
        </div>`;
}