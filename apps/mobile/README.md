# Fresh Harvest — Customer Mobile (iOS & Android)

Native customer app built with **Expo + React Native**.  
It runs **in parallel** with the Next.js web storefront (`apps/web`) and keeps **separate UI/code**.

The driver app lives in `apps/driver` and is not mixed into this package.

## Architecture (separated from web)

| Layer | Path | Notes |
|-------|------|--------|
| Screens | `app/` | Expo Router — Home / Shop / Cart / Account + stacks |
| Auth session | `src/context/AuthContext.tsx` | Hydrates SecureStore token |
| Auth API | `src/lib/authApi.ts` | Login / OTP / OAuth / register / reset |
| Catalog API | `src/lib/catalog.ts` | Products, banners, flash, CMS pages |
| Components | `src/components/` | Mobile-only UI (not shared with Next.js) |
| Theme | `src/theme.ts` | Mobile design tokens |

Web pages under `apps/web` are **not imported** here.

## Tabs (parallel to web)

1. **Home** — banners, recommendations, flash sales  
2. **Shop** — full catalog (search + categories) ≈ web `/products`  
3. **Cart** — cart + checkout entry  
4. **Account** — orders, wallet, loyalty, support, CMS About, auth  

## Run locally

```bash
# from monorepo root — API must be running on :4000
npx pnpm --filter @fv/api dev

# customer mobile
npx pnpm --filter @fv/mobile start
```

Then press:

- `a` — Android emulator / device  
- `i` — iOS simulator (macOS)  
- scan QR with Expo Go  

Point the device at your machine IP if needed:

```bash
# PowerShell
$env:EXPO_PUBLIC_API_URL="http://192.168.x.x:4000"
npx pnpm --filter @fv/mobile start
```

Or set `extra.API_URL` in `app.json`.

## Native builds (EAS)

```bash
cd apps/mobile
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform android --profile preview
```

Bundle IDs:

- iOS: `ae.freshharvest.customer`  
- Android: `ae.freshharvest.customer`
