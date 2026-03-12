# Vibero-like Zotero Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Zotero plugin that delivers a Vibero-like skimming-first reading workflow inside Zotero: paper map, core sentence glosses, reader drill-down, reading trail notes, paper-code alignment, and a lightweight workspace.

**Architecture:** Replace the template's demo-first startup path with a modular plugin runtime. Keep Zotero-facing code thin under `src/integrations/**`, move product logic into testable services under `src/services/**`, and persist plugin state with a local repository layer under `src/storage/**`. Treat Gemini as the default remote AI provider for multimodal extraction and gloss generation, with a provider abstraction that can later support OpenAI-compatible endpoints.

**Tech Stack:** TypeScript, zotero-plugin-toolkit, Zotero 7 item pane and reader integrations, local JSON-backed persistence, Mocha/Chai test runner from `zotero-plugin test`, Gemini API adapter, optional OpenAI-compatible chat adapters.

## Product Scope

The product center is:

`paper map -> core sentence highlights -> gloss panel -> drill-down actions -> reading trail -> paper-code alignment -> light workspace`

Explicit non-goals for the first implementation cycle:

- no infinite whiteboard
- no heavy AST or full repo semantic graph
- no full PDF re-layout engine
- no free-form chat as the first UI state

## Delivery Principles

- Keep startup code host-safe and restart-safe.
- Prefer official Zotero integration points over ad hoc DOM injection.
- Every AI artifact that affects reading flow must be editable and persist provenance.
- User edits become the canonical interpretation layer for later drill-down and export.
- Gemini is the default provider when multimodal interpretation is needed:
  - figure/image-aware summarization
  - visual layout-sensitive gloss generation
  - future screenshot-to-gloss expansion

## Target Repo Layout

```text
src/
  core/
    plugin.ts
    lifecycle.ts
    registry.ts
    logger.ts
  constants/
    ids.ts
    prompts.ts
  types/
    paper.ts
    skimming.ts
    chat.ts
    repo.ts
    workspace.ts
    settings.ts
  integrations/
    itemPane/
      insightSection.ts
      glossPanel.ts
      repoSection.ts
    reader/
      selectionActions.ts
      glossOverlay.ts
      contextMenu.ts
      toolbar.ts
    notes/
      noteWriter.ts
      annotationWriter.ts
      templates.ts
    settings/
      settingsStore.ts
      settingsPane.ts
  services/
    paper/
      paperService.ts
      insightBuilder.ts
      sourceAnchor.ts
    skimming/
      skimmingBrief.ts
      paperMapBuilder.ts
      coreSentenceExtractor.ts
      glossBuilder.ts
      selectionDrilldown.ts
      readingTrail.ts
    ai/
      providerRegistry.ts
      geminiClient.ts
      openaiCompatibleClient.ts
      promptRouter.ts
      responseNormalizer.ts
    chat/
      chatService.ts
      contextAssembler.ts
      intentClassifier.ts
    repo/
      repoService.ts
      repoIndexer.ts
      aligner.ts
    workspace/
      workspaceService.ts
      cardFactory.ts
  storage/
    db.ts
    schema.ts
    paperRepo.ts
    skimmingRepo.ts
    chatRepo.ts
    repoRepo.ts
    workspaceRepo.ts
test/
  unit/
```

## Core Data Models

### `src/types/paper.ts`

```ts
export interface PaperRecord {
  itemID: number;
  attachmentItemID?: number;
  zoteroKey: string;
  title: string;
  abstractNote?: string;
  doi?: string;
  pdfPath?: string;
  parseStatus: "idle" | "queued" | "done" | "error";
  insightStatus: "idle" | "queued" | "done" | "error";
  updatedAt: number;
}

export interface SourceAnchor {
  itemID: number;
  attachmentItemID?: number;
  page?: number;
  selectedText?: string;
  annotationKey?: string;
  bbox?: [number, number, number, number];
}

export interface PaperMapNode {
  nodeID: string;
  itemID: number;
  type: "abstract" | "problem" | "method" | "result" | "limitation";
  title: string;
  summary: string;
  anchors: SourceAnchor[];
  emittedCoreSentenceIDs: string[];
}
```

