# Human Review Workflow Specification

## Purpose

Defines the mandatory review process for extracted policies.

No policy may be published without review.

---

# Review Lifecycle

Uploaded

↓

Processing

↓

Review

↓

Approved

↓

Published

---

# Review Interface

The review interface shall contain two panels.

## Left Panel

Source Policy

Displays:

- Original document
- Page reference
- Extracted paragraph

---

## Right Panel

Extracted Rule

Displays:

- Rule type
- Extracted value
- Confidence score
- Status

---

# Reviewer Actions

## Approve

Accept extracted value.

---

## Modify

Update extracted value.

Store:

- AI value
- Reviewer value
- Reason

---

## Reject

Remove rule from policy version.

Reason required.

---

# Confidence Highlighting

High Confidence

95-100

Green

---

Medium Confidence

80-94

Amber

---

Low Confidence

Below 80

Red

---

# Version Comparison View

Reviewers shall be able to compare:

Current Version

vs

Previous Version

---

# Change Types

Added

Removed

Modified

---

# Change Presentation

Example:

Business Class Threshold

Version 4 = 8 Hours

Version 5 = 6 Hours

Status = Modified

---

# Review Completion Rules

A review cannot be completed until:

- All low confidence items reviewed
- All modified items saved
- Mandatory rules assessed

---

# Audit Requirements

Every review action must record:

- User
- Timestamp
- Original value
- Updated value
- Reason

Audit history is immutable.

---

# Publication Approval

Only approved policy versions may be published.

Publication generates a PolicyPublished event.