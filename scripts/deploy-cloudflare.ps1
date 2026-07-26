# Deploy Fresh Harvest web storefront to Cloudflare Workers (OpenNext)
# Prerequisites:
#   1) npm exec -- pnpm install
#   2) npx wrangler login   (or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
#   3) adsolutions-eg.com zone in the same Cloudflare account
#   4) NEXT_PUBLIC_API_URL = public HTTPS API (never localhost — mixed content blocks it)
#
# Usage:
#   .\scripts\deploy-cloudflare.ps1
#   .\scripts\deploy-cloudflare.ps1 -ApiUrl https://your-api.example.com

param(
  [string]$ApiUrl = $env:NEXT_PUBLIC_API_URL
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $ApiUrl) {
  Write-Warning "NEXT_PUBLIC_API_URL is not set. The storefront will default to http://localhost:4000 which breaks on https://nabtio.adsolutions-eg.com (mixed content + CORS)."
  Write-Warning "Pass -ApiUrl https://your-public-api or set NEXT_PUBLIC_API_URL before deploying."
} else {
  $env:NEXT_PUBLIC_API_URL = $ApiUrl.TrimEnd('/')
  Write-Host "Using NEXT_PUBLIC_API_URL=$($env:NEXT_PUBLIC_API_URL)" -ForegroundColor Cyan
}

Write-Host "Installing deps..." -ForegroundColor Cyan
npm exec -- pnpm install

Write-Host "Deploying apps/web to Cloudflare (domain: nabtio.adsolutions-eg.com)..." -ForegroundColor Cyan
Set-Location (Join-Path $root 'apps\web')
# Windows without Developer Mode can't create Next.js standalone symlinks.
$env:NODE_OPTIONS = "--require `"$root\scripts\symlink-fallback.cjs`""
npm exec -- pnpm exec opennextjs-cloudflare build
npm exec -- pnpm exec opennextjs-cloudflare deploy

Write-Host "Done. Verify https://nabtio.adsolutions-eg.com" -ForegroundColor Green