### `src/types/skimming.ts`

```ts
export interface SkimBrief {
  itemID: number;
  purpose: string;
  keyClaims: string[];
  readingOrder: string[];
  importantSections: Array<{ label: string; reason: string; anchors: SourceAnchor[] }>;
  generatedAt: number;
  updatedAt: number;
}

export interface CoreSentenceRecord {
  id: string;
  itemID: number;
  anchor: SourceAnchor;
  type: "problem" | "claim" | "method" | "result" | "limitation";
  source: "ai" | "user";
  status: "active" | "edited" | "removed";
  originalText: string;
  userText?: string;
  summaryGloss: string;
  translationGloss?: string;
  editedAt?: number;
}

export interface ReadingTrailEntry {
  id: string;
  itemID: number;
  kind: "skim-brief" | "core-sentence" | "selection-drilldown" | "user-note";
  title: string;
  content: string;
  sourceAnchors: SourceAnchor[];
  createdAt: number;
}
```

### `src/types/settings.ts`

```ts
export interface PluginSettings {
  provider: "gemini" | "openai-compatible";
  geminiApiKey?: string;
  geminiModel: string;
  geminiVisionModel: string;
  openAIBaseURL?: string;
  openAIApiKey?: string;
  openAIModel?: string;
  autoBuildInsightOnOpen: boolean;
  autoGenerateGlosses: boolean;
  saveReadingTrailAsChildNote: boolean;
  maxContextChars: number;
}
```

### `src/types/repo.ts`

```ts
export interface RepoBinding {
  itemID: number;
  repoURL: string;
  branch?: string;
  status: "unbound" | "bound" | "indexing" | "done" | "error";
  boundAt: number;
}

export interface RepoFileSummary {
  path: string;
  language?: string;
  summary: string;
  symbols?: string[];
}
```

## Milestones And Acceptance

### Milestone A: Runtime Skeleton Replaced

Acceptance:

- plugin starts without demo popups or example commands
- plugin registers only production controllers
- existing startup smoke test still passes
- new unit tests cover lifecycle composition

### Milestone B: Skim Brief And Paper Map Usable

Acceptance:

- selecting an item renders a real skim section in Item Pane
- skim brief persists and reloads for the same item
- paper map nodes include anchors back to the PDF context
- each skim block supports edit state

### Milestone C: Core Sentence Gloss Flow Working

Acceptance:

- core sentences appear in a dedicated panel
- clicking a gloss jumps to the best known source anchor
- edit/delete/add flows persist
- drill-down actions use edited text before original AI text

### Milestone D: Reading Trail Integrated

Acceptance:

- drill-down output is saved into reading trail entries
- child note export includes skim brief, corrected core sentences, and trail entries
- exported note is deterministic and readable

### Milestone E: Gemini-Backed Multimodal Insight

Acceptance:

- Gemini provider can generate skim brief and glosses
- prompt router can choose text-only or multimodal Gemini path
- provider failure falls back cleanly with explicit UI status

### Milestone F: Paper-Code Alignment And Workspace

Acceptance:

- repo binding metadata persists
- weak alignment returns top relevant files plus explanation
- workspace panel can hold cards sourced from paper or drill-down results

## Task 1: Replace Template Demo Startup With Product Runtime

**Files:**
- Modify: `src/hooks.ts`
- Create: `src/core/plugin.ts`
- Create: `src/core/lifecycle.ts`
- Create: `src/core/registry.ts`
- Create: `src/core/logger.ts`
- Modify: `src/addon.ts`
- Test: `test/unit/core/plugin.test.ts`
- Test: `test/unit/core/lifecycle.test.ts`

**Step 1: Write the failing tests**

Write tests asserting that runtime startup:
- initializes registry once
- registers integrations in a stable order
- does not call any `ExampleFactory`
- exposes shutdown cleanup handlers

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/core/plugin.test.ts test/unit/core/lifecycle.test.ts`
Expected: FAIL because runtime modules do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `createPluginRuntime()`
- `registerControllers()`
- `disposeControllers()`

Refactor `src/hooks.ts` so it delegates to runtime services instead of demo modules.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/core/plugin.test.ts test/unit/core/lifecycle.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/hooks.ts src/core src/addon.ts test/unit/core
git commit -m "refactor: replace template startup with plugin runtime"
```

