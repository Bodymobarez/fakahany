# Deploy Fresh Harvest web storefront to Cloudflare Workers (OpenNext)
# Prerequisites:
#   1) npm exec -- pnpm install
#   2) npx wrangler login   (or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
#   3) adsolutions-eg.com zone in the same Cloudflare account
#   4) Optional: NEXT_PUBLIC_API_URL pointing at your API

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Installing deps..." -ForegroundColor Cyan
npm exec -- pnpm install

Write-Host "Deploying apps/web to Cloudflare (domain: nabtio.adsolutions-eg.com)..." -ForegroundColor Cyan
Set-Location (Join-Path $root 'apps\web')
# Windows without Developer Mode can't create Next.js standalone symlinks.
$env:NODE_OPTIONS = "--require `"$root\scripts\symlink-fallback.cjs`""
npm exec -- pnpm exec opennextjs-cloudflare build
npm exec -- pnpm exec opennextjs-cloudflare deploy

Write-Host "Done. Verify https://nabtio.adsolutions-eg.com" -ForegroundColor Green
