---
"web-app-foundation": patch
---

Fix the trusted Pages caller permission union so cleanup calls can start reusable publisher workflows while the cleanup job still runs with its narrower least-privilege token.