## Task 2: Add Settings And Local Storage Foundation

**Files:**
- Create: `src/constants/ids.ts`
- Create: `src/types/settings.ts`
- Create: `src/storage/db.ts`
- Create: `src/storage/schema.ts`
- Create: `src/storage/skimmingRepo.ts`
- Create: `src/integrations/settings/settingsStore.ts`
- Create: `src/integrations/settings/settingsPane.ts`
- Test: `test/unit/storage/db.test.ts`
- Test: `test/unit/settings/settingsStore.test.ts`

**Step 1: Write the failing tests**

Write tests covering:
- schema bootstraps empty collections
- settings merge defaults with persisted values
- Gemini fields validate correctly
- repo and skimming collections round-trip through storage

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/storage/db.test.ts test/unit/settings/settingsStore.test.ts`
Expected: FAIL because storage and settings modules are missing.

**Step 3: Write minimal implementation**

Implement a local JSON-backed repository layer with collections for:
- `papers`
- `skimBriefs`
- `coreSentences`
- `readingTrail`
- `repoBindings`
- `workspaceCards`
- `settings`

Expose a settings pane that includes:
- provider selection
- Gemini API key
- Gemini model names
- fallback OpenAI-compatible fields

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/storage/db.test.ts test/unit/settings/settingsStore.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/constants src/types/settings.ts src/storage src/integrations/settings test/unit/storage test/unit/settings
git commit -m "feat: add storage and provider settings foundation"
```

## Task 3: Build Paper Service, Skim Brief, And Paper Map

**Files:**
- Create: `src/types/paper.ts`
- Create: `src/types/skimming.ts`
- Create: `src/services/paper/paperService.ts`
- Create: `src/services/paper/insightBuilder.ts`
- Create: `src/services/paper/sourceAnchor.ts`
- Create: `src/services/skimming/skimmingBrief.ts`
- Create: `src/services/skimming/paperMapBuilder.ts`
- Create: `src/storage/paperRepo.ts`
- Test: `test/unit/paper/paperService.test.ts`
- Test: `test/unit/skimming/skimmingBrief.test.ts`
- Test: `test/unit/skimming/paperMapBuilder.test.ts`

**Step 1: Write the failing tests**

Write tests verifying:
- current Zotero item metadata maps into `PaperRecord`
- skim brief can be built from metadata plus fallback extracted text
- paper map emits problem/method/result/limitation nodes with anchors
- skim brief edits overwrite generated content cleanly

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/paper/paperService.test.ts test/unit/skimming/skimmingBrief.test.ts test/unit/skimming/paperMapBuilder.test.ts`
Expected: FAIL because paper and skimming modules are missing.

**Step 3: Write minimal implementation**

Implement:
- text extraction helpers for the current item context
- heuristic skim brief builder for no-provider fallback
- paper map builder that derives a first structured reading scaffold

Store both generated and user-edited values.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/paper/paperService.test.ts test/unit/skimming/skimmingBrief.test.ts test/unit/skimming/paperMapBuilder.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/paper.ts src/types/skimming.ts src/services/paper src/services/skimming/skimmingBrief.ts src/services/skimming/paperMapBuilder.ts src/storage/paperRepo.ts test/unit/paper test/unit/skimming
git commit -m "feat: add paper service skim brief and paper map"
```

## Task 4: Render Item Pane Insight Section

**Files:**
- Create: `src/integrations/itemPane/insightSection.ts`
- Modify: `src/core/registry.ts`
- Modify: `src/hooks.ts`
- Test: `test/unit/integrations/insightSection.test.ts`

**Step 1: Write the failing test**

Write a controller test asserting:
- section registers with `Zotero.ItemPaneManager`
- section renders skim brief and paper map blocks
- edit actions delegate to skimming services

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/integrations/insightSection.test.ts`
Expected: FAIL because insight section does not exist.

**Step 3: Write minimal implementation**

Render:
- purpose
- key claims
- reading order
- important sections
- edit affordances

Do not add repo status or workspace controls yet.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/integrations/insightSection.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/integrations/itemPane/insightSection.ts src/core/registry.ts src/hooks.ts test/unit/integrations/insightSection.test.ts
git commit -m "feat: render skim insight section in item pane"
```

