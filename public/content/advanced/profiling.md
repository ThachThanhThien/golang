---
id: lesson-20
slug: profiling
title: "Profiling and Optimization with pprof"
level: advanced
order: 20
duration: 22
tags:
  - profiling
  - pprof
  - benchmarks
  - cpu
  - memory
summary: "Finding where a Go program actually spends time and memory — collecting CPU and heap profiles from benchmarks or a running server, exploring them with go tool pprof (top, list, web), and following the measure-profile-fix-remeasure loop instead of guessing."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Collect **CPU** and **heap** profiles from benchmarks and running servers.
- Explore profiles with **`go tool pprof`** (`top`, `list`, `web`).
- Use benchmarks with `-cpuprofile`/`-memprofile` to guide optimization.
- Follow the **measure → profile → fix → re-measure** loop.
- Know when to reach for the execution **tracer** instead.

# Why It Matters

The previous lesson's refrain was "measure, don't guess." **Profiling** is *how* you measure. Go has
excellent, built-in profiling: with a few lines or a single flag you can see exactly which functions
burn CPU or allocate memory, down to the line. This turns optimization from guesswork into a targeted
process — you fix the 5% of code responsible for 90% of the cost, and leave the rest clean and simple.

# Concept Explanation

### What a profile is

A **profile** is a statistical sample of your program's behavior. The two you'll use most:

- A **CPU profile** samples the call stack many times per second, showing where CPU time goes.
- A **heap (memory) profile** samples allocations, showing what allocates memory and how much.

There are also block, mutex, and goroutine profiles for specific concurrency questions.

### Profiling a benchmark

The easiest starting point: benchmarks can emit profiles directly.

```bash
go test -bench=. -cpuprofile=cpu.out -memprofile=mem.out
```

This runs your benchmarks and writes `cpu.out` and `mem.out` (plus the benchmark binary). Then explore:

```bash
go tool pprof cpu.out
```

### Profiling a running server

For a service, import the **`net/http/pprof`** package for its side effect; it registers handlers
under `/debug/pprof/` on the default mux:

```go
import _ "net/http/pprof" // registers /debug/pprof/ endpoints

// then run an HTTP server (even a separate, internal one)
go func() { log.Println(http.ListenAndServe("localhost:6060", nil)) }()
```

Collect a 30-second CPU profile from the live server:

```bash
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
# heap snapshot:
go tool pprof http://localhost:6060/debug/pprof/heap
```

Expose these endpoints only on a trusted, internal address — never publicly.

### Exploring with go tool pprof

Inside the interactive `pprof` prompt (or via flags), the essential commands:

- **`top`** — the functions consuming the most (CPU or memory), highest first. `top10` limits to ten.
- **`list Func`** — annotated source of `Func`, showing cost per line — where the time/allocations
  actually are.
- **`web`** — opens a visual call graph in your browser (needs Graphviz installed).
- **`peek Func`** — callers and callees of a function.

Two numbers in `top`: **flat** (time spent in the function itself) and **cum** (cumulative, including
functions it calls). High flat = the hot code is *here*; high cum but low flat = the cost is in what it
*calls*.

### The optimization loop

Optimization is a disciplined cycle:

1. **Measure** with a benchmark to get a baseline (`ns/op`, `allocs/op`).
2. **Profile** to find the hotspot (`top`, `list`).
3. **Fix** that one spot with the smallest change that helps.
4. **Re-measure** to confirm it actually improved — and didn't break anything.

Repeat only while the gains are worth the added complexity. Stop when the code is fast enough; don't
optimize past the point of usefulness.

### The execution tracer

For questions profiles can't answer — *why* is there latency, how are goroutines scheduled, where are
they blocked — use the **execution tracer**:

```bash
go test -trace=trace.out
go tool trace trace.out # opens an interactive timeline in the browser
```

The tracer shows goroutine scheduling, GC events, and blocking over time — ideal for diagnosing
concurrency and latency issues rather than raw CPU cost.

# Key Terminology

