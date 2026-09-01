/**
 * Register Page
 * New user registration — matches LoginPage visual language
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
    UserPlus,
    Mail,
    Lock,
    AlertCircle,
    Sparkles,
    Building2,
    Zap,
    Factory,
    User,
    Leaf,
    Shield,
    BarChart3,
    Check,
} from 'lucide-react';

const ACCOUNT_TYPES = [
    {
        value: 'generator_owner',
        label: 'Generator Owner',
        shortLabel: 'Generator',
        description: 'Runtime & performance',
        icon: Zap,
        accent: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
        selected: 'border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-50 dark:bg-emerald-950/40',
        iconColor: 'text-emerald-500',
    },
    {
        value: 'industry_owner',
        label: 'Industry Owner',
        shortLabel: 'Industry',
        description: 'Compliance & anomalies',
        icon: Factory,
        accent: 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
        selected: 'border-violet-500 ring-2 ring-violet-500/25 bg-violet-50 dark:bg-violet-950/40',
        iconColor: 'text-violet-500',
    },
    {
        value: 'city_admin',
        label: 'City Admin',
        shortLabel: 'City',
        description: 'Ward analytics & policy',
        icon: Building2,
        accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
        selected: 'border-amber-500 ring-2 ring-amber-500/25 bg-amber-50 dark:bg-amber-950/40',
        iconColor: 'text-amber-500',
    },
] as const;

const FEATURES = [
    { icon: Leaf, text: 'Real-time emission tracking' },
    { icon: Shield, text: 'Sensor drift intelligence' },
    { icon: BarChart3, text: 'AI compliance insights' },
];

const inputClass =
    'w-full pl-10 pr-4 py-3.5 text-base sm:text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all touch-manipulation';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'generator_owner',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { isAuthenticated, user } = useAuthStore();
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

    const update = (key: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 900));
            navigate('/login');
        } catch {
            setError('Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
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
                            Create your workspace and start tracking emissions across generators and industry.
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
                        Join the platform and pick the role that fits your operations.
                    </p>
                </div>
            </div>

            {/* Form panel */}
            <div className="flex-1 flex flex-col min-h-0 lg:min-h-[100dvh] bg-white dark:bg-slate-900 rounded-t-[1.75rem] lg:rounded-none -mt-5 lg:mt-0 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] lg:shadow-none overflow-y-auto overscroll-contain">
                <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 py-6 sm:py-10 lg:px-10 pb-[max(5.5rem,env(safe-area-inset-bottom))]">
                    <div className="w-full max-w-md animate-slide-in">
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Create account
                            </h2>
                            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                                Set up EMIQ in under a minute.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 sm:mb-6 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-3.5 sm:p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                            {/* Role cards */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                                    Account type
                                </p>
                                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                    {ACCOUNT_TYPES.map((type) => {
                                        const Icon = type.icon;
                                        const selected = formData.role === type.value;
                                        return (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => update('role', type.value)}
                                                className={`relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border bg-gradient-to-br p-3 sm:p-3.5 text-left transition-all duration-200 min-h-[72px] active:scale-[0.98] touch-manipulation ${
                                                    selected
                                                        ? type.selected
                                                        : `${type.accent} hover:shadow-md`
                                                }`}
                                            >
                                                {selected && (
                                                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                                                        <Check className="w-3 h-3" strokeWidth={3} />
                                                    </span>
                                                )}
                                                <span
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm ${type.iconColor}`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </span>
                                                <span className="min-w-0 flex-1 pr-4">
                                                    <span className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                                        <span className="sm:hidden">{type.shortLabel}</span>
                                                        <span className="hidden sm:inline">{type.label}</span>
                                                    </span>
                                                    <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                        {type.description}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Names */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label htmlFor="reg-first" className={labelClass}>
                                        First name
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                        <input
                                            id="reg-first"
                                            type="text"
                                            autoComplete="given-name"
                                            value={formData.firstName}
                                            onChange={(e) => update('firstName', e.target.value)}
                                            className={inputClass}
                                            placeholder="Priya"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="reg-last" className={labelClass}>
                                        Last name
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                        <input
                                            id="reg-last"
                                            type="text"
                                            autoComplete="family-name"
                                            value={formData.lastName}
                                            onChange={(e) => update('lastName', e.target.value)}
                                            className={inputClass}
                                            placeholder="Patel"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reg-email" className={labelClass}>
                                    Email address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                    <input
                                        id="reg-email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={(e) => update('email', e.target.value)}
                                        className={inputClass}
                                        placeholder="you@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reg-password" className={labelClass}>
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                    <input
                                        id="reg-password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={formData.password}
                                        onChange={(e) => update('password', e.target.value)}
                                        className={inputClass}
                                        placeholder="At least 8 characters"
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reg-confirm" className={labelClass}>
                                    Confirm password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                                    <input
                                        id="reg-confirm"
                                        type="password"
                                        autoComplete="new-password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => update('confirmPassword', e.target.value)}
                                        className={inputClass}
                                        placeholder="Repeat password"
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
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5" />
                                        Create account
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 sm:mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors inline-block py-1 touch-manipulation"
                            >
                                Sign in
                            </Link>
                        </p>

                        <div className="mt-5 sm:mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
                            <Link to="/home" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">
                                Home
                            </Link>
                            <Link to="/pricing" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">
                                Pricing
                            </Link>
                            <Link to="/how-it-compares" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">
                                Compare
                            </Link>
                            <Link to="/trust" className="py-1 hover:text-emerald-600 transition-colors touch-manipulation">
                                Trust
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
