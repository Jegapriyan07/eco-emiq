/**
 * Trust & Privacy page (F2)
 */

import { Shield, Lock, Users, FileWarning } from 'lucide-react';

export default function TrustPage() {
    return (
        <div className="space-y-10 max-w-3xl mx-auto">
            <div className="text-center">
                <Shield className="w-12 h-12 text-primary-600 mx-auto mb-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trust & Privacy</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Responsible AI and human-in-the-loop enforcement</p>
            </div>

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-lg"><Lock className="w-5 h-5" /> Data we collect</h2>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                    <li>Sensor readings: CO, NO₂, NH₃, PM2.5/PM10, temperature, device metadata</li>
                    <li>Account info: name, email, role (generator / industry / city admin)</li>
                    <li>Maintenance and compliance history tied to your devices</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-lg"><Shield className="w-5 h-5" /> Security</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Authentication uses <strong>JWT tokens</strong> with <strong>role-based access control (RBAC)</strong>.
                    Generator owners see only their devices; city admins see ward-level aggregates; industry owners see their facilities.
                    Data in transit is encrypted (HTTPS). Production deployments use PostgreSQL/TimescaleDB with access controls.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-lg"><FileWarning className="w-5 h-5" /> Disputes & appeals</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Any flagged violation includes a <strong>Dispute this</strong> action in the dashboard.
                    Flags with classifier confidence below 70% are automatically routed to <strong>human review</strong> —
                    they are not used for auto-enforcement.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 font-bold text-lg"><Users className="w-5 h-5" /> Human-in-the-loop enforcement</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Authority enforcement agents <strong>recommend and draft</strong> notices — they do <strong>not</strong> auto-send.
                    A city official must <strong>Approve & Send</strong> before any enforcement action is delivered.
                    This policy is implemented by design, not as an afterthought.
                </p>
            </section>

            <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
                <strong>Coming soon (roadmap):</strong> Opt-in anonymized peer benchmarking for emission scores.
                Not yet available in the product.
            </section>
        </div>
    );
}
