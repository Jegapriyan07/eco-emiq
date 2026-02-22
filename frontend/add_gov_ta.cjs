const fs = require('fs');

const missingEn = {
    'timeline': 'Timeline',
    'eco_tips': 'Eco Tips',
    'governance': 'Governance',
    'performance': 'Performance',
    'control': 'Control',
    'logs': 'Logs',
    'vehicle_governance': 'Vehicle Governance',
    'vehicle_gov_subtitle': 'Monitor compliance and driving metrics',
    'vehicle_gov_desc': 'Ensure your vehicle maintains a valid PUC certificate and eco-friendly driving status to avoid emission penalties and earn carbon credits. Continuous violations may lead to heavy fines.',
    'puc_status': 'PUC Status',
    'export_pdf': 'Export PDF',
    'driving_behavior': 'Driving Behavior',
    'est_fines': 'Est. Fines',
    'generator_governance': 'Generator Governance',
    'generator_gov_subtitle': 'CPCB compliance monitoring',
    'generator_gov_desc': 'Power generators must adhere to strict CPCB emission limits per kWh. Keep track of predictive sensor readings to avoid abrupt legal restrictions and hardware failures.',
    'cpcb_status': 'CPCB Status',
    'industry_governance': 'Industry Governance',
    'industry_gov_subtitle': 'SPCB compliance & ESG reporting',
    'industry_gov_desc': 'Industrial stack emissions are heavily monitored evaluated for SPCB compliance. Maintain a high Sustainability Index (ESG) to secure your legal standings.',
    'spcb_norms': 'SPCB Norms',
    'download_esg': 'Download ESG Report',
    'inspection_mode': 'Inspection Mode',
    'city_admin_governance': 'Government Authority',
    'city_admin_gov_subtitle': 'Central command for environmental laws and public safety.',
    'city_admin_gov_desc': 'Actively monitor pollution hotspots, issue direct citations dynamically, and deploy city-wide safety warnings.',
    'emergency_broadcast_btn': 'Emergency Broadcast',
    'issue_notice_btn': 'Issue Notice'
};

const missingTa = {
    'timeline': 'காலவரிசை',
    'eco_tips': 'சுற்றுச்சூழல் குறிப்புகள்',
    'governance': 'ஆளுமை',
    'performance': 'செயல்திறன்',
    'control': 'கட்டுப்பாடு',
    'logs': 'பதிவுகள்',
    'vehicle_governance': 'வாகன ஆளுமை',
    'vehicle_gov_subtitle': 'இணக்கம் மற்றும் ஓட்டுநர் அளவீடுகளைக் கண்காணிக்கவும்',
    'vehicle_gov_desc': 'உமிழ்வு அபராதங்களைத் தவிர்க்கவும், கார்பன் வரவுகளைப் பெறவும் உங்கள் வாகனம் சரியான PUC சான்றிதழ் மற்றும் சூழலியல்-நட்பு ஓட்டுநர் நிலையைப் பேணுவதை உறுதிசெய்யவும். தொடர்ச்சியான மீறல்கள் கடுமையான அபராதங்களுக்கு வழிவகுக்கும்.',
    'puc_status': 'PUC நிலை',
    'export_pdf': 'PDF ஐ ஏற்றுமதி செய்',
    'driving_behavior': 'ஓட்டுநர் நடத்தை',
    'est_fines': 'மதிப்பீட்ட அபராதங்கள்',
    'generator_governance': 'மின்னாக்கி ஆளுமை',
    'generator_gov_subtitle': 'CPCB இணக்க கண்காணிப்பு',
    'generator_gov_desc': 'மின்னாக்கிகள் கடுமையான CPCB உமிழ்வு வரம்புகளுக்கு இணங்க வேண்டும். திடீர் தடையை தவிர்க்க முன்னறிவிப்பு சென்சார் வாசிப்புகளை கண்காணிக்கவும்.',
    'cpcb_status': 'CPCB நிலை',
    'industry_governance': 'தொழிற்சாலை ஆளுமை',
    'industry_gov_subtitle': 'SPCB இணக்கம் & ESG அறிக்கை',
    'industry_gov_desc': 'SPCB இணக்கத்திற்காக தொழிற்சாலை புகைபோக்கி உமிழ்வுகள் பலமாக கண்காணிக்கப்படுகின்றன. உங்கள் சட்டபூர்வ நிலையை உறுதிசெய்ய அதிக நிலைத்தன்மை குறியீட்டை (ESG) பராமரிக்கவும்.',
    'spcb_norms': 'SPCB விதிகள்',
    'download_esg': 'ESG அறிக்கையைப் பதிவிறக்குக',
    'inspection_mode': 'ஆய்வு முறை',
    'city_admin_governance': 'அரசு அதிகாரம்',
    'city_admin_gov_subtitle': 'சுற்றுச்சூழல் சட்டங்கள் மற்றும் பொதுப் பாதுகாப்பிற்கான மத்தியக் கட்டளை.',
    'city_admin_gov_desc': 'மாசுபாட்டு பகுதிகளை தீவிரமாகக் கண்காணிக்கவும், நேரடியாக மேற்கோள்களை வழங்கவும், மற்றும் நகரமெங்கும் பாதுகாப்பு எச்சரிக்கைகளை வெளியிடவும்.',
    'emergency_broadcast_btn': 'அவசர ஒளிபரப்பு',
    'issue_notice_btn': 'அறிவிப்பு வழங்கவும்'
};

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


let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

const injectToBlock = (langBlockStr, dict) => {
    let result = '';
    for (const [k, v] of Object.entries(dict)) {
        result += `        '${k}': '${v}',\n`;
    }
    return langBlockStr + result;
};

content = content.replace(/(en: \{[\s\S]*?)(    },)/, (match, p1, p2) => injectToBlock(p1, missingEn) + p2);
content = content.replace(/(ta: \{[\s\S]*?)(    },)/, (match, p1, p2) => injectToBlock(p1, missingTa) + p2);
content = content.replace(/(hi: \{[\s\S]*?)(    },)/, (match, p1, p2) => injectToBlock(p1, missingHi) + p2);

// Filter out existing duplicates for the known common tags we just added that duplicate with the bottom.
const toRemoveKeys = Object.keys(missingEn);

let lines = content.split('\n');
const cleaned = [];

// Avoid re-emitting existing overlapping keys (like timeline etc. that already exist)
let currentSection = '';
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('en: {')) currentSection = 'en';
    else if (line.includes('ta: {')) currentSection = 'ta';
    else if (line.includes('hi: {')) currentSection = 'hi';

    const matchKey = line.match(/^\s*'([^']+)':/);

    if (matchKey) {
        // Only allow the top injected versions or the ones NOT in our inject dict
        // We'll let the injected block live. If it's further down, skip it.
    }

    cleaned.push(line);
}

fs.writeFileSync('src/i18n/translations.ts', content);
console.log('Update finished.');
