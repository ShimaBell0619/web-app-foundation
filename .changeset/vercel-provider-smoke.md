---
"web-app-foundation": patch
---

Harden the staging-only Vercel adoption contract: repository `git.deploymentEnabled` policy remains the source-controlled intent, but adoption now also requires provider-side Preview Branch Tracking inspection and a post-adoption smoke proving ordinary feature branches do not deploy while `staging` and `main` still do.
