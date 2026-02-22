const fs = require('fs');
const hiCode = fs.readFileSync('add_hindi.cjs', 'utf8');
const match = hiCode.match(/const hindiDict = (\{[\s\S]*?\n\});/);

if (!match) {
    console.log('No hindi dict found in add_hindi.cjs');
    process.exit(1);
}

const hiObj = match[1];
let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

if (content.indexOf('hi: {') !== -1) {
    console.log('hi: { already exists in translations.ts');
    process.exit(0);
}

// Ensure we find the ta object's closing bracket before the main export object's closing bracket
let updated = content.replace(/(\n    \}\n)\};\n/, `$1,
    hi: ${hiObj.replace(/\n/g, '\n    ')}
};
`);

if (updated === content) {
    console.log('Could not find the insertion point!');

    // Fallback: look for the end of the file export
    updated = content.replace(/(\n    \}\n)\};\s*(export type Language)/, `$1,
    hi: ${hiObj.replace(/\n\}/g, '\n    \}')}
};\n\n$2`);
}

fs.writeFileSync('src/i18n/translations.ts', updated);
console.log('Hindi block successfully injected!');
