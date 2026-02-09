import * as vscode from 'vscode';
import { KEYWORDS } from './data/keywords';

export class Vic3Diagnostics {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('vic3');
    }

    public updateDiagnostics(document: vscode.TextDocument): void {
        const config = vscode.workspace.getConfiguration('vic3');
        if (!config.get<boolean>('validation.enable', true)) {
            this.diagnosticCollection.delete(document.uri);
            return;
        }

        // Debounce to avoid excessive updates
        const existingTimer = this.debounceTimers.get(document.uri.toString());
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            this.performDiagnostics(document);
            this.debounceTimers.delete(document.uri.toString());
        }, 300);

        this.debounceTimers.set(document.uri.toString(), timer);
    }

    private performDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        const config = vscode.workspace.getConfiguration('vic3');
        const showUnknownWarning = config.get<boolean>('validation.unknownKeywordWarning', true);

        // Check brackets
        this.checkBrackets(lines, diagnostics);

        // Check strings
        this.checkStrings(lines, diagnostics);

        // Check syntax
        this.checkSyntax(lines, diagnostics);

        // Check keywords
        if (showUnknownWarning) {
            this.checkKeywords(lines, diagnostics);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private checkBrackets(lines: string[], diagnostics: vscode.Diagnostic[]): void {
        const stack: { line: number; col: number }[] = [];
        let inString = false;

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            let inComment = false;

            for (let col = 0; col < line.length; col++) {
                const char = line[col];

                if (char === '#' && !inString) {
                    inComment = true;
                }

                if (inComment) continue;

                if (char === '"') {
                    inString = !inString;
                }

                if (inString) continue;

                if (char === '{') {
                    stack.push({ line: lineNum, col });
                }

                if (char === '}') {
                    if (stack.length === 0) {
                        diagnostics.push(new vscode.Diagnostic(
                            new vscode.Range(lineNum, col, lineNum, col + 1),
                            "Unmatched closing '}'",
                            vscode.DiagnosticSeverity.Error
                        ));
                    } else {
                        stack.pop();
                    }
                }
            }
        }

        // Unclosed brackets
        for (const bracket of stack) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(bracket.line, bracket.col, bracket.line, bracket.col + 1),
                "Unclosed opening '{'",
                vscode.DiagnosticSeverity.Error
            ));
        }
    }

    private checkStrings(lines: string[], diagnostics: vscode.Diagnostic[]): void {
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            
            if (line.trim().startsWith('#')) continue;

            let inString = false;
            let quoteCount = 0;

            for (let col = 0; col < line.length; col++) {
                const char = line[col];

                if (char === '#' && !inString) break;

                if (char === '"' && line[col - 1] !== '\\') {
                    quoteCount++;
                    inString = !inString;
                }
            }

            if (quoteCount % 2 !== 0) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, 0, lineNum, line.length),
                    'Unclosed string quote',
                    vscode.DiagnosticSeverity.Error
                ));
            }
        }
    }

    private checkSyntax(lines: string[], diagnostics: vscode.Diagnostic[]): void {
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) continue;

            // Check for == instead of =
            const doubleEquals = /(?<![<>!])={2}(?!=)/.exec(line);
            if (doubleEquals) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, doubleEquals.index, lineNum, doubleEquals.index + 2),
                    "Use '=' instead of '=='",
                    vscode.DiagnosticSeverity.Error
                ));
            }

            // Check for trailing semicolon
            if (trimmed.endsWith(';')) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, line.length - 1, lineNum, line.length),
                    "Remove trailing ';' (not needed in Paradox script)",
                    vscode.DiagnosticSeverity.Error
                ));
            }

            // Check for missing space around =
            const noSpaceEquals = /\S=\S/.exec(line);
            if (noSpaceEquals && !line.includes('"')) {
                // This is just a hint, not an error
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(lineNum, noSpaceEquals.index, lineNum, noSpaceEquals.index + 3),
                    "Consider adding spaces around '=' for readability",
                    vscode.DiagnosticSeverity.Hint
                ));
            }
        }
    }

    private checkKeywords(lines: string[], diagnostics: vscode.Diagnostic[]): void {
        const validPrefixes = [
            'is_', 'has_', 'can_', 'any_', 'all_', 'count_', 'num_',
            'add_', 'set_', 'remove_', 'create_', 'trigger_', 'change_',
            'every_', 'random_', 'ordered_', 'percent_', 'on_',
            'building_', 'country_', 'state_', 'pop_', 'unit_',
            'character_', 'ig_', 'pm_', 'law_', 'tech_', 'market_',
            'bg_', 'je_', 'institution_', 'interest_group_'
        ];

        const validSuffixes = ['_mult', '_add', '_div', '_min', '_max', '_factor', '_bool'];

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) continue;

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) continue;

            const leftSide = trimmed.substring(0, eqIndex).trim().toLowerCase();
            const rightSide = trimmed.substring(eqIndex + 1).trim();

            // Skip various valid cases
            if (!leftSide) continue;
            if (/^[a-z_]+\.\d+$/i.test(leftSide)) continue; // Event ID
            if (line.trimStart() === line && (rightSide === '{' || rightSide.startsWith('{'))) continue; // Top-level definition
            if (leftSide.includes(':')) continue; // scope:name, var:name
            if (/^\d+$/.test(leftSide)) continue; // Number
            if (/^-?\d+\.?\d*$/.test(leftSide)) continue; // Decimal
            if (['yes', 'no', 'true', 'false'].includes(leftSide)) continue;
            if (leftSide.startsWith('@')) continue; // Variable
            if (leftSide.startsWith('"')) continue; // String key

            // Check if keyword exists
            if (!KEYWORDS[leftSide]) {
                // Check if it looks valid based on prefix/suffix
                const looksValid = validPrefixes.some(p => leftSide.startsWith(p)) ||
                                   validSuffixes.some(s => leftSide.endsWith(s));

                if (!looksValid) {
                    const colStart = line.indexOf(leftSide);
                    const similar = this.findSimilarKeywords(leftSide);
                    
                    let message = `Unknown keyword: '${leftSide}'`;
                    if (similar.length > 0) {
                        message += `. Did you mean: ${similar.slice(0, 3).join(', ')}?`;
                    }

                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(lineNum, colStart, lineNum, colStart + leftSide.length),
                        message,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
        }
    }

    private findSimilarKeywords(word: string): string[] {
        const results: string[] = [];
        const wordLower = word.toLowerCase();

        for (const keyword of Object.keys(KEYWORDS)) {
            if (keyword.includes(wordLower) || wordLower.includes(keyword)) {
                results.push(keyword);
            } else if (this.levenshtein(wordLower, keyword) <= 2) {
                results.push(keyword);
            }

            if (results.length >= 5) break;
        }

        return results;
    }

    private levenshtein(a: string, b: string): number {
        if (Math.abs(a.length - b.length) > 2) return 3;

        const matrix: number[][] = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
    }
}