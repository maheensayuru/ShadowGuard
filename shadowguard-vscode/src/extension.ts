import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface Finding {
    line: number;
    match: string;
    type: string;
    entropy: number;
}

let diagnosticCollection: vscode.DiagnosticCollection;
let logger: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
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
    } else {
        logger.appendLine(`[Boot] Engine binary verified on disk.`);
    }

    let typingTimer: NodeJS.Timeout | undefined;

    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.uri.scheme !== 'file') {
            return;
        }
        if (typingTimer) { clearTimeout(typingTimer); }
        
        typingTimer = setTimeout(() => {
            scanDocument(document, enginePath);
        }, 500);
    });
}

function scanDocument(document: vscode.TextDocument, enginePath: string) {
    const text = document.getText();
    if (!text) return;

    logger.appendLine(`\n[Scan] Triggered. Sending ${document.lineCount} lines to Go Engine...`);

    const engine = spawn(enginePath);
    let outputData = '';

    // Capture standard output
    engine.stdout.on('data', (data: any) => {
        outputData += data.toString();
    });

    // Capture Go runtime panics or errors
    engine.stderr.on('data', (data: any) => {
        logger.appendLine(`[Engine ERROR] ${data.toString()}`);
    });

    // Capture Node.js failure to spawn
    engine.on('error', (err) => {
        logger.appendLine(`[Spawn ERROR] Failed to start process: ${err.message}`);
    });

    engine.on('close', (code: number) => {
        logger.appendLine(`[Scan] Process closed with code: ${code}`);
        logger.appendLine(`[Scan] Raw JSON received: ${outputData.trim() || 'EMPTY'}`);

        if (code !== 0 || !outputData.trim()) { return; }

        try {
            const findings: Finding[] = JSON.parse(outputData);
            logger.appendLine(`[Scan] Parsed successfully. Found ${findings.length} secrets.`);
            
            const diagnostics: vscode.Diagnostic[] = [];

            findings.forEach(finding => {
                const lineIndex = finding.line - 1;
                if (lineIndex >= document.lineCount) return;

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

        } catch (error) {
            logger.appendLine(`[JSON Parse ERROR] ${error}`);
        }
    });

    // Send the text and close the pipe
    engine.stdin.write(text);
    engine.stdin.end();
}

export function deactivate() {
    if (diagnosticCollection) { diagnosticCollection.dispose(); }
    if (logger) { logger.dispose(); }
}