---
id: lesson-19
slug: memory-and-performance
title: "The Memory Model, Escape Analysis, and Performance"
level: advanced
order: 19
duration: 22
tags:
  - memory-model
  - escape-analysis
  - gc
  - performance
  - allocations
summary: "How Go manages memory and where performance comes from — stack versus heap and the escape analysis that decides, the concurrent garbage collector and GOGC, the memory model's happens-before rules, and a measured, non-premature approach to reducing allocations."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain **stack vs heap** allocation and how **escape analysis** decides.
- Describe Go's **garbage collector** at a high level and what `GOGC` tunes.
- State the **memory model** rule (happens-before) that makes concurrent code correct.
- Reduce **allocations** with preallocation, reuse, and `sync.Pool` — when measurement justifies it.
- Approach performance work by **measuring first**, not guessing.

# Why It Matters

Go gives you the productivity of a garbage-collected language while still compiling to fast native
code. Understanding *where* memory lives (stack or heap), *how* the collector works, and *what*
actually causes allocations lets you write efficient code without fighting the runtime. Equally
important is discipline: most performance problems aren't where you'd guess, so the golden rule is
**measure, don't speculate** — a theme this lesson and the next (profiling) share.

# Concept Explanation

### Stack vs heap

Each goroutine has a **stack** for local variables; values there are cheap to allocate and freed
automatically when the function returns. The **heap** holds values that must outlive the function that
created them; heap memory is managed by the **garbage collector**.

You don't choose stack or heap — the compiler does, via **escape analysis**. If a value's lifetime is
confined to a function, it stays on the stack; if a reference to it "escapes" (is returned, stored in a
longer-lived structure, or captured by a goroutine), it's moved to the heap. You can *observe* the
decisions:

```bash
go build -gcflags=-m ./...
# prints lines like: ./main.go:10:9: &x escapes to heap
```

Returning a pointer to a local is perfectly safe in Go — unlike C — precisely because escape analysis
promotes that value to the heap and the GC keeps it alive as long as needed.

### The garbage collector

Go's GC is a **concurrent, tri-color mark-and-sweep** collector: it runs largely alongside your
program (not stopping it for long), finding unreachable objects and reclaiming them. As of writing it
is **non-generational and non-compacting**, and designed for **low latency** (short pause times)
rather than maximum throughput.

You don't manage memory, but one knob matters: **`GOGC`** (default `100`) controls how much the heap
may grow between collections — roughly, GC runs when the heap has grown by `GOGC` percent since the
last collection. A higher `GOGC` means fewer, larger collections (more memory, less CPU on GC); a
lower one means more frequent collections. Leave it alone unless profiling says otherwise. Avoid
promising specific pause numbers — they depend on version, workload, and hardware; say "as of writing."

### The memory model, briefly

When multiple goroutines share memory, the **Go memory model** defines when one goroutine is
guaranteed to see another's writes, using a **happens-before** relationship. Synchronization
operations establish it: sending on a channel *happens before* the corresponding receive completes; a
`sync.Mutex` unlock *happens before* a later lock; `sync.Once`, `WaitGroup`, and `sync/atomic` also
create ordering. Without such synchronization, concurrent access with a write is a **data race** and
has undefined behavior (see the concurrency lessons). The slogan "share memory by communicating" is
the practical shorthand; happens-before is the actual rule.

### Reducing allocations — after measuring

Allocations aren't free: they cost CPU and give the GC more to do. Common, safe reductions **once a
profile points here**:

- **Preallocate** slices and maps when the size is known: `make([]T, 0, n)` avoids repeated regrowth.
- **Reuse buffers** instead of allocating per iteration (e.g. a single `bytes.Buffer` or
  `strings.Builder`).
- **Avoid unnecessary pointer/interface boxing** in hot paths.
- **`sync.Pool`** caches and reuses temporary objects across goroutines for very hot allocation sites
  — a specialized tool, not a default.

Crucially, none of this should be applied blindly. Cleaner, simpler code usually wins; optimize only
the spots a benchmark or profiler proves are hot.

# Key Terminology

