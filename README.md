# Priyanshu Singh — Portfolio

Personal portfolio for the **AWS Student Builder Challenge**. Plain HTML/CSS/JS — no build step.

**Creative feature: "Try to break my agent"** — a live, in-browser miniature of a multi-agent support pipeline
(Guardrail → Supervisor → Investigator → Policy → Human approval → Resolver). Visitors request refunds, hit a
human-in-the-loop approval gate, or try prompt injection and cross-customer lookups and watch the pipeline stop them.
Hints: pulsing hero button, a "Break my agent" nav item, and a floating pill that follows you down the page.

## Run locally
```bash
python -m http.server 5180
# open http://localhost:5180
```

## Deploy on AWS Amplify Hosting
1. Create a GitHub repo and push this folder (`git init && git add . && git commit -m "portfolio" && git push`).
2. AWS Console → **AWS Amplify** → *Create new app* → **GitHub** → pick the repo and branch `main`.
3. Build settings: Amplify auto-detects `amplify.yml` (no build, publishes the repo root).
4. Save and deploy. Every `git push` redeploys; the site is served over HTTPS through Amazon CloudFront.
5. Copy the `https://main.<id>.amplifyapp.com` URL into your challenge submission.

## Structure
```
index.html        page markup and content
css/style.css     design system, layout, responsive rules
js/main.js        loader, smooth scroll (Lenis), reveals, cursor, network canvas
js/agent.js       the creative feature (agent pipeline simulation)
amplify.yml       Amplify build spec
SUBMISSION.md     draft write-up for the hackathon "Your project" page
```
