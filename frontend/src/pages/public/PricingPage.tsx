/**
 * Pricing / business model page (D1–D3)
 * Aligned to BUSINESS_MODEL.md — Compliance + Carbon Reduction as a Service.
 */

import { Link } from 'react-router-dom';
import { Building2, Factory, Car, Check } from 'lucide-react';

const plans = [
    {
        segment: 'B2B — MSME / Industry',
        icon: Factory,
        highlight: true,
        badge: 'Primary revenue',
        price: '₹2,499',
        unit: '/ device / month',
        desc: 'Compliance + carbon reduction as a service with audit-ready reports. Best willingness-to-pay segment.',
        features: [
            'CPCB-aligned compliance tracking',
            'Anomaly & violation alerts',
            'Audit-ready PDF/CSV exports',
            'Multi-chamber dashboard',
            'Device packs: 1–5 at ₹2,499; 6–20 at ₹1,999; 21+ custom',
            'Priority support',
        ],
    },
    {
        segment: 'B2C — Vehicle & Generator',
        icon: Car,
        highlight: false,
        badge: 'Freemium',
        price: 'Free – ₹199',
        unit: '/ month',
        desc: 'Free tier: basic emission score. Paid unlocks AI coaching and reduction recommendations.',
        features: ['Live emission health score', 'Free: basic monitoring', 'Pro (₹99–199/mo): Carbon Reduction Advisor', 'Maintenance drift forecast', 'WhatsApp alerts'],
    },
    {
        segment: 'B2G — Municipal / SPCB',
        icon: Building2,
        highlight: false,
        badge: 'Enterprise',
        price: 'Custom',
        unit: 'per city / zone',
        desc: 'Authority dashboard, ward analytics, enforcement prioritization (human-in-the-loop). Anchor ₹15–40L / year per zone.',
        features: ['City-wide heatmaps & wards', 'Violation prioritization drafts', 'Policy threshold config', 'City-wide impact calculator', 'SLA & onboarding'],
    },
];

export default function PricingPage() {
    return (
        <div className="space-y-12">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pricing & Business Model</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
                    Hardware priced near-cost (less than a mid-range smartphone). Recurring SaaS subscription is the margin driver — razor-and-blades model.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-2xl mx-auto">
                    SDG 13 / 11 / 9 / 3: impact reported as devices × compliance rate × ~2.1 tCO₂e avoided per device per year.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {plans.map((p) => (
                    <div
                        key={p.segment}
                        className={`rounded-2xl p-6 border-2 ${p.highlight ? 'border-primary-500 shadow-xl scale-[1.02] bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                    >
                        {p.badge && (
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${p.highlight ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                                {p.badge}
                            </span>
                        )}
                        <p.icon className="w-8 h-8 text-primary-600 mt-3" />
                        <h2 className="font-bold text-lg mt-2 text-gray-900 dark:text-white">{p.segment}</h2>
                        <p className="text-2xl font-black text-primary-600 mt-2">{p.price}<span className="text-sm font-normal text-gray-500">{p.unit}</span></p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{p.desc}</p>
                        <ul className="mt-4 space-y-2">
                            {p.features.map((f) => (
                                <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <section className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Calibration & sensor health SLA</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Sensor Drift Intelligence is the trust layer. Recurring calibration keeps readings defensible as you scale.
                </p>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ₹499–999 / device / quarter — calibration & sensor health SLA
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        One-time onboarding / install for industrial and city fleets
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Annual audit pack upsell for MSME compliance reports
                    </li>
                </ul>
            </section>

            <section className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Go-to-market roadmap</h2>
                <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <li><strong>Phase 1:</strong> Pilot — 1–2 MSME clusters + one municipal ward (TSM incubation support)</li>
                    <li><strong>Phase 2:</strong> B2B expansion across Tamil Nadu industrial clusters</li>
                    <li><strong>Phase 3:</strong> B2G municipal contracts (Chennai wards → state SPCBs)</li>
                    <li><strong>Phase 4:</strong> National scale + carbon credit integration <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">Coming in Phase 4 — not yet active</span></li>
                </ol>
                <p className="text-xs text-gray-500 mt-4">
                    Future revenue (not active): data licensing & carbon credit facilitation fee — roadmap only.
                </p>
            </section>

            <p className="text-center">
                <Link to="/login" className="text-primary-600 font-medium hover:underline">Start free →</Link>
            </p>
        </div>
    );
}