## Task 5: Add Core Sentence Extraction And Gloss Building

**Files:**
- Create: `src/services/skimming/coreSentenceExtractor.ts`
- Create: `src/services/skimming/glossBuilder.ts`
- Modify: `src/storage/skimmingRepo.ts`
- Test: `test/unit/skimming/coreSentenceExtractor.test.ts`
- Test: `test/unit/skimming/glossBuilder.test.ts`

**Step 1: Write the failing tests**

Write tests covering:
- extraction of candidate core sentences from paper map and skim brief
- provenance fields for AI-generated records
- user edits update `status`, `userText`, and `editedAt`
- gloss builder prefers user text over original text

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/skimming/coreSentenceExtractor.test.ts test/unit/skimming/glossBuilder.test.ts`
Expected: FAIL because extractor and gloss builder are missing.

**Step 3: Write minimal implementation**

Implement:
- candidate extraction heuristics
- gloss generation inputs
- persistence helpers for add/edit/delete/retype flows

Keep the model interface provider-agnostic.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/skimming/coreSentenceExtractor.test.ts test/unit/skimming/glossBuilder.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/skimming/coreSentenceExtractor.ts src/services/skimming/glossBuilder.ts src/storage/skimmingRepo.ts test/unit/skimming/coreSentenceExtractor.test.ts test/unit/skimming/glossBuilder.test.ts
git commit -m "feat: add core sentence extraction and gloss persistence"
```

## Task 6: Add Gloss Panel And Reader Overlay

**Files:**
- Create: `src/integrations/itemPane/glossPanel.ts`
- Create: `src/integrations/reader/glossOverlay.ts`
- Create: `src/integrations/reader/toolbar.ts`
- Modify: `src/core/registry.ts`
- Test: `test/unit/integrations/glossPanel.test.ts`
- Test: `test/unit/integrations/glossOverlay.test.ts`

**Step 1: Write the failing tests**

Write tests asserting:
- gloss panel lists core sentence records in stable order
- clicking a row resolves a source anchor jump
- overlay highlights active anchors and can refresh after edits

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/integrations/glossPanel.test.ts test/unit/integrations/glossOverlay.test.ts`
Expected: FAIL because panel and overlay modules are missing.

**Step 3: Write minimal implementation**

Implement:
- annotation-style list panel
- lightweight highlight overlay
- refresh hooks on item change and edit completion

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/integrations/glossPanel.test.ts test/unit/integrations/glossOverlay.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/integrations/itemPane/glossPanel.ts src/integrations/reader/glossOverlay.ts src/integrations/reader/toolbar.ts src/core/registry.ts test/unit/integrations/glossPanel.test.ts test/unit/integrations/glossOverlay.test.ts
git commit -m "feat: add gloss panel and reader overlay"
```

## Task 7: Add Provider Registry And Gemini Client

**Files:**
- Create: `src/services/ai/providerRegistry.ts`
- Create: `src/services/ai/geminiClient.ts`
- Create: `src/services/ai/openaiCompatibleClient.ts`
- Create: `src/services/ai/promptRouter.ts`
- Create: `src/services/ai/responseNormalizer.ts`
- Test: `test/unit/ai/providerRegistry.test.ts`
- Test: `test/unit/ai/geminiClient.test.ts`
- Test: `test/unit/ai/promptRouter.test.ts`

**Step 1: Write the failing tests**

Write tests verifying:
- provider registry returns Gemini by default
- Gemini request building supports text-only and multimodal modes
- prompt router picks multimodal Gemini for figure or screenshot-aware tasks
- response normalization returns content safe for notes and glosses

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/ai/providerRegistry.test.ts test/unit/ai/geminiClient.test.ts test/unit/ai/promptRouter.test.ts`
Expected: FAIL because AI provider modules are missing.

**Step 3: Write minimal implementation**

Implement:
- a provider abstraction with `generateText()` and `generateMultimodal()`
- Gemini adapter as the primary implementation
- OpenAI-compatible fallback adapter for future compatibility

Gemini prompt modes in scope:
- skim brief generation
- gloss generation
- figure/visual explanation preparation

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/ai/providerRegistry.test.ts test/unit/ai/geminiClient.test.ts test/unit/ai/promptRouter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/ai test/unit/ai
git commit -m "feat: add gemini-first provider abstraction"
```

