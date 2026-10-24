-- Pro access from Dodo Payments (docs/PRICING.md). One row per user: their current paid plan.
-- Only the Dodo webhook writes here, with the service key. Users can read their own row.
create table public.subscriptions (
  user_id text primary key,
  source text not null check (source in ('monthly','pass')),
  -- Dodo's subscription status for monthly ('active', 'past_due', 'cancelled', ...);
  -- 'paid' or 'refunded' for the 3-month pass.
  status text not null,
  -- Pro lasts until this moment: next billing date, grace-period end, or pass end.
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  dodo_customer_id text,
  dodo_subscription_id text,
  dodo_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "read own subscription" on public.subscriptions
  for select to authenticated using (user_id = public.requesting_user_id());
-- No insert/update/delete policies: only the service role (the webhook) can write.

-- Every webhook delivery we've applied, keyed by Dodo's webhook-id header, so a retry is a no-op.
create table public.billing_events (
  id text primary key,
  type text not null,
  user_id text,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
-- No policies: service role only.
