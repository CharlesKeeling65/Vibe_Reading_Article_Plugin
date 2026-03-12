# Zotero AI Reading Plugin MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Zotero plugin MVP that supports reader-side AI actions, item-pane insights, note persistence, repo binding, and a lightweight workspace.

**Architecture:** Use a TypeScript Zotero plugin skeleton with a thin addon entrypoint plus modular services under `src/`. Keep all Zotero-facing code in integration controllers, move orchestration to plain TypeScript services, and store cached plugin data in a local JSON-backed repository layer so most behavior is testable outside Zotero.

**Tech Stack:** TypeScript, Vitest, npm, Zotero plugin addon files, JSON file persistence, fetch-compatible HTTP clients.

### Task 1: Bootstrap project tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `addon/bootstrap.js`
- Create: `addon/manifest.json`
- Create: `addon/prefs.js`
- Create: `src/index.ts`
- Create: `src/core/plugin.ts`
- Create: `src/core/lifecycle.ts`
- Create: `src/core/logger.ts`
- Create: `src/types/zotero.d.ts`
- Test: `test/unit/core/plugin.test.ts`

**Step 1: Write the failing test**

Write a test that imports `plugin.startup()` and asserts it initializes lifecycle hooks and registers integration controllers in order.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/unit/core/plugin.test.ts`
Expected: FAIL because plugin modules do not exist yet.

**Step 3: Write minimal implementation**

Create the npm/TypeScript/Vitest scaffold, add addon entry files, and implement `plugin.startup()` / `plugin.shutdown()` with injectable dependencies.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/unit/core/plugin.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts addon src test
git commit -m "feat: bootstrap zotero plugin scaffold"
```

### Task 2: Implement settings and local storage

**Files:**
- Create: `src/constants/ids.ts`
- Create: `src/types/settings.ts`
- Create: `src/storage/db.ts`
- Create: `src/storage/schema.ts`
- Create: `src/integrations/settings/settingsStore.ts`
- Create: `src/integrations/settings/settingsPane.ts`
- Test: `test/unit/storage/db.test.ts`
- Test: `test/unit/settings/settingsStore.test.ts`

**Step 1: Write the failing tests**

Write tests that verify:
- storage initializes empty collections with default schema
- settings store returns defaults and persists partial updates

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/storage/db.test.ts test/unit/settings/settingsStore.test.ts`
Expected: FAIL because storage and settings modules are missing.

**Step 3: Write minimal implementation**

Add JSON-backed repositories and a settings store that merges persisted values with defaults.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/storage/db.test.ts test/unit/settings/settingsStore.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/constants src/storage src/integrations/settings src/types test/unit
git commit -m "feat: add local storage and settings store"
```

### Task 3: Implement paper and insight services

**Files:**
- Create: `src/types/paper.ts`
- Create: `src/services/paper/paperService.ts`
- Create: `src/services/paper/chunker.ts`
- Create: `src/services/paper/insightBuilder.ts`
- Create: `src/services/paper/sourceAnchor.ts`
- Create: `src/storage/paperRepo.ts`
- Test: `test/unit/paper/paperService.test.ts`
- Test: `test/unit/paper/insightBuilder.test.ts`

**Step 1: Write the failing tests**

Write tests covering:
- creating/fetching a paper record
- deriving selection context from page text
- building an insight pack from chunked text

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/paper/paperService.test.ts test/unit/paper/insightBuilder.test.ts`
Expected: FAIL because paper modules are missing.

**Step 3: Write minimal implementation**

Implement plain-text page chunking, cached paper records, and heuristic insight generation suitable for MVP fallback when no remote parser exists.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/paper/paperService.test.ts test/unit/paper/insightBuilder.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/paper.ts src/services/paper src/storage/paperRepo.ts test/unit/paper
git commit -m "feat: add paper parsing and insight services"
```

### Task 4: Implement chat, repo, workspace, and note pipelines

