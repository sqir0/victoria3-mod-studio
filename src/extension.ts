import * as vscode from 'vscode';
import { Vic3CompletionProvider } from './completionProvider';
import { Vic3HoverProvider } from './hoverProvider';
import { Vic3Diagnostics } from './diagnostics';
import { Vic3Formatter } from './formatter';
import { getKeywordCount, initializeKeywords } from './data/keywords';

let diagnostics: Vic3Diagnostics;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
    console.log('[Victoria 3 Mod Studio] Activating...');

    // Database'i yükle (progress ile)
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: "Vic3 Mod Studio",
        cancellable: false
    }, async (progress) => {
        progress.report({ message: "Loading database..." });
        await initializeKeywords();
        progress.report({ message: `${getKeywordCount()} keywords loaded!` });
    });

    const selector: vscode.DocumentSelector = [
        { language: 'vic3', scheme: 'file' },
        { language: 'vic3-gui', scheme: 'file' }
    ];

    // Status Bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(database) Vic3: ${getKeywordCount()} keywords`;
    statusBarItem.tooltip = 'Victoria 3 Mod Studio - Click for keyword database';
    statusBarItem.command = 'vic3.showKeywordInfo';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Completion Provider
    const completionProvider = new Vic3CompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(selector, completionProvider, '.', '_')
    );

    // Hover Provider
    const hoverProvider = new Vic3HoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(selector, hoverProvider)
    );

    // Diagnostics
    diagnostics = new Vic3Diagnostics();
    context.subscriptions.push(diagnostics);

    // Formatter
    const formatter = new Vic3Formatter();
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(selector, formatter)
    );

    // Document Change Listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.languageId === 'vic3' || e.document.languageId === 'vic3-gui') {
                diagnostics.updateDiagnostics(e.document);
            }
        })
    );

    // Document Open Listener
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => {
            if (doc.languageId === 'vic3' || doc.languageId === 'vic3-gui') {
                diagnostics.updateDiagnostics(doc);
            }
        })
    );

    // ═══════════════════════════════════════════════════════════════
    // COMMANDS
    // ═══════════════════════════════════════════════════════════════

    context.subscriptions.push(
        vscode.commands.registerCommand('vic3.validate', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                diagnostics.updateDiagnostics(editor.document);
                vscode.window.showInformationMessage('Victoria 3: Validation complete ✓');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('vic3.validateWorkspace', async () => {
            const files = await vscode.workspace.findFiles('**/*.{txt,gui}', '**/node_modules/**');
            let count = 0;
            for (const file of files) {
                const doc = await vscode.workspace.openTextDocument(file);
                if (doc.languageId === 'vic3' || doc.languageId === 'vic3-gui') {
                    diagnostics.updateDiagnostics(doc);
                    count++;
                }
            }
            vscode.window.showInformationMessage(`Victoria 3: Validated ${count} files ✓`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('vic3.formatDocument', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                await vscode.commands.executeCommand('editor.action.formatDocument');
                vscode.window.showInformationMessage('Victoria 3: Document formatted ✓');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('vic3.showKeywordInfo', () => {
            showKeywordPanel(context);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('vic3.reloadDatabase', async () => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Reloading Victoria 3 database...",
                cancellable: false
            }, async () => {
                await initializeKeywords();
            });
            
            statusBarItem.text = `$(database) Vic3: ${getKeywordCount()} keywords`;
            vscode.window.showInformationMessage(`Victoria 3: Database reloaded! (${getKeywordCount()} keywords)`);
        })
    );

    // Validate open documents
    vscode.workspace.textDocuments.forEach((doc) => {
        if (doc.languageId === 'vic3' || doc.languageId === 'vic3-gui') {
            diagnostics.updateDiagnostics(doc);
        }
    });

    console.log(`[Victoria 3 Mod Studio] ✅ Activated with ${getKeywordCount()} keywords`);
    
    // Success notification
    vscode.window.showInformationMessage(`Vic3 Mod Studio ready! (${getKeywordCount()} keywords)`);
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD PANEL
// ═══════════════════════════════════════════════════════════════

function showKeywordPanel(context: vscode.ExtensionContext) {
    const { KEYWORDS } = require('./data/keywords');
    
    const panel = vscode.window.createWebviewPanel(
        'vic3Keywords',
        'Victoria 3 Keywords',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const config = vscode.workspace.getConfiguration('vic3');
    const language = config.get<string>('language', 'en');

    // Counts
    const counts = { trigger: 0, effect: 0, modifier: 0, scope: 0, gui: 0, structure: 0 };
    const keywordList: string[] = [];

    for (const [keyword, info] of Object.entries(KEYWORDS) as [string, any][]) {
        counts[info.type as keyof typeof counts]++;
        
        const desc = getLocalizedDesc(info.desc, language);
        const typeColor = getTypeColor(info.type);
        
        keywordList.push(`
            <div class="keyword-item" data-type="${info.type}">
                <div class="keyword-header">
                    <span class="keyword-name">${keyword}</span>
                    <span class="keyword-type" style="background:${typeColor}">${info.type.toUpperCase()}</span>
                </div>
                <div class="keyword-desc">${desc || 'No description'}</div>
                ${info.scopes ? `<div class="keyword-scopes">Scopes: ${info.scopes}</div>` : ''}
            </div>
        `);
    }

    const total = Object.keys(KEYWORDS).length;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #1e1e2e; color: #cdd6f4; }
        .header { margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: 700; color: #c9a227; margin-bottom: 10px; }
        .subtitle { font-size: 12px; color: #6c7086; margin-bottom: 15px; }
        .stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .stat { padding: 10px 16px; border-radius: 8px; background: #262637; font-size: 12px; text-align: center; }
        .stat-value { font-weight: 700; font-size: 18px; display: block; }
        .stat.trigger .stat-value { color: #89b4fa; }
        .stat.effect .stat-value { color: #f38ba8; }
        .stat.modifier .stat-value { color: #f9e2af; }
        .stat.scope .stat-value { color: #94e2d5; }
        .stat.gui .stat-value { color: #f5c2e7; }
        .stat.structure .stat-value { color: #cba6f7; }
        .search { margin-bottom: 15px; }
        .search input { width: 100%; padding: 12px 16px; border: 1px solid #313244; border-radius: 8px; background: #2a2a3d; color: #cdd6f4; font-size: 14px; }
        .search input:focus { outline: none; border-color: #c9a227; }
        .search input::placeholder { color: #6c7086; }
        .filter-buttons { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
        .filter-btn { padding: 8px 14px; border: 1px solid #313244; border-radius: 6px; background: #262637; color: #cdd6f4; cursor: pointer; font-size: 11px; transition: all 0.2s; }
        .filter-btn:hover, .filter-btn.active { background: #c9a227; color: #1e1e2e; border-color: #c9a227; }
        .keywords { display: flex; flex-direction: column; gap: 8px; max-height: 55vh; overflow-y: auto; padding-right: 8px; }
        .keywords::-webkit-scrollbar { width: 8px; }
        .keywords::-webkit-scrollbar-track { background: #262637; border-radius: 4px; }
        .keywords::-webkit-scrollbar-thumb { background: #414158; border-radius: 4px; }
        .keyword-item { padding: 12px 14px; background: #262637; border: 1px solid #313244; border-radius: 8px; transition: all 0.2s; }
        .keyword-item:hover { border-color: #c9a227; transform: translateX(4px); }
        .keyword-item.hidden { display: none; }
        .keyword-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .keyword-name { font-family: 'Consolas', 'Monaco', monospace; font-weight: 600; font-size: 13px; }
        .keyword-type { padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; color: #1e1e2e; }
        .keyword-desc { font-size: 12px; color: #a6adc8; line-height: 1.5; }
        .keyword-scopes { font-size: 10px; color: #6c7086; margin-top: 6px; font-family: monospace; }
        .no-results { text-align: center; padding: 40px; color: #6c7086; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🎮 Victoria 3 Keywords</div>
        <div class="subtitle">Database loaded from GitHub • ${total} keywords</div>
    </div>
    <div class="stats">
        <div class="stat trigger"><span class="stat-value">${counts.trigger}</span>Triggers</div>
        <div class="stat effect"><span class="stat-value">${counts.effect}</span>Effects</div>
        <div class="stat modifier"><span class="stat-value">${counts.modifier}</span>Modifiers</div>
        <div class="stat scope"><span class="stat-value">${counts.scope}</span>Scopes</div>
        <div class="stat gui"><span class="stat-value">${counts.gui}</span>GUI</div>
        <div class="stat structure"><span class="stat-value">${counts.structure}</span>Structure</div>
    </div>
    <div class="search">
        <input type="text" id="search" placeholder="🔍 Search ${total} keywords...">
    </div>
    <div class="filter-buttons">
        <button class="filter-btn active" data-filter="all">All (${total})</button>
        <button class="filter-btn" data-filter="trigger">Triggers</button>
        <button class="filter-btn" data-filter="effect">Effects</button>
        <button class="filter-btn" data-filter="modifier">Modifiers</button>
        <button class="filter-btn" data-filter="scope">Scopes</button>
        <button class="filter-btn" data-filter="gui">GUI</button>
        <button class="filter-btn" data-filter="structure">Structure</button>
    </div>
    <div class="keywords" id="keywords">
        ${keywordList.join('')}
    </div>
    <script>
        const search = document.getElementById('search');
        const keywords = document.querySelectorAll('.keyword-item');
        const filterBtns = document.querySelectorAll('.filter-btn');
        let currentFilter = 'all';

        function filterKeywords() {
            const query = search.value.toLowerCase();
            let visibleCount = 0;
            
            keywords.forEach(kw => {
                const name = kw.querySelector('.keyword-name').textContent.toLowerCase();
                const desc = kw.querySelector('.keyword-desc').textContent.toLowerCase();
                const type = kw.dataset.type;
                const matchesSearch = name.includes(query) || desc.includes(query);
                const matchesFilter = currentFilter === 'all' || type === currentFilter;
                const isVisible = matchesSearch && matchesFilter;
                kw.classList.toggle('hidden', !isVisible);
                if (isVisible) visibleCount++;
            });
        }

        search.addEventListener('input', filterKeywords);
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                filterKeywords();
            });
        });
    </script>
</body>
</html>`;
}

function getLocalizedDesc(desc: string | undefined, lang: string): string {
    if (!desc) return '';
    const parts = desc.split('|');
    if (parts.length < 2) return desc;
    const en = parts[0].replace('EN:', '').trim();
    const tr = parts[1].replace('TR:', '').trim();
    return lang === 'tr' ? tr : en;
}

function getTypeColor(type: string): string {
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

export function deactivate() {
    console.log('[Victoria 3 Mod Studio] Deactivated');
}