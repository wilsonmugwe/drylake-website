# DNS and domain recovery

**Registrar and DNS host:** Synergy Wholesale (reseller account held by Ben). Nameservers
`ns1.nameserver.net.au`, `ns2.nameserver.net.au`, `ns3.nameserver.net.au`. Domain on auto-renew
from a prepaid balance; registered 2026-10-02, next renewal 2027-10-02.

## Record snapshot (read from ns1.nameserver.net.au, 2026-10-06, zone serial 2026100604)

This table is the backup of the zone. Re-take it after every DNS change (W9).
DKIM key bodies are omitted (public, but long; copy from the vendor dashboard if rebuilding).

| Name | Type | Value | Serves |
|---|---|---|---|
| `drylake.com.au` | A | `216.198.79.1` | Vercel (site) |
| `www` | CNAME | `ce38cee7df6e9128.vercel-dns-017.com` | Vercel (308 to apex) |
| `drylake.com.au` | MX 0 | `drylake-com-au.mail.protection.outlook.com` | Microsoft 365 mail |
| `drylake.com.au` | TXT | `v=spf1 include:spf.protection.outlook.com -all` | SPF (M365) |
| `drylake.com.au` | TXT | `MS=ms29487669` | M365 domain verification |
| `drylake.com.au` | TXT | `google-site-verification=oODr6...` | Google Search Console (existing owner) |
| `autodiscover` | CNAME | `autodiscover.outlook.com` | Outlook setup |
| `selector1._domainkey` | CNAME | `selector1-drylake-com-au._domainkey.drylakepty.d-v1.dkim.mail.microsoft` | M365 DKIM |
| `selector2._domainkey` | CNAME | `selector2-drylake-com-au._domainkey.drylakepty.d-v1.dkim.mail.microsoft` | M365 DKIM |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:benedict@drylake.com.au` | DMARC (review 2026-10-20) |
| `clerk` | CNAME | `frontend-api.clerk.services` | Clerk frontend API |
| `accounts` | CNAME | `accounts.clerk.services` | Clerk account portal |
| `clkmail` | CNAME | `mail.nwbtfcfu4gkw.clerk.services` | Clerk email |
| `clk._domainkey` | CNAME | `dkim1.nwbtfcfu4gkw.clerk.services` | Clerk DKIM |
| `clk2._domainkey` | CNAME | `dkim2.nwbtfcfu4gkw.clerk.services` | Clerk DKIM |
| `send` | MX + TXT (SPF) | `send.forge.rmta.net` | Resend bounce/SPF |
| `rsend` | MX + TXT (SPF) | `rsend-apne1.forge.rmta.net` | Resend bounce/SPF (ap-northeast-1) |
| `resend._domainkey` | TXT | `p=<key>` | Resend DKIM |

Stripe uses no DNS records here.

## Failure modes and what to do

| Problem | Effect | Recovery |
|---|---|---|
| A record deleted or edited | Whatever it served stops (site, mail, sign-in, email sending) | Re-enter from the table above at Synergy; TTL 3600, so allow up to an hour |
| Domain expiry / lapsed prepaid balance | **Everything** stops at once | Top up the Synergy balance and renew; .au domains have a short grace period, act the same day |
| Synergy outage | DNS changes impossible; resolution usually continues from caches/secondaries | Wait. If prolonged, move nameservers to another host (Cloudflare) by entering this table there first, then changing NS at the registry |
| Account compromise | Records or transfer could be changed | Reset Synergy password, check transfer lock, compare the zone with this table |
| Vercel project re-created | Site domain needs re-verification | Add domains in Vercel, update the A/CNAME it shows |

## Not here

`drylake.au`, `drylakecare.com.au` and `spoonwise.com.au` are registered at the same account but
serve nothing for this app.