**Files:**
- Create: `src/types/chat.ts`
- Create: `src/types/repo.ts`
- Create: `src/types/workspace.ts`
- Create: `src/services/ai/llmClient.ts`
- Create: `src/services/ai/promptRouter.ts`
- Create: `src/services/ai/responseNormalizer.ts`
- Create: `src/services/chat/chatService.ts`
- Create: `src/services/chat/contextAssembler.ts`
- Create: `src/services/chat/intentClassifier.ts`
- Create: `src/services/repo/repoService.ts`
- Create: `src/services/repo/aligner.ts`
- Create: `src/services/workspace/workspaceService.ts`
- Create: `src/integrations/notes/noteWriter.ts`
- Create: `src/integrations/notes/annotationWriter.ts`
- Create: `src/storage/chatRepo.ts`
- Create: `src/storage/repoRepo.ts`
- Create: `src/storage/workspaceRepo.ts`
- Test: `test/unit/chat/chatService.test.ts`
- Test: `test/unit/repo/repoService.test.ts`
- Test: `test/unit/workspace/workspaceService.test.ts`

**Step 1: Write the failing tests**

Write tests verifying:
- chat context merges selection, insight, and repo context
- repo binding/index caching works
- workspace cards are appended and reordered correctly

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/chat/chatService.test.ts test/unit/repo/repoService.test.ts test/unit/workspace/workspaceService.test.ts`
Expected: FAIL because modules are missing.

**Step 3: Write minimal implementation**

Use dependency injection for LLM calls, keep repo indexing metadata-only, and persist chat/workspace data to local repositories.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/chat/chatService.test.ts test/unit/repo/repoService.test.ts test/unit/workspace/workspaceService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types src/services src/integrations/notes src/storage test/unit
git commit -m "feat: add ai orchestration and persistence services"
```

### Task 5: Implement Zotero integration controllers

**Files:**
- Create: `src/integrations/itemPane/insightSection.ts`
- Create: `src/integrations/itemPane/repoSection.ts`
- Create: `src/integrations/reader/selectionActions.ts`
- Create: `src/integrations/reader/contextMenu.ts`
- Create: `src/integrations/reader/toolbar.ts`
- Create: `src/integrations/reader/sidePanel.ts`
- Create: `src/ui/dialogs/askDialog.ts`
- Create: `src/ui/dialogs/bindRepoDialog.ts`
- Create: `src/ui/panels/chatPanel.ts`
- Create: `src/ui/panels/workspacePanel.ts`
- Test: `test/unit/integrations/selectionActions.test.ts`
- Test: `test/unit/integrations/insightSection.test.ts`
- Test: `test/unit/integrations/repoSection.test.ts`

**Step 1: Write the failing tests**

Write controller tests asserting they register with Zotero APIs and delegate to services with the expected payloads.

**Step 2: Run tests to verify they fail**

Run: `npm test -- test/unit/integrations/selectionActions.test.ts test/unit/integrations/insightSection.test.ts test/unit/integrations/repoSection.test.ts`
Expected: FAIL because controllers are missing.

**Step 3: Write minimal implementation**

Implement thin adapters around Zotero APIs, with safe no-op fallbacks when running outside Zotero.

**Step 4: Run tests to verify they pass**

Run: `npm test -- test/unit/integrations/selectionActions.test.ts test/unit/integrations/insightSection.test.ts test/unit/integrations/repoSection.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/integrations src/ui test/unit/integrations
git commit -m "feat: add zotero integration controllers"
```

### Task 6: Finish documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `docs/初步设想.md`
- Modify: `docs/初始架构.md`
- Modify: `docs/接口清单和模块骨架.md`

**Step 1: Write the failing verification step**

List the exact commands needed to validate the scaffold, unit tests, and packaging assumptions.

**Step 2: Run verification**

Run: `npm test`
Expected: PASS with all unit tests green.

**Step 3: Write minimal documentation updates**

Document implemented modules, remaining Zotero-runtime gaps, configuration, and next steps for real Zotero integration testing.

**Step 4: Re-run verification**

Run: `npm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: document zotero plugin mvp"
```
