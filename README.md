# Go Learning Portal

A **frontend-only** Go (Golang) course: read Markdown lessons, take quizzes, and track
your progress — all in the browser. No sign-up, no backend.

## What this is

The portal shell is built with React 19, Vite, TypeScript, React Router, Tailwind CSS v4,
`marked`, and PrismJS. It renders a **24-lesson curriculum** that takes you from "what is Go?"
through the language fundamentals — variables and types, functions, control flow, slices, maps and
structs, packages and modules — into the ideas that make Go distinctive — interfaces, errors as
values, and concurrency with goroutines and channels — and on to production topics: testing,
generics, the standard library, `context`, HTTP services, the memory model and performance,
profiling, reflection, distribution, and running services in production, ending in a concurrent CLI
capstone. Every lesson is written in plain, welcoming English and verified against primary sources
(see **Sources** below).

Progress, bookmarks, and quiz scores live in `localStorage` under `golang-learning-*` keys, so
nothing leaves your machine.

## Run it locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## How the content works

The app is **data-driven** — adding a lesson needs no code changes:

1. Write the lesson Markdown in `public/content/<level>/<slug>.md` with YAML front-matter
   (including a `summary`).
2. Add a quiz at `public/quizzes/lesson-NN.json`.
3. Regenerate `public/content/course-manifest.json` from the front-matter (the manifest is
   generated, so it can't drift).

> **Code fences** must declare one of the highlighted languages: `go` (the primary language),
> `bash` (the `go` command and shell commands), `json` (small config/data snippets), or `text`
> (program output, `go.mod` files, directory trees, error messages); see `src/core/prism.ts`.

## Curriculum

**Beginner — the language fundamentals:** what is Go? · installing Go & the toolchain ·
variables, constants & types · functions · control flow · arrays, slices & maps ·
structs & methods · packages & modules.

**Intermediate — what makes Go distinctive:** interfaces · errors · goroutines · channels ·
concurrency patterns (`select`, `sync`) · testing & benchmarks · generics · the standard library.

**Advanced — production Go:** context & cancellation · HTTP services with `net/http` · the memory
model & performance · profiling with pprof · reflection & struct tags · modules, versioning &
distribution · production services (config, logging, graceful shutdown) · a concurrent URL
health-checker capstone.

## Accuracy: no hallucination

Every definition, default, and claim is verified against primary sources. The per-lesson authoring
contract lives in `prompts/golang-authoring-prompt.md`.

**Sources:**

- **The Go Programming Language Specification** — <https://go.dev/ref/spec> — the authoritative
  definition of the language.
- **Effective Go** — <https://go.dev/doc/effective_go> · **A Tour of Go** — <https://go.dev/tour/>
  — idiomatic style and a hands-on introduction.
- **Standard library & package docs** — <https://pkg.go.dev/std> — the reference for every package.
- **Go Modules Reference** — <https://go.dev/ref/mod> · **The `go` command** —
  <https://go.dev/cmd/go/> — dependency management and tooling.
- **The Go Memory Model** — <https://go.dev/ref/mem> — the rules for concurrent access.
- **The Go Blog** — <https://go.dev/blog/> and **The Go Programming Language** (Donovan &
  Kernighan, Addison-Wesley) — canonical explanations and examples.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
`BASE_PATH=/<repo>/` and publishes `dist/` to GitHub Pages.

---

React 19 · Vite · TypeScript · React Router · Tailwind CSS v4 · marked · PrismJS ·
localStorage.
