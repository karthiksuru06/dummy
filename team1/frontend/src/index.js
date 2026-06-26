import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import './styles/premium_ui.css';
import './styles/tailwind.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Sentry is OPTIONAL: it only initializes when a DSN is provided via env.
// When REACT_APP_SENTRY_DSN is unset (dev/test), Sentry does nothing.
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

function SentryFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        padding: '1rem',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
        Something went wrong.
      </h1>
      <p style={{ color: '#6b7280' }}>
        Please refresh the page or try again later.
      </p>
    </div>
  );
}

// Only wrap in a Sentry ErrorBoundary when a DSN is present; otherwise render normally.
const AppTree = process.env.REACT_APP_SENTRY_DSN ? (
  <Sentry.ErrorBoundary fallback={<SentryFallback />}>
    <App />
  </Sentry.ErrorBoundary>
) : (
  <App />
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {AppTree}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register the service worker so MEDviz works offline and is installable.
// Registration only takes effect in production builds.
serviceWorkerRegistration.register();
