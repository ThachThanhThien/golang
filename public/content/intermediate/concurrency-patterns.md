---
id: lesson-13
slug: concurrency-patterns
title: "Concurrency Patterns: select, sync, and Races"
level: intermediate
order: 13
duration: 24
tags:
  - select
  - sync
  - mutex
  - race-detector
  - worker-pool
summary: "Coordinating concurrent work — the select statement for multiplexing channels, timeouts and non-blocking operations, protecting shared state with sync.Mutex, understanding and detecting data races with the race detector, and the worker-pool pattern for bounded parallelism."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Use **`select`** to wait on multiple channels, add timeouts, and do non-blocking sends/receives.
- Protect shared state with **`sync.Mutex`** / **`sync.RWMutex`**.
- Define a **data race** and detect it with the **race detector** (`-race`).
- Decide between **channels** and **mutexes** for a given problem.
- Build a **worker pool** for bounded parallelism.

# Why It Matters

Real concurrent programs juggle several channels at once, need timeouts so they don't hang forever,
and sometimes must share state that channels alone don't fit. `select` and the `sync` package are the
tools for that. Just as important is understanding **data races** — the silent, nondeterministic bugs
that appear when goroutines touch the same memory without coordination — and the built-in detector
that finds them. Master these and you can write concurrent Go that's correct, not just fast.

# Concept Explanation

### select: waiting on multiple channels

A **`select`** blocks until one of its channel operations can proceed, then runs that case. If several
are ready, it picks **one at random** (preventing starvation):

```go
select {
case msg := <-ch1:
	fmt.Println("from ch1:", msg)
case ch2 <- 99:
	fmt.Println("sent to ch2")
}
```

Two powerful additions:

- A **`default`** case makes `select` **non-blocking** — if nothing else is ready, `default` runs
  immediately:

```go
select {
case v := <-ch:
	use(v)
default:
	// nothing available right now; don't block
}
```

- Combine with **`time.After`** for a **timeout**:

```go
select {
case res := <-work:
	fmt.Println("result:", res)
case <-time.After(2 * time.Second):
	fmt.Println("timed out")
}
```

`select` also pairs with `ctx.Done()` for cancellation, covered in the `context` lesson.

### Protecting shared state with a mutex

When goroutines must share mutable data (a counter, a cache), a **`sync.Mutex`** (mutual exclusion
lock) ensures only one goroutine touches it at a time:

```go
type Counter struct {
	mu sync.Mutex
	n  int
}

func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
}
```

Rules: the zero value of a `Mutex` is an unlocked, ready-to-use mutex; **don't copy** a mutex (or a
struct containing one) after first use — `go vet` flags this. For read-heavy data, a
**`sync.RWMutex`** allows many concurrent readers (`RLock`) or one writer (`Lock`). Also useful:
**`sync.Once`**, whose `Do(f)` runs `f` exactly once no matter how many goroutines call it.

### Data races and the race detector

A **data race** happens when two goroutines access the same memory **concurrently**, at least one
access is a **write**, and there's no synchronization ordering them. Races are **undefined
behavior** — results can be wrong, corrupted, or crash — and they're nondeterministic, so they may
hide in testing and strike in production.

Go ships a **race detector**. Run your program or tests with `-race`:

```bash
go test -race ./...
go run -race main.go
```

It instruments memory accesses and reports the exact conflicting operations. It only finds races on
code paths that actually execute, so run it against realistic workloads and tests. **Don't rely on a
race not being reported as proof there's none** — but a report is always a real bug to fix.

### Channels vs mutexes

Both coordinate goroutines; pick by the shape of the problem:

- Prefer **channels** when you're **passing ownership of data** or orchestrating a pipeline/stages —
  "share by communicating."
- Prefer a **mutex** when goroutines **share access to some state** (a counter, a map, a cache) and a
  channel would be awkward.

Neither is universally right; the Go team's own advice is to use whichever makes the code clearest.

### The worker pool

