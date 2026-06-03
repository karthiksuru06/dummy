import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({ name: '', email: '' });

  const validateName = (v) => (!v ? '' : /^[A-Za-z\s]+$/.test(v) ? '' : 'Only letters and spaces are allowed');
  const validateEmail = (v) => (!v ? '' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((d) => ({ ...d, [name]: value }));
    if (name === 'name') setErrors((x) => ({ ...x, name: validateName(value) }));
    if (name === 'email') setErrors((x) => ({ ...x, email: validateEmail(value) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (errors.name || errors.email) {
      alert('Please fix the validation errors before submitting.');
      return;
    }
    alert('Message sent successfully!');
    setFormData({ name: '', email: '', message: '' });
    setErrors({ name: '', email: '' });
  };

  const inputCls =
    'w-full rounded-2xl border border-brand-100 bg-white px-5 py-3.5 font-sans text-[15px] text-brand-900 placeholder:text-ink-muted transition focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100';

  return (
    <section id="contact" className="scroll-mt-20 bg-paper px-6 py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto grid max-w-6xl overflow-hidden rounded-[2.5rem] shadow-lift lg:grid-cols-2"
      >
        {/* Reassurance panel */}
        <div className="tw-mesh-dark relative bg-brand-900 p-10 md:p-12">
          <span className="tw-eyebrow bg-white/10 text-teal-300">Get in touch</span>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-white">
            Still have questions? <br /> We'd love to help.
          </h2>
          <p className="mt-5 max-w-md font-sans leading-relaxed text-brand-100">
            Reach out and our team will get back to you with the information and
            support you need. We value your feedback.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: Mail, text: 'support@medviz.tech' },
              { icon: Phone, text: '+91 12345 67890' },
              { icon: MapPin, text: 'Main Street, Kakinada, AP 52345' },
            ].map((c) => (
              <div key={c.text} className="flex items-center gap-3.5 font-sans text-brand-100">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-teal-300">
                  <c.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {c.text}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white p-10 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block font-sans text-sm font-semibold text-brand-800">Your name</label>
              <input id="c-name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" required className={inputCls} />
              {errors.name && <span className="mt-1.5 block font-sans text-xs text-red-500">{errors.name}</span>}
            </div>
            <div>
              <label htmlFor="c-email" className="mb-1.5 block font-sans text-sm font-semibold text-brand-800">Your email</label>
              <input id="c-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="jane@example.com" required className={inputCls} />
              {errors.email && <span className="mt-1.5 block font-sans text-xs text-red-500">{errors.email}</span>}
            </div>
            <div>
              <label htmlFor="c-msg" className="mb-1.5 block font-sans text-sm font-semibold text-brand-800">Message</label>
              <textarea id="c-msg" name="message" value={formData.message} onChange={handleChange} placeholder="How can we help?" required rows={4} className={`${inputCls} resize-none`} />
            </div>
            <button type="submit" className="tw-btn-primary w-full justify-center text-base">
              Send message <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default Contact;
