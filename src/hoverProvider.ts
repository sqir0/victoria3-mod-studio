import * as vscode from 'vscode';
import { KEYWORDS, KeywordInfo } from './data/keywords';

export class Vic3HoverProvider implements vscode.HoverProvider {

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {

        const config = vscode.workspace.getConfiguration('vic3');
        if (!config.get<boolean>('hover.enable', true)) {
            return null;
        }

        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange).toLowerCase();
        const info = KEYWORDS[word];

        if (!info) {
            return null;
        }

        const language = config.get<string>('language', 'en');
        const markdown = this.createHoverContent(word, info, language);

        return new vscode.Hover(markdown, wordRange);
    }

    private createHoverContent(keyword: string, info: KeywordInfo, language: string): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;

        // Header with type badge
        const typeColor = this.getTypeColor(info.type);
        const typeIcon = this.getTypeIcon(info.type);
        
        md.appendMarkdown(`### ${typeIcon} \`${keyword}\`\n\n`);
        md.appendMarkdown(`**Type:** \`${info.type.toUpperCase()}\`\n\n`);

        // Description
        if (info.desc) {
            const desc = this.getLocalizedDesc(info.desc, language);
            md.appendMarkdown(`${desc}\n\n`);
        }

        // Scopes
        if (info.scopes) {
            md.appendMarkdown(`**Scopes:** \`${info.scopes}\`\n\n`);
        }

        // Usage example
        const example = this.getUsageExample(keyword, info);
        if (example) {
            md.appendMarkdown(`---\n\n`);
            md.appendMarkdown(`**Example:**\n`);
            md.appendCodeblock(example, 'vic3');
        }

        return md;
    }

    private getLocalizedDesc(desc: string, lang: string): string {
        const parts = desc.split('|');
        if (parts.length < 2) return desc;
        const en = parts[0].replace('EN:', '').trim();
        const tr = parts[1].replace('TR:', '').trim();
        return lang === 'tr' ? tr : en;
    }

    private getTypeColor(type: string): string {
        const colors: Record<string, string> = {
            trigger: '#89b4fa',
            effect: '#f38ba8',
            modifier: '#f9e2af',
            scope: '#94e2d5',
            gui: '#f5c2e7',
            structure: '#cba6f7'
        };
        return colors[type] || '#cdd6f4';
    }

    private getTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            trigger: '🔵',
            effect: '🔴',
            modifier: '🟡',
            scope: '🟢',
            gui: '🎨',
            structure: '🟣'
        };
        return icons[type] || '⚪';
    }

    private getUsageExample(keyword: string, info: KeywordInfo): string | null {
        const examples: Record<string, string> = {
            // Triggers
            'is_player': 'trigger = {\n    is_player = yes\n}',
            'has_variable': 'trigger = {\n    has_variable = my_variable\n}',
            'has_modifier': 'trigger = {\n    has_modifier = my_modifier\n}',
            'is_at_war': 'trigger = {\n    is_at_war = yes\n}',
            'has_technology_researched': 'trigger = {\n    has_technology_researched = tech_name\n}',
            'any_country': 'any_country = {\n    limit = {\n        is_player = yes\n    }\n}',
            'NOT': 'NOT = {\n    is_at_war = yes\n}',
            'AND': 'AND = {\n    is_player = yes\n    is_at_war = no\n}',
            'OR': 'OR = {\n    is_player = yes\n    is_ai = yes\n}',

            // Effects
            'add_treasury': 'add_treasury = 1000',
            'add_modifier': 'add_modifier = {\n    name = my_modifier\n    months = 12\n}',
            'remove_modifier': 'remove_modifier = my_modifier',
            'set_variable': 'set_variable = {\n    name = my_var\n    value = 10\n}',
            'trigger_event': 'trigger_event = {\n    id = my_events.1\n    days = 5\n}',
            'if': 'if = {\n    limit = {\n        is_player = yes\n    }\n    add_treasury = 1000\n}',
            'random_list': 'random_list = {\n    50 = {\n        # 50% chance\n    }\n    50 = {\n        # 50% chance\n    }\n}',
            'every_country': 'every_country = {\n    limit = {\n        is_ai = yes\n    }\n    add_treasury = 100\n}',
            'save_scope_as': 'save_scope_as = my_scope',

            // Modifiers
            'country_prestige_add': 'country_prestige_add = 10',
            'country_prestige_mult': 'country_prestige_mult = 0.1',
            'state_infrastructure_add': 'state_infrastructure_add = 5',
            'building_throughput_mult': 'building_throughput_mult = 0.2',

            // Scopes
            'root': 'root = {\n    # Access root scope\n}',
            'owner': 'owner = {\n    # Access owner country\n}',
            'capital': 'capital = {\n    # Access capital state\n}',

            // GUI
            'window': 'window = {\n    name = "my_window"\n    size = { 600 800 }\n    position = { 100 100 }\n}',
            'button': 'button = {\n    name = "my_button"\n    size = { 200 40 }\n    text = "CLICK_ME"\n    onclick = "[Execute(Action)]"\n}',
            'text_single': 'text_single = {\n    text = "MY_TEXT"\n    align = center\n}',
            'hbox': 'hbox = {\n    spacing = 10\n    # horizontal layout\n}',
            'vbox': 'vbox = {\n    spacing = 10\n    # vertical layout\n}',
            'datamodel': 'datamodel = "[GetDataModel]"\n\nitem = {\n    # item template\n}',

            // Structure
            'namespace': 'namespace = my_events',
            'trigger': 'trigger = {\n    # conditions\n}',
            'immediate': 'immediate = {\n    # effects\n}',
            'option': 'option = {\n    name = my_events.1.a\n    # effects\n}',
            'ai_chance': 'ai_chance = {\n    base = 100\n    modifier = {\n        factor = 0\n        is_player = yes\n    }\n}'
        };

        return examples[keyword] || null;
    }
}