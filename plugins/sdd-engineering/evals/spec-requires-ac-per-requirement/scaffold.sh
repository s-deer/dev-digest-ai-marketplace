#!/usr/bin/env bash
# Creates a draft spec in which US-3 has no acceptance criterion.
# Runs only with: claude plugin eval . --scaffold
set -euo pipefail
mkdir -p specs src
cat > specs/2026-01-20-note-tags.md <<'SPEC'
# Note tags

- **Status:** draft
- **Date:** 2026-01-20
- **Scope:** notes module

## Summary
Users can label notes with tags and find notes by tag.

## Goals / Non-goals
**Goals:** add and remove tags on a note; find notes by tag.
**Non-goals:** tag colours, tag renaming, sharing tags between users.

## User stories
- **US-1** As a user, I want to add tags to a note, so that I can group related notes.
- **US-2** As a user, I want to remove a tag from a note, so that wrong labels do not stay.
- **US-3** As a user, I want to see all my notes that have a given tag, so that I can find a group of notes quickly.

## Acceptance criteria
- **AC-1** (US-1): When the user adds a tag to a note, the system shall show the tag on that note.
- **AC-2** (US-1): If the user adds a tag the note already has, then the system shall keep a single copy of the tag and report no error.
- **AC-3** (US-2): When the user removes a tag from a note, the system shall no longer show that tag on the note.

## Edge cases & errors
- **EC-1** Tag text that differs only in letter case is the same tag (covered by AC-2).

## Open questions
None.

## Traceability
| User story | AC | Edge case / NFR | Verification hint |
|---|---|---|---|
| US-1 | AC-1, AC-2 | EC-1 | unit |
| US-2 | AC-3 | — | unit |
| US-3 | — | — | — |
SPEC
cat > src/notes.ts <<'CODE'
export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
}
CODE
