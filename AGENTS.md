# AGENTS.md

Vanilla JS/HTML/CSS Pac-Man clone. No build system, no `package.json`, no tests, no linter.
The project's purpose is learning **spec-driven development** (see `README.md`).

## Running

Open `src/index.html` directly in a browser (plain `<script>` tags, no server, no bundler).

## Architecture

- Files are loaded as classic scripts, **not ES modules** — order in `src/index.html`
  is mandatory: `maze.js` → `game.js` → `render.js` → `main.js`.
  Everything shares global scope; `game.js` depends on globals from `maze.js`
  (`MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`), `main.js` on `createGame/update/draw`.
  Do not add `type="module"` or `import`/`export` to a single file.
- `maze.js`: level geometry as 31 strings of 28 chars, parsed to numbers.
  Cell coords are (x, y) with origin top-left; `MAZE` is pristine and must not be mutated
  (`createGame` copies it into `game.grid` so eaten dots reset on restart).
- `render.js`: all canvas drawing; reads `game.grid`, never `MAZE`.
- `game.js`: state and rules only; no DOM access.
- Game speed is in **cells per frame** (`PACMAN_SPEED`, `GHOST_SPEED` in `game.js`),
  tied to `requestAnimationFrame` — not time-based.

## Spec workflow (the point of this repo)

- Skills are installed under `.agents/skills/` (`spec`, `spec-impl`) and locked in `skills-lock.json`.
- Specs live in `specs/NN-slug.md` (folder may not exist yet). A new spec starts in `Draft`;
  only the human sets it to `Approved`/`Aprobado`.
- `/spec-impl` creates a branch named `spec-NN-slug` from the spec filename and never
  commits on its own. Branch behavior is controlled by `specs/.spec-config.yml`
  (`AutoCreateBranch`, defaults to `true`).
- Never implement code during `/spec`, and never expand scope beyond the approved spec.

## Conventions

- Comments and UI text are in **Spanish**; match the language of the user's prompt.
- Style: spaces inside parentheses — `foo( bar )`, `if ( x )`, not `foo(bar)`.
