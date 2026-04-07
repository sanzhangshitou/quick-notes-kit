# Repository Guidelines

## Project Structure & Module Organization

`Quick Notes Kit` is an Electron desktop utility app built with Vue 3 and TypeScript.

- `src/main/`: Electron main-process code, tray behavior, IPC registration, and SQLite-backed services.
- `src/preload/`: typed bridge APIs exposed to the renderer through `contextBridge`.
- `src/renderer/src/`: Vue UI, page shells, shared types, and tool metadata.
- `src/renderer/src/components/tools/`: individual tools such as notes, TOTP, timestamp conversion, and data formatters.
- `build/`: platform packaging assets (`build/win`, `build/mac`, `build/linux`).
- `resources/`: runtime assets such as tray icons.
- `dist/` and `out/`: generated output; do not edit or commit generated artifacts.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies.
- `pnpm dev`: start Electron + Vite in development.
- `pnpm start`: preview the built app locally.
- `pnpm lint`: run ESLint checks.
- `pnpm typecheck`: run TypeScript checks for main and renderer code.
- `pnpm build`: type-check and build production bundles.
- `pnpm build:win`: package the Windows installer.

Run `pnpm lint` and `pnpm build` before opening a PR.

## Coding Style & Naming Conventions

- Use TypeScript for new code and Vue SFCs for renderer pages.
- Use 2-space indentation in `.ts`, `.vue`, `.json`, `.yml`, and `.md`.
- Use `PascalCase` for Vue component filenames, for example `LocalNotesTool.vue`.
- Use `camelCase` for variables, functions, and composable-style helpers.
- Keep Node/Electron access in `src/main/` or `src/preload/`; renderer code should use the typed preload API.
- Format with Prettier and keep ESLint warnings at zero.

## Testing Guidelines

No dedicated test framework is configured yet. Current validation is:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

If tests are added, prefer `*.test.ts` and place them near the feature or under `tests/`.

## Commit & Pull Request Guidelines

Git history in this workspace is not reliable enough to infer a project-specific convention. Use short imperative commit messages such as `Add JSON to PHP array converter`.

PRs should include a concise summary, linked issue or task when available, screenshots for UI changes, and the validation commands you ran.

## Security & Configuration Tips

This app stores notes and TOTP data locally in SQLite under Electron `userData`. Do not commit real secrets, exported backups, or generated databases. Review `electron-builder.yml` carefully before changing icons, installer behavior, or application metadata.
