# release_stable.py

Promotes the `canary` branch to `stable` and restores the canary label in one automated step. Run it when canary is ready to ship to stable users.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Branch Model](#2-branch-model)
3. [Usage](#3-usage)
4. [Options](#4-options)
5. [What It Does — Step by Step](#5-what-it-does--step-by-step)
6. [Pre-flight Checks](#6-pre-flight-checks)
7. [The Label Swap](#7-the-label-swap)
8. [Examples](#8-examples)
9. [Common Errors](#9-common-errors)

---

## 1. Overview

`release_stable.py` lives at the root of the `pydeck-plugins` repo. It automates the full canary → stable promotion sequence:

1. Regenerates `manifest.json` with the stable label.
2. Commits that on `canary`.
3. Merges `canary` into `stable` (fast-forward only).
4. Pushes `stable`.
5. Switches back to `canary`.
6. Regenerates `manifest.json` with the canary label again.
7. Commits and pushes `canary`.

Every git command and file write is printed as it runs so you can see exactly what happened.

---

## 2. Branch Model

The catalog repo uses two long-lived branches:

| Branch | Label | Who uses it |
|:---|:---|:---|
| `canary` | `"Official · Canary"` | Users who opt in to early releases |
| `stable` | `"Official · Stable"` | Default install, production users |

The only difference between the two branches at any point in time is the `label` field in `manifest.json`. All plugin files and version folders are identical — `stable` is always a fast-forward of `canary`.

PyDeck shows the label as a badge next to each catalog source in the marketplace UI, so users can see which channel a plugin comes from.

---

## 3. Usage

```bash
python release_stable.py
```

Must be run from the repo root while on the `canary` branch with a clean working tree.

---

## 4. Options

| Flag | Default | Description |
|:---|:---|:---|
| `--stable-label TEXT` | `"Official · Stable"` | The label written into `manifest.json` before merging into stable. |
| `--canary-label TEXT` | `"Official · Canary"` | The label restored on canary after the merge. |
| `--dry-run` | off | Print every step without executing any git commands or writing any files. |

---

## 5. What It Does — Step by Step

```
canary  ──●──────────────●──────────●──▶
           │              │  stable   │
           │              └────merge──┘
           └── regenerate label "Stable"
                          ↑
               regenerate label "Canary"
```

### Step 1 — Set stable label on canary

Runs `generate_manifest.py --label "Official · Stable"`, rewriting `manifest.json` in-place with the stable label.

### Step 2 — Commit on canary

```
git add manifest.json
git commit -m "chore: set manifest label to Official · Stable"
```

### Step 3 — Merge canary → stable

```
git checkout stable
git merge canary --ff-only
```

The `--ff-only` flag ensures the merge is a clean fast-forward. If `stable` has diverged from `canary` for any reason the command fails and nothing is pushed.

### Step 4 — Push stable

```
git push origin stable
```

At this point PyDeck users on the stable channel see the updated plugins.

### Step 5 — Switch back to canary

```
git checkout canary
```

### Step 6 — Restore canary label

Runs `generate_manifest.py --label "Official · Canary"`, rewriting `manifest.json` with the canary label so canary-channel users still see `"Official · Canary"`.

### Step 7 — Commit and push canary

```
git add manifest.json
git commit -m "chore: restore manifest label to Official · Canary"
git push origin canary
```

---

## 6. Pre-flight Checks

The script aborts immediately if either of these conditions is not met:

| Check | Error message |
|:---|:---|
| Current branch is not `canary` | `ERROR: must be on 'canary' branch (currently on '<branch>')` |
| Working tree has uncommitted changes to tracked files | `ERROR: working tree has uncommitted changes — commit or stash them first.` |

Untracked files (new files not yet staged) do not block the release.

---

## 7. The Label Swap

The label matters because PyDeck displays it next to the catalog source in the marketplace. Having separate labels for canary and stable lets users tell which channel each plugin comes from when both catalogs are loaded simultaneously.

The swap must happen on `canary` before the merge — not after — so that the commit merged into `stable` already has the stable label. After the merge, the label is immediately restored on `canary` so the canary branch always shows `"Official · Canary"` regardless of when users fetch it.

---

## 8. Examples

### Preview the full release sequence without executing anything

```bash
python release_stable.py --dry-run
```

Output shows every git command that would run, prefixed with `$`, but nothing is actually executed.

### Release with default labels

```bash
python release_stable.py
```

### Release with custom labels

```bash
python release_stable.py \
  --stable-label "Official · Stable" \
  --canary-label "Official · Canary"
```

---

## 9. Common Errors

### `ERROR: must be on 'canary' branch`

Switch to canary before running:

```bash
git checkout canary
python release_stable.py
```

### `ERROR: working tree has uncommitted changes`

Commit or stash everything first:

```bash
git stash
python release_stable.py
git stash pop   # if you want to restore the stash after
```

Or commit pending changes:

```bash
git add .
git commit -m "chore: ..."
python release_stable.py
```

### `fatal: Not possible to fast-forward`

`stable` has commits that are not on `canary`. This should not happen in normal use. Inspect the divergence with:

```bash
git log stable..canary --oneline
git log canary..stable --oneline
```

If `stable` has commits that `canary` does not, those need to be cherry-picked onto `canary` before releasing.
