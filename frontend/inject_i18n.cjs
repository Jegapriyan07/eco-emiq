const fs = require('fs');
let code = fs.readFileSync('src/i18n/translations.ts', 'utf8');

const tEn = {
    'accessibility_mode': 'Accessibility Mode',
    'accessibility_desc': 'Adjust the settings below to make the site easier to use.',
    'high_contrast': 'High Contrast',
    'large_text': 'Large Text',
    'more_spacing': 'More Spacing',
    'dyslexia_friendly': 'Dyslexia Friendly',
    'large_cursor': 'Large Cursor',
    'pause_animations': 'Pause Animations',
    'reset_settings': 'Reset Settings',
    'generator_owner': 'Generator Owner',
    'city_admin': 'City Admin',
    'vehicle_owner': 'Vehicle Owner',
    'industry_owner': 'Industry Owner'
};

const tTa = {
    'accessibility_mode': 'அணுகல் முறை',
    'accessibility_desc': 'தளத்தை பயன்படுத்த எளிதாக்க கீழேயுள்ள அமைப்புகளை சரிசெய்யவும்.',
    'high_contrast': 'உயர் முரண்பாடு',
    'large_text': 'பெரிய உரை',
    'more_spacing': 'கூடுதல் இடைவெளி',
    'dyslexia_friendly': 'டிஸ்லெக்ஸியா நட்பு',
    'large_cursor': 'பெரிய கர்சர்',
    'pause_animations': 'அனிமேஷன்களை இடைநிறுத்து',
    'reset_settings': 'அமைப்புகளை மீட்டமை',
    'generator_owner': 'ஜெனரேட்டர் உரிமையாளர்',
    'city_admin': 'நகர நிர்வாகி',
    'vehicle_owner': 'வாகன உரிமையாளர்',
    'industry_owner': 'தொழிற்சாலை உரிமையாளர்'
};

const tHi = {
    'accessibility_mode': 'एक्सेसिबिलिटी मोड',
    'accessibility_desc': 'साइट का उपयोग आसान बनाने के लिए नीचे दी गई सेटिंग्स समायोजित करें।',
    'high_contrast': 'उच्च कंट्रास्ट',
    'large_text': 'बड़ा पाठ',
    'more_spacing': 'अधिक रिक्ति',
    'dyslexia_friendly': 'डिस्लेक्सिया के अनुकूल',
    'large_cursor': 'बड़ा कर्सर',
    'pause_animations': 'एनिमेशन रोकें',
    'reset_settings': 'सेटिंग्स रीसेट करें',
    'generator_owner': 'जनरेटर मालिक',
    'city_admin': 'शहर व्यवस्थापक',
    'vehicle_owner': 'वाहन मालिक',
    'industry_owner': 'उद्योग मालिक'
};

function forceInject(langBlock, dict, str) {
    const lines = Object.entries(dict).map(([k, v]) => `        '${k}': '${v}',`).join('\n');
    return str.replace(langBlock, `${langBlock}\n${lines}`);
}

code = forceInject('en: {', tEn, code);
code = forceInject('ta: {', tTa, code);
code = forceInject('hi: {', tHi, code);

fs.writeFileSync('src/i18n/translations.ts', code);
console.log('Injection Complete!');
