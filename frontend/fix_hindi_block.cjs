const fs = require('fs');

let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');
const hiCode = fs.readFileSync('add_hindi.cjs', 'utf8');

const match = hiCode.match(/const hindiDict = (\{[\s\S]*?\n\});/);
if (match) {
    const hiObj = match[1];

    // Find where the `ta` object ends.
    if (!content.includes('hi: {')) {
        content = content.replace(/(ta: \{[\s\S]*?)(    \})\n\};/, (m, p1, p2) => {
            return p1 + p2 + ',\n    hi: ' + hiObj + '\n};';
        });

        fs.writeFileSync('src/i18n/translations.ts', content);
        console.log('Added hi block successfully.');
    } else {
        console.log('hi block already exists');
    }
} else {
    console.log('Could not parse add_hindi.cjs');
}
