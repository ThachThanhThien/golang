# Go Course — Authoring Prompt & No-Hallucination Contract

This file is the contract for writing and maintaining the **Go (Golang)** course in this repo.
Every lesson and quiz must obey it. The goal: a beginner-friendly, **source-verified** course on the
Go language — the fundamentals, concurrency, the standard library, and building real programs — with
**zero invented facts**.

## Audience & voice

- **Suitable for everyone.** Assume the reader is new to Go and may be new to systems/backend
  programming. Define every term the first time it appears. Prefer short sentences and concrete
  examples.
- Explain the *why*, not just the *how*. Use **one plain-language analogy per lesson** (in the
  `# Real World Analogy` section).
- Be honest about limits and trade-offs. Go makes deliberate choices (no exceptions, no inheritance,
  a small feature set); explain the reasoning without overselling ("Go is the fastest", "always use
  channels"). Qualify claims and name the trade-offs.
- Keep code **minimal and runnable**. Prefer small, self-contained snippets that compile as-is.
  Every program you show as a full program should be valid Go: correct `package` clause, imports
  actually used, and a real `func main`. Show program output as a `text` fence when it aids
  understanding. When output depends on ordering that Go does not guarantee (map iteration,
  goroutine scheduling), say so.

## Currency & honesty

- Go is backward compatible under the **Go 1 compatibility promise**; code from Go 1.0 still
  compiles. Do **not** hard-code "the latest version is X", benchmark timings, or "fastest/best"
  claims as fixed facts. Say **"as of writing"** and link the current docs.
- When a feature is version-specific, name the version it **landed in** (these are stable, historical
  facts): generics/type parameters and `any` in **Go 1.18**; error wrapping (`%w`, `errors.Is`,
  `errors.As`) in **Go 1.13**; `min`/`max`/`clear` builtins in **Go 1.21**; per-iteration loop
  variables and `for i := range n` in **Go 1.22**; modules the default since **Go 1.16**. Do not
  attribute a feature to a version you are unsure of — omit the version instead.
- When you show a standard-library signature, it must match the **current** documented signature on
  <https://pkg.go.dev>. If unsure, link the package page rather than paraphrasing the signature.

## Authoritative sources (cite these; do not invent)

- **The Go Programming Language Specification** — <https://go.dev/ref/spec> (the authoritative
  language definition: types, statements, built-ins, conversions).
- **Effective Go** — <https://go.dev/doc/effective_go> (idiomatic style).
- **A Tour of Go** — <https://go.dev/tour/> (hands-on intro).
- **Standard library / package docs** — <https://pkg.go.dev/std> (every package: signatures,
  behavior, examples). Primary reference for `fmt`, `strings`, `io`, `errors`, `sync`, `context`,
  `net/http`, `encoding/json`, `testing`, `time`, `os`, `reflect`, `sort`, `slices`, `maps`.
- **The `go` command** — <https://go.dev/cmd/go/> · **Go Modules Reference** — <https://go.dev/ref/mod>.
- **The Go Memory Model** — <https://go.dev/ref/mem> (happens-before, synchronization, data races).
- **How to Write Go Code** — <https://go.dev/doc/code> · **Go FAQ** — <https://go.dev/doc/faq>.
- **The Go Blog** — <https://go.dev/blog/> (e.g. "Go Slices: usage and internals", "Error handling
  and Go", "Share Memory By Communicating").
- **The Go Programming Language**, Donovan & Kernighan (Addison-Wesley, 2015) — the canonical book.

If a claim isn't backed by one of these (or another primary source), don't write it. If unsure,
qualify it or leave it out.

## High-risk facts to get right (anti-hallucination checklist)

These are the classic places Go material goes wrong. Getting them right is the point of the course.

1. **Arrays are values; slices are references.** An array (`[3]int`) has a fixed size that is part of
   its type and is **copied** on assignment or when passed to a function. A **slice** is a small
   header `{pointer, length, capacity}` over a backing array; copying a slice copies the header but
   **shares** the backing array. Spec + "Go Slices: usage and internals" (Go blog).
2. **`append` may or may not reallocate.** When the backing array has spare capacity, `append` writes
   in place; when it doesn't, it allocates a new array and copies. Therefore you **must** use its
   return value: `s = append(s, x)`. Two slices over the same array can alias; appending to one can
   overwrite the other. A `nil` slice (`var s []int`) has length and capacity 0 and is ready to
   `append` to.
3. **Maps.** Iteration order is **randomized** by design — never rely on it. Reading a missing key
   returns the value type's **zero value**; use `v, ok := m[k]` to tell "missing" from "zero".
   Writing to a **nil** map **panics** (reading a nil map is fine). Maps are **not safe for
   concurrent use**; concurrent read/write can crash the program — use a `sync.Mutex` or `sync.Map`.
