# Claude Code — Hardy House App · First Session Prompt

Paste this entire file as your first message in Claude Code.
Delete this header line before pasting.

---

You are starting work on the **Hardy House Consulting App** — a unified Node.js + Express web application combining an interactive Sacred Geometry demo system, a ContextForge framework explainer, and a consulting portfolio.

**Before writing a single line of code, read these files in this order:**

1. `CLAUDE.md` — your complete operating instructions, stack rules, design system, and conventions
2. `project-scaffold.md` — the exact folder structure and file specifications
3. `tokens.css` — the design token system (CSS custom properties)

All three are in the project root. Do not proceed until you have read all three.

---

## Context you need to hold

This project is built by James Hardy — an AuHD (autistic/ADHD) Modern Workplace / Endpoint Engineering consultant at Avanade. He thinks in structures: Sacred Geometry is not decoration in this project, it is the actual architectural logic. **Team sizes are not hardcoded — they are dynamically calculated** using the `team-builder` skill's complexity formula (`domains × criticality × uncertainty → fibonacci_lookup()`) for the Fibonacci path, or derived from GCMT shape selection (Tetrahedron/Cube/Octahedron/Icosahedron/Dodecahedron/Tesseract) when geometry determines the team structure. Every agent role maps to a Platonic solid. The Tree of Life maps to the ContextForge agent coordination chain. Treat this framework as sacred — do not approximate, rename, or refactor geometry constants without understanding the math.

The source demo (`_source/hardy-house-app-demo.html`) is a working 911-line single-file proof of concept built in Claude.ai. It contains working Three.js implementations of:
- Hero canvas (nested Dodecahedron + Icosahedron + Octahedron + particles)
- Element Oracle (5 questions → Platonic solid assignment → CSS accent variable shift)
- Geometry explorer (5 Platonic solids, orbit controls, mode pills)
- FOL Decomposition (Flower of Life → Seed → Fruit → Metatron's Cube, 2D + 3D)
- Tree of Life (10 Sephiroth, 20 paths, click to reveal ContextForge mapping)
- Contact section (Torus geometry)

Your job is NOT to rewrite this demo. Your job is to scaffold a proper Node.js project that this demo will grow into, then migrate the demo's logic into the module structure.

---

## Session 1 — Scaffold only. No migration yet.

Run the **First Session Checklist** from `project-scaffold.md` (steps 1–20) in order. Stop after step 20. Do not begin migrating section content in this session.

Here is the checklist for reference:

```
[ ] 1.  Read CLAUDE.md, project-scaffold.md, tokens.css fully
[ ] 2.  npm init -y
[ ] 3.  Install runtime deps: express express-session
[ ] 4.  Install dev deps: nodemon jest supertest @playwright/test eslint
[ ] 5.  Create .gitignore (node_modules, .env, coverage/, playwright-report/)
[ ] 6.  Create .env from .env.example (generate a real SESSION_SECRET with crypto.randomBytes)
[ ] 7.  Scaffold ALL directories from project-scaffold.md — mkdir -p for every folder
[ ] 8.  Create empty placeholder files for every file listed in the scaffold
[ ] 9.  Copy tokens.css → public/css/tokens.css
[ ] 10. Copy _vendor/*.js → public/vendor/ (three, gsap, ScrollTrigger)
[ ] 11. Write server.js exactly as specified in project-scaffold.md
[ ] 12. Write routes/pages.js — GET / → res.sendFile views/index.html
[ ] 13. Write views/index.html — shell with nav, section divs, footer, imports
[ ] 14. Write public/js/utils/createRenderer.js — exactly as specified
[ ] 15. Write public/js/utils/router.js — hash router with lazy section loading
[ ] 16. Write public/js/utils/orbitControl.js — extracted from demo source
[ ] 17. Write public/js/elementState.js — read/write element from API + localStorage
[ ] 18. Write routes/api/element.js — GET + POST /api/element
[ ] 19. Write public/js/geometry/constants.js — PHI, SQ3H, FOL_R
[ ] 20. Run: npm run dev → confirm http://localhost:3000 returns the shell HTML
[ ] 21. git init && git add . && git commit -m "scaffold: project structure and server"
```

After step 21, stop and report:
- Which files were created
- What `npm run dev` output looked like
- Any issues encountered

Do not start Session 2 (geometry migration) until Session 1 is confirmed working and committed.

---

## File inventory in this package

```
CLAUDE.md                    ← Your primary operating instructions
project-scaffold.md          ← Folder structure + file specs + checklist
tokens.css                   ← Design token system

_source/
  hardy-house-app-demo.html  ← Working single-file demo (migration source)
  hardy-house-geometry.html  ← Geometry explorer (source for #geometry section)
  hardy-house-decomposition.html ← FOL demo (source for #decomposition section)
  hardy-house-variants.html  ← Brand studio (source for #variants section)
  demo-presentation.html     ← Presentation (source for #presentation section)
  phone-geometry.html        ← Phone explorer (source for #phonegeo section)
  phone-card.html            ← Business card (source for #contact section)

_docs/
  app-architecture.html      ← Information architecture and build plan
  next-steps-research.html   ← Technical feasibility research (Tree of Life, Sri Yantra, etc.)

_vendor/
  three.r128.min.js          ← Three.js r128 (copy to public/vendor/)
  gsap.3.12.2.min.js         ← GSAP 3.12.2 (copy to public/vendor/)
  ScrollTrigger.3.12.2.min.js ← GSAP ScrollTrigger (copy to public/vendor/)
```

---

## Critical rules — memorise before writing any code

1. **Never write `new THREE.WebGLRenderer()` directly.** Use `createRenderer()` from `utils/createRenderer.js`.
2. **Never hardcode a hex colour.** Every colour comes from `tokens.css` via `var(--accent)` or `var(--hh-gold)` etc.
3. **`preserveDrawingBuffer: true` on every renderer.** Already handled by `createRenderer()`.
4. **`parentElement.clientWidth` not `canvas.clientWidth`.** And always 80ms setTimeout after DOM mount.
5. **No `renderer.setSize(w, h, false)`.** The `false` breaks CSS sizing.
6. **Sacred geometry invariants:** `MET_EDGES` = 78, `FRUIT_IDX` = 13, `FOL_PTS` = 19. If you produce different counts, something is wrong.
7. **Element accent system:** Oracle sets `data-element` on `<html>`. All interactive accents use `var(--accent)`. Never hardcode `#C49A1F` for an interactive element.
8. **PHI = (1 + Math.sqrt(5)) / 2.** Import from `geometry/constants.js`. Never redefine it.

---

## Session roadmap (after Session 1)

- **Session 2:** Migrate `#geometry` section — Platonic solids explorer + mode pills
- **Session 3:** Migrate `#decomposition` section — FOL → Metatron → Solid extraction
- **Session 4:** Build `#home` — Breathing Circle + hero canvas + Element Oracle
- **Session 5:** Build `#tree` — Tree of Life interactive + PAOAL Torus
- **Session 6:** Build `#grow` — Phyllotaxis slider + L-system fractal tree
- **Session 7:** Build `#tree` (cont) — ContextForge Agent Graph
- **Session 8:** Migrate remaining sections + connect API routes + deploy to Render.com

Each session ends with a git commit. No session starts without the previous one committed.

---

Begin now. Read `CLAUDE.md` first.
