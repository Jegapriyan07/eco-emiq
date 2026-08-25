/**
 * Landing page with "Why EMIQ" moat statement (E2)
 */

import { Link } from 'react-router-dom';
import { Brain, Shield, Zap, ArrowRight } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="space-y-16">
            <section className="text-center py-12">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
                    AI-Driven Carbon Reduction,<br />Not Just Monitoring
                </h1>
                <p className="text-sm font-semibold tracking-wide uppercase text-primary-600 mb-4">
                    Compliance + Carbon Reduction as a Service
                </p>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                    EMIQ combines Sensor Drift Intelligence, multi-agent AI, and real-time edge sensing
                    across vehicles, generators, and industry — on one platform.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <Link to="/login" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700">
                        Open Dashboard <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link to="/pricing" className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800">
                        View Plans
                    </Link>
                </div>
            </section>

            <section className="grid md:grid-cols-3 gap-6">
                {[
                    { icon: Brain, title: 'Sensor Drift Intelligence', desc: 'Baseline-shift detection, spike rejection, cross-sensor validation, confidence scoring.' },
                    { icon: Zap, title: 'Multi-Agent AI Layer', desc: 'Compliance explainer, carbon reduction advisor, drift forecasting — not a bolt-on chatbot.' },
                    { icon: Shield, title: 'Three Emitter Categories', desc: 'Vehicle owners, generator/industry operators, and city authorities — one platform.' },
                ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                        <Icon className="w-8 h-8 text-primary-600 mb-3" />
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{desc}</p>
                    </div>
                ))}
            </section>

            <section className="bg-primary-600 text-white rounded-2xl p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Why EMIQ wins</h2>
                <p className="max-w-3xl mx-auto opacity-90">
                    No single existing solution combines <strong>Sensor Drift Intelligence + multi-agent AI + a single platform spanning three emitter categories</strong>.
                    PUC centres test periodically. CPCB stations are sparse. Industrial CEMS are expensive. EMIQ is continuous, affordable, and action-oriented.
                </p>
                <Link to="/how-it-compares" className="inline-block mt-6 underline font-medium">See full comparison →</Link>
            </section>
        </div>
    );
}
