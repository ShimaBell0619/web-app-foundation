---
"web-app-foundation": minor
---

BREAKING: replace the separate Preview and Fixed Staging workflows with a single opt-in Hosted Review workflow triggered by exact `/preview` and `/staging` PR comments. Preserve exact-HEAD CI and Git ref leases, reject superseded Staging requests, and verify Vercel deployment READY against its API before notification. The new provider verification needs explicitly configured project-scoped Vercel credentials; no existing application is migrated automatically.
