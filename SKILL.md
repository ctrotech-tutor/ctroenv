# Documentation Verification & Completeness Skill

## Identity

This Skill exists to validate documentation against real implementation.

The objective is to make documentation trustworthy enough that users can
rely on it without opening source code.

Documentation must be evidence-based.

Source code is authoritative.

------------------------------------------------------------------------

## Success Criteria

Documentation is considered complete only when:

-   Public behavior matches implementation
-   Examples are validated
-   Exports are documented
-   Important capabilities are covered
-   Incorrect statements are removed
-   Confidence threshold is reached

Target thresholds:

-   Accuracy ≥ 9.5 / 10
-   Completeness ≥ 9.5 / 10

------------------------------------------------------------------------

## Operating Principles

### 1. Never Guess

If behavior cannot be proven:

Mark:

UNVERIFIED --- implementation confirmation required

Do not invent APIs.

### 2. Source Wins

Priority:

1.  Source implementation
2.  Public exports
3.  Type definitions
4.  Tests
5.  Examples
6.  Existing docs

### 3. Move Slowly

Audit one scope at a time.

Allowed scope:

-   One directory
-   One package
-   One feature
-   One module

Do not continue until current scope passes review.

------------------------------------------------------------------------

## Verification Workflow

### Discover

Inspect:

-   Structure
-   Entry points
-   Public exports
-   Internal organization

### Understand

Read:

-   Implementation
-   Types
-   Tests
-   Config
-   Examples
-   Build output

### Compare

Classify:

-   Covered
-   Missing
-   Incorrect
-   Outdated
-   Unclear

### Repair

Every change must include:

-   What changed
-   Why
-   Evidence
-   Suggested improvement

### Validate

Confirm:

-   Examples work
-   APIs align
-   Links resolve
-   Terminology consistent

------------------------------------------------------------------------

## Directory Audit Template

Directory: \[PATH\]

Status: PASS \| PARTIAL \| FAIL

Public Surface: \[...\]

Missing Docs: \[...\]

Incorrect Docs: \[...\]

Evidence: \[...\]

Actions: \[...\]

Confidence: \_\_/10

------------------------------------------------------------------------

## Final Repository Report

Produce:

-   Coverage %
-   Accuracy %
-   Missing sections
-   Incorrect sections
-   Structural recommendations
-   Release readiness

Only declare success after complete verification.
