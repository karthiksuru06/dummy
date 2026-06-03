import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Activity, ShieldCheck, Sparkles } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const STATS = [
  { value: "24/7", label: "AI triage support" },
  { value: "150+", label: "Verified specialists" },
  { value: "20k+", label: "Patients cared for" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="tw-mesh relative overflow-hidden bg-paper px-6 pt-32 pb-20 md:pt-40 md:pb-28"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-12">
        {/* Copy */}
        <motion.div variants={container} initial="hidden" animate="visible" className="lg:col-span-7">
          <motion.span variants={item} className="tw-eyebrow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Telehealth, reimagined
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-brand-900 md:text-6xl lg:text-7xl"
          >
            Your health,
            <br />
            <span className="text-teal-600">our priority</span> — care
            <br className="hidden md:block" /> that comes to you.
          </motion.h1>

          <motion.p variants={item} className="mt-7 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">
            MEDviz detects emergencies early, connects you with expert doctors,
            and keeps your records in one calm, secure place — anytime, anywhere.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
            <button onClick={() => navigate("/login")} className="tw-btn-primary text-base">
              Explore services <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
              className="tw-btn-ghost text-base"
            >
              Learn more
            </button>
          </motion.div>

          <motion.div variants={item} className="mt-12 flex max-w-lg items-center gap-8">
            {STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <span className="h-10 w-px bg-brand-200" aria-hidden="true" />}
                <div>
                  <div className="font-display text-3xl font-semibold text-brand-900">{s.value}</div>
                  <div className="mt-1 font-sans text-sm text-ink-muted">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </motion.div>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:col-span-5"
        >
          <div className="absolute -inset-6 -z-10 rounded-[2.75rem] bg-teal-400/20 blur-3xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-800 to-brand-900 p-2 shadow-lift ring-1 ring-white/10">
            <img
              src="/doctor-consultation.png"
              alt="A doctor consulting a patient through MEDviz"
              className="h-full w-full rounded-[2rem] object-cover"
            />
          </div>

          {/* Floating chips */}
          <motion.div
            initial={{ opacity: 0, x: -24, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.9, type: "spring" }}
            className="absolute left-0 top-10 flex animate-float items-center gap-3 rounded-2xl bg-white/95 p-3.5 pr-5 shadow-card ring-1 ring-brand-100 backdrop-blur sm:-left-4"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block font-sans text-sm font-bold text-brand-900">24/7 AI Support</span>
              <span className="block font-sans text-xs text-ink-muted">Early detection & care</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 1.1, type: "spring" }}
            className="absolute right-0 bottom-12 flex animate-float-slow items-center gap-3 rounded-2xl bg-white/95 p-3.5 pr-5 shadow-card ring-1 ring-brand-100 backdrop-blur sm:-right-2"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block font-sans text-sm font-bold text-brand-900">Verified Doctors</span>
              <span className="block font-sans text-xs text-ink-muted">Vetted professionals</span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
