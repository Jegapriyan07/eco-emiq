/**
 * PricingPage.tsx
 * Role-based subscription model – shown after login when user has no active plan.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
    Check, X, Zap, Shield, BarChart3, Globe, Car, Factory,
    Cpu, Building2, Crown, Star, Sparkles, ArrowRight, ChevronDown
} from 'lucide-react';

/* ─── Plan definitions ──────────────────────────────────────────────────── */

type Role = 'vehicle_owner' | 'generator_owner' | 'industry_owner' | 'city_admin';

interface Plan {
    id: string;
    name: string;
    badge?: string;
    price: number;          // INR / month
    description: string;
    features: { text: string; included: boolean }[];
    cta: string;
    highlight: boolean;
    accentFrom: string;
    accentTo: string;
    icon: JSX.Element;
}

const ROLE_PLANS: Record<Role, Plan[]> = {
    vehicle_owner: [
        {
            id: 'vehicle-free',
            name: 'Basic',
            price: 0,
            description: 'Get started with basic emission tracking.',
            accentFrom: '#4ade80', accentTo: '#22d3ee',
            icon: <Car size={22} />,
            cta: 'Get Started Free',
            highlight: false,
            features: [
                { text: 'Live CO/NOx sensor dashboard', included: true },
                { text: 'PUC status check', included: true },
                { text: 'Weekly emission report (PDF)', included: false },
                { text: 'AI-based driving behaviour score', included: false },
                { text: 'Carbon credit earnings', included: false },
                { text: 'Priority notification alerts', included: false },
            ],
        },
        {
            id: 'vehicle-pro',
            name: 'Pro',
            badge: 'Most Popular',
            price: 299,
            description: 'For eco-conscious vehicle owners who want complete control.',
            accentFrom: '#6366f1', accentTo: '#8b5cf6',
            icon: <Car size={22} />,
            cta: 'Start Pro Plan',
            highlight: true,
            features: [
                { text: 'Live CO/NOx sensor dashboard', included: true },
                { text: 'PUC status check', included: true },
                { text: 'Weekly emission report (PDF)', included: true },
                { text: 'AI-based driving behaviour score', included: true },
                { text: 'Carbon credit earnings', included: false },
                { text: 'Priority notification alerts', included: false },
            ],
        },
        {
            id: 'vehicle-elite',
            name: 'Elite',
            badge: 'Best Value',
            price: 599,
            description: 'Unlock carbon credits and multi-vehicle fleet support.',
            accentFrom: '#f59e0b', accentTo: '#ef4444',
            icon: <Crown size={22} />,
            cta: 'Go Elite',
            highlight: false,
            features: [
                { text: 'Live CO/NOx sensor dashboard', included: true },
                { text: 'PUC status check', included: true },
                { text: 'Weekly emission report (PDF)', included: true },
                { text: 'AI-based driving behaviour score', included: true },
                { text: 'Carbon credit earnings', included: true },
                { text: 'Priority notification alerts', included: true },
            ],
        },
    ],

    generator_owner: [
        {
            id: 'gen-starter',
            name: 'Starter',
            price: 0,
            description: 'Basic CPCB compliance dashboard.',
            accentFrom: '#4ade80', accentTo: '#22d3ee',
            icon: <Cpu size={22} />,
            cta: 'Get Started Free',
            highlight: false,
            features: [
                { text: 'Real-time emission gauge', included: true },
                { text: 'CPCB limit alerts', included: true },
                { text: 'Monthly compliance report', included: false },
                { text: 'Predictive maintenance AI', included: false },
                { text: 'Multi-generator management', included: false },
                { text: 'API access & integrations', included: false },
            ],
        },
        {
            id: 'gen-business',
            name: 'Business',
            badge: 'Most Popular',
            price: 799,
            description: 'Full compliance tracking for small to medium generators.',
            accentFrom: '#06b6d4', accentTo: '#3b82f6',
            icon: <Cpu size={22} />,
            cta: 'Start Business',
            highlight: true,
            features: [
                { text: 'Real-time emission gauge', included: true },
                { text: 'CPCB limit alerts', included: true },
                { text: 'Monthly compliance report', included: true },
                { text: 'Predictive maintenance AI', included: true },
                { text: 'Multi-generator management', included: false },
                { text: 'API access & integrations', included: false },
            ],
        },
        {
            id: 'gen-enterprise',
            name: 'Enterprise',
            price: 1499,
            description: 'Industrial-grade monitoring with API access.',
            accentFrom: '#f59e0b', accentTo: '#ef4444',
            icon: <Crown size={22} />,
            cta: 'Contact Sales',
            highlight: false,
            features: [
                { text: 'Real-time emission gauge', included: true },
                { text: 'CPCB limit alerts', included: true },
                { text: 'Monthly compliance report', included: true },
                { text: 'Predictive maintenance AI', included: true },
                { text: 'Multi-generator management', included: true },
                { text: 'API access & integrations', included: true },
            ],
        },
    ],

    industry_owner: [
        {
            id: 'ind-basic',
            name: 'Basic',
            price: 0,
            description: 'Start your SPCB compliance journey.',
            accentFrom: '#4ade80', accentTo: '#22d3ee',
            icon: <Factory size={22} />,
            cta: 'Get Started Free',
            highlight: false,
            features: [
                { text: 'Stack emission monitoring', included: true },
                { text: 'SPCB compliance dashboard', included: true },
                { text: 'ESG sustainability report', included: false },
                { text: 'Anomaly detection AI', included: false },
                { text: 'Regulatory penalty estimator', included: false },
                { text: 'Dedicated support manager', included: false },
            ],
        },
        {
            id: 'ind-growth',
            name: 'Growth',
            badge: 'Most Popular',
            price: 1499,
            description: 'AI-driven compliance for growing industries.',
            accentFrom: '#8b5cf6', accentTo: '#ec4899',
            icon: <Factory size={22} />,
            cta: 'Start Growth Plan',
            highlight: true,
            features: [
                { text: 'Stack emission monitoring', included: true },
                { text: 'SPCB compliance dashboard', included: true },
                { text: 'ESG sustainability report', included: true },
                { text: 'Anomaly detection AI', included: true },
                { text: 'Regulatory penalty estimator', included: false },
                { text: 'Dedicated support manager', included: false },
            ],
        },
        {
            id: 'ind-enterprise',
            name: 'Enterprise',
            price: 3999,
            description: 'End-to-end industrial emission governance.',
            accentFrom: '#f59e0b', accentTo: '#ef4444',
            icon: <Crown size={22} />,
            cta: 'Contact Sales',
            highlight: false,
            features: [
                { text: 'Stack emission monitoring', included: true },
                { text: 'SPCB compliance dashboard', included: true },
                { text: 'ESG sustainability report', included: true },
                { text: 'Anomaly detection AI', included: true },
                { text: 'Regulatory penalty estimator', included: true },
                { text: 'Dedicated support manager', included: true },
            ],
        },
    ],

    city_admin: [
        {
            id: 'city-monitor',
            name: 'Monitor',
            price: 0,
            description: 'Basic city-wide AQI monitoring.',
            accentFrom: '#4ade80', accentTo: '#22d3ee',
            icon: <Globe size={22} />,
            cta: 'Get Started Free',
            highlight: false,
            features: [
                { text: 'City AQI heatmap', included: true },
                { text: 'Ward-level sensor data', included: true },
                { text: '72-hour AQI forecast', included: false },
                { text: 'Emergency broadcast system', included: false },
                { text: 'Automated citation issuance', included: false },
                { text: 'Multi-city management', included: false },
            ],
        },
        {
            id: 'city-governance',
            name: 'Governance',
            badge: 'Recommended',
            price: 2499,
            description: 'Proactive tools for smart city environments.',
            accentFrom: '#0ea5e9', accentTo: '#6366f1',
            icon: <Building2 size={22} />,
            cta: 'Start Governance Plan',
            highlight: true,
            features: [
                { text: 'City AQI heatmap', included: true },
                { text: 'Ward-level sensor data', included: true },
                { text: '72-hour AQI forecast', included: true },
                { text: 'Emergency broadcast system', included: true },
                { text: 'Automated citation issuance', included: false },
                { text: 'Multi-city management', included: false },
            ],
        },
        {
            id: 'city-command',
            name: 'Command',
            price: 5999,
            description: 'Full-spectrum environmental command for large municipalities.',
            accentFrom: '#f59e0b', accentTo: '#ef4444',
            icon: <Crown size={22} />,
            cta: 'Contact Municipal Sales',
            highlight: false,
            features: [
                { text: 'City AQI heatmap', included: true },
                { text: 'Ward-level sensor data', included: true },
                { text: '72-hour AQI forecast', included: true },
                { text: 'Emergency broadcast system', included: true },
                { text: 'Automated citation issuance', included: true },
                { text: 'Multi-city management', included: true },
            ],
        },
    ],
};