## Task 8: Add Selection Drill-down Flow

**Files:**
- Create: `src/integrations/reader/selectionActions.ts`
- Create: `src/integrations/reader/contextMenu.ts`
- Create: `src/services/skimming/selectionDrilldown.ts`
- Create: `src/services/chat/chatService.ts`
- Create: `src/services/chat/contextAssembler.ts`
- Create: `src/services/chat/intentClassifier.ts`
- Create: `src/types/chat.ts`
- Test: `test/unit/skimming/selectionDrilldown.test.ts`
- Test: `test/unit/chat/chatService.test.ts`
- Test: `test/unit/integrations/selectionActions.test.ts`

**Step 1: Write the failing tests**

Write tests covering:
- selection actions resolve against skim brief and edited core sentences
- drill-down action types produce correct prompt intents
- controller hands off payload with item, page, selection, and anchor context

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/skimming/selectionDrilldown.test.ts test/unit/chat/chatService.test.ts test/unit/integrations/selectionActions.test.ts`
Expected: FAIL because drill-down modules are missing.

**Step 3: Write minimal implementation**

Implement four actions:
- `Explain in plain language`
- `Why this matters`
- `Relates to which core claim`
- `Save to reading trail`

Do not add free-form ask yet.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/skimming/selectionDrilldown.test.ts test/unit/chat/chatService.test.ts test/unit/integrations/selectionActions.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/integrations/reader/selectionActions.ts src/integrations/reader/contextMenu.ts src/services/skimming/selectionDrilldown.ts src/services/chat src/types/chat.ts test/unit/skimming/selectionDrilldown.test.ts test/unit/chat/chatService.test.ts test/unit/integrations/selectionActions.test.ts
git commit -m "feat: add skim-aware selection drilldown flow"
```

## Task 9: Add Reading Trail And Note Export

**Files:**
- Create: `src/services/skimming/readingTrail.ts`
- Create: `src/integrations/notes/noteWriter.ts`
- Create: `src/integrations/notes/annotationWriter.ts`
- Create: `src/integrations/notes/templates.ts`
- Test: `test/unit/skimming/readingTrail.test.ts`
- Test: `test/unit/notes/noteWriter.test.ts`

**Step 1: Write the failing tests**

Write tests verifying:
- reading trail appends deterministic entries
- note writer exports skim brief, corrected core sentences, and drill-down results
- export prefers edited user content over original AI text

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/skimming/readingTrail.test.ts test/unit/notes/noteWriter.test.ts`
Expected: FAIL because reading trail and note writer modules are missing.

**Step 3: Write minimal implementation**

Implement:
- reading trail repository methods
- child note template renderer
- annotation attachment helper for later extension

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/skimming/readingTrail.test.ts test/unit/notes/noteWriter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/skimming/readingTrail.ts src/integrations/notes test/unit/skimming/readingTrail.test.ts test/unit/notes/noteWriter.test.ts
git commit -m "feat: add reading trail and note export"
```

## Task 10: Add Repo Binding And Weak Paper-Code Alignment

**Files:**
- Create: `src/types/repo.ts`
- Create: `src/integrations/itemPane/repoSection.ts`
- Create: `src/services/repo/repoService.ts`
- Create: `src/services/repo/repoIndexer.ts`
- Create: `src/services/repo/aligner.ts`
- Create: `src/storage/repoRepo.ts`
- Test: `test/unit/repo/repoService.test.ts`
- Test: `test/unit/repo/aligner.test.ts`
- Test: `test/unit/integrations/repoSection.test.ts`

**Step 1: Write the failing tests**

