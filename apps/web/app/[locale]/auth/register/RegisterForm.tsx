'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from '@/i18n/routing';
import { finishAuthSession, parseApiError, registerCustomer } from '@/lib/authApi';
import {
  EMIRATES,
  LocationPicker,
  UAE_CENTER,
  type MapLocation,
} from '@/components/maps/LocationPicker';
import { PasswordField } from '@/components/auth/PasswordField';

const fieldClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-neutral-400 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
}

export function RegisterForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('+971');
  const [location, setLocation] = useState<MapLocation>({
    lat: UAE_CENTER.lat,
    lng: UAE_CENTER.lng,
    emirate: 'Dubai',
    area: '',
    street: '',
    detected: false,
    status: 'idle',
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const firstName = String(fd.get('firstName') ?? '').trim();
    const lastName = String(fd.get('lastName') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const emirate = String(fd.get('emirate') ?? location.emirate);
    const area = String(fd.get('area') ?? location.area).trim();
    const street = String(fd.get('street') ?? location.street).trim();
    const building = String(fd.get('building') ?? '').trim();
    const floor = String(fd.get('floor') ?? '').trim() || null;
    const apartment = String(fd.get('apartment') ?? '').trim() || null;

    if (password !== confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const normalizedPhone = phone.replace(/\s+/g, '');
    if (!normalizedPhone.startsWith('+971') || normalizedPhone.length < 12) {
      setError('Enter a valid UAE phone number (+971…)');
      setLoading(false);
      return;
    }

    try {
      const data = await registerCustomer({
        firstName,
        lastName,
        email,
        phone: normalizedPhone,
        password,
        address: {
          emirate,
          area,
          street,
          building,
          floor,
          apartment,
          lat: location.lat,
          lng: location.lng,
          label: 'Home',
        },
      });
      await finishAuthSession(dispatch, data);
      router.push('/');
    } catch (err) {
      setError(parseApiError(err, 'Could not create account'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-8">
      <Section title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label required>First Name</Label>
            <input
              name="firstName"
              required
              autoComplete="given-name"
              placeholder="Enter your first name"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <Label required>Family Name</Label>
            <input
              name="lastName"
              required
              autoComplete="family-name"
              placeholder="Enter your family name"
              className={fieldClass}
            />
          </label>
        </div>
      </Section>

      <Section title="Contact Information">
        <label className="block">
          <Label required>Email</Label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <Label required>Phone Number</Label>
          <input
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => {
              let v = e.target.value;
              if (!v.startsWith('+971')) v = '+971';
              setPhone(v);
            }}
            autoComplete="tel"
            className={fieldClass}
          />
        </label>
      </Section>

      <Section title="Delivery Address">
        <LocationPicker value={location} onChange={(next) => setLocation(next)} />
        <label className="block">
          <Label required>Emirate</Label>
          <select
            name="emirate"
            required
            value={location.emirate}
            onChange={(e) => setLocation((prev) => ({ ...prev, emirate: e.target.value }))}
            className={fieldClass}
          >
            {EMIRATES.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label required>Area / Neighborhood</Label>
          <input
            name="area"
            required
            value={location.area}
            onChange={(e) => setLocation((prev) => ({ ...prev, area: e.target.value }))}
            placeholder="Damac Hills 2"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <Label required>Street</Label>
          <input
            name="street"
            required
            value={location.street}
            onChange={(e) => setLocation((prev) => ({ ...prev, street: e.target.value }))}
            placeholder="Street name"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <Label required>Building</Label>
          <input
            name="building"
            required
            placeholder="Building name or number"
            className={fieldClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label>Floor</Label>
            <input name="floor" placeholder="Optional" className={fieldClass} />
          </label>
          <label className="block">
            <Label>Apartment</Label>
            <input name="apartment" placeholder="Optional" className={fieldClass} />
          </label>
        </div>
      </Section>

      <Section title="Security">
        <PasswordField
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
          placeholder="Min 8 chars, 1 uppercase, 1 special"
        />
        <PasswordField
          name="confirmPassword"
          label="Confirm Password"
          value={confirm}
          onChange={setConfirm}
          required
          autoComplete="new-password"
          placeholder="Confirm your password"
        />
      </Section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-leaf-800 py-3.5 text-sm font-semibold text-white transition hover:bg-leaf-700 disabled:opacity-60"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}
