-- Shared single-use store for Cloudflare Turnstile tokens (contact form replay protection).
-- Run once in the Supabase SQL editor for the production project.
-- Holds only a SHA-256 fingerprint of each token and when it was first seen; no personal data.
-- RLS on with no policies: only the server's secret key can read or write it.

create table if not exists public.turnstile_token_claims (
  fingerprint text primary key,
  claimed_at timestamptz not null default now()
);

alter table public.turnstile_token_claims enable row level security;

create index if not exists turnstile_token_claims_claimed_at_idx
  on public.turnstile_token_claims (claimed_at);

-- Tokens expire after 5 minutes, so old rows have no value. Optional housekeeping, e.g. weekly:
-- delete from public.turnstile_token_claims where claimed_at < now() - interval '1 day';
