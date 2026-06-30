/**
 * Navbar Component
 * Top navigation bar with user profile, language switcher, and logout
 */

import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { Menu, LogOut, User } from 'lucide-react';
import { NotificationBell } from '../../pages/vehicle-owner/Dashboard';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, logout } = useAuthStore();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const getRoleBadge = (role: string) => {
        const badges: any = {
            vehicle_owner: { label: t('vehicle_owner'), color: 'bg-blue-100 text-blue-700' },
            generator_owner: { label: 'Generator Owner', color: 'bg-green-100 text-green-700' },
            industry_owner: { label: t('industry_owner'), color: 'bg-purple-100 text-purple-700' },
            city_admin: { label: t('city_admin'), color: 'bg-orange-100 text-orange-700' },
        };
        return badges[role] || badges.vehicle_owner;
    };

    const badge = user ? getRoleBadge(user.role) : null;

    return (
        <nav className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between sticky top-0 z-20">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('welcome')}, {user?.firstName}!
                    </h2>
                    {badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${badge.color}`}>
                            {badge.label}
                        </span>
                    )}
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
                {/* Language Switcher */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'en' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('ta')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'ta' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        தமிழ்
                    </button>
                    <button
                        onClick={() => setLanguage('hi')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${language === 'hi' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        हिंदी
                    </button>
                </div>

                {/* Notifications */}
                <NotificationBell />

                {/* User Menu */}
                <div className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </nav>
    );
}
