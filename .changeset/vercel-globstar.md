---
"web-app-foundation": patch
---

Fix the staging-only Vercel branch policy so the catch-all uses slash-safe minimatch globstar `**`; ordinary branches such as `feature/foo` and `chore/...` no longer fall through to Vercel's default deployment-enabled behavior. Update validation and adoption guidance from real `auth-flow-lab` evidence.