- **Profile** — a statistical sample of program behavior (CPU, heap, block, mutex, goroutine).
- **CPU profile** — where CPU time is spent, by call stack.
- **Heap/memory profile** — what allocates memory and how much.
- **`net/http/pprof`** — package exposing `/debug/pprof/` endpoints on a server.
- **`go tool pprof`** — the tool to analyze profiles (`top`, `list`, `web`).
- **flat vs cum** — cost in a function itself vs including its callees.
- **Execution tracer (`go tool trace`)** — a timeline of scheduling, GC, and blocking.

# Options and Trade-offs

| Question | Tool | Command |
| -------- | ---- | ------- |
| Where does CPU time go? | CPU profile | `go test -bench -cpuprofile` → `top`, `list` |
| What allocates memory? | Heap profile | `-memprofile` → `top`, `list` |
| Why is a request slow / blocked? | Execution tracer | `go test -trace` → `go tool trace` |
| Live production hotspot | `net/http/pprof` | `pprof http://.../debug/pprof/profile` |
| Which line is hot? | `list Func` | annotated source |

| Reading `top` | High flat | High cum, low flat |
| ------------- | --------- | ------------------ |
| Meaning | Hot code is in this function | Cost is in functions it calls |
| Action | Optimize this function | Follow the call chain down |

# Worked Example

The full loop on a slow string-building function:

```go
// slow.go
func Concat(parts []string) string {
	out := ""
	for _, p := range parts {
		out += p // allocates a new string every iteration
	}
	return out
}
```

```go
// slow_test.go
func BenchmarkConcat(b *testing.B) {
	parts := make([]string, 1000)
	for i := range parts {
		parts[i] = "x"
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = Concat(parts)
	}
}
```

```bash
$ go test -bench=BenchmarkConcat -benchmem -cpuprofile=cpu.out
# baseline: high ns/op and ~1000 allocs/op

$ go tool pprof cpu.out
(pprof) top
(pprof) list Concat   # points at the `out += p` line as the hotspot
```

The profile fingers `out += p`. Fixing it with a `strings.Builder`:

```go
func Concat(parts []string) string {
	var b strings.Builder
	for _, p := range parts {
		b.WriteString(p)
	}
	return b.String()
}
```

Re-running the benchmark shows far lower `ns/op` and `allocs/op`. The point isn't the specific numbers
(report them as "for this run") — it's that the profile told you *exactly* where to look instead of you
guessing.

# Real World Analogy

Profiling is like an **itemized utility bill for your program**. Before it, you know the total is too
high but not why — is it the heating, the lights, or something left running in the basement? The CPU
profile is the **breakdown line by line**: "kitchen: 60% of the bill." `list Func` is walking into that
room to find the **one appliance** that's the culprit. You fix that appliance, then read next month's
bill (re-measure) to confirm the savings — rather than randomly unplugging things and hoping.

# Examples

## Example 1 — Basic: profile a benchmark and read top

```bash
go test -bench=. -cpuprofile=cpu.out
go tool pprof -top cpu.out   # non-interactive: print the top functions
```

**Why this works:** `-cpuprofile` records where the benchmark spent CPU; `pprof -top` lists the
costliest functions immediately, giving you a ranked starting point without opening the interactive
prompt.

## Example 2 — Real-world: a live heap snapshot from a server

```go
import _ "net/http/pprof"

func main() {
	go func() { log.Println(http.ListenAndServe("localhost:6060", nil)) }()
	runServer() // your real service
}
```

```bash
go tool pprof http://localhost:6060/debug/pprof/heap
(pprof) top   # what is holding memory right now
```

**Why this works:** the blank import wires up `/debug/pprof/` endpoints; hitting the heap endpoint
gives a snapshot of current allocations, so you can diagnose a memory issue in a running service —
kept on `localhost` so it isn't exposed publicly.

## Example 3 — Pitfall: optimizing without profiling

```text
Developer belief:  "The JSON encoding must be the slow part — I'll hand-roll it."
Reality (profile): 85% of time is in a regexp compiled inside a loop.
```