A **worker pool** runs a fixed number of goroutines that pull jobs from a channel — bounding
parallelism so you don't spawn unlimited goroutines:

```go
func pool(jobs <-chan int, results chan<- int, workers int) {
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs { // each worker pulls jobs until the channel closes
				results <- j * j
			}
		}()
	}
	wg.Wait()
	close(results)
}
```

The producer sends jobs and closes the `jobs` channel; workers drain it; a `WaitGroup` waits for all
workers before closing `results`.

# Key Terminology

- **`select`** — waits on multiple channel operations; runs one ready case (random if several).
- **`default` case** — makes `select` non-blocking.
- **`time.After`** — a channel that fires after a duration; used for timeouts.
- **`sync.Mutex` / `RWMutex`** — locks for exclusive / reader-writer access to shared state.
- **`sync.Once`** — runs a function exactly once across goroutines.
- **Data race** — unsynchronized concurrent access with at least one write; undefined behavior.
- **Race detector** — the `-race` tool that reports actual races at runtime.
- **Worker pool** — a fixed set of goroutines consuming jobs from a channel.

# Options and Trade-offs

| Problem | Reach for | Rather than |
| ------- | --------- | ----------- |
| Wait on several channels | `select` | Nested goroutines |
| Don't block if nothing's ready | `select` + `default` | Polling with sleeps |
| Bound how long you wait | `select` + `time.After` | Hoping it returns |
| Shared counter/cache | `sync.Mutex` | An awkward channel dance |
| Read-mostly shared data | `sync.RWMutex` | A plain `Mutex` (over-serializes reads) |
| One-time initialization | `sync.Once` | A boolean flag (racy) |
| Limit parallelism | Worker pool | One goroutine per job unbounded |

# Worked Example

A worker pool that squares numbers with three workers:

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	var wg sync.WaitGroup
	for w := 0; w < 3; w++ { // three workers
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				results <- j * j
			}
		}()
	}

	for i := 1; i <= 5; i++ { // produce jobs
		jobs <- i
	}
	close(jobs) // tell workers no more jobs

	go func() { wg.Wait(); close(results) }() // close results once workers finish

	sum := 0
	for r := range results {
		sum += r
	}
	fmt.Println("sum of squares:", sum)
}
```

Output:

```text
sum of squares: 55
```

Three workers share the `jobs` channel, so at most three squares are computed at once. Closing `jobs`
ends each worker's `range`; a helper goroutine closes `results` after `wg.Wait()`, letting `main`'s
`range` finish.

# Real World Analogy

`select` is like a **short-order cook watching several tickets at once**: whichever order is ready
first, that's the one they act on; if two are ready together they just grab one. `time.After` is the
**kitchen timer** that also counts as a "ticket" — if it dings before any food is ready, the cook
gives up on waiting. A `Mutex` is the **single key to the supply closet**: only the person holding it
can go in, so two cooks never grab the last bag of flour simultaneously (a data race). And a worker
pool is **hiring exactly three line cooks** instead of one per order — enough to keep up, without a
hundred cooks crammed into the kitchen.

# Examples

## Example 1 — Basic: a timeout with select

```go
func fetchOrTimeout(work chan string) string {
	select {
	case v := <-work:
		return v
	case <-time.After(500 * time.Millisecond):
		return "timeout"
	}
}
```

**Why this works:** `select` waits for whichever fires first — the real result or the timer. It
guarantees the function returns within about half a second instead of blocking indefinitely.

## Example 2 — Real-world: a mutex-guarded counter under load

```go
type SafeMap struct {
	mu sync.Mutex
	m  map[string]int
}

