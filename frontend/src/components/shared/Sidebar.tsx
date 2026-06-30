/**
 * Sidebar Component
 * Navigation sidebar with role-based menu items and translation support
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    Home,
    Activity,
    Settings,
    FileText,
    Wrench,
    Lightbulb,
    Wifi,
    MapPin,
    AlertTriangle,
    BarChart3,
    Users,
    Shield,
} from 'lucide-react';

export default function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
    const { user } = useAuthStore();
    const { t } = useLanguage();
    const location = useLocation();

    // Helper to get translated label
    const getLabel = (key: string) => t(key);

    const vehicleOwnerMenu = [
        { icon: Home, label: getLabel('dashboard'), path: '/vehicle-owner' },
        { icon: Activity, label: getLabel('timeline'), path: '/vehicle-owner/timeline' },
        { icon: Wrench, label: getLabel('maintenance'), path: '/vehicle-owner/maintenance' },
        { icon: Lightbulb, label: getLabel('eco_tips'), path: '/vehicle-owner/tips' },
        { icon: Shield, label: getLabel('governance'), path: '/vehicle-owner/governance' },
    ];

    const generatorOwnerMenu = [
        { icon: Home, label: getLabel('dashboard'), path: '/generator-owner' },
        { icon: BarChart3, label: getLabel('performance'), path: '/generator-owner/performance' },
        { icon: Wrench, label: getLabel('maintenance'), path: '/generator-owner/maintenance' },
        { icon: Settings, label: getLabel('control'), path: '/generator-owner/control' },
        { icon: FileText, label: getLabel('logs'), path: '/generator-owner/logs' },
        { icon: Shield, label: getLabel('governance'), path: '/generator-owner/governance' },
    ];

    const industryOwnerMenu = [
        { icon: Home, label: getLabel('dashboard'), path: '/industry-owner' },
        { icon: FileText, label: getLabel('compliance'), path: '/industry-owner/compliance' },
        { icon: Wrench, label: getLabel('maintenance'), path: '/industry-owner/maintenance' },
        { icon: AlertTriangle, label: getLabel('anomalies'), path: '/industry-owner/anomalies' },
        { icon: Users, label: getLabel('organization'), path: '/industry-owner/organization' },
        { icon: Shield, label: getLabel('governance'), path: '/industry-owner/governance' },
    ];

    const cityAdminMenu = [
        { icon: Home, label: getLabel('dashboard'), path: '/city-admin' },
        { icon: MapPin, label: getLabel('ward_details'), path: '/city-admin/wards' },
        { icon: Wifi, label: getLabel('devices'), path: '/city-admin/devices' },
        { icon: AlertTriangle, label: getLabel('alerts'), path: '/city-admin/alerts' },
        { icon: Settings, label: 'Policy', path: '/city-admin/policy' },
        { icon: Activity, label: getLabel('forecast'), path: '/city-admin/predictions' },
        { icon: Shield, label: 'Governance', path: '/city-admin/governance' },
    ];

    const menuItems = user?.role === 'vehicle_owner' ? vehicleOwnerMenu
        : user?.role === 'generator_owner' ? generatorOwnerMenu
            : user?.role === 'industry_owner' ? industryOwnerMenu
                : cityAdminMenu;

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-30 ${isOpen ? 'w-64' : 'w-20'
                }`}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
                <Link to="/" className={`font-bold text-primary-600 ${isOpen ? 'text-xl' : 'text-sm'}`}>
                    {isOpen ? 'EcoTronics' : 'ET'}
                </Link>
            </div>

            {/* Menu Items */}
            <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
