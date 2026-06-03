import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Briefcase, ArrowRight } from 'lucide-react';
import doctorImage from './doctor.webp';

const DOCTORS = [
  { name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', degree: 'MBBS, Cardiology', experience: '15 yrs', location: 'Chitrada', rating: 4.8, reviews: 24 },
  { name: 'Dr. Michael Chen', specialty: 'Neurologist', degree: 'MBBS, Neurology', experience: '12 yrs', location: 'Korangi', rating: 4.5, reviews: 10 },
  { name: 'Dr. Emily Brown', specialty: 'Pediatrician', degree: 'MBBS, Pediatrics', experience: '10 yrs', location: 'Kakinada', rating: 4.6, reviews: 18 },
  { name: 'Dr. James Wilson', specialty: 'Orthopedic', degree: 'MBBS, Orthopedics', experience: '18 yrs', location: 'Hyderabad', rating: 4.7, reviews: 32 },
  { name: 'Dr. Lisa Anderson', specialty: 'Dermatologist', degree: 'MBBS, Dermatology', experience: '14 yrs', location: 'Vijayawada', rating: 4.4, reviews: 12 },
  { name: 'Dr. David Taylor', specialty: 'Oncologist', degree: 'MBBS, Oncology', experience: '20 yrs', location: 'Vizag', rating: 4.9, reviews: 40 },
];

const DoctorCard = ({ doc, onBook, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
    viewport={{ once: true, margin: '-60px' }}
    className="tw-card group flex flex-col hover:-translate-y-1.5 hover:shadow-card"
  >
    <div className="flex items-center gap-4">
      <div className="relative">
        <img src={doctorImage} alt={doc.name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-brand-100" />
        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-teal-500" title="Available" />
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold leading-tight text-brand-900">{doc.name}</h3>
        <p className="font-sans text-sm font-medium text-teal-600">{doc.specialty}</p>
        <p className="font-sans text-xs text-ink-muted">{doc.degree}</p>
      </div>
    </div>

    <div className="mt-5 flex items-center gap-4 font-sans text-sm text-ink-soft">
      <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-brand-400" aria-hidden="true" /> {doc.experience}</span>
      <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-400" aria-hidden="true" /> {doc.location}</span>
    </div>

    <div className="mt-4 flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 font-sans text-sm font-semibold text-amber-700">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" /> {doc.rating}
      </span>
      <span className="font-sans text-xs text-ink-muted">({doc.reviews} reviews)</span>
    </div>

    <button onClick={onBook} className="tw-btn-ghost mt-6 w-full justify-center group-hover:bg-brand-700 group-hover:text-white group-hover:ring-brand-700">
      Book consultation <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  </motion.div>
);

const DoctorsSection = () => {
  const navigate = useNavigate();
  const book = () => navigate('/login');

  return (
    <section id="doctors" className="scroll-mt-20 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="tw-eyebrow">Our specialists</span>
          <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-brand-900 md:text-5xl">
            Meet the doctors behind your care.
          </h2>
          <p className="mt-5 font-sans text-lg text-ink-soft">
            World-class professionals, verified and ready when you need them.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DOCTORS.map((doc, i) => (
            <DoctorCard key={doc.name} doc={doc} index={i} onBook={book} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default DoctorsSection;
