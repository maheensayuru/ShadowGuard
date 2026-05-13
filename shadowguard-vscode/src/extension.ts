import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os'; // Added OS module

interface Finding {
    line: number;
    match: string;
    type: string;
    entropy: number;
}

let diagnosticCollection: vscode.DiagnosticCollection;
let logger: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    logger = vscode.window.createOutputChannel('ShadowGuard');
    logger.appendLine('[Boot] ShadowGuard Extension Activated.');

    diagnosticCollection = vscode.languages.createDiagnosticCollection('shadowguard');
    context.subscriptions.push(diagnosticCollection);

    // --- THE OS ROUTER ---
    const platform = os.platform();
    const arch = os.arch();
    let binaryName = 'shadowguard-win.exe'; // Default to Windows

    if (platform === 'linux') {
        binaryName = 'shadowguard-linux';
    } else if (platform === 'darwin') {
        binaryName = arch === 'arm64' ? 'shadowguard-mac-arm64' : 'shadowguard-mac-amd64';
    }

    logger.appendLine(`[Boot] OS Detected: ${platform} (${arch})`);
    logger.appendLine(`[Boot] Selected Engine: ${binaryName}`);

    // Point to the new 'bin' folder inside the extension
    const extPath = context.extensionPath;
    const enginePath = path.join(extPath, 'bin', binaryName);
    
    if (!fs.existsSync(enginePath)) {
        logger.appendLine(`[Boot] FATAL ERROR: ${binaryName} NOT FOUND in bin directory!`);
        vscode.window.showErrorMessage('ShadowGuard Engine missing! Check Output tab.');
        return;
    } else {
        logger.appendLine(`[Boot] Engine binary verified on disk.`);
    }

    let typingTimer: NodeJS.Timeout | undefined;

    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;

        if (document.uri.scheme !== 'file') { return; }
        if (typingTimer) { clearTimeout(typingTimer); }
        
        typingTimer = setTimeout(() => {
            scanDocument(document, enginePath);
        }, 500);
    });
}

function scanDocument(document: vscode.TextDocument, enginePath: string) {
    const text = document.getText();
    if (!text) return;

    const engine = spawn(enginePath);
    let outputData = '';

    engine.stdout.on('data', (data: any) => {
        outputData += data.toString();
    });

    engine.stderr.on('data', (data: any) => {
        logger.appendLine(`[Engine ERROR] ${data.toString()}`);
    });

    engine.on('error', (err) => {
        logger.appendLine(`[Spawn ERROR] Failed to start process: ${err.message}`);
    });

    engine.on('close', (code: number) => {
        if (code !== 0 || !outputData.trim()) { return; }

        try {
            const findings: Finding[] = JSON.parse(outputData);
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

        } catch (error) {
            logger.appendLine(`[JSON Parse ERROR] ${error}`);
        }
    });

    engine.stdin.write(text);
    engine.stdin.end();
}

export function deactivate() {
    if (diagnosticCollection) { diagnosticCollection.dispose(); }
    if (logger) { logger.dispose(); }
}