4. **Zero values, not "undefined".** Every declared variable has a defined zero value: `0`, `0.0`,
   `""`, `false`, and `nil` for pointers, slices, maps, channels, functions, and interfaces. There is
   no uninitialized memory.
5. **Strings are immutable UTF-8 bytes.** `len(s)` counts **bytes**, not characters. `s[i]` is a
   `byte`. `for i, r := range s` iterates **runes** (Unicode code points), with `i` the byte offset.
   Convert with `[]byte(s)`, `[]rune(s)`, `string(runes)`.
6. **`defer` evaluates arguments immediately; runs LIFO.** The deferred call's arguments are
   evaluated when `defer` executes, but the call runs when the surrounding function **returns**
   (including on `panic`), in last-in-first-out order. A deferred closure can modify **named** return
   values. `defer` inside a loop does not run until the function returns.
7. **Loop variable capture.** **As of Go 1.22**, each loop iteration has its own copy of the loop
   variable, so goroutines/closures capturing it behave as expected. **Before Go 1.22** the variable
   was shared, so a goroutine launched in a `for` loop would often observe the final value — the
   classic bug. State the version when you mention this.
8. **Pointers, receivers, and method sets.** Go has pointers but **no pointer arithmetic**. A **value
   receiver** operates on a copy; a **pointer receiver** can mutate the receiver and avoids copying.
   The method set of `T` includes value-receiver methods; the method set of `*T` includes both. So if
   a method has a **pointer receiver**, only `*T` (an addressable value) satisfies an interface that
   requires it — not a `T` value.
9. **Typed nil in an interface.** An interface value holds a **(type, value)** pair and is `nil` only
   when **both** are nil. Storing a nil concrete pointer (e.g. `var p *MyError = nil`) in an
   interface makes the interface **non-nil** (it has a type). This is why returning a nil `*MyError`
   as an `error` yields a non-nil error — always return a literal `nil` for "no error".
10. **Errors are values.** Idiomatic Go returns `error` as the last result and checks
    `if err != nil`. Create with `errors.New` / `fmt.Errorf`; wrap with `%w` (Go 1.13+) and inspect
    with `errors.Is` (sentinel match) and `errors.As` (type match). **`panic` is not for ordinary
    errors.** `recover` only works inside a **deferred** function.
11. **Goroutines & the `main` goroutine.** A goroutine is a lightweight thread managed by the Go
    runtime, started with `go f()`. When **`main` returns, the program exits** — it does not wait for
    other goroutines. Starting a goroutine does not guarantee it runs before the next statement.
12. **Channel rules (memorize).** Receiving from a **closed** channel returns the zero value
    immediately with `ok == false` (`v, ok := <-ch`). **Sending on a closed channel panics.**
    Closing a nil or already-closed channel panics. Send/receive on a **nil** channel blocks forever.
    Only the **sender** should close a channel, and only when done sending. `range ch` receives until
    the channel is closed. An **unbuffered** send blocks until a receiver is ready (a synchronization
    point); a **buffered** send blocks only when the buffer is full.
13. **The memory model & data races.** "Don't communicate by sharing memory; share memory by
    communicating" is a **slogan**, not the rule. The real rule (The Go Memory Model) is
    **happens-before**, established by channel operations, `sync.Mutex`, `sync.WaitGroup`,
    `sync.Once`, and `sync/atomic`. A **data race** — concurrent access with at least one write and no
    synchronization — has **undefined behavior**. Detect (don't rely on catching) with `go run -race`.
14. **`sync` basics.** A `sync.Mutex` zero value is an unlocked mutex; **don't copy** a mutex (or any
    `sync` type) after first use (`go vet` flags this). `sync.WaitGroup`: `Add` before starting the
    goroutine, `Done` inside it (usually via `defer`), `Wait` to block. `sync.Once.Do` runs its
    function exactly once.
15. **`select`.** Blocks until one case can proceed; if several are ready it chooses **one at
    random**; a `default` case makes it non-blocking. Common uses: timeouts (`time.After`),
    cancellation (`ctx.Done()`), and multiplexing channels.
16. **`context`.** `context.Background()` is the root; `context.TODO()` a placeholder.
    `WithCancel`/`WithTimeout`/`WithDeadline` return a context **and a `cancel` function you must
    call** (usually `defer cancel()`), even when the timeout already fired, to release resources.
    Pass `ctx` as the **first** argument; don't store it in a struct. `WithValue` is only for
    request-scoped data crossing API boundaries, with an **unexported key type** to avoid collisions.
