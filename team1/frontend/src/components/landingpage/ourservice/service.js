import React from "react";
import { motion } from "framer-motion";
import { Stethoscope, Bot, MapPin, BookOpenText } from "lucide-react";

const SERVICES = [
  { icon: Stethoscope, title: "Online Doctors", desc: "Connect with certified specialists anywhere, anytime — no waiting room." },
  { icon: Bot, title: "AI Symptom Check", desc: "Deterministic triage that flags emergencies early and guides your next step safely." },
  { icon: MapPin, title: "Find Clinics", desc: "Locate trusted nearby clinics and hospitals, and book in a couple of taps." },
  { icon: BookOpenText, title: "Health Guidance", desc: "Clear, expert-reviewed articles and reminders for a healthier everyday." },
];

export default function Service() {
  return (
    <section id="services" className="scroll-mt-20 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <span className="tw-eyebrow">What we do</span>
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-brand-900 md:text-5xl">
            Everything you need, in one calm place.
          </h2>
          <p className="mt-5 font-sans text-lg text-ink-soft">
            From first symptom to follow-up — MEDviz brings the whole journey together.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: "-60px" }}
              className="tw-card group hover:-translate-y-1.5 hover:shadow-card hover:ring-teal-200"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-500 group-hover:text-white">
                <s.icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold text-brand-900">{s.title}</h3>
              <p className="mt-2.5 font-sans text-[15px] leading-relaxed text-ink-soft">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
