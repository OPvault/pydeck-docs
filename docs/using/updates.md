# Updating PyDeck

PyDeck runs from a git checkout, so updating means moving that checkout — either pulling a branch or checking out a release tag. **Settings → Updates** drives both, and can do it automatically in the background.

This page is about updating the **app**. Plugins and themes update separately through the [Marketplace](marketplace.md).

---

## Update modes

| Mode | What it does |
|:---|:---|
| **GitHub Release** (default) | Compares your version against the newest GitHub release and checks out that tag. |
| **Git Pull** | Runs `git pull origin <branch>` on a branch you choose. |
| **None** | Never updates on its own. Manual updates fall back to GitHub Release. |

Your current version comes from `release.json` at the root of the checkout, not from git.

### Git Pull mode

Pick the branch in the same panel — the list is populated from the remote's branches. If the checkout is on a different branch, PyDeck checks the chosen one out first.

!!! warning "Local edits will stop an update"
    A pull that hits a merge conflict is **aborted** (`git merge --abort`) and reported
    as an error rather than left half-applied. If you have modified files in the
    checkout, commit or stash them — otherwise every update attempt fails the same way.

---

## Automatic updates

Set a **check interval**: `15`, `30` (default), `60`, `120`, `360`, `720`, or `1440` minutes — or `0` to disable automatic checks entirely.

Two things run the check:

- **At startup**, if the interval has elapsed since the last check.
- **A background thread**, on the interval, for as long as PyDeck is running.

When an update is applied, PyDeck **restarts itself** to load the new code. If an automatic update fails, the error is kept and surfaced in the Updates panel rather than logged and forgotten.

---

## Updating manually

The panel has two buttons:

- **Check for updates** — reports whether one is available and what version. In Git Pull mode it reports how many commits you are behind instead of a version number.
- **Update now** — applies the update in the configured mode and restarts.

---

## Pinning a version

The **version selector** stays on one specific release instead of tracking the newest.

Choosing a release checks out that tag, sets the updater mode to **None**, and records the pin. While pinned:

- Automatic checks and background updates do not run.
- **Check for updates** reports no update, with a note that a version is pinned.
- **Update now** refuses with a `409`.

To resume updates, clear the pin by setting the version selector back to **None** and choosing an update mode again.

!!! tip "Pinning is the safe way to roll back"
    If a release breaks something for you, pin the previous one rather than manually
    checking out a tag — a manual checkout leaves the updater free to move you forward
    again on its next run.

---

## Where the settings live

All of it is in `~/.config/pydeck/core/config.json`:

| Key | Meaning |
|:---|:---|
| `app_updater_mode` | `none`, `git_pull`, or `github_release` |
| `app_updater_branch` | Branch used by `git_pull` |
| `app_updater_interval_minutes` | Check interval, `0` to disable |
| `app_updater_last_check` | Timestamp used for the interval cooldown |
| `version_selector_mode` | `none`, or `github_release` when pinned |
| `version_selector_pinned_version` | The pinned version |

Updating replaces the process in place (`os.execv`), so the service manager that started PyDeck — systemd, LaunchAgent, Task Scheduler — is not involved and does not need restarting.
