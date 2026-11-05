# Submission draft — "Your project"

Fill the bracketed parts after you deploy. Add screenshots of: the live site, the Amplify app overview,
the build/deploy log, and the domain/hosting settings.

## Title
Priyanshu Singh — a portfolio that tries to get hacked

## Creative feature
**Try to break my agent.** Visitors sign in (virtually) as a customer and talk to a miniature of my TicketPilot
system. A visible pipeline (Guardrail → Supervisor → Investigator → Policy → Human → Resolver) lights up per request.
They can get a refund, approve a high-value one as the human reviewer, or try prompt injection, someone else's order,
or an off-topic question — and see why each is stopped. It reveals how I think: least-privilege tools, server-side
rules, human approval, and guardrails that are tested rather than trusted. Hint: pulsing hero button, nav item and
floating pill.

## Site
Live URL: [https://main.xxxx.amplifyapp.com]
GitHub: [https://github.com/priyanshuu-x/portfolio]

## AWS services used
- **AWS Amplify Hosting** — connected to the GitHub repo, builds and deploys on every push to `main`.
- **Amazon CloudFront** — Amplify serves the site through a global CDN with HTTPS by default.
- [Add anything else you really use, e.g. Route 53 for a custom domain, or an AWS coding agent from the Day 2 guide.]

## What I learned
- [How Amplify's Git-based deploy flow works and how fast iteration became.]
- [What you learned about motion/performance on a static site — e.g. one canvas, no heavy frameworks.]

## Challenges
- Making a heavy-motion site stay readable and fast on phones (reduced layout effects, `prefers-reduced-motion`, sticky cards only on tall screens).
- Keeping the creative feature self-contained (no backend) so the live demo can never go down during judging.
- [Anything you hit during Amplify setup.]

## Checklist from the rules
- [ ] Public site loads at a live URL
- [ ] About Me, Skills/Tech Superpowers, Projects sections (all present)
- [ ] Creative feature works and has a visible hint
- [ ] GitHub repo link
- [ ] Project entry with screenshots, AWS services, learnings, challenges
- [ ] Original, unpublished site
