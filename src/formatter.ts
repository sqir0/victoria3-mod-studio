import * as vscode from 'vscode';

export class Vic3Formatter implements vscode.DocumentFormattingEditProvider {

    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {

        const config = vscode.workspace.getConfiguration('vic3');
        const tabSize = config.get<number>('formatting.tabSize', 4);
        const insertSpaces = config.get<boolean>('formatting.insertSpaceAroundOperators', true);

        const text = document.getText();
        const formatted = this.formatCode(text, tabSize, insertSpaces);

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, formatted)];
    }

    private formatCode(code: string, tabSize: number, insertSpaces: boolean): string {
        const lines = code.split('\n');
        const result: string[] = [];
        let indent = 0;
        const indentStr = ' '.repeat(tabSize);

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines
            if (!trimmed) {
                result.push('');
                continue;
            }

            // Count closing braces at start
            let closingBraces = 0;
            for (let i = 0; i < trimmed.length && trimmed[i] === '}'; i++) {
                closingBraces++;
            }

            // Decrease indent for closing braces
            indent = Math.max(0, indent - closingBraces);

            // Format the line
            let formattedLine = indentStr.repeat(indent) + trimmed;

            // Add spaces around = if enabled
            if (insertSpaces && !trimmed.startsWith('#')) {
                formattedLine = this.addSpacesAroundOperators(formattedLine, indentStr.repeat(indent));
            }

            result.push(formattedLine);

            // Count bracket changes for next line
            let openBraces = 0;
            let inString = false;
            let inComment = false;

            for (let i = 0; i < trimmed.length; i++) {
                const char = trimmed[i];

                if (char === '#' && !inString) {
                    inComment = true;
                }

                if (inComment) continue;

                if (char === '"' && trimmed[i - 1] !== '\\') {
                    inString = !inString;
                }

                if (!inString) {
                    if (char === '{') openBraces++;
                    if (char === '}') openBraces--;
                }
            }

            // Adjust for closing braces we already counted
            indent = Math.max(0, indent + openBraces + closingBraces);
        }

        return result.join('\n');
    }

    private addSpacesAroundOperators(line: string, indent: string): string {
        const trimmed = line.trim();
        
        // Skip comments
        if (trimmed.startsWith('#')) {
            return line;
        }

        // Find the = sign (but not inside strings or comparisons)
        let result = '';
        let inString = false;
        let i = 0;

        while (i < trimmed.length) {
            const char = trimmed[i];

            if (char === '"' && trimmed[i - 1] !== '\\') {
                inString = !inString;
                result += char;
                i++;
                continue;
            }

            if (inString) {
                result += char;
                i++;
                continue;
            }

            // Handle comparison operators
            if ((char === '>' || char === '<' || char === '!' || char === '=') && 
                trimmed[i + 1] === '=') {
                // Ensure spaces around comparison operators
                if (result.length > 0 && result[result.length - 1] !== ' ') {
                    result += ' ';
                }
                result += char + trimmed[i + 1];
                i += 2;
                if (i < trimmed.length && trimmed[i] !== ' ') {
                    result += ' ';
                }
                continue;
            }

            // Handle single = (assignment)
            if (char === '=' && 
                trimmed[i - 1] !== '>' && 
                trimmed[i - 1] !== '<' && 
                trimmed[i - 1] !== '!' && 
                trimmed[i - 1] !== '=') {
                
                if (result.length > 0 && result[result.length - 1] !== ' ') {
                    result += ' ';
                }
                result += '=';
                if (i + 1 < trimmed.length && trimmed[i + 1] !== ' ' && trimmed[i + 1] !== '{') {
                    result += ' ';
                }
                i++;
                continue;
            }

            result += char;
            i++;
        }

        return indent + result;
    }
}