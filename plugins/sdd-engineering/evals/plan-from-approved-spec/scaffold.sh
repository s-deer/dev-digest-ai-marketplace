#!/usr/bin/env bash
# Creates a tiny TypeScript project with one approved spec in the empty eval workspace.
# Runs only with: claude plugin eval . --scaffold
set -euo pipefail
mkdir -p specs src
cat > specs/2026-01-15-note-archive.md <<'SPEC'
# Archive notes

- **Status:** approved
- **Date:** 2026-01-15
- **Scope:** notes module

## Summary
Users can archive notes they no longer need without deleting them, and restore them later.

## Acceptance criteria
- **AC-1** (US-1): When the user archives a note, the system shall hide the note from the default note list.
- **AC-2** (US-1): When the user opens the archive view, the system shall list archived notes, newest archived first.
- **AC-3** (US-2): When the user restores an archived note, the system shall show the note in the default note list again.

## Non-functional requirements
- **NFR-1** Archiving or restoring a note shall not change its content or creation date.

## Edge cases & errors
- **EC-1** Archiving an already archived note leaves it archived and reports no error (covered by AC-1).
SPEC
cat > src/notes.ts <<'CODE'
export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
}

export class NoteStore {
  private notes = new Map<string, Note>();

  add(note: Note): void {
    this.notes.set(note.id, note);
  }

  list(): Note[] {
    return [...this.notes.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
CODE
cat > package.json <<'JSON'
{ "name": "notes", "private": true, "type": "module", "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit" } }
JSON
git init -q
git add -A
git -c user.name=eval -c user.email=eval@example.com commit -qm init
