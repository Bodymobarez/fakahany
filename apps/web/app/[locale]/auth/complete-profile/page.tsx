'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { useRouter } from '@/i18n/routing';
import { AuthShell, authFieldClass, authPrimaryBtnClass } from '@/components/auth/AuthShell';
import {
  EMIRATES,
  LocationPicker,
  UAE_CENTER,
  type MapLocation,
} from '@/components/maps/LocationPicker';
import {
  exchangeOAuthTicket,
  finishAuthSession,
  parseApiError,
  updateMyProfile,
} from '@/lib/authApi';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

function CompleteProfileInner() {
  const search = useSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();

  const [bootError, setBootError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    const ticket = search.get('ticket');
    if (!ticket) {
      if (getAccessToken()) {
        setReady(true);
        return;
      }
      setBootError('Please sign in again to complete your profile.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await exchangeOAuthTicket(ticket);
        if (cancelled) return;
        if (!data.user || !data.accessToken || !data.refreshToken) {
          throw new Error('Sign-in incomplete');
        }
        await finishAuthSession(dispatch, {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        if (data.user.phone) setPhone(data.user.phone);
        setReady(true);
      } catch (err) {
        if (!cancelled) setBootError(parseApiError(err, 'Could not continue sign-in'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, search]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const emirate = String(fd.get('emirate') ?? location.emirate);
    const area = String(fd.get('area') ?? location.area).trim();
    const street = String(fd.get('street') ?? location.street).trim();
    const building = String(fd.get('building') ?? '').trim();
    const floor = String(fd.get('floor') ?? '').trim() || null;
    const apartment = String(fd.get('apartment') ?? '').trim() || null;
    const normalizedPhone = phone.replace(/\s+/g, '');

    if (!normalizedPhone.startsWith('+971') || normalizedPhone.length < 12) {
      setError('Enter a valid UAE phone number (+971…)');
      setLoading(false);
      return;
    }

    try {
      await updateMyProfile({ phone: normalizedPhone });
      const line1 = [street, building].filter(Boolean).join(', ') || area;
      const line2 = [floor && `Floor ${floor}`, apartment && `Apt ${apartment}`]
        .filter(Boolean)
        .join(', ');
      await api.post('/api/addresses', {
        label: 'Home',
        line1,
        line2: line2 || null,
        area,
        street,
        building,
        floor,
        apartment,
        city: area,
        emirate,
        country: 'UAE',
        lat: location.lat,
        lng: location.lng,
        isDefault: true,
      });
      const returnTo = search.get('returnTo');
      router.replace(returnTo && returnTo.startsWith('/') ? returnTo : '/');
    } catch (err) {
      setError(parseApiError(err, 'Could not save delivery address'));
    } finally {
      setLoading(false);
    }
  }

  if (bootError) {
    return (
      <AuthShell title="Almost there" subtitle="We need a few details to finish your account.">
        <p className="mt-6 text-sm text-red-600">{bootError}</p>
        <button
          type="button"
          onClick={() => router.push('/auth/login')}
          className={`${authPrimaryBtnClass} mt-4`}
        >
          Back to login
        </button>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <AuthShell title="Almost there" subtitle="Preparing your account…">
        <p className="mt-6 text-center text-sm text-ink/60">Please wait…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Add delivery address"
      subtitle="Same as a new account — save your home delivery details to your customer profile."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-5">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink/80">Mobile number</span>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => {
              let v = e.target.value;
              if (!v.startsWith('+971')) v = '+971';
              setPhone(v);
            }}
            className={authFieldClass}
          />
        </label>

        <LocationPicker value={location} onChange={(next) => setLocation(next)} />

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink/80">Emirate</span>
          <select
            name="emirate"
            required
            value={location.emirate}
            onChange={(e) => setLocation((prev) => ({ ...prev, emirate: e.target.value }))}
            className={authFieldClass}
          >
            {EMIRATES.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink/80">Area / Neighborhood</span>
          <input
            name="area"
            required
            value={location.area}
            onChange={(e) => setLocation((prev) => ({ ...prev, area: e.target.value }))}
            className={authFieldClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink/80">Street</span>
          <input
            name="street"
            required
            value={location.street}
            onChange={(e) => setLocation((prev) => ({ ...prev, street: e.target.value }))}
            className={authFieldClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink/80">Building</span>
          <input name="building" required className={authFieldClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink/80">Floor</span>
            <input name="floor" className={authFieldClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink/80">Apartment</span>
            <input name="apartment" className={authFieldClass} />
          </label>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
          {loading ? 'Saving…' : 'Save & continue'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Almost there" subtitle="Preparing your account…">
          <p className="mt-6 text-center text-sm text-ink/60">Please wait…</p>
        </AuthShell>
      }
    >
      <CompleteProfileInner />
    </Suspense>
  );
}
