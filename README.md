# 🎮 Victoria 3 Mod Studio

Complete modding toolkit for **Victoria 3** - Syntax highlighting, IntelliSense, validation, and more!

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Victoria 3](https://img.shields.io/badge/Victoria%203-v1.12.4-gold)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🎨 **Syntax Highlighting** - Full support for `.txt` and `.gui` files
- 🧠 **IntelliSense** - 2000+ keywords with auto-completion
- ✅ **Real-time Validation** - Bracket matching, syntax errors
- 📝 **Code Formatting** - Auto-indent and beautify
- 📖 **Hover Docs** - Keyword descriptions (EN/TR)
- 📚 **Snippets** - 15+ templates (events, decisions, GUI, etc.)

## 📦 Installation

### From Release (Recommended)

1. Go to [Releases](https://github.com/sqir0/victoria3-mod-studio/releases)
2. Download `victoria3-mod-studio-1.0.0.vsix`
3. Open VS Code
4. `Ctrl+Shift+X` → `...` menu → **Install from VSIX...**
5. Select downloaded file

### From Source

```bash
git clone https://github.com/sqir0/victoria3-mod-studio.git
cd victoria3-mod-studio
npm install
npm run compile
npx vsce package
code --install-extension victoria3-mod-studio-1.0.0.vsix
