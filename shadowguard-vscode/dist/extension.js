/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
const child_process_1 = __webpack_require__(2);
const path = __importStar(__webpack_require__(3));
const fs = __importStar(__webpack_require__(4));
let diagnosticCollection;
let logger;
function activate(context) {
    // 1. Boot up the Telemetry Console
    logger = vscode.window.createOutputChannel('ShadowGuard');
    logger.appendLine('[Boot] ShadowGuard Extension Activated.');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('shadowguard');
    context.subscriptions.push(diagnosticCollection);
    // 2. Resolve and VERIFY the Go Engine Path
    const extPath = context.extensionPath;
    const enginePath = path.join(extPath, '..', 'engine', 'shadowguard.exe');
    logger.appendLine(`[Boot] Expected Engine Path: ${enginePath}`);
    // If the path is wrong, the extension will now scream at you
    if (!fs.existsSync(enginePath)) {
        logger.appendLine(`[Boot] FATAL ERROR: shadowguard.exe NOT FOUND!`);
        vscode.window.showErrorMessage('ShadowGuard Engine missing! Check Output tab.');
        return;
    }
    else {
        logger.appendLine(`[Boot] Engine binary verified on disk.`);
    }
    let typingTimer;
    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.uri.scheme !== 'file') {
            return;
        }
        if (typingTimer) {
            clearTimeout(typingTimer);
        }
        typingTimer = setTimeout(() => {
            scanDocument(document, enginePath);
        }, 500);
    });
}
function scanDocument(document, enginePath) {
    const text = document.getText();
    if (!text)
        return;
    logger.appendLine(`\n[Scan] Triggered. Sending ${document.lineCount} lines to Go Engine...`);
    const engine = (0, child_process_1.spawn)(enginePath);
    let outputData = '';
    // Capture standard output
    engine.stdout.on('data', (data) => {
        outputData += data.toString();
    });
    // Capture Go runtime panics or errors
    engine.stderr.on('data', (data) => {
        logger.appendLine(`[Engine ERROR] ${data.toString()}`);
    });
    // Capture Node.js failure to spawn
    engine.on('error', (err) => {
        logger.appendLine(`[Spawn ERROR] Failed to start process: ${err.message}`);
    });
    engine.on('close', (code) => {
        logger.appendLine(`[Scan] Process closed with code: ${code}`);
        logger.appendLine(`[Scan] Raw JSON received: ${outputData.trim() || 'EMPTY'}`);
        if (code !== 0 || !outputData.trim()) {
            return;
        }
        try {
            const findings = JSON.parse(outputData);
            logger.appendLine(`[Scan] Parsed successfully. Found ${findings.length} secrets.`);
            const diagnostics = [];
            findings.forEach(finding => {
                const lineIndex = finding.line - 1;
                if (lineIndex >= document.lineCount)
                    return;
                const lineText = document.lineAt(lineIndex).text;
                const startIndex = lineText.indexOf(finding.match);
                const endIndex = startIndex + finding.match.length;
                if (startIndex !== -1) {
                    const range = new vscode.Range(lineIndex, startIndex, lineIndex, endIndex);
                    const message = `ShadowGuard: Leaked ${finding.type} detected. (Entropy: ${finding.entropy.toFixed(2)})`;
                    const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diagnostic);
                }
            });
            diagnosticCollection.set(document.uri, diagnostics);
            logger.appendLine(`[UI] Painted ${diagnostics.length} red squiggles on the screen.`);
        }
        catch (error) {
            logger.appendLine(`[JSON Parse ERROR] ${error}`);
        }
    });
    // Send the text and close the pipe
    engine.stdin.write(text);
    engine.stdin.end();
}
function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
    if (logger) {
        logger.dispose();
    }
}


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("fs");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map