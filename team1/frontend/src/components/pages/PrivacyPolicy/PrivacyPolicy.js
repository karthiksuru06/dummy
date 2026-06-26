import React from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPolicy.css';

/**
 * Privacy Policy / data-handling notice. This is the consent target referenced
 * at registration and the privacy URL required by app stores for a health app.
 *
 * NOTE: This is a working template, not legal advice. Before handling real
 * patient data it MUST be reviewed by a qualified attorney and reconciled with
 * the regulations that apply to you (e.g. HIPAA in the US, GDPR in the EU,
 * India's DPDP Act) and with the BAAs you sign with MongoDB Atlas, Cloudinary,
 * and your email provider.
 */
const CONSENT_VERSION = '1.0';
const LAST_UPDATED = 'June 2026';

const PrivacyPolicy = () => (
  <div className="privacy-page">
    <div className="privacy-container">
      <Link to="/" className="privacy-back">← Back to MEDviz</Link>
      <h1>MEDviz Privacy &amp; Data Handling Policy</h1>
      <p className="privacy-meta">Version {CONSENT_VERSION} · Last updated {LAST_UPDATED}</p>

      <div className="privacy-banner" role="note">
        This is a template pending legal review. It describes how MEDviz is
        engineered to handle data; the binding policy for your jurisdiction must
        be confirmed with counsel before processing real patient records.
      </div>

      <section>
        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account &amp; identity:</strong> name, email, phone, date of birth, gender, address, emergency contact.</li>
          <li><strong>Health information (PHI):</strong> blood group, medical history, current medications, uploaded medical reports, symptoms you share with the assistant, appointments, and prescriptions.</li>
          <li><strong>Technical:</strong> authentication tokens, request logs, and a tamper-evident audit trail of who accessed which record and when.</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <p>Solely to provide the service: to register and authenticate you, let you book and manage appointments, let your treating clinicians view the records you share, deliver prescriptions and notifications, and provide non-diagnostic symptom guidance. We do not sell your data or use it for advertising.</p>
      </section>

      <section>
        <h2>3. How it is protected</h2>
        <ul>
          <li>Passwords are hashed (bcrypt); access is gated by authentication and per-record ownership checks.</li>
          <li>Uploaded reports are stored privately and served only via short-lived, signed links — not public URLs.</li>
          <li>Data is encrypted in transit (TLS) and at rest by our database provider.</li>
          <li>Every access to or change of a medical record is recorded in an append-only audit log.</li>
        </ul>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>Your health information is visible to you, to the clinician(s) involved in your care, and to authorized administrators for support and safety. Infrastructure providers (database, file storage, email) process data on our behalf under data-protection agreements. We disclose data otherwise only when required by law.</p>
      </section>

      <section>
        <h2>5. Your choices &amp; rights</h2>
        <p>You may access, correct, or request deletion of your data, and withdraw consent, by contacting us. Withdrawing consent may mean we can no longer provide the service. Subject-rights and retention periods follow the law that applies to you.</p>
      </section>

      <section>
        <h2>6. The AI assistant is not a diagnosis</h2>
        <p>MEDviz's symptom assistant provides general guidance only and is not a substitute for professional medical advice. In an emergency, contact your local emergency services immediately.</p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>For privacy requests or questions, contact the MEDviz data team at the address listed on our contact page.</p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicy;
