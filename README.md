# Priyanshu Singh — Portfolio

Personal portfolio for the **AWS Student Builder Challenge**. Plain HTML, CSS and JavaScript. No build step, no backend.
Hosted on AWS Amplify Hosting.

## Highlights
- **Try to break my agent**: an in-browser miniature of a multi-agent support pipeline (guardrails, ownership checks, human approval).
- **Agent Tower**: a 3D CSS carousel of About, Skills, Projects and Contact that spins on scroll or drag.
- **Glass project stage**: three projects floating on a frosted-glass panel.
- Hero glass sculpture in WebGL (Three.js), smooth scrolling (Lenis).

## Run locally
```bash
python -m http.server 5180
# open http://localhost:5180
```

## Deploy (AWS Amplify Hosting)
Connect this repo in AWS Amplify, branch `main`, leave the build command empty and the output directory as `/`.
Each push to `main` redeploys.

## Structure
```
index.html        page markup and content
css/              style, glass, type, sky (theme), tower, stage, glance
js/main.js        loader, smooth scroll, reveals, cursor, network canvas, tilt
js/glass.js       WebGL glass hero
js/tower.js       3D tower and fly-out sheets
js/stage.js       glass project stage
js/agent.js       "Try to break my agent"
favicon.svg
```