17. **Generics (Go 1.18+).** Functions/types can take **type parameters** with **constraints**
    (`func Max[T cmp.Ordered](a, b T) T`). `any` is an alias for `interface{}`; `comparable` is the
    constraint for `==`/`!=`. **Methods cannot introduce their own type parameters.** Reach for
    generics to avoid duplicating code across types — not everywhere.
18. **Packages & modules.** A package is a directory of `.go` files with the same `package` clause;
    an executable is `package main` with `func main()`. **Exported** identifiers start with an
    **uppercase** letter. A **module** (`go.mod`) has a path, a Go version, and dependencies;
    `go.sum` records checksums. For **v2+**, the major version is part of the import path
    (`example.com/m/v2`). Modules are the default since **Go 1.16**; GOPATH mode is legacy.
19. **`iota`.** A constant generator that starts at 0 in each `const` block and increments by one per
    `ConstSpec` line — the idiomatic way to build enumerations.
20. **GC & escape analysis.** Go has a **concurrent, tri-color mark-and-sweep** garbage collector; as
    of writing it is **non-generational and non-compacting**. **Escape analysis** decides whether a
    value lives on the stack or the heap; you cannot force it, but you can observe decisions with
    `go build -gcflags=-m`. Do not promise specific pause times or numbers.
21. **`encoding/json`.** Only **exported** struct fields are marshaled/unmarshaled. Field names come
    from `json:"..."` tags (`omitempty`, `-`). Unmarshaling into `interface{}` yields
    `map[string]interface{}`, `[]interface{}`, `float64` for **all** numbers, `string`, `bool`, or
    `nil`. Unknown JSON fields are ignored by default.
22. **Testing.** Test files end in `_test.go`; tests are `func TestXxx(t *testing.T)`, run with
    `go test`. **Table-driven tests** with `t.Run` subtests are idiomatic. Benchmarks are
    `func BenchmarkXxx(b *testing.B)` looping `for i := 0; i < b.N; i++`, run with `go test -bench`.
    `Example` functions with an `// Output:` comment are compiled **and** verified.

## Lesson structure (every lesson, in this exact order)

Front-matter (YAML) with: `id` (`lesson-NN`), `slug`, `title`, `level`
(`beginner`|`intermediate`|`advanced`), `order` (1–24), `duration` (minutes), `tags` (**exactly 5**),
`summary` (one sentence). Then these H1 (`#`) sections **in order**:

1. `# Learning Objectives` — bulleted, "By the end… you will be able to…".
2. `# Why It Matters` — motivation in plain terms.
3. `# Concept Explanation` — the core, broken into `###` subsections.
4. `# Key Terminology` — bulleted **term — definition** list.
5. `# Options and Trade-offs` — a Markdown **table** comparing real choices.
6. `# Worked Example` — one guided example, usually a `text` trace or a small program.
7. `# Real World Analogy` — the single analogy for the lesson.
8. `# Examples` — `## Example 1` (basic), `## Example 2` (real-world), `## Example 3` (pitfall), each
   ending with a short "why this works / why this bites" note.
9. `# Common Mistakes` — bulleted.
10. `# Best Practices` — bulleted.
11. `# Summary` — bulleted recap.
12. `# Flash Cards` — **6** `Q:` / `A:` pairs (question line, then answer line).
13. `# Exercises` — `### Easy`, `### Medium`, `### Challenging`.
14. `# Further Reading` — links to the primary sources above, relevant to the lesson.

**Code fences** must use only: `go`, `bash`, `json`, or `text`. Nothing else (those are the languages
`src/core/prism.ts` highlights). Use `bash` for `go` commands and shell; `text` for program output,
`go.mod` files, directory trees, and error messages.

## Quiz rules (every quiz)

File `public/quizzes/lesson-NN.json` with `id` `quiz-lesson-NN`, `lessonId` `lesson-NN`,
`passingScore` `60`, and **5–6 questions** that together use **all five types** at least once across
the course, and a good mix within each quiz:

- `single-choice` — `options` `[{id,text}]` + `answer` (one option id).
- `multiple-choice` — `options` + `answer` (array of ids); make **two or more** correct.
- `fill-blank` — `answer` (array of accepted strings, compared case-insensitively after trim).
- `ordering` — `items` `[{id,text}]` + `answer` (ids in correct order).
- `match-pair` — `pairs` `[{left,right}]` (the pairing itself is the answer; no `answer` field).

Every question needs an `explanation`, and **every answer must be traceable to the lesson body** — do
not test facts the lesson didn't teach. Keep prompts unambiguous and options mutually exclusive.

## The manifest

`public/content/course-manifest.json` is **generated** from front-matter (id, slug, title, level,
order, duration, `file` = `<level>/<slug>.md`, summary, tags). It must contain **24** entries ordered
`order` 1–24 (8 beginner, 8 intermediate, 8 advanced). Regenerate it after any front-matter change so
it can't drift.