const ROLE_META: Record<Role, { label: string; icon: JSX.Element; color: string }> = {
    vehicle_owner: { label: 'Vehicle Owner', icon: <Car size={18} />, color: 'from-blue-500 to-cyan-500' },
    generator_owner: { label: 'Generator Owner', icon: <Cpu size={18} />, color: 'from-green-500 to-teal-500' },
    industry_owner: { label: 'Industry Owner', icon: <Factory size={18} />, color: 'from-purple-500 to-pink-500' },
    city_admin: { label: 'City Admin', icon: <Building2 size={18} />, color: 'from-orange-500 to-red-500' },
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function PricingPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState<Role>((user?.role as Role) ?? 'vehicle_owner');
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
    const [activePlan, setActivePlan] = useState<string | null>(null);
    const [showFAQ, setShowFAQ] = useState<number | null>(null);

    const plans = ROLE_PLANS[selectedRole];
    const multiplier = billing === 'yearly' ? 0.8 : 1; // 20% off yearly

    const handleSelect = (planId: string, price: number) => {
        setActivePlan(planId);
        if (price === 0) {
            // Free plan → go straight to dashboard
            const path = selectedRole === 'vehicle_owner' ? '/vehicle-owner'
                : selectedRole === 'generator_owner' ? '/generator-owner'
                    : selectedRole === 'industry_owner' ? '/industry-owner'
                        : '/city-admin';
            navigate(path);
        } else {
            // Simulate payment flow
            setTimeout(() => {
                const path = selectedRole === 'vehicle_owner' ? '/vehicle-owner'
                    : selectedRole === 'generator_owner' ? '/generator-owner'
                        : selectedRole === 'industry_owner' ? '/industry-owner'
                            : '/city-admin';
                navigate(path);
            }, 1200);
        }
    };

    const faqs = [
        { q: 'Can I switch plans later?', a: 'Yes, you can upgrade or downgrade at any time from your account settings. Billing is prorated.' },
        { q: 'Is there a free trial for paid plans?', a: 'All paid plans come with a 14-day free trial. No credit card required upfront.' },
        { q: 'What payment methods do you accept?', a: 'We accept UPI, credit/debit cards, net banking, and NEFT/RTGS for enterprise contracts.' },
        { q: 'Are my sensor data and reports stored securely?', a: 'Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3) and compliant with MeitY guidelines.' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* ── Header ── */}
            <div className="relative overflow-hidden pt-16 pb-12 px-6 text-center">
                {/* Glow blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
                </div>

                <div className="relative">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 mb-6 backdrop-blur-sm">
                        <Sparkles size={14} className="text-yellow-400" />
                        Transparent, Affordable Pricing
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                        Choose Your Plan
                    </h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto">
                        Role-based subscriptions tailored for every stakeholder in the EMIQ ecosystem.
                    </p>
                </div>

                {/* Billing toggle */}
                <div className="inline-flex items-center gap-3 mt-8 bg-white/5 border border-white/10 rounded-xl p-1.5">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('yearly')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                        Yearly
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">-20%</span>
                    </button>
                </div>
            </div>

            {/* ── Role Selector ── */}
            <div className="px-6 pb-10">
                <div className="max-w-5xl mx-auto">
                    <p className="text-center text-sm text-slate-500 mb-4 uppercase tracking-widest font-semibold">Filter by role</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(Object.keys(ROLE_META) as Role[]).map(role => {
                            const m = ROLE_META[role];
                            const active = selectedRole === role;
                            return (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-semibold text-sm transition-all duration-200 ${active
                                        ? `bg-gradient-to-r ${m.color} border-transparent text-white shadow-lg scale-105`
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {m.icon}
                                    <span>{m.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Plans Grid ── */}
            <div className="px-6 pb-20">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const yearly = billing === 'yearly';
                        const displayPrice = plan.price === 0 ? 0 : Math.round(plan.price * multiplier);
                        const isSelected = activePlan === plan.id;
                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden group
                                    ${plan.highlight
                                        ? 'border-indigo-500/60 shadow-2xl shadow-indigo-500/20 scale-105'
                                        : 'border-white/10 hover:border-white/20 hover:scale-[1.02]'
                                    } bg-slate-900/80 backdrop-blur-sm`}
                            >
                                {/* Gradient stripe at top */}
                                <div
                                    className="h-1 w-full"
                                    style={{ background: `linear-gradient(to right, ${plan.accentFrom}, ${plan.accentTo})` }}
                                />

                                {/* Badge */}
                                {plan.badge && (
                                    <div
                                        className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                                        style={{ background: `linear-gradient(to right, ${plan.accentFrom}, ${plan.accentTo})` }}
                                    >
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="p-6 flex flex-col flex-1">
                                    {/* Icon + Name */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                                            style={{ background: `linear-gradient(135deg, ${plan.accentFrom}, ${plan.accentTo})` }}
                                        >
                                            {plan.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-4">
                                        <div className="flex items-end gap-1">
                                            <span className="text-4xl font-extrabold text-white">
                                                {displayPrice === 0 ? 'Free' : `₹${displayPrice}`}
                                            </span>
                                            {displayPrice > 0 && (
                                                <span className="text-slate-400 text-sm mb-1.5">
                                                    /{yearly ? 'yr billed monthly' : 'mo'}
                                                </span>
                                            )}
                                        </div>
                                        {yearly && plan.price > 0 && (
                                            <p className="text-green-400 text-xs mt-1 font-semibold">
                                                Save ₹{Math.round(plan.price * 12 * 0.2)}/year
                                            </p>
                                        )}
                                        <p className="text-slate-400 text-sm mt-2">{plan.description}</p>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2.5 mb-6 flex-1">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-sm">
                                                {f.included ? (
                                                    <Check size={16} className="text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <X size={16} className="text-slate-600 flex-shrink-0" />
                                                )}
                                                <span className={f.included ? 'text-slate-200' : 'text-slate-600'}>
                                                    {f.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => handleSelect(plan.id, displayPrice)}
                                        disabled={isSelected}
                                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200
                                            ${plan.highlight
                                                ? 'text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 active:scale-95'
                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                            } ${isSelected ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        style={plan.highlight ? { background: `linear-gradient(to right, ${plan.accentFrom}, ${plan.accentTo})` } : {}}
                                    >
                                        {isSelected ? (
                                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                                        ) : (
                                            <>{plan.cta} <ArrowRight size={15} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Trust Strip ── */}
            <div className="border-t border-white/5 py-10 px-6">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                        { icon: <Shield size={22} className="text-green-400" />, label: 'MeitY Compliant', sub: 'Data stored in India' },
                        { icon: <Zap size={22} className="text-yellow-400" />, label: '14-Day Free Trial', sub: 'No credit card needed' },
                        { icon: <Star size={22} className="text-indigo-400" />, label: '99.9% Uptime SLA', sub: 'Enterprise grade infra' },
                        { icon: <BarChart3 size={22} className="text-purple-400" />, label: 'Real-time Analytics', sub: 'Live sensor streams' },
                    ].map((t, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                {t.icon}
                            </div>
                            <p className="text-white font-semibold text-sm">{t.label}</p>
                            <p className="text-slate-500 text-xs">{t.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── FAQ ── */}
            <div className="px-6 pb-20">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-white mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
                            >
                                <button
                                    onClick={() => setShowFAQ(showFAQ === i ? null : i)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left text-white font-semibold text-sm hover:bg-white/5 transition-colors"
                                >
                                    {faq.q}
                                    <ChevronDown
                                        size={16}
                                        className={`flex-shrink-0 transition-transform duration-200 ${showFAQ === i ? 'rotate-180' : ''} text-slate-400`}
                                    />
                                </button>
                                {showFAQ === i && (
                                    <div className="px-5 pb-4 text-sm text-slate-400 border-t border-white/10 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Footer note ── */}
            <div className="text-center pb-12 text-slate-600 text-xs px-4">
                Prices are in Indian Rupees (INR) and exclude GST. Plans auto-renew. Cancel anytime.
            </div>
        </div>
    );
}
