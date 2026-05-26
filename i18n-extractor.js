const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'frontend/src/translations/locales');
const enFile = path.join(localesPath, 'en.json');
const nyFile = path.join(localesPath, 'ny.json');

let enTranslations = JSON.parse(fs.readFileSync(enFile, 'utf8'));
let nyTranslations = JSON.parse(fs.readFileSync(nyFile, 'utf8'));

// We will put everything under a new "auto" namespace to avoid conflicts
if (!enTranslations.auto) enTranslations.auto = {};
if (!nyTranslations.auto) nyTranslations.auto = {};

function generateKey(text) {
    let key = text.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (key.length > 40) key = key.substring(0, 40) + '_' + Math.random().toString(36).substring(2,6);
    if (!key) key = 'empty_' + Math.random().toString(36).substring(2,6);
    return key;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let modified = false;

    // Pattern for simple JSX text: > Text Here <
    // Be careful with nested tags, logic, etc.
    // This is a naive regex but works for a lot of simple text.
    content = content.replace(/>\s*([^<{]+?)\s*</g, (match, p1) => {
        let text = p1.trim();
        // Ignore single characters, numbers, symbols, or all uppercase codes
        if (text.length < 2 || /^[^a-zA-Z]+$/.test(text) || /^(&[a-z]+;|[A-Z_]+)$/.test(text)) {
            return match;
        }

        const key = generateKey(text);
        enTranslations.auto[key] = text;
        
        // Naive Chichewa translation (just append ' [NY]' for now to prove it works)
        if (!nyTranslations.auto[key]) {
            nyTranslations.auto[key] = text + " [NY]"; 
        }

        modified = true;
        return `>{t('auto.${key}')}<`;
    });

    // Pattern for placeholder="Text"
    content = content.replace(/placeholder="([^"]+)"/g, (match, p1) => {
        let text = p1.trim();
        if (text.length < 2) return match;
        
        const key = generateKey(text);
        enTranslations.auto[key] = text;
        if (!nyTranslations.auto[key]) nyTranslations.auto[key] = text + " [NY]"; 

        modified = true;
        return `placeholder={t('auto.${key}')}`;
    });

    // Pattern for label="Text"
    content = content.replace(/label="([^"]+)"/g, (match, p1) => {
        let text = p1.trim();
        if (text.length < 2) return match;
        
        const key = generateKey(text);
        enTranslations.auto[key] = text;
        if (!nyTranslations.auto[key]) nyTranslations.auto[key] = text + " [NY]"; 

        modified = true;
        return `label={t('auto.${key}')}`;
    });

    // Ensure useTranslation is imported and used
    if (modified && !content.includes('useTranslation')) {
        content = `import { useTranslation } from 'react-i18next';\n` + content;
        
        // Find component definition to inject const { t } = useTranslation();
        content = content.replace(/(export const [a-zA-Z0-9_]+.*=>\s*{)/, `$1\n  const { t } = useTranslation();\n`);
        content = content.replace(/(export default function [a-zA-Z0-9_]+\(.*\)[\s]*{)/, `$1\n  const { t } = useTranslation();\n`);
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walkDir(path.join(__dirname, 'frontend/src/pages'));
walkDir(path.join(__dirname, 'frontend/src/components'));

fs.writeFileSync(enFile, JSON.stringify(enTranslations, null, 2), 'utf8');
fs.writeFileSync(nyFile, JSON.stringify(nyTranslations, null, 2), 'utf8');

console.log("Translation extraction complete.");
