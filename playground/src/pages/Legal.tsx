import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="legal">
      <nav className="pg-nav">
        <div className="pg-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><LogoMark size={22} /> VisionStream</div>
        <div className="pg-nav-links">
          <a className="pg-nav-link" onClick={() => navigate('/playground')}>Playground</a>
          <a className="pg-nav-link" onClick={() => navigate('/docs')}>Docs</a>
          <a className="pg-nav-link" onClick={() => navigate('/')}>Home</a>
        </div>
      </nav>
      <main className="legal-main">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        {children}
        <p className="legal-contact">Questions? Email <a href="mailto:hello@visionstream.dev">hello@visionstream.dev</a>.</p>
      </main>
    </div>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="August 2026">
      <h3>1. Beta service</h3>
      <p>VisionStream is an early-access ("beta") API and web tool that captures a screenshot of a web page and returns a structured description of that page. The service is provided as-is and may change, break, or be unavailable while in beta.</p>

      <h3>2. Acceptable use</h3>
      <p>You agree to use VisionStream only against URLs you are legally permitted to access, and in a way that respects the target site's terms of service, robots directives, and applicable law. You must not use VisionStream to access private, internal, or authentication-gated systems you don't own or control, to harvest personal data you have no right to collect, or for any unlawful, deceptive, or abusive purpose. We block requests to private, loopback, and internal network addresses, and we may suspend access that we reasonably believe violates these terms.</p>

      <h3>3. Your responsibility for targets</h3>
      <p>You are responsible for the URLs you submit and for how you use the data returned. You — not VisionStream — are responsible for licensing, copyright, and compliance obligations attached to the content you capture.</p>

      <h3>4. API keys and usage</h3>
      <p>When key issuance opens, keys are personal to your account and metered against your plan. Keep them secret; you're responsible for activity under your keys. We may rate-limit or throttle to protect the service.</p>

      <h3>5. No warranty; limitation of liability</h3>
      <p>The service is provided without warranties of any kind. To the maximum extent permitted by law, VisionStream is not liable for indirect, incidental, or consequential damages, or for any loss arising from your use of the service or the data it returns.</p>

      <h3>6. Changes</h3>
      <p>We may update these terms as the product evolves. Continued use after an update means you accept the revised terms.</p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="August 2026">
      <h3>What we collect</h3>
      <p>Account and waitlist email addresses you give us; basic usage records (which endpoint you called, timestamps, and metering counts) tied to your API key; and the URLs you submit. During a capture we process the target page transiently to produce the screenshot and structured output.</p>

      <h3>How we use it</h3>
      <p>To run the service, meter usage, prevent abuse, and contact you about your account or early access. We do not sell your data, and we don't use the content you capture to train models.</p>

      <h3>Captured content and storage</h3>
      <p>Screenshots, when stored, live in a private bucket and are served only through short-lived signed URLs. Data is stored with our infrastructure provider (Supabase). We aim to retain captured images only as long as needed and to expire access links quickly.</p>

      <h3>Cookies</h3>
      <p>We keep cookies to a minimum — essentially what's needed to keep you signed in. No third-party ad tracking.</p>

      <h3>Your choices</h3>
      <p>You can ask us to delete your account data or remove you from the waitlist at any time by emailing us.</p>
    </LegalShell>
  );
}
