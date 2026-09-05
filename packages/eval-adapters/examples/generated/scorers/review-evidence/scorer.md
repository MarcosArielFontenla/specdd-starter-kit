---
name: "review-evidence"
description: "Review evidence classification"
agents:
  - "reviewer"
output: classification
labels:
  - value: "supported"
    description: "Concrete evidence supports the review conclusion"
    score: 1
  - value: "missing"
    description: "Evidence is missing or unsupported"
    score: 0
passingScore: 1
samplingRate: 25
model: "claude-4-5-haiku"
selfImprovement: false
---

Classify whether the review contains concrete acceptance-criteria evidence. Return exactly one declared label. Unsupported claims or absent evidence must be classified as missing. This classification is not execution of acceptance checks.