Write tests covering:
- binding and unbinding repo metadata
- file summary indexing from mocked repo inputs
- alignment from method summary to top relevant files
- item pane section renders repo status and alignment action

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/repo/repoService.test.ts test/unit/repo/aligner.test.ts test/unit/integrations/repoSection.test.ts`
Expected: FAIL because repo modules are missing.

**Step 3: Write minimal implementation**

Implement weak alignment only:
- README summary
- top-level file summaries
- query-to-file matching
- explanation of why the file is relevant

Do not clone private repos or build symbol graphs yet.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/repo/repoService.test.ts test/unit/repo/aligner.test.ts test/unit/integrations/repoSection.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/repo.ts src/integrations/itemPane/repoSection.ts src/services/repo src/storage/repoRepo.ts test/unit/repo test/unit/integrations/repoSection.test.ts
git commit -m "feat: add repo binding and paper code alignment"
```

## Task 11: Add Lightweight Workspace

**Files:**
- Create: `src/types/workspace.ts`
- Create: `src/services/workspace/workspaceService.ts`
- Create: `src/services/workspace/cardFactory.ts`
- Create: `src/storage/workspaceRepo.ts`
- Create: `src/ui/panels/workspacePanel.ts`
- Test: `test/unit/workspace/workspaceService.test.ts`

**Step 1: Write the failing test**

Write tests verifying:
- workspace cards append and reorder correctly
- cards preserve source anchors
- cards can be created from skim brief, gloss, drill-down, and repo alignment outputs

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/workspace/workspaceService.test.ts`
Expected: FAIL because workspace modules are missing.

**Step 3: Write minimal implementation**

Implement a list-style workspace panel with:
- grouped cards
- reorder support
- source jump metadata

Do not build a freeform canvas.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/workspace/workspaceService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/workspace.ts src/services/workspace src/storage/workspaceRepo.ts src/ui/panels/workspacePanel.ts test/unit/workspace/workspaceService.test.ts
git commit -m "feat: add lightweight workspace panel"
```

## Task 12: Final Verification And Docs Refresh

**Files:**
- Modify: `README.md`
- Modify: `docs/初始架构.md`
- Modify: `docs/初步设想.md`
- Modify: `docs/接口清单和模块骨架.md`

**Step 1: Write the verification checklist**

List exact checks for:
- runtime startup
- item pane rendering
- gloss edit persistence
- drill-down note export
- Gemini configuration flow

**Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS with all added unit tests green.

**Step 3: Build and type-check**

Run: `npm run build`
Expected: PASS with no TypeScript errors.

**Step 4: Update docs**

Refresh the architectural docs so they match the implemented module names and milestone sequence.

**Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: refresh implementation architecture and verification"
```

## Manual Verification Scenarios

Run these after Milestones B-F land:

1. Open a paper item with a PDF attachment.
Expected: `Skim Brief` renders in Item Pane without entering text.

2. Trigger gloss generation.
Expected: core sentence list appears and clicking an item jumps to source context.

3. Edit a core sentence gloss.
Expected: edited value survives restart and is used by later drill-down.

4. Select a sentence in Reader and choose `Why this matters`.
Expected: answer references the skim context and can be saved to reading trail.

5. Export reading trail to note.
Expected: child note contains skim summary, corrected core sentences, and drill-down entries.

6. Bind a GitHub repo and run code alignment.
Expected: section shows repo status and returns relevant file summaries with rationale.

## Risk Register

- Zotero reader anchor APIs may be more limited than the plan assumes.
  Mitigation: allow degraded anchors using page plus selected text.

- Gemini multimodal inputs may be harder to source directly from reader content than from raw image assets.
  Mitigation: start with text-first Gemini calls and reserve visual inputs for figure screenshots later.

- Plugin-side local storage may need migration once data shapes stabilize.
  Mitigation: add `schemaVersion` in `src/storage/schema.ts` from the start.

- Repo indexing can become a scope trap.
  Mitigation: cap first release at metadata and file-summary alignment only.

## Execution Order Summary

1. Runtime skeleton
2. Settings and storage
3. Paper service and skim brief
4. Item pane insight section
5. Core sentences and gloss persistence
6. Gloss panel and overlay
7. Gemini-first provider layer
8. Selection drill-down
9. Reading trail and note export
10. Repo alignment
11. Workspace
12. Verification and docs
