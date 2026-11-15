# Egbe at the hackathon (Nov 15 2026)

Egbe is used only for go-to-market today. The security product and its customer
data stay on our own stack from day one, because enterprise buyers will require
SOC 2, data residency, SSO and a vendor we fully control. Moving accounts or
billing off Egbe later would be a migration we do not want.

## Egbe today (throwaway, demand validation)

1. Market research skill: ICP and pricing check (SaaS teams of 20 to 500 engineers
   with no AppSec hire). Output feeds the PRD.
2. Landing page on Egbe hosting: headline, 3 plan tiers, "Get a free scan" form
   (email + GitHub repo URL). Waitlist rows in the Egbe DB.
3. Optional Stripe preorder button (refundable deposit) to measure willingness to pay.
4. Ad test with Sundai credits + $10 welcome credit, hard budget cap: Google and
   LinkedIn ads on "dependabot alternative", "github security autofix".
5. Lead discovery + outreach: 50 CTOs at seed to Series B SaaS, email offering a
   free scan of one public repo.
6. Analytics: visits, form submits, deposits. These numbers are the business loop
   shown at the 20:00 demo.

## Not on Egbe

GitHub App, scanners, fix agent, sandbox test runner, customer accounts, billing,
findings DB, audit log. These live in the monorepo on our own cloud.
After the hackathon the landing page and waitlist export move to our own domain.
