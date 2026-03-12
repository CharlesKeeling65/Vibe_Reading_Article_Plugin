# Skimming Reading Realignment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorient the plugin away from prompt-first demo behavior and toward a skimming-first reading workflow that helps users grasp paper structure, main claims, and decision points in minutes.

**Architecture:** Shift the product center from ad hoc prompts and alerts to a structured reading loop: `paper map -> guided skim surfaces -> focused drill-down -> result capture`. Keep Zotero as the host, but treat PDF reading as a staged navigation problem rather than a chat problem. The plugin should surface precomputed or fast-generated reading landmarks before asking the user to type anything.

**Tech Stack:** Zotero plugin bootstrap/runtime APIs, TypeScript service layer, reader event listeners, item pane sections, notes integration, lightweight local cache.

## Core UX Principle Added On 2026-03-12

Skimming landmarks must be visible inside the reading flow, not hidden in a separate summary pane. The plugin should identify `core sentences` and bind each one to a short `summary gloss` and optional `translation gloss`. These glosses should behave like annotation highlights:

- visibly attached to the source sentence
- listed in a dedicated annotation-style panel
- independently readable without losing the PDF context
- clickable to jump back to the exact sentence/page anchor

This means the product center is now:

`paper map -> core sentence highlights -> annotation panel glosses -> drill-down interaction -> reading trail`

## Editability Principle Added On 2026-03-12

`Skim Brief` and `Core Sentences` are not read-only AI output. They must be treated as an editable reading scaffold so the user can correct AI mistakes and reshape the skim model of the paper.

Required behaviors:

- `Skim Brief` blocks are editable in place
- `Core Sentences` can be added, edited, deleted, and retyped
- each record preserves provenance:
  - `source: ai | user`
  - `status: active | edited | removed`
  - `originalText`
  - `userText`
  - `editedAt`
- user edits are first-class data, not temporary UI state
- saved notes and later drill-down actions must prefer user-corrected content over raw AI output

### Task 1: Replace “ask anything” with “guided skim entry”

**Files:**
- Modify: `addon/bootstrap.js`
- Modify: `src/integrations/itemPane/insightSection.ts`
- Create: `src/services/skimming/skimmingBrief.ts`
- Test: `test/unit/skimming/skimmingBrief.test.ts`

**Intent:**
The first visible state should be a paper briefing, not a free-form prompt.

**Deliverable:**
- A compact skim card showing:
  - paper purpose
  - 3-5 key claims
  - recommended reading order
  - likely important figures/sections
- a first batch of core sentences that should be highlighted in-reader
- each skim block has an edit affordance

### Task 2: Build a “paper map” instead of isolated answers

**Files:**
- Create: `src/services/skimming/paperMapBuilder.ts`
- Modify: `src/types/paper.ts`
- Modify: `src/services/paper/insightBuilder.ts`
- Test: `test/unit/skimming/paperMapBuilder.test.ts`

**Intent:**
Vibero’s core is not chat; it is reducing the search cost of finding where meaning lives in the PDF.

**Deliverable:**
- A lightweight paper map:
  - abstract
  - intro problem statement
  - method spine
  - result highlights
  - limitation cues
- Each node links back to page/selection anchors.
- Each map node may emit one or more `core sentence anchors`.

### Task 2.5: Add annotation-style gloss layer for core sentences

**Files:**
- Create: `src/types/skimming.ts`
- Create: `src/services/skimming/coreSentenceExtractor.ts`
- Create: `src/services/skimming/glossBuilder.ts`
- Create: `src/integrations/reader/glossOverlay.ts`
- Create: `src/integrations/itemPane/glossPanel.ts`
- Test: `test/unit/skimming/coreSentenceExtractor.test.ts`
- Test: `test/unit/skimming/glossBuilder.test.ts`

**Intent:**
Core sentences should become visible navigation units. Users should be able to skim the paper by scanning highlighted claims and their glosses, without rereading full paragraphs.

**Deliverable:**
- For each detected core sentence:
  - source anchor
  - short summary gloss
  - optional Chinese translation gloss
  - type label such as `problem`, `claim`, `method`, `result`, `limitation`
  - editable provenance state
- Reader overlay:
  - visually highlight anchor text
  - click to open/expand gloss
- Gloss panel:
  - independent list view like annotation panel
  - click row to jump back to page and sentence
  - edit / delete / retype controls
  - `add core sentence` entry point

### Task 3: Turn Reader selection into “drill down from skim”

**Files:**
- Modify: `addon/bootstrap.js`
- Modify: `src/integrations/reader/selectionActions.ts`
- Create: `src/services/skimming/selectionDrilldown.ts`
- Test: `test/unit/skimming/selectionDrilldown.test.ts`

**Intent:**
Reader selection should not start from a blank question box. It should inherit context from the current skim state.

**Deliverable:**
- Reader popup actions:
  - `Explain in plain language`
  - `Why this matters`
  - `Relates to which core claim`
  - `Save to reading trail`
- If the selection overlaps a core sentence, the popup should foreground the linked gloss first.

### Task 4: Make note saving reflect reading progression

**Files:**
- Modify: `addon/bootstrap.js`
- Modify: `src/integrations/notes/noteWriter.ts`
- Create: `src/services/skimming/readingTrail.ts`
- Test: `test/unit/skimming/readingTrail.test.ts`

**Intent:**
Saved results should represent the user’s skim path, not a pile of unrelated QA snippets.

**Deliverable:**
- Saved note template:
  - skim summary
  - core sentence glosses
  - selected evidence
  - AI clarification
  - next reading step
- user-edited versions replace raw AI defaults in exported reading trail

### Task 5: Only then add deeper AI and code alignment

**Files:**
- Modify: existing `chat`, `repo`, and `workspace` services after Tasks 1-4 land

**Intent:**
Advanced features should plug into the skim-first scaffold rather than compete with it.

**Deliverable:**
- AI answers become subordinate to:
  - paper map
  - reading trail
  - source anchors

## Execution Order

### Phase A: Host-safe rebuild

- remove bootstrap demo behavior as product center
- keep only install/runtime-safe bootstrap responsibilities
- ensure all visible states move into supported Zotero panels or note flows

### Phase B: Selected Item Skim Brief

- generate `Skim Brief` from current item metadata plus available text
- render it in Item Pane
- allow in-place edit for each block
- persist edits locally

### Phase C: Core Sentences And Gloss Panel

- derive core sentences from skim brief
- show them in a dedicated panel
- support add / edit / delete / retype
- support click-to-jump using the best verified anchor available

### Phase D: Reader Drill-down

- selection action should resolve against skim brief and core sentences
- drill-down output should attach to reading trail, not appear as isolated QA

### Phase E: Reading Trail Note

- save skim brief, corrected core sentences, glosses, and drill-down results into a structured child note
- preserve user edits as the canonical interpretation layer
