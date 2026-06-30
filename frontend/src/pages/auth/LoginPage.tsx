/**
 * Login Page
 * User authentication with email and password + demo quick-login
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogIn, Mail, Lock, AlertCircle, Zap } from 'lucide-react';

const DEMO_ACCOUNTS = [
    { email: 'city@demo.com', labelKey: 'city_admin', role: 'city_admin', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { email: 'vehicle@demo.com', labelKey: 'vehicle_owner', role: 'vehicle_owner', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { email: 'generator@demo.com', labelKey: 'generator_owner', role: 'generator_owner', color: 'bg-green-100 text-green-700 border-green-300' },
    { email: 'industry@demo.com', labelKey: 'industry_owner', role: 'industry_owner', color: 'bg-purple-100 text-purple-700 border-purple-300' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { setAuth } = useAuthStore();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const doLogin = async (emailVal: string) => {
        setError('');
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 600));

        const names: Record<string, { first: string; last: string }> = {
            'city@demo.com': { first: 'John', last: 'Doe' },
            'vehicle@demo.com': { first: 'Rahul', last: 'Sharma' },
            'generator@demo.com': { first: 'Priya', last: 'Patel' },
            'industry@demo.com': { first: 'Anand', last: 'Kumar' },
        };

        const n = names[emailVal] ?? { first: 'Demo', last: 'User' };

        const demoUser = {
            id: '123',
            email: emailVal,
            firstName: n.first,
            lastName: n.last,
            role: emailVal.includes('vehicle')
                ? ('vehicle_owner' as const)
                : emailVal.includes('generator')
                    ? ('generator_owner' as const)
                    : emailVal.includes('industry')
                        ? ('industry_owner' as const)
                        : ('city_admin' as const),
        };

        setAuth(demoUser, 'demo-access-token', 'demo-refresh-token');

        const path =
            demoUser.role === 'vehicle_owner' ? '/vehicle-owner' :
                demoUser.role === 'generator_owner' ? '/generator-owner' :
                    demoUser.role === 'industry_owner' ? '/industry-owner' :
                        '/city-admin';

        navigate(path);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await doLogin(email);
    };

    return (
        <div className="space-y-6 relative">
            {/* Language Switcher */}
            <div className="absolute -top-12 right-0 flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'en' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>EN</button>
                <button onClick={() => setLanguage('ta')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'ta' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>தமிழ்</button>
                <button onClick={() => setLanguage('hi')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'hi' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>हिंदी</button>
            </div>

            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('welcome_back')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {t('sign_in_desc')}
                </p>
            </div>

            {/* Quick Demo Login */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{t('quick_demo')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                        <button
                            key={acc.email}
                            type="button"
                            onClick={() => doLogin(acc.email)}
                            disabled={loading}
                            className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${acc.color}`}
                        >
                            {t(acc.labelKey)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white dark:bg-gray-800 px-3 text-gray-500">{t('or_manual')}</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('email_address')}
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder="city@demo.com"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('password')}
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder="any password works in demo"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t('signing_in')}
                        </>
                    ) : (
                        <>
                            <LogIn className="w-5 h-5" />
                            {t('sign_in')}
                        </>
                    )}
                </button>
            </form>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {t('no_account')}{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                    {t('sign_up')}
                </Link>
            </div>

            {/* Pricing teaser */}
            <Link
                to="/pricing"
                className="block w-full rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 transition-all p-3 text-center group"
            >
                <p className="text-xs text-indigo-400 font-semibold group-hover:text-indigo-300 flex items-center justify-center gap-1.5">
                    <span>✨</span>
                    View Plans & Pricing — Free, Pro &amp; Enterprise
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </p>
            </Link>
        </div>
    );
}
