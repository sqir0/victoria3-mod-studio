import * as https from 'https';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface KeywordInfo {
    type: 'trigger' | 'effect' | 'modifier' | 'scope' | 'gui' | 'structure';
    desc?: string;
    scopes?: string;
}

interface DatabaseKeyword {
    desc?: string;
    scopes?: string;
    category?: string;
}

interface DatabaseStructure {
    triggers: Record<string, DatabaseKeyword>;
    effects: Record<string, DatabaseKeyword>;
    modifiers: Record<string, DatabaseKeyword>;
    scopes: Record<string, DatabaseKeyword>;
    structure: Record<string, DatabaseKeyword>;
    gui: Record<string, DatabaseKeyword>;
}

// ═══════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════

const DATABASE_URL = 'https://raw.githubusercontent.com/sqir0/vic3-mod-studio/main/database.json';

// Başlangıçta boş, initializeKeywords ile doldurulacak
export let KEYWORDS: Record<string, KeywordInfo> = {};

// ═══════════════════════════════════════════════════════════════
// FETCH HELPER (Node.js için)
// ═══════════════════════════════════════════════════════════════

function fetchJSON(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            // Redirect takibi
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    fetchJSON(redirectUrl).then(resolve).catch(reject);
                    return;
                }
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════

export async function initializeKeywords(): Promise<void> {
    try {
        console.log('[Vic3] Loading database from GitHub...');
        
        const database: DatabaseStructure = await fetchJSON(DATABASE_URL);
        
        if (database) {
            KEYWORDS = convertDatabaseToKeywords(database);
            console.log(`[Vic3] ✅ Database loaded: ${Object.keys(KEYWORDS).length} keywords`);
        } else {
            throw new Error('Empty database');
        }
        
    } catch (error) {
        console.error('[Vic3] ❌ Database load failed:', error);
        console.log('[Vic3] Using fallback...');
        KEYWORDS = getFallbackKeywords();
    }
}

// ═══════════════════════════════════════════════════════════════
// CONVERTER
// ═══════════════════════════════════════════════════════════════

function convertDatabaseToKeywords(database: DatabaseStructure): Record<string, KeywordInfo> {
    const keywords: Record<string, KeywordInfo> = {};

    const categoryMap: Record<string, 'trigger' | 'effect' | 'modifier' | 'scope' | 'gui' | 'structure'> = {
        triggers: 'trigger',
        effects: 'effect',
        modifiers: 'modifier',
        scopes: 'scope',
        structure: 'structure',
        gui: 'gui'
    };

    for (const [category, type] of Object.entries(categoryMap)) {
        const items = (database as any)[category] || {};
        
        for (const [key, value] of Object.entries(items) as [string, DatabaseKeyword][]) {
            const keyLower = key.toLowerCase();
            
            // Duplicate check
            if (!keywords[keyLower]) {
                keywords[keyLower] = {
                    type: type,
                    desc: value.desc || '',
                    scopes: category === 'gui' ? (value.category || 'gui') : (value.scopes || 'any')
                };
            }
        }
    }

    return keywords;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK (İnternet yoksa)
// ═══════════════════════════════════════════════════════════════

function getFallbackKeywords(): Record<string, KeywordInfo> {
    return {
        // Temel Triggers
        "always": { type: "trigger", desc: "EN: Always true/false | TR: Her zaman doğru/yanlış", scopes: "any" },
        "is_player": { type: "trigger", desc: "EN: Is player controlled | TR: Oyuncu kontrolünde mi", scopes: "country" },
        "is_ai": { type: "trigger", desc: "EN: Is AI controlled | TR: AI kontrolünde mi", scopes: "country" },
        "has_variable": { type: "trigger", desc: "EN: Has variable | TR: Değişken var mı", scopes: "any" },
        "has_modifier": { type: "trigger", desc: "EN: Has modifier | TR: Modifier var mı", scopes: "any" },
        "NOT": { type: "trigger", desc: "EN: Negation | TR: Tersine çevir", scopes: "any" },
        "AND": { type: "trigger", desc: "EN: All must be true | TR: Hepsi doğru olmalı", scopes: "any" },
        "OR": { type: "trigger", desc: "EN: Any must be true | TR: Biri doğru olmalı", scopes: "any" },
        
        // Temel Effects
        "add_treasury": { type: "effect", desc: "EN: Add/remove money | TR: Para ekle/çıkar", scopes: "country" },
        "add_modifier": { type: "effect", desc: "EN: Add modifier | TR: Modifier ekle", scopes: "any" },
        "remove_modifier": { type: "effect", desc: "EN: Remove modifier | TR: Modifier kaldır", scopes: "any" },
        "set_variable": { type: "effect", desc: "EN: Set variable | TR: Değişken ayarla", scopes: "any" },
        "trigger_event": { type: "effect", desc: "EN: Trigger event | TR: Olay tetikle", scopes: "any" },
        "if": { type: "effect", desc: "EN: Conditional | TR: Koşullu", scopes: "any" },
        "else": { type: "effect", desc: "EN: Else branch | TR: Değilse dalı", scopes: "any" },
        
        // Temel Structure
        "namespace": { type: "structure", desc: "EN: Event namespace | TR: Olay ad alanı", scopes: "event" },
        "trigger": { type: "structure", desc: "EN: Trigger block | TR: Tetikleyici bloğu", scopes: "any" },
        "immediate": { type: "structure", desc: "EN: Immediate effects | TR: Anlık efektler", scopes: "event" },
        "option": { type: "structure", desc: "EN: Event option | TR: Olay seçeneği", scopes: "event" },
        
        // Temel Scopes
        "root": { type: "scope", desc: "EN: Root scope | TR: Kök kapsam", scopes: "any" },
        "this": { type: "scope", desc: "EN: Current scope | TR: Mevcut kapsam", scopes: "any" },
        "owner": { type: "scope", desc: "EN: Owner scope | TR: Sahip kapsamı", scopes: "state, building" },
        
        // Temel GUI
        "window": { type: "gui", desc: "EN: GUI window | TR: GUI penceresi", scopes: "gui" },
        "button": { type: "gui", desc: "EN: Button widget | TR: Buton widget", scopes: "gui" },
        "text_single": { type: "gui", desc: "EN: Single line text | TR: Tek satır metin", scopes: "gui" },
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getKeywordCount(): number {
    return Object.keys(KEYWORDS).length;
}

export function getKeywordsByType(type: string): Array<{ keyword: string; info: KeywordInfo }> {
    return Object.entries(KEYWORDS)
        .filter(([_, info]) => info.type === type)
        .map(([keyword, info]) => ({ keyword, info }));
}

export function searchKeywords(query: string): Array<{ keyword: string; info: KeywordInfo }> {
    const lowerQuery = query.toLowerCase();
    return Object.entries(KEYWORDS)
        .filter(([keyword, _]) => keyword.includes(lowerQuery))
        .map(([keyword, info]) => ({ keyword, info }))
        .slice(0, 50);
}

export function getKeyword(name: string): KeywordInfo | undefined {
    return KEYWORDS[name.toLowerCase()];
}

export function hasKeyword(name: string): boolean {
    return name.toLowerCase() in KEYWORDS;
}