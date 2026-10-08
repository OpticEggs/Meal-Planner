# Table — Free private hosting: research and comparison with paid Render

Researched 2026-10-08 (directive "B21/B22 Implementation Directive", Hosting section). **Desk research
only: nothing was signed up for, provisioned, deployed or paid.** Every provider fact below was read on
the provider's own page on 2026-10-08; the key ones were re-read independently in this session (marked
✔). Anything not confirmed from a primary page is marked **UNCONFIRMED**. Provider terms change — re-read
them before approving. The paid recommendation remains in `DEPLOYMENT.md` §2.

## 1. What "fit" means for Table (from the code, `DEPLOYMENT.md` §1)

A persistent Node 22 process (`next start`) with server-sent events and a 30 s recovery sweep; real
PostgreSQL 16 with session semantics (row locks, REPEATABLE READ, deferred constraints, triggers — **no
transaction-mode pooler**); sessions in PostgreSQL; ~171 MB for the Next process at light load (local
measurement, not a hosted peak); durable data with backups; an operator path for `member:create` /
`member:reset-password` (there is no public sign-up); HTTPS.

## 2. Candidates

| Option | Sleeping | PostgreSQL | Backups | Limits | Security / access | Reliability | Charge risk | Fit |
|---|---|---|---|---|---|---|---|---|
| **Oracle Cloud Always Free** — one Ampere A1 VM (or E2.1.Micro), Node + self-managed PostgreSQL 16 on it | None (always-on VM) — but **idle instances may be reclaimed** (below) | Full PostgreSQL 16, self-managed, no pooler | Do-it-yourself: nightly `pg_dump` to Always Free Object Storage (20 GB ✔) + an off-Oracle copy; 5 volume backups ✔ | A1: 1,500 OCPU-h + 9,000 GB-h/month = **2 OCPU / 12 GB** ✔; E2.1.Micro: two instances, 1/8 OCPU, 1 GB; 200 GB block storage ✔; 10 TB/month egress ✔; home region only ✔ | SSH; you patch the OS and PostgreSQL; private access via Tailscale (tailnet-only) or Cloudflare Tunnel + Access (needs a domain); no public inbound ports needed | No SLA for Free Tier (stated in Oracle's FAQ per the research pass; **this session's re-fetch got 403 — UNCONFIRMED here**); "out of host capacity" in popular regions | Card required for sign-up; "Your credit card will not be charged unless you upgrade your account" ✔ | **Meets every requirement; best free option** |
| **Home device** (an always-on computer you already own) + Tailscale | None | Full, self-managed | Do-it-yourself | The device's | Tailscale Personal: "$0", "Free forever", "Up to 6 users" ✔; site never on the public internet; both phones need the Tailscale app | Home power and internet; no SLA | None (electricity) | Meets requirements if such a device exists |
| **Render free web + Neon free Postgres** | Web spins down after 15 min without inbound traffic; ~1 min to wake ✔; "may restart at any time" | Neon direct endpoint (session semantics); the `-pooler` endpoint is transaction mode — **not usable**; PostgreSQL 16 availability **UNCONFIRMED** | Neon free: 6 h history (1 GB) ✔; otherwise DIY `pg_dump` | Neon: 1 GB/project, 100 CU-h/project, compute suspends after 5 min, 5 GB egress; over the CU-h → "suspends compute until the next billing period" ✔ | Render free: **no shell, no one-off jobs** ✔ (run operator scripts locally against the Neon URL); `onrender.com` URL, app login only | Render: "Do not use them for production applications" ✔ | Neon: no card ✔; Render card **UNCONFIRMED** | Works, but sleeps, thin backups, not-for-production terms |
| Render free web + Render free Postgres | as above | Free Postgres **expires 30 days after creation**, deleted after a 14-day grace ✔ | none on free | 1 GB | as above | — | — | **Disqualified** (data deleted) |
| Google Cloud e2-micro | None | Self-managed | DIY | 0.25 vCPU, 1 GB, 30 GB disk, 1 GB/month egress (North America) | SSH | No reclamation policy found | Billing account with a chargeable card required; an external IPv4 address appears billed (~$3.65/month) — **UNCONFIRMED** | Probably **not $0** |
| Koyeb free | Scales to zero after 1 h | Free Postgres: 5 compute-hours/month, 1 GB | — | 512 MB, 0.1 vCPU, 1 instance | — | — | card policy **UNCONFIRMED** | Database unusable for a 30 s sweep |
| Supabase free | — | 500 MB; direct connection IPv6-only (IPv4 needs a paid add-on); session pooler usable | "Not included" on free | projects "paused after 1 week of inactivity" | — | — | — | Weaker than Neon |
| Fly.io | — | Managed Postgres from $38/month | — | "New organizations don't have a free tier" | — | — | — | **Not free** |
| Railway, AWS, Azure | — | — | — | one-time or 6–12-month credits | — | — | — | **Trials, not free** |
| Northflank Sandbox | "Always-on-compute – no sleeping" | one database add-on | **UNCONFIRMED** | sizes "Limited" — **UNCONFIRMED** | — | "should not be used for production" | card required | Worth a closer look only if Oracle is rejected |

