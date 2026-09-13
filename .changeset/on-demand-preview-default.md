---
"web-app-foundation": minor
---

BREAKING: make explicit On-demand Vercel Preview the default hosted-review contract and move Fixed Staging to an optional fixed-origin profile. Hosted Preview validates the exact PR HEAD before a trusted publisher creates a content-identical synthetic deployment commit; Production and Release exact-SHA rules remain unchanged.

Add an explicit reusable-CI checkout source for exact-HEAD validation and provide credential-free Vercel Git Integration Preview automation with repository-writer authorization, per-PR synthetic branches, Vercel success-event correlation, real Preview URL feedback, and close cleanup.
