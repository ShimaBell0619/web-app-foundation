---
"web-app-foundation": minor
---

BREAKING: make Fixed Staging the default Vercel hosted-review surface. Foundation Vercel consumers now disable automatic feature/PR Git deployments and allow only `main` (Production) and `staging` through repository-owned `git.deploymentEnabled` configuration. Add copyable generic/Vite SPA templates and contract validation for the policy.
