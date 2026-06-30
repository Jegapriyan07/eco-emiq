/**
 * Vehicle Owner - Eco Tips Page
 */
import { Lightbulb } from 'lucide-react';

const TIPS = [
    { id: 1, title: 'Smooth Acceleration', desc: 'Gradual acceleration uses less fuel and produces fewer emissions than hard starts.', category: 'Driving', impact: 'High' },
    { id: 2, title: 'Reduce Engine Idling', desc: 'Turn off the engine if parked for more than 60 seconds to cut unnecessary emissions.', category: 'Engine', impact: 'High' },
    { id: 3, title: 'Maintain Tyre Pressure', desc: 'Properly inflated tyres can improve fuel efficiency by up to 3% and reduce CO₂.', category: 'Tyres', impact: 'Medium' },
    { id: 4, title: 'Use Higher Gears', desc: 'Driving at lower RPMs by shifting to a higher gear reduces fuel consumption significantly.', category: 'Driving', impact: 'Medium' },
    { id: 5, title: 'Regular Servicing', desc: 'A well-maintained engine emits 10–30% fewer pollutants than a neglected one.', category: 'Maintenance', impact: 'High' },
    { id: 6, title: 'Plan Your Route', desc: 'Avoid traffic congestion to minimize stop-and-go driving which increases emissions.', category: 'Planning', impact: 'Medium' },
];

const impactColor = { High: 'bg-success-100 text-success-700', Medium: 'bg-blue-100 text-blue-700', Low: 'bg-gray-100 text-gray-600' };

export default function EcoTipsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Eco Tips</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Actionable tips to reduce your vehicle's emissions</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {TIPS.map(tip => (
                    <div key={tip.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-success-50 dark:bg-success-900/20 rounded-lg flex items-center justify-center">
                                    <Lightbulb className="w-5 h-5 text-success-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-500 uppercase">{tip.category}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${impactColor[tip.impact as keyof typeof impactColor]}`}>{tip.impact} Impact</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{tip.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tip.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
