# DevProfile Pro — Pricing, Plans and Usage Caps

> Read [USER_PROBLEMS.md](USER_PROBLEMS.md) first. This doc decides **how we charge** and **how we cap AI usage** so the free tier is generous, the paid tier is profitable, and nobody gets the paywall trap we criticise.

> **[Claude section]** Drafted 24 October 2026. Not yet reviewed by the team. AI costs below are **estimates** from token budgets in the code; replace them with real numbers from `ai_runs.meta.cost_usd` once there are a few hundred runs (query at the bottom).

---

## 1. The decision in one paragraph

**Subscription with plain-language allowances, not credits and not pay-per-use.** Users see "3 of 3 tailored resumes left this month", never "412 credits". Behind the scenes we meter real AI cost per user (we already log it) and use it only as a safety net. Building your first resume, editing, checks and PDF downloads are free forever. Money comes from people who are actively applying and want many tailored versions — that's where the value and the repeat use are.

| Plan | Price | Who it's for |
| --- | --- | --- |
| **Free** | $0 | Everyone. Build a great base resume, download it, tailor a few times |
| **Pro** | **$12 / month**, or **$29 for 3 months** (one payment, does **not** auto-renew) | People actively applying to many jobs |

One price everywhere: $12 a month or $29 for the pass (decided 24 October 2026; regional pricing turned off).

---

## 2. Why not credits, why not usage-based

