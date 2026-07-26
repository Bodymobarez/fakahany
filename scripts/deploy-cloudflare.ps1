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
npm exec -- pnpm run deploy

Write-Host "Done. Verify https://nabtio.adsolutions-eg.com" -ForegroundColor Green
