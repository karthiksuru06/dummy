import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const CARDS = [
  {
    title: 'How we help',
    points: [
      'Book appointments with instant confirmations.',
      'Keep every health record securely in one place.',
      '24/7 access to a dedicated support team.',
    ],
  },
  {
    title: 'Why MEDviz',
    points: [
      'Consult trusted, certified doctors fully online.',
      'Personalized reminders for medication and checkups.',
      'Everything in one easy-to-use platform.',
    ],
  },
  {
    title: 'Our values',
    points: [
      'Transparent service with zero hidden fees.',
      'Your medical data stays encrypted and private.',
      'Designed around your comfort, time, and care.',
    ],
  },
];

const About = () => (
  <section id="about" className="scroll-mt-20 bg-paper px-6 py-24 md:py-32">
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <span className="tw-eyebrow">About us</span>
          <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-brand-900 md:text-5xl">
            Care built around people, not paperwork.
          </h2>
          <p className="mt-6 font-sans text-lg leading-relaxed text-ink-soft">
            MEDviz exists to close the distance between feeling unwell and getting
            a real clinician's plan — measured in minutes, not days.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, margin: '-60px' }}
              className="tw-card flex flex-col"
            >
              <h3 className="font-display text-xl font-semibold text-brand-900">{card.title}</h3>
              <ul className="mt-5 space-y-3.5">
                {card.points.map((p) => (
                  <li key={p} className="flex gap-3 font-sans text-[15px] leading-snug text-ink-soft">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default About;
