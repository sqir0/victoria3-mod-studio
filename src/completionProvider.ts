import * as vscode from 'vscode';
import { KEYWORDS, KeywordInfo, searchKeywords } from './data/keywords';

export class Vic3CompletionProvider implements vscode.CompletionItemProvider {

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {

        const config = vscode.workspace.getConfiguration('vic3');
        if (!config.get<boolean>('completion.enable', true)) {
            return [];
        }

        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const wordMatch = linePrefix.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
        
        if (!wordMatch) {
            return this.getContextualCompletions(document, position);
        }

        const word = wordMatch[0].toLowerCase();
        const language = config.get<string>('language', 'en');
        const showDescriptions = config.get<boolean>('completion.showDescriptions', true);

        const completions: vscode.CompletionItem[] = [];
        const matches = searchKeywords(word);

        for (const { keyword, info } of matches) {
            const item = this.createCompletionItem(keyword, info, language, showDescriptions);
            completions.push(item);
        }

        // Add scope completions
        if (linePrefix.includes('scope:') || linePrefix.includes('var:')) {
            completions.push(...this.getScopeVariableCompletions(document));
        }

        return completions;
    }

    private createCompletionItem(
        keyword: string,
        info: KeywordInfo,
        language: string,
        showDescriptions: boolean
    ): vscode.CompletionItem {
        
        const item = new vscode.CompletionItem(keyword, this.getCompletionKind(info.type));
        
        item.detail = `(${info.type}) ${keyword}`;
        
        if (showDescriptions && info.desc) {
            const desc = this.getLocalizedDesc(info.desc, language);
            item.documentation = new vscode.MarkdownString(desc);
            if (info.scopes) {
                item.documentation.appendMarkdown(`\n\n**Scopes:** \`${info.scopes}\``);
            }
        }

        // Insert text with smart formatting
        item.insertText = this.getInsertText(keyword, info);
        
        // Set sort text to prioritize exact matches
        item.sortText = keyword.startsWith(keyword) ? `0_${keyword}` : `1_${keyword}`;

        // Add color based on type
        item.tags = [];

        return item;
    }

    private getCompletionKind(type: string): vscode.CompletionItemKind {
        switch (type) {
            case 'trigger':
                return vscode.CompletionItemKind.Function;
            case 'effect':
                return vscode.CompletionItemKind.Method;
            case 'modifier':
                return vscode.CompletionItemKind.Variable;
            case 'scope':
                return vscode.CompletionItemKind.Reference;
            case 'gui':
                return vscode.CompletionItemKind.Class;
            case 'structure':
                return vscode.CompletionItemKind.Keyword;
            default:
                return vscode.CompletionItemKind.Text;
        }
    }

    private getInsertText(keyword: string, info: KeywordInfo): vscode.SnippetString {
        // Smart insert based on keyword type
        const blockKeywords = [
            'if', 'else', 'else_if', 'trigger_if', 'trigger_else', 'trigger_else_if',
            'random', 'random_list', 'while', 'switch', 'limit',
            'every_country', 'every_scope_state', 'every_scope_pop', 'every_scope_building',
            'every_scope_character', 'every_interest_group',
            'random_country', 'random_scope_state', 'random_scope_character',
            'any_country', 'any_scope_state', 'any_scope_pop', 'any_scope_building',
            'NOT', 'AND', 'OR', 'NOR', 'NAND',
            'trigger', 'immediate', 'option', 'possible', 'is_shown', 'when_taken',
            'complete', 'on_complete', 'fail', 'on_fail', 'on_start',
            'event_image', 'ai_chance', 'building_modifiers', 'workforce_scaled'
        ];

        const valueKeywords = [
            'add_treasury', 'add_prestige', 'add_infamy', 'add_loyalists', 'add_radicals',
            'set_variable', 'change_variable', 'days', 'months', 'years',
            'base', 'factor', 'weight', 'value', 'min', 'max'
        ];

        const scopeKeywords = [
            'save_scope_as', 'save_temporary_scope_as', 'save_scope_value_as'
        ];

        if (blockKeywords.includes(keyword)) {
            return new vscode.SnippetString(`${keyword} = {\n\t$0\n}`);
        } else if (valueKeywords.includes(keyword)) {
            return new vscode.SnippetString(`${keyword} = \${1:0}`);
        } else if (scopeKeywords.includes(keyword)) {
            return new vscode.SnippetString(`${keyword} = \${1:scope_name}`);
        } else if (keyword === 'trigger_event') {
            return new vscode.SnippetString(`trigger_event = {\n\tid = \${1:namespace}.\${2:1}\n\tdays = \${3:1}\n}`);
        } else if (keyword === 'add_modifier') {
            return new vscode.SnippetString(`add_modifier = {\n\tname = \${1:modifier_name}\n\tmonths = \${2:12}\n}`);
        } else if (info.type === 'gui') {
            return new vscode.SnippetString(`${keyword} = {\n\t$0\n}`);
        } else {
            return new vscode.SnippetString(`${keyword} = \${1:yes}`);
        }
    }

    private getLocalizedDesc(desc: string, lang: string): string {
        const parts = desc.split('|');
        if (parts.length < 2) return desc;
        const en = parts[0].replace('EN:', '').trim();
        const tr = parts[1].replace('TR:', '').trim();
        return lang === 'tr' ? tr : en;
    }

    private getContextualCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Analyze context
        const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const depth = this.getBracketDepth(textBefore);
        const lastKeyword = this.getLastKeyword(textBefore);

        // Context-aware suggestions
        if (lastKeyword === 'trigger' || lastKeyword === 'limit' || lastKeyword === 'possible') {
            // Suggest triggers
            const triggers = Object.entries(KEYWORDS)
                .filter(([_, info]) => info.type === 'trigger')
                .slice(0, 20);
            
            for (const [keyword, info] of triggers) {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Function);
                item.detail = '(trigger)';
                completions.push(item);
            }
        } else if (lastKeyword === 'immediate' || lastKeyword === 'when_taken' || lastKeyword === 'on_complete') {
            // Suggest effects
            const effects = Object.entries(KEYWORDS)
                .filter(([_, info]) => info.type === 'effect')
                .slice(0, 20);
            
            for (const [keyword, info] of effects) {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Method);
                item.detail = '(effect)';
                completions.push(item);
            }
        }

        return completions;
    }

    private getScopeVariableCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const text = document.getText();

        // Find saved scopes
        const scopeMatches = text.matchAll(/save_(?:temporary_)?scope_as\s*=\s*(\w+)/g);
        for (const match of scopeMatches) {
            const item = new vscode.CompletionItem(`scope:${match[1]}`, vscode.CompletionItemKind.Reference);
            item.detail = 'Saved scope';
            completions.push(item);
        }

        // Find variables
        const varMatches = text.matchAll(/set_variable\s*=\s*(\w+)/g);
        for (const match of varMatches) {
            const item = new vscode.CompletionItem(`var:${match[1]}`, vscode.CompletionItemKind.Variable);
            item.detail = 'Variable';
            completions.push(item);
        }

        return completions;
    }

    private getBracketDepth(text: string): number {
        let depth = 0;
        let inString = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"' && text[i - 1] !== '\\') {
                inString = !inString;
            }
            if (!inString) {
                if (char === '{') depth++;
                if (char === '}') depth--;
            }
        }
        
        return depth;
    }

    private getLastKeyword(text: string): string | null {
        const lines = text.split('\n').reverse();
        
        for (const line of lines) {
            const match = line.match(/^\s*(\w+)\s*=\s*\{?\s*$/);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }
}