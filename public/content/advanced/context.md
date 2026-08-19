---
id: lesson-17
slug: context
title: "Context, Cancellation, and Timeouts"
level: advanced
order: 17
duration: 20
tags:
  - context
  - cancellation
  - timeouts
  - deadlines
  - request-scope
summary: "The context package — how Go propagates cancellation, deadlines, and request-scoped values across API boundaries and goroutines, why you must always call the cancel function, how to react to ctx.Done(), and the conventions that keep context usage clean."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what a **`context.Context`** carries and why it exists.
- Create contexts with **`Background`**, **`WithCancel`**, **`WithTimeout`**, and **`WithDeadline`**.
- React to cancellation via **`ctx.Done()`** and **`ctx.Err()`**.
- Use **`WithValue`** correctly for request-scoped data.
- Follow the conventions: pass `ctx` first, always call `cancel`, don't store contexts in structs.

# Why It Matters

Long-running operations — HTTP requests, database queries, pipelines of goroutines — need a way to be
**cancelled** and **time-bounded**. Without it, a client that gives up leaves the server churning, and
goroutines leak. Go's answer is the **`context`** package: a single value that flows down a call
chain carrying a cancellation signal and a deadline. Nearly every I/O-related standard-library and
third-party API takes a `context.Context` as its first argument, so understanding it is essential to
writing robust services.

# Concept Explanation

### What a context is

A **`context.Context`** is a small interface that carries, across API boundaries and between
goroutines:

- a **cancellation signal** (a channel that closes when work should stop),
- an optional **deadline** (a time after which it auto-cancels),
- optional **request-scoped values**.

Its key methods:

```go
ctx.Done()             // <-chan struct{}: closed when cancelled or timed out
ctx.Err()              // why it's done: context.Canceled or context.DeadlineExceeded
ctx.Deadline()         // the deadline, if any
ctx.Value(key)         // a request-scoped value
```

### Creating contexts

Start from a root and derive children:

```go
ctx := context.Background() // the empty root; use at main/top of a request
ctx := context.TODO()       // placeholder when you haven't wired context through yet
```

Derive a **cancellable** context; it returns a `cancel` function you **must** call to release
resources (even if the work finished normally):

```go
ctx, cancel := context.WithCancel(parent)
defer cancel() // always — releases the context's resources; safe to call twice

ctx, cancel := context.WithTimeout(parent, 2*time.Second) // auto-cancels after 2s
defer cancel()

ctx, cancel := context.WithDeadline(parent, someTime)
defer cancel()
```

Contexts form a **tree**: cancelling a parent cancels all its children. `defer cancel()` is not
optional — skipping it leaks the timer/goroutine the context set up (and `go vet` warns about it).

### Reacting to cancellation

Code that does long work should **watch `ctx.Done()`** and stop when it fires, usually inside a
`select`:

```go
func worker(ctx context.Context, jobs <-chan int) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err() // context.Canceled or context.DeadlineExceeded
		case j, ok := <-jobs:
			if !ok {
				return nil
			}
			process(j)
		}
	}
}
```

Well-behaved library functions already do this — for example, an HTTP request made with a context is
aborted when the context is cancelled.

### Request-scoped values

**`context.WithValue`** attaches a value that travels with the context — meant for **request-scoped**
data crossing API boundaries (a request ID, an authenticated user), **not** for passing optional
function parameters. Use an **unexported custom key type** to avoid collisions:

```go
type ctxKey string
const requestIDKey ctxKey = "requestID"

ctx = context.WithValue(ctx, requestIDKey, "abc-123")
id, ok := ctx.Value(requestIDKey).(string) // type-assert on the way out
```

Overusing `WithValue` makes data flow invisible; prefer explicit parameters for normal inputs.

### Conventions