- **Stack / heap** — per-goroutine local storage / GC-managed storage for longer-lived values.
- **Escape analysis** — the compiler's decision about whether a value can stay on the stack.
- **Garbage collector (GC)** — concurrent tri-color mark-and-sweep; reclaims unreachable memory.
- **`GOGC`** — the setting controlling how much the heap grows between collections (default 100).
- **Memory model / happens-before** — the rules for when one goroutine sees another's writes.
- **`sync.Pool`** — a pool of reusable temporary objects to cut allocations in hot paths.
- **Allocation** — reserving heap memory; costs CPU and adds GC work.

# Options and Trade-offs

| Lever | Effect | Caution |
| ----- | ------ | ------- |
| Preallocate (`make([]T, 0, n)`) | Fewer regrowths/allocations | Only when size is known |
| Reuse a buffer | Avoids per-iteration allocation | Watch for accidental sharing/aliasing |
| `sync.Pool` | Reuses temporaries in hot paths | Adds complexity; objects may be GC'd anytime |
| Raise `GOGC` | Less GC CPU | More memory used |
| Lower `GOGC` | Less memory | More GC CPU/latency |
| Pointer vs value | Avoids copies / avoids heap escape | Depends on size and lifetime — measure |

The overarching trade-off: **optimization vs. clarity**. Simpler code is the default; spend complexity
only where measurement shows it pays.

# Worked Example