**Why this bites:** effort spent hand-optimizing the wrong function yields little and adds complexity,
while the real hotspot (a regexp recompiled every call) goes untouched. A five-minute CPU profile would
have pointed straight at it. Profile *before* you optimize, every time.

# Common Mistakes

- **Optimizing without a profile.** You'll usually pick the wrong function.
- **Exposing `/debug/pprof/` publicly.** Keep it on a trusted internal address.
- **Reading only `flat` or only `cum`.** Use both to tell "hot here" from "hot in callees."
- **Trusting a single noisy run.** Profile realistic workloads; benchmark multiple times.
- **Using a CPU profile for a latency/blocking question.** Reach for the tracer instead.

# Best Practices

- Start from a **benchmark** so you have a repeatable baseline and can profile it directly.
- Use `top` to rank, then `list Func` to find the exact hot lines.
- Change **one** thing, then **re-measure** to confirm the win.
- For concurrency/latency puzzles, use `go tool trace`.
- Report results as measurements on a specific machine/version — never as universal claims.

# Summary

- A **profile** samples behavior; **CPU** and **heap** profiles are the workhorses (plus block/mutex/
  goroutine).
- Get profiles from **benchmarks** (`-cpuprofile`/`-memprofile`) or a live server via
  **`net/http/pprof`**.
- Analyze with **`go tool pprof`**: `top` to rank, `list` for per-line cost, `web` for a call graph;
  read **flat vs cum**.
- Follow the loop: **measure → profile → fix → re-measure**, stopping when it's fast enough.
- Use the **execution tracer** for scheduling, GC, and blocking questions.

# Flash Cards

Q: What is the difference between a CPU profile and a heap profile?
A: A CPU profile samples call stacks to show where CPU time is spent; a heap profile samples allocations to show what allocates memory and how much.

Q: How do you collect CPU and memory profiles from a benchmark?
A: Run `go test -bench=. -cpuprofile=cpu.out -memprofile=mem.out`, then analyze with `go tool pprof cpu.out` (or `mem.out`).

Q: What do `top` and `list Func` show in `go tool pprof`?
A: `top` ranks the costliest functions; `list Func` shows the annotated source of `Func` with cost per line, pinpointing the hot lines.

Q: In pprof output, what's the difference between "flat" and "cum"?
A: Flat is time spent in the function itself; cum is cumulative, including everything it calls — high flat means the hot code is right there, high cum with low flat means the cost is in its callees.

Q: How do you profile a running server, and what precaution applies?
A: Import `net/http/pprof` for its side effect to expose `/debug/pprof/` endpoints, then point `go tool pprof` at them — but keep those endpoints on a trusted internal address, never public.

Q: When should you use the execution tracer instead of a profile?
A: For questions about goroutine scheduling, GC events, blocking, and latency over time — things a statistical CPU/heap profile can't show — via `go test -trace` and `go tool trace`.

# Exercises

### Easy
Write a small benchmark for any function, run it with `-cpuprofile`, and use `go tool pprof -top` to
print the top functions. Identify the function with the highest flat time.

### Medium
Take the `Concat` example, benchmark it with `-benchmem`, profile it, use `list Concat` to find the hot
line, rewrite it with `strings.Builder`, and re-benchmark. Report before/after `ns/op` and `allocs/op`
for your run.

### Challenging
Add `net/http/pprof` to a small HTTP server that does some CPU work per request, drive it with a load
of requests, capture a 10-second CPU profile via the `/debug/pprof/profile` endpoint, and identify the
hottest function. Explain why exposing this endpoint publicly would be a mistake.

# Further Reading

- *Profiling Go Programs* (Go blog): <https://go.dev/blog/pprof>
- *Diagnostics* (official guide to profiling, tracing, debugging): <https://go.dev/doc/diagnostics>
- *`runtime/pprof`* — <https://pkg.go.dev/runtime/pprof> · *`net/http/pprof`* — <https://pkg.go.dev/net/http/pprof>
- *`go tool trace`* — <https://pkg.go.dev/cmd/trace>