- Pass `ctx` as the **first parameter**, conventionally named `ctx`.
- **Don't store** a `Context` in a struct; pass it through calls instead.
- Never pass a **nil** context; use `context.TODO()` if you don't have one yet.
- The context should be **derived and cancelled** where the work is scoped (e.g. per request).

# Key Terminology

- **`context.Context`** — carries cancellation, deadline, and request-scoped values.
- **`Background` / `TODO`** — the empty root context / a placeholder when none is available yet.
- **`WithCancel` / `WithTimeout` / `WithDeadline`** — derive a cancellable/time-bounded child + a
  `cancel` func.
- **`ctx.Done()`** — a channel closed when the context is cancelled or expires.
- **`ctx.Err()`** — `context.Canceled` or `context.DeadlineExceeded`, explaining why it's done.
- **`WithValue`** — attaches request-scoped data (with an unexported key type).

# Options and Trade-offs

| Need | Use | Note |
| ---- | --- | ---- |
| Manual cancellation | `WithCancel` | Call `cancel()` when done |
| Bound total time | `WithTimeout` | Relative duration; auto-cancels |
| Cancel at a fixed instant | `WithDeadline` | Absolute time |
| Top of a program/request | `Background` | The root context |
| Not wired through yet | `TODO` | A visible placeholder |
| Carry a request ID/user | `WithValue` + unexported key | Not for ordinary parameters |

## `WithValue` vs explicit parameters

| | `WithValue` | Function parameter |
| - | ----------- | ------------------ |
| Good for | Request-scoped data across many layers | Ordinary inputs |
| Downside | Data flow is invisible, untyped at call sites | More verbose signatures |

# Worked Example