See escape analysis and preallocation in action with a benchmark comparison (measure, don't guess):

```go
package bench

// grows the slice without preallocating: repeated reallocation
func BuildNaive(n int) []int {
	var s []int
	for i := 0; i < n; i++ {
		s = append(s, i)
	}
	return s
}

// preallocates exact capacity: one allocation
func BuildPrealloc(n int) []int {
	s := make([]int, 0, n)
	for i := 0; i < n; i++ {
		s = append(s, i)
	}
	return s
}
```

```go
// bench_test.go
func BenchmarkNaive(b *testing.B)    { for i := 0; i < b.N; i++ { _ = BuildNaive(1000) } }
func BenchmarkPrealloc(b *testing.B) { for i := 0; i < b.N; i++ { _ = BuildPrealloc(1000) } }
```

Running `go test -bench=. -benchmem` reports `allocs/op` for each. `BuildPrealloc` typically shows far
fewer allocations because it reserves capacity once instead of regrowing the backing array many times.
The returned slice **escapes to heap** in both (it's returned), which `go build -gcflags=-m` confirms.
Report the exact numbers as "for this run on this machine," not as universal facts.

# Real World Analogy

Escape analysis is like a **coat check that decides where your coat goes based on how long you'll
need it**. If you're just stepping in for a minute, you hold your coat (stack) — trivial to grab and
go. If you're staying for the whole show, they hang it in the cloakroom (heap), and an attendant (the
GC) makes sure it isn't thrown out while you still need it and cleans up coats nobody claims.
Preallocation is **reserving the right number of hangers up front** instead of the attendant scrambling
to add hangers one at a time as the crowd grows.

# Examples

## Example 1 — Basic: observing an escape

```go
func newPoint() *Point {
	p := Point{X: 1, Y: 2} // p escapes: its address is returned
	return &p
}
```

Running `go build -gcflags=-m` prints something like `moved to heap: p`. **Why this works:** because a
pointer to `p` outlives `newPoint`, escape analysis places `p` on the heap so it stays valid — no
dangling pointer, unlike in C.

## Example 2 — Real-world: reuse a buffer in a hot loop

```go
func joinLines(lines []string) string {
	var b strings.Builder
	b.Grow(estimateSize(lines)) // preallocate the builder's capacity
	for _, ln := range lines {
		b.WriteString(ln)
		b.WriteByte('\n')
	}
	return b.String()
}
```

**Why this works:** one `strings.Builder` with a pre-grown buffer replaces repeated string
concatenation (which allocates a new string each time), cutting allocations dramatically for large
inputs — a change worth making when a profile shows string building is hot.

## Example 3 — Pitfall: premature optimization with sync.Pool

```go
// Reaching for sync.Pool before measuring — added complexity, unclear benefit
var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}

func handle() {
	buf := bufPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufPool.Put(buf)
	// ... if this path isn't actually hot, the pool just adds risk and complexity
}
```

**Why this bites:** `sync.Pool` helps only at genuinely hot allocation sites, and it adds real
complexity (objects can be reclaimed by the GC at any time, and misuse causes subtle bugs). Applying it
without a profile that fingers this allocation is premature — you pay in clarity for a benefit you
haven't confirmed. Measure first; optimize the proven hotspot.

# Common Mistakes

- **Guessing where the time/allocations go.** Profile and benchmark before optimizing.
- **Fearing to return pointers to locals.** Escape analysis makes it safe; the value goes to the heap.
- **Tuning `GOGC` blindly.** Change it only with data showing GC is the bottleneck.
- **Sharing a reused buffer unsafely.** A reused/pooled buffer must be reset and not retained
  elsewhere.
- **Quoting fixed GC pause numbers.** They vary by version and workload; qualify with "as of writing."

# Best Practices

- Write clear code first; optimize only the hotspots a **benchmark or profiler** identifies.
- Preallocate slices/maps and reuse builders/buffers when sizes are known or paths are hot.
- Rely on escape analysis; use `-gcflags=-m` to understand allocations when it matters.
- Use synchronization (channels, mutexes, atomics) to establish happens-before — never rely on luck.
- Report performance results as measurements on a specific machine and version.

# Summary

- Local values live on the **stack**; escaping values move to the **heap**, decided by **escape
  analysis** (`-gcflags=-m`).
- Go's **GC** is concurrent tri-color mark-and-sweep, low-latency, non-generational as of writing;
  **`GOGC`** trades memory for GC CPU.
- The **memory model** guarantees visibility through **happens-before**, established by
  synchronization.
- Cut allocations with **preallocation, buffer reuse, and (rarely) `sync.Pool`** — but only where
  measured.
- **Measure first**: clarity is the default; optimize proven hotspots.

# Flash Cards

Q: What decides whether a value is allocated on the stack or the heap in Go?
A: The compiler's escape analysis — if a value's references don't outlive the function it stays on the stack; if they escape, it moves to the heap.

Q: Is it safe to return a pointer to a local variable in Go?
A: Yes — escape analysis detects that the value outlives the function and allocates it on the heap, so there's no dangling pointer (unlike in C).

Q: What kind of garbage collector does Go use, and what does `GOGC` control?
A: A concurrent tri-color mark-and-sweep collector (low-latency, non-generational as of writing); `GOGC` controls how much the heap may grow between collections (default 100).

Q: What is the memory model's core guarantee, and how is it established?
A: Happens-before — one goroutine's writes are visible to another only when synchronization (channels, mutexes, `sync.Once`, atomics) orders them; otherwise it's a data race.

Q: What is the golden rule before optimizing Go code?
A: Measure first — profile and benchmark to find the real hotspots; most bottlenecks aren't where you'd guess, and clarity is the default.

Q: When is `sync.Pool` appropriate?
A: Only at genuinely hot allocation sites confirmed by profiling; it reuses temporary objects but adds complexity and its objects can be collected at any time.

# Exercises

### Easy
Write a function that returns a pointer to a local struct, then run `go build -gcflags=-m` and find the
line reporting that the value escaped to the heap. Explain why it escaped.

### Medium
Write `BuildNaive` and `BuildPrealloc` as in the worked example and benchmark both with
`go test -bench=. -benchmem`. Report the `allocs/op` for each (as of your run) and explain the
difference.

### Challenging
Take a function that builds a large string via `+=` in a loop, benchmark it, then rewrite it with
`strings.Builder` (with `Grow`). Compare `ns/op` and `allocs/op`, and write a short note on when this
optimization is worth the extra code and when it isn't.

# Further Reading

- *The Go Memory Model* — <https://go.dev/ref/mem>
- *A Guide to the Go Garbage Collector* — <https://go.dev/doc/gc-guide>
- *Effective Go* — Allocation with `new`/`make`: <https://go.dev/doc/effective_go#allocation_new>
- *`sync.Pool`* — <https://pkg.go.dev/sync#Pool>
