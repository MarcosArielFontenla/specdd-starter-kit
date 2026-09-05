---
agent: specdd-foreman
enabled: false
triggers:
  - provider: github
    event: "issue_created"
---

# Issue to Draft PR

Prepare a reviewed draft pull request record without merge or deployment.

Start canonical workflow `issue-to-draft-pr` and follow its generated foreman instructions. This automation is intentionally disabled in Phase 4.