| Option | How it feels to a job seeker | Verdict |
| --- | --- | --- |
| **Credits** (what the dashboard shows today: 1 credit = 1¢ of AI cost) | "How many credits is a tailored resume? Will I run out mid-application?" Credits are an exchange rate people have to learn. It also leaks our costs and makes every click feel like spending money | ❌ Drop from the UI. Keep the metering underneath |
| **Usage-based billing** (pay per tailored resume, or metered monthly bill) | Unpredictable bills for students who are broke and anxious. Every action has a visible price tag, which discourages exactly the iterating we want them to do | ❌ |
| **Weekly subscriptions** (Teal $13/week, Zety's trial → $25.95 every 4 weeks) | Works for them financially, but this is the auto-renew trap our users complain about | ❌ It's our positioning to not do this |
| **Lifetime deal** (Rezi $149 once) | Great for users, but our cost is ongoing AI per action. A lifetime user who keeps tailoring loses us money forever | ❌ Maybe later as a launch promo with a fair-use cap |
| **Subscription with plain allowances + fair use** | "Pro gets you as many tailored resumes as you'll realistically need." Predictable price, nothing to learn | ✅ |
| **Fixed-length pass that doesn't auto-renew** ($29 for 3 months) | Matches how people actually job-hunt: a 2–3 month burst, then nothing. No surprise charge when they've got the job | ✅ Our anti-trap differentiator |

Job hunting is bursty. Most people search hard for 1–3 months, then stop. A 3-month pass that simply ends fits that, and "we never charge you again without asking" is a sentence competitors can't say.

---

## 3. What's free and what's Pro

The rule (principle 8 in USER_PROBLEMS.md): **never let someone build a resume and then hold the download hostage.** Everything that makes the first resume good is free. Pro is about *volume* and *staying current*.

| | Free | Pro |
| --- | --- | --- |
| Build your resume (GitHub + questions + writing) | ✅ First build, then **1 full rebuild a month** | ✅ Unlimited (fair use) |
| PDF + LaTeX download | ✅ Unlimited, no watermark | ✅ |
| Editing, reordering, hiding, checks, parser view | ✅ Unlimited (no AI cost) | ✅ |
| Answer impact questions | ✅ | ✅ |
| **Tailored resumes** (paste a job post) | **3 a month** | **Unlimited** (fair use: 100/month) |
| Match report on a tailored resume | ✅ on those 3 | ✅ |
| **AI fixes** (rewrite a line, "make it shorter", chat edits) | **20 a month** | **Unlimited** (fair use) |
| GitHub / LinkedIn re-sync | 1 a month | Anytime |
| "What did I send where" history | Last 3 downloads | All, forever |
| Coming later (Pro): cover letters, interview prep from your resume, auto-noticing new GitHub work | — | ✅ |

**What users see:** a small line, never a credit balance:
- *"2 of 3 free tailored resumes left this month · resets Nov 1"*
- On the 4th: *"You've used this month's 3 free tailored resumes. Pro gets you unlimited for $12/month, or $29 for 3 months with no auto-renew."* Plus the honest alternative: *"Or keep using your base resume — it's still yours to edit and download."*

---

## 4. What each action costs us (estimates)

Prices per million tokens (input / output): **Claude Opus 5.5 $4 / $20**, **Claude Sonnet 5.5 $2 / $10**, **Claude Haiku 5.5 $0.10 / $0.50**, gpt-4.1-mini $0.40 / $1.60. Opus 5.5 always thinks, and thinking is billed as output, so output estimates include it.

| Action | Tokens in / out (approx.) | Opus 5.5 | Sonnet 5.5 | gpt-4.1-mini (today's fallback) |
| --- | --- | --- | --- | --- |
| Read sources → Career Record (extract) | 40k / 10k | ~$0.36 | ~$0.18 | ~$0.03 |
| Interview questions | 4k / 3k | ~$0.08 | ~$0.04 | <$0.01 |
| Write all bullets (+ occasional repair) | 8k / 9k | ~$0.21–0.29 | ~$0.11–0.15 | ~$0.02 |
| **First resume, end to end** | | **~$0.65–0.75** | **~$0.35** | **~$0.05** |
| Tailored resume (plan + fit) | 12k / 6k | ~$0.17 | ~$0.08 | ~$0.01 |
| AI fix (one entry rewrite, one chat turn) | 3–8k / 2–3k | ~$0.05–0.09 | ~$0.03–0.05 | <$0.01 |
| GitHub re-sync (re-extract) | 40k / 10k | ~$0.36 | ~$0.18 | ~$0.03 |
| PDF, editing, checks, link tests | — | $0 | $0 | $0 |

### Model choice per step (recommended)

Use the best model where quality is the product, the cheaper one where it isn't:

| Step | Model | Why |
| --- | --- | --- |
| Extract, Write | **Opus 5.5** | This *is* the resume. Bad bullets = no product |
| Interview, Tailor plan, Chat, single-entry rewrites | **Sonnet 5.5** | Picking and ordering, short edits. Half the cost |
| Scanned-PDF transcription, small classifications | **Haiku 5.5** | Mechanical |

With that mix: **first resume ≈ $0.65**, **tailored resume ≈ $0.08**, **AI fix ≈ $0.04**.

### Unit economics

| User | Their month | Our AI cost | Revenue | Margin |
| --- | --- | --- | --- | --- |
| Free, typical | 1 build, 2 tailors, 8 fixes | ~$1.10 (first month), ~$0.50 after | $0 | Acquisition cost |
| Free, maxed | 1 build + 1 rebuild, 3 tailors, 20 fixes | ~$2.40 | $0 | Capped by allowances |
| Pro, typical | 2 syncs, 25 tailors, 40 fixes | ~$4.40 | $12 | ~$6.40 after ~$1 payment fees |
| Pro, heavy | 5 syncs, 100 tailors, 150 fixes | ~$15 | $12 | Negative → fair-use cap kicks in (section 5) |
| Pro, 3-month pass | ~3× typical | ~$13 | $29 | ~$14 |

Free users cost roughly $1 each in their first month. At $12/month, **about 1 in 10 free users converting** pays for all free usage. Track this from day one.

The other lever is **prompt caching**. Tailoring and chat re-send the same Career Record every time; caching that prefix cuts their input cost by up to ~90% (cache reads are $0.20/MTok on Opus and Sonnet 5.5).

---

## 5. The capping system (how to build it)

Three layers. Users only ever see layer 1.

| Layer | What it limits | Who sees it | Today in the code |
| --- | --- | --- | --- |
| **1. Plan allowances** | Counts per month: tailored resumes, AI fixes, rebuilds, syncs | User ("2 of 3 left") | ❌ New |
| **2. Fair-use cost ceiling** | Each user's real AI $ per month: Free **$3**, Pro **$15** | Nobody, unless hit | Partly: `lib/ai/budget.ts` checks **$ per day** (`AI_USER_DAILY_BUDGET_USD`, default $0.50) |
| **3. Abuse limits** | Requests per day per step (stops scripts and loops) + whole-server daily $ cap | Nobody | ✅ `lib/ratelimit.ts` (`DAILY_LIMITS`) + `AI_SERVER_DAILY_BUDGET_USD` |

**When a Pro user hits the fair-use ceiling, don't block them. Downgrade quietly**: route their remaining requests that month to Sonnet 5.5 or Haiku 5.5. They keep working and we stop losing money. Only Free users hit a hard stop, with the upgrade message above.

**Counting rules:**
- A tailored resume counts when it's **saved**, not when the AI call is made. A failed or retried call never counts.
- An AI fix counts per rewrite or chat message that changes the resume. Answering an impact question is free: it's how bullets get better, and we want people to do it.
- The monthly reset is on the user's billing date (Pro) or the 1st of the month (Free).

### Changes to the code

1. **Schema** (new migration):
   - `subscriptions`: user_id, plan (`free` | `pro`), source (`monthly` | `pass`), current_period_start, current_period_end, provider_customer_id, provider_subscription_id.
   - `usage_events`: user_id, kind (`tailor` | `fix` | `rebuild` | `sync`), created_at, plus a reference to the resume or run. Counting rows per period gives layer 1. A separate table, because `ai_runs` logs every attempt, including retries and failures.
2. **`lib/plans.ts`**: one table of allowances per plan, the only place to change them.
3. **`lib/ai/budget.ts`**: change the per-day check to per-billing-period, with the limit by plan. Return "downgrade" instead of throwing for Pro.
4. **`lib/ai/model.ts`**: `modelFor(step, { downgraded })` picks Opus, Sonnet or Haiku per the table in section 4.
5. **Actions**: `stageTailorSave`, `regenerateItem`, `chatWithResume` and rebuilds check the allowance before the AI call and write a `usage_events` row after success.
6. **UI**: replace the dashboard's credits card (`summarizeUsage` in `lib/credits.ts`) with "This month: 2 of 3 tailored resumes, 12 of 20 AI fixes". Keep the per-activity cost breakdown in an admin-only view.

---

## 6. Prices: what to charge and why

### Competitor prices (October 2026, from public pricing pages and review sites)

| Product | Paid price | Model | Notes |
| --- | --- | --- | --- |
| Teal+ | ~$13/week, $29/month, $79/quarter | Subscription | Free tier is generous on resumes, limited AI |
| Rezi Pro | $29/month or $149 lifetime | Subscription + lifetime | Free: 1 resume, 3 PDF downloads |
| Jobscan Premium | $49.95/month, $89.95/quarter | Subscription | ATS keyword scanner |
| Kickresume Premium | ~$24/month, ~$8/month yearly | Subscription | Regional (PPP) pricing |
| Zety | $1.95 14-day trial → $25.95 every 4 weeks | Trial into auto-renew | The pattern our users hate |

**The market charges $24–50 a month.** We undercut deliberately at **$12/month** because:
- Our core audience is students and early-career developers, the most price-sensitive group.
- Free PDF download plus a cheap, honest Pro is the positioning ("no paywall trap").
- Our AI cost per Pro user (~$4–5) leaves a healthy margin at $12.

**$29 for 3 months** is the best-value option and the honest one: it matches a job search and doesn't renew. Expect most Pro buyers to pick it.

### Regional pricing (turned off 24 October 2026)

Tried with Dodo's purchasing power parity: Nepal paid about $3.60 a month. Turned off so every country pays $12 / $29. The tiers below are kept for if we try it again.


Charge by country purchasing power, as Kickresume does. A $12 subscription is a week's groceries in some of our biggest developer markets.

| Tier | Countries (examples) | Monthly | 3-month pass |
| --- | --- | --- | --- |
| A | US, UK, Canada, Australia, Western Europe | $12 | $29 |
| B | Eastern Europe, Latin America, Southeast Asia | $8 | $19 |
| C | India, Nepal, Pakistan, Bangladesh, most of Africa | $5 | $12 |

Use the payment provider's country detection at checkout, not the IP alone, so a VPN doesn't break it.

### Later price experiments

- A **student price** that needs a verified `.edu` or university email: Pro at about half price.
- A **launch lifetime deal**, e.g. $79 for the first 500 buyers, with the same fair-use cap. It brings in cash and testimonials early; stop it before it becomes a cost problem.
- Raise tier A to **$15/month** once tailoring plus the match report demonstrably gets interviews.

---

## 7. Payments: which provider (founder based in Nepal)

Stripe doesn't support businesses based in Nepal, and PayPal doesn't operate there. So the choice is a **merchant of record** (MoR) that pays out to a Nepali bank, plus a local wallet for Nepali customers. An MoR sells to the customer for us and handles VAT and sales tax worldwide.

| Provider | Payouts to Nepal | Verdict |
| --- | --- | --- |
| **Dodo Payments** | ✅ Nepal is on its list of countries for merchant accounts and payouts (KYC with a Nepali ID) | **Use this for international customers.** MoR, subscriptions and one-time payments, cards, Apple Pay and Google Pay, prices shown in local currency |
| **Khalti** and/or **eSewa** | ✅ Local NPR wallets | **Use for Nepali customers** (the tier C price in NPR). Nepali dollar cards have low yearly limits, so most local users can't pay in USD |
| Paddle | ❓ Its seller country list is only visible to partners | Backup. Ask their sales team whether they onboard Nepal-based sellers and pay out by SWIFT |
| Lemon Squeezy | ❌ Nepal isn't on its bank payout list, and PayPal (its other payout route) isn't available in Nepal | Don't use |
| Polar, Stripe Billing | ❌ Both need a Stripe account in a supported country | Don't use |

**Before going live:**
1. Register the business (company or sole proprietorship) and get a PAN. Dodo's KYC and Khalti/eSewa merchant accounts both need it.
2. Open a business account at a Nepali bank that receives SWIFT transfers in USD. Dodo payouts land there and are converted to NPR under Nepal Rastra Bank rules.
3. Ask a Nepali chartered accountant about tax on software export income (there are concessional rates for IT exports) and how to report it.
4. Billing webhooks from Dodo and from Khalti/eSewa all update the same `subscriptions` table; the app only reads that table.

A later option, if the business grows: a US entity (for example through Stripe Atlas or Doola) unlocks Stripe, at the cost of US filing every year.

### Dodo setup (what the code expects)

Code: `lib/billing/` (Dodo client and the event rules), `app/api/webhooks/dodo/route.ts`, `lib/plan-actions.ts` (checkout and billing portal), migration `0003_billing.sql`.

1. **Products** (created in test mode): Pro monthly, $12 recurring, and the 3-month pass, $29 one-time. Purchasing power parity is off on both (one price everywhere). Put their ids in `DODO_PRO_MONTHLY_PRODUCT_ID` / `DODO_PRO_PASS_PRODUCT_ID`.
2. **Purchasing power parity:** off. Also switch it off in the business settings so new products don't inherit it.
3. **Webhook:** Developer → Webhooks → add `https://<your-domain>/api/webhooks/dodo` with the `subscription.*`, `payment.succeeded` and `refund.succeeded` events. Its secret goes in `DODO_PAYMENTS_WEBHOOK_KEY`. For local testing, expose port 3000 through a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`) and register that URL instead.
4. **Supabase:** apply `0003_billing.sql`, and set `SUPABASE_SECRET_KEY` (server only), which the webhook uses to write `subscriptions`.
5. **Going live:** create the same two products in live mode, then switch to the live API key, the live webhook secret and `DODO_PAYMENTS_ENVIRONMENT=live_mode`, and set `NEXT_PUBLIC_APP_URL`.

## 8. Rules we don't break

1. PDF download is never paywalled, watermarked or delayed.
2. Prices are on the landing page before signup. No "see pricing after you build".
3. Cancel is one click in the app, and Pro stays on until the end of the paid month.
4. The 3-month pass never auto-renews.
5. Running out of allowance never locks the resume. Editing and downloading keep working.
6. **No refunds** (decided 24 October 2026). Free has everything except volume, so people can judge Pro before paying. Say "payments aren't refunded" on the pricing page and at checkout, never only in the terms. A refund issued by hand in Dodo's dashboard still ends Pro through the webhook.

---

## 9. Open questions

- Is 3 free tailored resumes a month the right hook? Test 3 against 5: watch conversion and cost.
- Should the very first build be on Opus for Free users (best first impression, ~$0.70) or Sonnet (~$0.35)? Recommendation: Opus, since that's the "aha" moment, then measure.
- Do we gate the match report, or keep it free as a reason to try tailoring?
- Team or university plans (career centres buying seats) once there's traction.

## Measuring real costs

Once there's real traffic, replace the estimates in section 4 with:

```sql
select step, model, count(*) as runs,
       round(avg((meta->>'cost_usd')::numeric), 4) as avg_usd,
       round(percentile_cont(0.9) within group (order by (meta->>'cost_usd')::numeric)::numeric, 4) as p90_usd
from ai_runs
where ok and created_at > now() - interval '30 days'
group by step, model
order by step;
```

## Sources

- Payments: [Dodo Payments accepted countries](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories.md), [Lemon Squeezy supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [Paddle supported sellers](https://developer.paddle.com/partners/embed-billing/get-started/supported-sellers) (checked 24 October 2026)

- Claude model prices: Anthropic API pricing, as listed in the Claude API reference (October 2026).
- Teal: [Toolradar](https://toolradar.com/tools/teal-hq/pricing), [Scoutify review](https://scoutify.com/blog/teal-review), [Jobshinobi comparison](https://jobshinobi.com/compare/best-teal-alternative-2026)
- Rezi: [Rezi pricing](https://www.rezi.ai/pricing?via=bhavin), [Toolradar](https://toolradar.com/tools/rezi/pricing)
- Jobscan: [The Interview Guys review](https://blog.theinterviewguys.com/?p=10428), [Capterra](https://www.capterra.com/p/10016414/Jobscan/)
- Kickresume: [Kickresume help centre](https://kickresume.com/en/help-center/alternative-to-zety/), [Toolradar](https://toolradar.com/tools/kickresume/pricing)
- Zety: [Zety pricing](https://zety.com/pricing) (via the Codex review in USER_PROBLEMS.md)
