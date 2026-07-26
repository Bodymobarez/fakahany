export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl text-[var(--fv-green-900)]">Privacy Policy (UAE PDPL)</h1>
      <p className="mt-4 text-neutral-700">
        Fresh Harvest processes personal data in line with the UAE Personal Data Protection Law (PDPL).
        You may request data export or account deletion from your account settings or via{' '}
        <code className="text-sm">/api/compliance/export</code> and{' '}
        <code className="text-sm">/api/compliance/delete</code>.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Marketing & cookies</h2>
      <p className="mt-2 text-neutral-700">
        Marketing communications require explicit opt-in. Cookie preferences can be managed via the
        consent banner on first visit.
      </p>
    </div>
  );
}
