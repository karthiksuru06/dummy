import React from "react";
import { motion } from "framer-motion";
import { Twitter, Github, Instagram, Plus } from "lucide-react";

const NAV = ["Home", "About", "Services", "Doctors", "Contact"];
const PLATFORM = ["Security", "Privacy", "Status", "Documentation"];
const SOCIALS = [
  { icon: Twitter, href: "https://twitter.com", label: "MEDviz on Twitter" },
  { icon: Github, href: "https://github.com", label: "MEDviz on GitHub" },
  { icon: Instagram, href: "https://instagram.com", label: "MEDviz on Instagram" },
];

export default function Footer() {
  return (
    <footer className="bg-brand-900 px-6 pt-20 pb-8 text-brand-100">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true, margin: "-50px" }}
        className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 lg:grid-cols-4"
      >
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-500 text-brand-900">
              <Plus className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="font-display text-2xl font-semibold text-white">MEDviz</span>
          </div>
          <p className="mt-5 font-sans text-sm leading-relaxed text-brand-200">
            The next generation of telemedicine and patient care — simple, fast,
            and reliable, built around the people who use it.
          </p>
          <div className="mt-6 flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-brand-100 ring-1 ring-white/10 transition hover:bg-teal-500 hover:text-brand-900"
              >
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Navigation</h4>
          <ul className="mt-5 space-y-3">
            {NAV.map((l) => (
              <li key={l}>
                <a href={"#" + l.toLowerCase()} className="font-sans text-sm text-brand-200 transition hover:text-teal-300">{l}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Platform</h4>
          <ul className="mt-5 space-y-3">
            {PLATFORM.map((l) => (
              <li key={l}>
                <a href="#contact" className="font-sans text-sm text-brand-200 transition hover:text-teal-300">{l}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white">Office</h4>
          <p className="mt-5 font-sans text-sm leading-relaxed text-brand-200">
            Main Street, Kakinada<br />Andhra Pradesh, 52345
          </p>
          <p className="mt-4 font-sans text-sm text-brand-200">
            support@medviz.tech<br />+91 12345 67890
          </p>
        </div>
      </motion.div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-white/10 pt-8 font-sans text-sm text-brand-300 sm:flex-row">
        <span>© 2025 MEDviz — All rights reserved</span>
        <span>Built by Team-1</span>
      </div>
    </footer>
  );
}
