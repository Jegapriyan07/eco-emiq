import { useState, useEffect } from 'react';
import { Accessibility, Type, Contrast, EyeOff, LayoutGrid, MousePointer2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

const AccessibilityWidget = () => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('accessibility-settings');
        return saved ? JSON.parse(saved) : {
            highContrast: false,
            largeText: false,
            increasedSpacing: false,
            dyslexiaFont: false,
            largeCursor: false,
            pauseAnimations: false,
        };
    });

    useEffect(() => {
        localStorage.setItem('accessibility-settings', JSON.stringify(settings));

        // Apply classes to root html element
        const html = document.documentElement;

        if (settings.highContrast) html.classList.add('a11y-high-contrast');
        else html.classList.remove('a11y-high-contrast');

        if (settings.largeText) html.classList.add('a11y-large-text');
        else html.classList.remove('a11y-large-text');

        if (settings.increasedSpacing) html.classList.add('a11y-increase-spacing');
        else html.classList.remove('a11y-increase-spacing');

        if (settings.dyslexiaFont) html.classList.add('a11y-dyslexia');
        else html.classList.remove('a11y-dyslexia');

        if (settings.largeCursor) html.classList.add('a11y-large-cursor');
        else html.classList.remove('a11y-large-cursor');

        if (settings.pauseAnimations) html.classList.add('a11y-pause-animations');
        else html.classList.remove('a11y-pause-animations');

    }, [settings]);

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const resetSettings = () => {
        setSettings({
            highContrast: false,
            largeText: false,
            increasedSpacing: false,
            dyslexiaFont: false,
            largeCursor: false,
            pauseAnimations: false,
        });
    };

    const tools = [
        { key: 'highContrast', label: t('high_contrast'), icon: <Contrast size={20} /> },
        { key: 'largeText', label: t('large_text'), icon: <Type size={20} /> },
        { key: 'increasedSpacing', label: t('more_spacing'), icon: <LayoutGrid size={20} /> },
        { key: 'dyslexiaFont', label: t('dyslexia_friendly'), icon: <Type size={20} /> },
        { key: 'largeCursor', label: t('large_cursor'), icon: <MousePointer2 size={20} /> },
        { key: 'pauseAnimations', label: t('pause_animations'), icon: <EyeOff size={20} /> },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl mb-4 p-4 w-[320px] max-w-[calc(100vw-2rem)] border border-gray-200 dark:border-gray-700 font-sans"
                        style={{ zIndex: 9999 }}
                    >
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                                <Accessibility size={20} className="text-blue-600 dark:text-blue-400" />
                                {t('accessibility_mode')}
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
                                aria-label="Close Accessibility Menu"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
                            {t('accessibility_desc')}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {tools.map((tool) => {
                                const isActive = settings[tool.key as keyof typeof settings];
                                return (
                                    <button
                                        key={tool.key}
                                        onClick={() => toggleSetting(tool.key as keyof typeof settings)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${isActive
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="mb-2">{tool.icon}</div>
                                        <span className="text-xs text-center font-medium leading-tight">{tool.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={resetSettings}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-xl text-sm font-semibold transition-colors"
                        >
                            {t('reset_settings')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                aria-label="Open Accessibility Menu"
                style={{ zIndex: 9999 }}
            >
                <Accessibility size={28} />
            </button>
        </div>
    );
};

export default AccessibilityWidget;
