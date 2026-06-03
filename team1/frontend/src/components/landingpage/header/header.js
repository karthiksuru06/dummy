import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, Plus } from "lucide-react";

const NAV = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Doctors", href: "#doctors" },
  { label: "Contact", href: "#contact" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-paper/85 backdrop-blur-md shadow-soft" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="MEDviz home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-900 text-teal-400 shadow-soft transition-transform group-hover:rotate-6">
            <Plus className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-brand-900">
            MED<span className="text-teal-600">viz</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="rounded-full px-4 py-2 font-sans text-sm font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-800"
            >
              {n.label}
            </a>
          ))}
          <Link to="/login" className="tw-btn-primary ml-3 px-6 py-2.5 text-sm">
            Login
          </Link>
        </nav>

        <button
          className="grid h-10 w-10 place-items-center rounded-xl text-brand-900 ring-1 ring-brand-200 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-3 rounded-3xl bg-white p-3 shadow-card ring-1 ring-brand-100 md:hidden"
        >
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 font-sans text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
            >
              {n.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setOpen(false)} className="tw-btn-primary mt-2 w-full">
            Login
          </Link>
        </motion.nav>
      )}
    </motion.header>
  );
};

export default Header;