## 3. The best genuinely free option: Oracle Cloud Always Free (A1 VM)

**Shape:** one VM.Standard.A1.Flex in the home region, Ubuntu LTS, PostgreSQL 16 listening on
localhost only, `next start` under systemd, Tailscale Serve (or Cloudflare Tunnel + Access) for HTTPS,
unattended security updates, a nightly `pg_dump` to Object Storage plus a copy kept off Oracle.

**The material risk — idle reclamation** ✔: "Idle Always Free compute instances may be reclaimed by
Oracle", where idle means that over 7 days the 95th-percentile CPU is under 20 %, network under 20 % and
— for A1 shapes only — memory under 20 %. A two-person app is far below 20 % CPU and network.
- Whether "reclaimed" means stopped or deleted is not stated on the page. Community reports (2023) say
  stopped after a warning email, and that a Pay As You Go account is exempt — **UNCONFIRMED for 2026**.
  Table survives a stop (sessions and data are in PostgreSQL; recovery runs on start), but the site is
  down until someone restarts the VM.
- For A1 the three conditions must **all** hold, so a VM sized so that its real memory use stays above
  20 % (e.g. 1 OCPU with a small memory allocation, PostgreSQL's shared buffers sized to it) would not
  meet the memory condition. **This is a hypothesis, not a measured fact**: how Oracle measures memory
  (with or without cache) is not stated, and it must be observed on the host for 7+ days before relying
  on it. Generating artificial load to dodge the policy is not proposed.
- Account level (from Oracle's FAQ via the research pass): accounts "left idle for 30 days or more may
  be deemed abandoned" — what counts as activity is undefined (**UNCONFIRMED**).

**Other costs of "free":** you patch the OS and PostgreSQL; backups are yours to run and to test;
provisioning may hit "out of host capacity"; no SLA; a card is held (not charged unless you upgrade).

## 4. Comparison with the paid Render recommendation

| | Paid Render (`DEPLOYMENT.md` §2) | Oracle Always Free (A1) |
|---|---|---|
| Monthly cost | ≈ $13.30 + usage | **$0** (card on file, not charged unless upgraded) |
| Always-on process / SSE / sweep | yes (0.5 CPU, 512 MB) | yes (up to 2 OCPU / 12 GB) |
| PostgreSQL 16, session semantics | managed | self-managed, full control |
| Backups | point-in-time recovery (3 days) + 7-day logical exports, run by Render | DIY `pg_dump` + 5 volume backups; restore drill needed |
| Operator commands | Render shell (paid) | SSH |
| Private access | app login on a public URL (an access proxy needs a domain) | tailnet-only with Tailscale — stronger privacy |
| Patching | Render | **you** |
| Deploy overlap (D67) | ~60 s overlap, handled by the app | single VM: stop-start or a manual blue/green |
| Main risk | cost | idle reclamation, capacity, self-maintenance |
| Work before go-live | Blueprint exists (`deploy/render.yaml`) | new templates needed: systemd unit, PostgreSQL setup, Tailscale/Tunnel, backup timer, restore drill (none written yet) |

**Recommendation.** If $0 matters more than hands-off operation, Oracle Always Free with Tailscale is
the strongest free choice — but call it *fit* only after a hosted trial shows: provisioning succeeded;
HTTPS and sign-in through the private path; migrations; a backup **and a restore** from Object Storage;
memory over a week of real use; and whether Oracle flags the VM as idle. If an unexpected stop of the
site for a day is unacceptable, the paid Render setup remains the recommendation. Render free + Neon is
the only managed $0 route; its cold starts, missing shell and 6-hour history make it a fallback, not a
recommendation. Nothing is provisioned until the owner chooses and separately authorizes it.

## Sources (read 2026-10-08)
- Oracle: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm ✔ ·
  https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm ✔ · https://www.oracle.com/cloud/free/faq/
  (research pass; 403 on this session's re-fetch)
- Render: https://render.com/docs/free ✔ · https://render.com/docs/postgresql-backups · https://render.com/pricing
- Neon: https://neon.com/pricing ✔ · https://neon.com/docs/introduction/plans · https://neon.com/docs/connect/connection-pooling
- Tailscale: https://tailscale.com/pricing ✔ · https://tailscale.com/kb/1312/serve
- Google Cloud: https://docs.cloud.google.com/free/docs/free-cloud-features · https://cloud.google.com/vpc/network-pricing
- Koyeb: https://www.koyeb.com/docs/reference/instances · https://www.koyeb.com/docs/databases
- Supabase: https://supabase.com/pricing · https://supabase.com/docs/guides/platform/backups
- Fly.io: https://docs.fly.io/about/pricing · Railway: https://docs.railway.com/reference/pricing/free-trial ·
  AWS: https://aws.amazon.com/free/ · Azure: https://azure.microsoft.com/en-us/pricing/free-services ·
  Northflank: https://northflank.com/pricing
- Cloudflare: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/ ·
  https://blog.cloudflare.com/teams-plans (50 free users, 2020 — current limit UNCONFIRMED)
