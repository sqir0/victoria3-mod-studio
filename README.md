# Victoria 3 Mod Studio

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Victoria 3](https://img.shields.io/badge/Victoria%203-v1.12.4-gold)
![VS Code](https://img.shields.io/badge/VS%20Code-1.80+-purple)

Complete modding toolkit for **Victoria 3** with syntax highlighting, IntelliSense, validation, and more!

## ✨ Features

### 🎨 Syntax Highlighting
- Full syntax highlighting for `.txt` and `.gui` files
- Color-coded keywords: triggers (blue), effects (red), modifiers (yellow), scopes (teal), GUI (pink)
- String, number, and comment highlighting
- Variable highlighting (`@variables`, `scope:`, `var:`)

### 🧠 IntelliSense
- **Auto-completion** for 300+ keywords
- Smart snippets for events, decisions, journal entries, GUI, and more
- Context-aware suggestions
- Scope and variable completion

### ✅ Real-time Validation
- Bracket matching and error detection
- Unclosed string detection
- Unknown keyword warnings
- Syntax error highlighting

### 📝 Code Formatting
- Automatic indentation
- Configurable tab size
- Space normalization around operators

### 📚 Hover Information
- Detailed keyword descriptions
- Scope information
- Usage examples
- Bilingual support (English / Turkish)

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Victoria 3 Mod Studio"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from releases
2. Open VS Code
3. Go to Extensions → `...` menu → "Install from VSIX..."
4. Select the downloaded file

## 🚀 Quick Start

1. Open your Victoria 3 mod folder in VS Code
2. Open any `.txt` or `.gui` file
3. Start typing and enjoy IntelliSense!

### Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Validate file | `Ctrl+Shift+V` |
| Format document | `Ctrl+Shift+F` |
| Show keyword database | Command Palette → "Victoria 3: Show Keyword Database" |
| Insert snippet | Command Palette → "Victoria 3: Insert Snippet" |

## ⚙️ Configuration

Open Settings (`Ctrl+,`) and search for "Victoria 3":

| Setting | Description | Default |
|---------|-------------|---------|
| `vic3.validation.enable` | Enable real-time validation | `true` |
| `vic3.validation.unknownKeywordWarning` | Warn about unknown keywords | `true` |
| `vic3.completion.enable` | Enable auto-completion | `true` |
| `vic3.completion.showDescriptions` | Show descriptions in completions | `true` |
| `vic3.hover.enable` | Enable hover information | `true` |
| `vic3.language` | Description language (en/tr) | `en` |
| `vic3.formatting.tabSize` | Indentation size | `4` |
| `vic3.formatting.insertSpaceAroundOperators` | Add spaces around `=` | `true` |

## 📖 Supported Content

### Script Keywords (300+)
- **Triggers:** `is_player`, `has_variable`, `any_country`, `NOT`, `AND`, `OR`, etc.
- **Effects:** `add_treasury`, `trigger_event`, `set_variable`, `every_country`, etc.
- **Modifiers:** `country_prestige_add`, `state_infrastructure_mult`, etc.
- **Scopes:** `root`, `owner`, `capital`, `ruler`, etc.
- **Structure:** `namespace`, `trigger`, `immediate`, `option`, etc.

### GUI Keywords (100+)
- **Widgets:** `window`, `button`, `icon`, `text_single`, `scrollarea`, etc.
- **Layouts:** `hbox`, `vbox`, `flowcontainer`, `fixedgridbox`, etc.
- **Properties:** `size`, `position`, `visible`, `onclick`, `tooltip`, etc.

### Snippets (15+)
- Country Event
- State Event
- Decision
- Journal Entry
- Scripted Trigger/Effect
- GUI Window
- GUI Button
- And more...

## 🌍 Language Support

Descriptions are available in:
- 🇬🇧 English
- 🇹🇷 Türkçe

Change the language in settings: `vic3.language`

## 🤝 Contributing

Contributions are welcome! Please feel free to:
- Report bugs
- Suggest new features
- Add more keywords
- Improve translations

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Credits

- **Author:** SqiR
- **Victoria 3** by Paradox Interactive
- Inspired by [CWTools](https://github.com/cwtools/cwtools)

---

**Enjoy modding Victoria 3!** 🎮