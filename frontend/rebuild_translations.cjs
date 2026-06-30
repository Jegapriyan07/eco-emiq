const fs = require('fs');

let t = fs.readFileSync('src/i18n/translations.ts', 'utf8').replace(/\r/g, '');
let lines = t.split('\n');

// Find the line index where ta ends.
let taEndIndex = lines.findIndex(l => l.includes("'timeline': 'காலவரிசை',"));
if (taEndIndex === -1) {
    console.error("Could not find ta timeline");
    process.exit(1);
}

// Slice to keep only up to the timeline line
let cleanLines = lines.slice(0, taEndIndex + 1);

// Now we close the `ta` block, and open the `hi` block
let newContent = cleanLines.join('\n') + '\n    },\n    hi: {\n';

// We pull the hindi dictionary from add_hindi.cjs
let hiCode = fs.readFileSync('add_hindi.cjs', 'utf8').replace(/\r/g, '');
const match = hiCode.match(/const hindiDict = (\{[\s\S]*?\n\});/);
if (!match) {
    console.error("Could not find hindiDict");
    process.exit(1);
}

const hiObjStr = match[1];

// Remove outer brackets from hiObjStr so we can embed it correctly
let hiContent = hiObjStr.replace(/^\{\n/m, '').replace(/\n\};?$/m, '');

newContent += hiContent;

// Now append missing Gov strings to Hi
const missingHi = {
    'timeline': 'समयरेखा',
    'eco_tips': 'इको-टिप्स',
    'governance': 'शासन',
    'performance': 'प्रदर्शन',
    'control': 'नियंत्रण',
    'logs': 'लॉग',
    'vehicle_governance': 'वाहन शासन',
    'vehicle_gov_subtitle': 'अनुपालन और ड्राइविंग मैट्रिक्स मॉनिटर करें',
    'vehicle_gov_desc': 'निश्चित करें कि आपका वाहन पीयूसी प्रमाणपत्र और इको-फ्रेंडली ड्राइविंग स्थिति बनाए रखता है ताकि उत्सर्जन जुर्माने से बचा जा सके और कार्बन क्रेडिट कमाया जा सके। लगातार उल्लंघनों से भारी जुर्माना हो सकता है।',
    'puc_status': 'PUC स्थिति',
    'export_pdf': 'PDF निर्यात करें',
    'driving_behavior': 'ड्राइविंग व्यवहार',
    'est_fines': 'अनुमानित जुर्माना',
    'generator_governance': 'जनरेटर शासन',
    'generator_gov_subtitle': 'CPCB अनुपालन निगरानी',
    'generator_gov_desc': 'पावर जनरेटरों को प्रति kWh सख्त CPCB उत्सर्जन सीमाओं का पालन करना चाहिए। अचानक कानूनी प्रतिबंधों और हार्डवेयर विफलताओं से बचने के लिए पूर्वानुमानित सेंसर रीडिंग पर नज़र रखें।',
    'cpcb_status': 'CPCB स्थिति',
    'industry_governance': 'उद्योग शासन',
    'industry_gov_subtitle': 'SPCB अनुपालन और ESG रिपोर्टिंग',
    'industry_gov_desc': 'SPCB अनुपालन के लिए औद्योगिक स्टैक उत्सर्जन की भारी निगरानी और मूल्यांकन किया जाता है। अपनी कानूनी स्थिति सुरक्षित करने के लिए उच्च स्थिरता सूचकांक (ESG) बनाए रखें।',
    'spcb_norms': 'SPCB मानदंड',
    'download_esg': 'ESG रिपोर्ट डाउनलोड करें',
    'inspection_mode': 'निरीक्षण मोड',
    'city_admin_governance': 'सरकारी प्राधिकरण',
    'city_admin_gov_subtitle': 'पर्यावरण कानूनों और सार्वजनिक सुरक्षा के लिए केंद्रीय कमान।',
    'city_admin_gov_desc': 'प्रदूषण हॉटस्पॉट की सक्रिय निगरानी करें, सीधे उद्धरण जारी करें, और शहर-व्यापी सुरक्षा चेतावनियाँ तैनात करें।',
    'emergency_broadcast_btn': 'आपातकालीन प्रसारण',
    'issue_notice_btn': 'नोटिस जारी करें'
};

for (const [k, v] of Object.entries(missingHi)) {
    // only append if not already in hiContent
    if (!hiContent.includes(`'${k}':`)) {
        newContent += `\n        '${k}': '${v}',`;
    }
}

// Ensure the block is closed out properly with the type definition
newContent += '\n    }\n};\n\nexport type Language = \'en\' | \'ta\' | \'hi\';\n';

fs.writeFileSync('src/i18n/translations.ts', newContent);
console.log('Complete Rebuild of translations.ts Success!');