func (s *SafeMap) Add(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[key]++ // safe: only one goroutine mutates the map at a time
}
```

**Why this works:** maps aren't concurrency-safe, so the mutex serializes writes. Locking around the
map turns a crash-prone shared map into a safe one; `defer Unlock` guarantees the lock is released
even if the body returns early.

## Example 3 — Pitfall: a data race on a shared counter

```go
var n int
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
	wg.Add(1)
	go func() { defer wg.Done(); n++ }() // RACE: unsynchronized writes to n
}
wg.Wait()
fmt.Println(n) // often < 1000, and 'go run -race' reports the race
```

**Why this bites:** `n++` is read-modify-write; without a lock or atomic, concurrent increments
overwrite each other, so the total is wrong and the behavior is undefined. `go run -race` pinpoints
it. Fix it with a `sync.Mutex` around `n++`, or `atomic.AddInt64`.

# Common Mistakes

- **Copying a mutex.** Pass structs containing a `sync.Mutex` by pointer; copying breaks locking.
- **Forgetting `Unlock`.** Use `defer c.mu.Unlock()` right after `Lock` so it always releases.
- **Assuming no report means no race.** The detector only sees executed paths; write tests that
  exercise concurrency.
- **Spawning unbounded goroutines.** Use a worker pool to cap parallelism and resource use.
- **Reaching for a mutex when a channel is clearer (or vice versa).** Match the tool to the problem.

# Best Practices

- Keep critical sections (the code between `Lock` and `Unlock`) **small**.
- Run tests with `-race` in CI; treat any report as a must-fix bug.
- Use `select` + `time.After` (or `context`) so operations can't hang forever.
- Prefer channels for pipelines and ownership transfer; mutexes for shared in-place state.
- Bound concurrency with worker pools; close channels from the producing side.

# Summary

- **`select`** multiplexes channel operations; `default` makes it non-blocking and `time.After` adds
  timeouts.
- **`sync.Mutex`/`RWMutex`** guard shared state (don't copy them); **`sync.Once`** runs setup once.
- A **data race** is unsynchronized concurrent access with a write — undefined behavior; find it with
  **`-race`**.
- Choose **channels** for communication/pipelines and **mutexes** for shared state, by clarity.
- A **worker pool** bounds parallelism: fixed goroutines draining a jobs channel.

# Flash Cards

Q: What does a `select` statement do when several of its cases are ready at once?
A: It chooses one of the ready cases at random, which helps prevent any one channel from starving the others.

Q: How do you make a `select` non-blocking?
A: Add a `default` case — if no channel operation is ready, `default` runs immediately instead of blocking.

Q: What three conditions define a data race?
A: Two goroutines access the same memory concurrently, at least one access is a write, and there is no synchronization ordering the accesses.

Q: How do you detect data races in Go, and what's the caveat?
A: Run with the `-race` flag (e.g. `go test -race`); it reports races on executed code paths only, so absence of a report is not proof of no race.

Q: When should you reach for a channel versus a mutex?
A: Channels for passing data/ownership and orchestrating pipelines ("share by communicating"); a mutex for guarding shared in-place state like a counter or cache — whichever is clearer.

Q: What problem does a worker pool solve?
A: It bounds parallelism by running a fixed number of goroutines that pull jobs from a channel, instead of spawning one unbounded goroutine per job.

# Exercises

### Easy
Write a `select` that receives from a channel or times out after 1 second using `time.After`, printing
either the value or "timeout".

### Medium
Fix the racy counter: take the `n++` loop from Example 3 and make it correct using a `sync.Mutex`
(then, separately, using `atomic.AddInt64`). Run both with `go run -race` and confirm no race is
reported and the total is exactly 1000.

### Challenging
Build a worker pool with a configurable number of workers that fetches the length of each string in a
slice (simulate work with a small sleep), collects results, and returns the total length. Add a
timeout so the whole operation aborts if it takes too long, and explain how `select` enables it.

# Further Reading

- *Go Concurrency Patterns: Pipelines and cancellation* (Go blog): <https://go.dev/blog/pipelines>
- *Introducing the Go Race Detector* (Go blog): <https://go.dev/blog/race-detector>
- *`sync` package* — <https://pkg.go.dev/sync> · *`select` statements* (spec): <https://go.dev/ref/spec#Select_statements>
- *Effective Go* — Concurrency: <https://go.dev/doc/effective_go#concurrency>
