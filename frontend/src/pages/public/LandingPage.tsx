import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BrainCircuit, Radar, ShieldCheck, Wrench } from 'lucide-react';

const capabilities = [
    { icon: Radar, title: 'Detect abnormal behaviour early', text: 'Spot meaningful changes against each asset’s own operating baseline, not just a static limit.' },
    { icon: ShieldCheck, title: 'Trust the signal', text: 'Evaluate sensor confidence before escalating an event, so teams can separate asset issues from data-quality issues.' },
    { icon: BrainCircuit, title: 'Know what needs attention', text: 'Prioritize the events with the greatest operational and emissions impact, then explain why they matter.' },
    { icon: Wrench, title: 'Act with context', text: 'Connect emission behaviour to maintenance predictions and recommended next steps.' },
];

export default function LandingPage() {
    return (
        <div className="space-y-20 pb-8">
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-16 text-white shadow-2xl sm:px-10 md:py-24">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_12%_92%,rgba(59,130,246,0.2),transparent_32%)]" />
                <div className="relative grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                    <div>
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Emissions intelligence</p>
                        <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">Find what changed.<br /><span className="text-emerald-300">Know what to do next.</span></h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">We help organizations operating emission-generating assets identify abnormal behaviour early and decide what requires attention.</p>
                        <div className="mt-9 flex flex-wrap gap-3"><Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300">Open your workspace <ArrowRight className="h-4 w-4" /></Link><Link to="/how-it-compares" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10">See how EMIQ works</Link></div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur sm:p-6"><div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm"><span className="font-semibold text-slate-300">Asset attention queue</span><span className="flex items-center gap-1.5 text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Live</span></div><div className="space-y-4 pt-5"><QueueItem asset="Boiler unit A" signal="Emission pattern shifted" priority="High" tone="rose" /><QueueItem asset="Generator 03" signal="Sensor confidence reduced" priority="Review" tone="amber" /><QueueItem asset="Exhaust line B" signal="Maintenance window predicted" priority="Plan" tone="emerald" /></div></div>
                </div>
            </section>
            <section><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-600">From monitoring to decisions</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Your emissions data should tell you what deserves attention.</h2></div><div className="mt-8 grid gap-5 md:grid-cols-2">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p></article>)}</div></section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-9"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-600">Why EMIQ</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">More than an emissions dashboard.</h2></div><Link to="/how-it-compares" className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700">Explore the comparison <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-8 grid divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700 md:grid-cols-2 md:divide-x md:divide-y-0"><div className="p-5 text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-950 dark:text-white">Existing monitoring</span><p className="mt-2">Measures current emissions and reports a problem.</p></div><div className="bg-slate-950 p-5 text-slate-300"><span className="flex items-center gap-2 font-bold text-emerald-300"><BadgeCheck className="h-4 w-4" /> EMIQ</span><p className="mt-2">Interprets emission behaviour, prioritizes the problem, and recommends action.</p></div></div></section>
        </div>
    );
}

function QueueItem({ asset, signal, priority, tone }: { asset: string; signal: string; priority: string; tone: 'rose' | 'amber' | 'emerald' }) {
    const styles = { rose: 'bg-rose-400/15 text-rose-200 ring-rose-300/25', amber: 'bg-amber-400/15 text-amber-200 ring-amber-300/25', emerald: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/25' };
    return <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-white">{asset}</p><p className="mt-0.5 text-xs text-slate-400">{signal}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[tone]}`}>{priority}</span></div>;
}