Time-bound an operation and observe which case wins:

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func slowOp(ctx context.Context, d time.Duration) error {
	select {
	case <-time.After(d): // pretend the work takes d
		return nil
	case <-ctx.Done(): // cancelled or timed out first
		return ctx.Err()
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := slowOp(ctx, 500*time.Millisecond) // needs 500ms, but only 100ms allowed
	fmt.Println("err:", err)
}
```

Output:

```text
err: context deadline exceeded
```

The operation would take 500ms, but the context times out after 100ms, so `ctx.Done()` fires first
and `slowOp` returns `context.DeadlineExceeded`. `defer cancel()` cleans up the timer regardless.

# Real World Analogy

A context is like a **"stop work" order that flows down a chain of subcontractors**. The general
contractor (your top-level request) can issue "stop" at any time, or set a firm deadline ("done by
5pm or down tools"). Every subcontractor is holding a copy of that order and periodically **checks
whether it's been called** (`ctx.Done()`) — the moment it is, they stop, no matter how deep in the
chain they are. And `cancel()` is **filing the paperwork that closes the job**: even if the work
finished on its own, you file it so the office doesn't keep a folder open forever (a resource leak).

# Examples

## Example 1 — Basic: cancel goroutines with WithCancel

```go
func main() {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		for {
			select {
			case <-ctx.Done():
				fmt.Println("goroutine stopping:", ctx.Err())
				return
			default:
				time.Sleep(50 * time.Millisecond)
			}
		}
	}()
	time.Sleep(150 * time.Millisecond)
	cancel() // signal the goroutine to stop
	time.Sleep(50 * time.Millisecond)
}
```

**Why this works:** calling `cancel()` closes `ctx.Done()`, so the goroutine's `select` takes the
`<-ctx.Done()` case and returns — a clean way to stop background work and avoid a leak.

## Example 2 — Real-world: an HTTP request with a timeout

```go
func fetch(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req) // aborts if ctx is cancelled/expired
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// caller:
// ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
// defer cancel()
// body, err := fetch(ctx, "https://example.com")
```

**Why this works:** `http.NewRequestWithContext` ties the request to the context, so a timeout or
cancellation aborts the in-flight HTTP call — no hung requests holding connections open.

## Example 3 — Pitfall: forgetting to call cancel

```go
func leak() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	_ = cancel // BUG: never called
	doWork(ctx)
	// the timer and internal goroutine live until the timeout fires — a resource leak
}
```

**Why this bites:** `WithTimeout`/`WithCancel` set up resources that only `cancel()` releases early.
Not calling it (here it's assigned and ignored) leaks until the deadline — `go vet` flags this. Always
`defer cancel()` right after deriving the context.

# Common Mistakes

- **Not calling `cancel`.** Always `defer cancel()`; skipping it leaks resources.
- **Storing a `Context` in a struct.** Pass it as a parameter instead.
- **Using `WithValue` for ordinary parameters.** Reserve it for request-scoped data with a typed key.
- **Passing a nil context.** Use `context.TODO()` if you don't have one yet.
- **Ignoring `ctx.Done()` in long loops.** Check it so work can actually be cancelled.

# Best Practices

- Take `ctx context.Context` as the **first** parameter of functions that do I/O or run long.
- Derive a timeout/deadline at the boundary (a request, a job) and `defer cancel()` immediately.
- Propagate the same context down the call chain so cancellation reaches every layer.
- Select on `ctx.Done()` in loops and blocking operations; return `ctx.Err()` when it fires.
- Keep `WithValue` for cross-cutting request data, using an unexported key type.

# Summary

- A **`context.Context`** carries a cancellation signal, an optional deadline, and request-scoped
  values across API boundaries.
- Derive from **`Background`** with **`WithCancel`/`WithTimeout`/`WithDeadline`**, and **always call
  `cancel`** (via `defer`).
- Watch **`ctx.Done()`** and return **`ctx.Err()`** (`Canceled` or `DeadlineExceeded`) to stop work.
- Use **`WithValue`** only for request-scoped data, with an unexported key type.
- Pass `ctx` first, never store it in a struct, and never pass nil.

# Flash Cards

Q: What three things can a `context.Context` carry?
A: A cancellation signal (`Done()` channel), an optional deadline/timeout, and optional request-scoped values.

Q: Why must you always call the `cancel` function returned by `WithCancel`/`WithTimeout`?
A: To release the resources (timers, internal goroutines) the context sets up; not calling it leaks them until the deadline, and `go vet` warns about it. `defer cancel()` is the idiom.

Q: How does a function know a context has been cancelled or timed out?
A: The channel returned by `ctx.Done()` is closed; `ctx.Err()` then returns `context.Canceled` or `context.DeadlineExceeded`.

Q: What is `context.WithValue` meant for, and what should the key be?
A: Request-scoped data crossing API boundaries (like a request ID), not ordinary parameters; the key should be an unexported custom type to avoid collisions.

Q: Where should a `Context` be passed, and where should it not be stored?
A: Passed as the first parameter (named `ctx`) of functions; it should not be stored in a struct.

Q: What is the difference between `context.Background()` and `context.TODO()`?
A: `Background()` is the empty root context used at the top of a program/request; `TODO()` is a placeholder for when you haven't wired a real context through yet.

# Exercises

### Easy
Write a function `doWork(ctx context.Context)` that loops printing a dot every 100ms and returns when
`ctx.Done()` fires. Call it with a 350ms `WithTimeout` context and observe it stop on its own.

### Medium
Wrap an operation that sleeps for a random duration in a `select` against `ctx.Done()`, and call it
with both a generous and a tight `WithTimeout`. Show that the tight one returns
`context.DeadlineExceeded`.

### Challenging
Build a small pipeline of two goroutines connected by a channel, all sharing one context. When the
context is cancelled, ensure both goroutines exit promptly (no leaks). Verify with
`runtime.NumGoroutine()` before and after cancellation, and explain how the context coordinated the
shutdown.

# Further Reading

- *`context` package* — <https://pkg.go.dev/context>
- *Go Concurrency Patterns: Context* (Go blog): <https://go.dev/blog/context>
- *Contexts and structs* (Go blog): <https://go.dev/blog/context-and-structs>
