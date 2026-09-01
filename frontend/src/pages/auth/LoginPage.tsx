/**
 * Login Page
 * User authentication with email and password + demo quick-login
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
    LogIn,
    Mail,
    Lock,
    AlertCircle,
    Sparkles,
    Building2,
    Zap,
    Factory,
    ArrowRight,
    Leaf,
    Shield,
    BarChart3,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
    {
        email: 'city@demo.com',
        label: 'City Admin',
        shortLabel: 'City',
        description: 'Ward analytics & policy',
        role: 'city_admin',
        icon: Building2,
        accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 active:border-amber-400/60 lg:hover:border-amber-400/60',
        iconColor: 'text-amber-400',
    },
    {
        email: 'generator@demo.com',
        label: 'Generator Owner',
        shortLabel: 'Generator',
        description: 'Runtime & performance',
        role: 'generator_owner',
        icon: Zap,
        accent: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 active:border-emerald-400/60 lg:hover:border-emerald-400/60',
        iconColor: 'text-emerald-400',
    },
    {
        email: 'industry@demo.com',
        label: 'Industry Owner',
        shortLabel: 'Industry',
        description: 'Compliance & anomalies',
        role: 'industry_owner',
        icon: Factory,
        accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 active:border-violet-400/60 lg:hover:border-violet-400/60',
        iconColor: 'text-violet-400',
    },
] as const;

const FEATURES = [
    { icon: Leaf, text: 'Real-time emission tracking' },
    { icon: Shield, text: 'Sensor drift intelligence' },
    { icon: BarChart3, text: 'AI compliance insights' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { isAuthenticated, user, setAuth } = useAuthStore();
    const navigate = useNavigate();

    if (isAuthenticated) {
        const dashboardPath =
            user?.role === 'generator_owner'
                ? '/generator-owner'
                    : user?.role === 'industry_owner'
                        ? '/industry-owner'
                        : '/city-admin';

        return <Navigate to={dashboardPath} replace />;
    }

    const doLogin = async (emailVal: string) => {
        setError('');
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 600));

        const names: Record<string, { first: string; last: string }> = {
            'city@demo.com': { first: 'John', last: 'Doe' },
            'generator@demo.com': { first: 'Priya', last: 'Patel' },
            'industry@demo.com': { first: 'Anand', last: 'Kumar' },
        };

        const n = names[emailVal] ?? { first: 'Demo', last: 'User' };

        const demoUser = {
            id: '123',
            email: emailVal,
            firstName: n.first,
            lastName: n.last,
            role: emailVal.includes('generator')
                    ? ('generator_owner' as const)
                    : emailVal.includes('industry')
                        ? ('industry_owner' as const)
                        : ('city_admin' as const),
        };

        setAuth(demoUser, 'demo-access-token', 'demo-refresh-token');

        const path =
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
        <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-slate-950">
            {/* Desktop brand panel */}
            <div className="hidden lg:flex lg:w-[46%] xl:w-[50%] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950" />
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                        backgroundSize: '32px 32px',
                    }}
                />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-emerald-200/90 backdrop-blur-sm">
                            <Sparkles className="w-3.5 h-3.5" />
                            Emission Monitoring Platform
                        </div>
                        <h1 className="mt-8 text-5xl xl:text-6xl font-black tracking-tight text-white">
                            EMIQ
                        </h1>
                        <p className="mt-4 text-lg text-slate-300 max-w-md leading-relaxed">
                            Continuous carbon intelligence for generators and industry — on one unified platform.
                        </p>
                    </div>

                    <ul className="space-y-4">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-slate-300">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                                    <Icon className="w-4 h-4 text-emerald-400" />
                                </span>
                                <span className="text-sm">{text}</span>
                            </li>
                        ))}
                    </ul>

                    <p className="text-xs text-slate-500">
                        © 2026 EMIQ · Built for a sustainable future
                    </p>
                </div>
            </div>

            {/* Mobile hero */}
            <div className="lg:hidden relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                        backgroundSize: '24px 24px',
                    }}
                />

                <div className="relative z-10 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-200/90">
                        <Sparkles className="w-3 h-3" />
                        Emission Monitoring
                    </div>
                    <h1 className="mt-4 text-4xl font-black tracking-tight text-white">EMIQ</h1>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-xs">
                        AI-driven carbon intelligence for every emitter type.
                    </p>

                    <div className="mt-5 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <span
                                key={text}
                                className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                            >
                                <Icon className="w-3 h-3 text-emerald-400" />
                                {text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form panel — sheet on mobile, side panel on desktop */}
            <div className="flex-1 flex flex-col min-h-0 lg:min-h-[100dvh] bg-white dark:bg-slate-900 rounded-t-[1.75rem] lg:rounded-none -mt-5 lg:mt-0 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] lg:shadow-none overflow-y-auto overscroll-contain">
                <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 py-6 sm:py-10 lg:px-10 pb-[max(5.5rem,env(safe-area-inset-bottom))]">
                    <div className="w-full max-w-md animate-slide-in">
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Welcome back
                            </h2>
                            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                                Sign in or tap a demo role to explore.
                            </p>
                        </div>

                        {/* Demo personas — 2×2 grid on all sizes, touch-friendly */}
                        <div className="mb-6 sm:mb-8">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 sm:mb-3">
                                Quick demo access
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                {DEMO_ACCOUNTS.map((acc) => {
                                    const Icon = acc.icon;
                                    return (
                                        <button
                                            key={acc.email}
                                            type="button"
                                            onClick={() => doLogin(acc.email)}
                                            disabled={loading}
                                            className={`group relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border bg-gradient-to-br p-3 sm:p-3.5 text-left transition-all duration-200 min-h-[72px] sm:min-h-0 active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:shadow-lg disabled:opacity-50 disabled:active:scale-100 touch-manipulation ${acc.accent}`}
                                        >
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm ${acc.iconColor}`}>
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                                    <span className="sm:hidden">{acc.shortLabel}</span>
                                                    <span className="hidden sm:inline">{acc.label}</span>
                                                </span>
                                                <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {acc.description}
                                                </span>
                                            </span>
                                            <ArrowRight className="hidden sm:block w-4 h-4 text-slate-400 opacity-60 lg:opacity-0 lg:-translate-x-1 transition-all lg:group-hover:opacity-100 lg:group-hover:translate-x-0 shrink-0" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="relative mb-6 sm:mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white dark:bg-slate-900 px-3 sm:px-4 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-5 sm:mb-6 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-3.5 sm:p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                            <div>
                                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Email address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3.5 text-base sm:text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all touch-manipulation"
                                        placeholder="you@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                    <input
                                        id="login-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3.5 text-base sm:text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all touch-manipulation"
                                        placeholder="Any password in demo"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full min-h-[48px] relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-semibold py-3.5 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 touch-manipulation"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Sign in
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 sm:mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Don&apos;t have an account?{' '}
                            <Link
                                to="/register"
                                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors inline-block py-1 touch-manipulation"
                            >
                                Create one
                            </Link>
                        </p>

                        <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
                            <Link to="/home" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">Home</Link>
                            <Link to="/pricing" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">Pricing</Link>
                            <Link to="/how-it-compares" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">Compare</Link>
                            <Link to="/trust" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">Trust</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
