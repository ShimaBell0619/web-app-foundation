---
"web-app-foundation": patch
---

Accept both `project.id` and `projectId` from Vercel's authenticated deployment API while rejecting conflicting identities. This fixes false rejection of legitimate READY notifications without relaxing project verification.
