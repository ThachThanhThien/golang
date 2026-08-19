---
id: lesson-11
slug: goroutines
title: "Goroutines and Concurrency"
level: intermediate
order: 11
duration: 20
tags:
  - goroutines
  - concurrency
  - scheduler
  - waitgroup
  - go-statement
summary: "Go's headline feature — goroutines, lightweight threads started with the go keyword and multiplexed onto OS threads by the runtime, why the main goroutine ending stops everything, coordinating with sync.WaitGroup, and the difference between concurrency and parallelism."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Start a **goroutine** with the `go` keyword and explain what it is.
- Describe at a high level how the Go **scheduler** runs goroutines on OS threads.
- Explain why the program exits when **`main` returns**, and how to wait.
- Coordinate goroutines with **`sync.WaitGroup`**.
- Distinguish **concurrency** from **parallelism** and avoid goroutine **leaks**.

# Why It Matters

Concurrency — doing many things at once — is baked into Go, and goroutines make it remarkably cheap:
you can run thousands where OS threads would be too heavy. That power comes with responsibility,
though. Goroutines run *independently*, so you need ways to wait for them and to hand data between
them safely. This lesson covers starting and waiting for goroutines; the next covers channels, the
idiomatic way they communicate.

# Concept Explanation

### What a goroutine is

A **goroutine** is a lightweight thread of execution managed by the **Go runtime**, not the operating
system directly. Start one by putting `go` in front of a function call:

```go
go doWork()          // runs doWork concurrently
go func() {          // an anonymous function works too
	fmt.Println("hi from a goroutine")
}()
```

Goroutines start with a tiny stack (a couple of kilobytes) that grows as needed, so launching many is
cheap. The `go` statement **returns immediately** — it does not wait for the function to finish, and
it does not even guarantee the goroutine has started running before the next line executes.

### The scheduler, briefly

The runtime multiplexes many goroutines onto a smaller number of OS threads (an **M:N** model). You
don't manage threads; the scheduler does, moving goroutines on and off threads at safe points (such as
channel operations, function calls, and blocking system calls). The environment variable / setting
**`GOMAXPROCS`** controls how many goroutines can run *in parallel* on CPU cores at once; as of
writing it defaults to the number of available cores.

The practical takeaways: goroutines are cheap, you rarely think about threads, and you must **not
assume any particular execution order** between goroutines.

### The main goroutine

`main` runs in its own goroutine. **When `main` returns, the whole program exits immediately** — it
does *not* wait for other goroutines to finish. This is the source of the classic beginner surprise:

```go
func main() {
	go fmt.Println("this may never print")
	// main returns right away; the program may exit first
}
```

You need to explicitly **wait** for goroutines you care about.

### Waiting with sync.WaitGroup

A **`sync.WaitGroup`** counts outstanding goroutines. The pattern:

```go
import "sync"

func main() {
	var wg sync.WaitGroup
	for i := 1; i <= 3; i++ {
		wg.Add(1)          // register one goroutine BEFORE starting it
		go func(id int) {
			defer wg.Done() // signal completion when the goroutine returns
			fmt.Println("worker", id)
		}(i)
	}
	wg.Wait() // block until the counter reaches zero
	fmt.Println("all workers done")
}
```

Three rules: call `Add` **before** launching the goroutine (not inside it, or `Wait` may not see it);
call `Done` (usually via `defer`) when the goroutine finishes; call `Wait` to block until all are
done. Note the `(i)` passed as an argument — a safe habit that predates the Go 1.22 loop-variable fix
and still reads clearly.

### Goroutine leaks

A goroutine that **blocks forever** (waiting on a channel that never receives, say) never returns, and
its memory is never reclaimed — a **goroutine leak**. Always make sure every goroutine has a way to
finish: through completion, a closed channel, or a cancellation signal (the `context` lesson).

### Concurrency vs parallelism

These are different ideas (a distinction Rob Pike made famous):

- **Concurrency** is *structuring* a program as independent tasks that can make progress
  independently. It's about design.
- **Parallelism** is *executing* multiple tasks at literally the same instant, which needs multiple
  CPU cores.

Concurrent code *can* run in parallel when cores are available, but concurrency is valuable even on a
single core — for example, keeping a server responsive while waiting on I/O.

# Key Terminology

- **Goroutine** — a lightweight, runtime-managed thread started with `go`.
- **`go` statement** — launches a function call as a new goroutine; returns immediately.
- **Scheduler** — the runtime component mapping goroutines onto OS threads (M:N).
- **`GOMAXPROCS`** — how many goroutines may run in parallel on CPU cores at once.
- **`sync.WaitGroup`** — a counter to wait for a set of goroutines to finish.
- **Goroutine leak** — a goroutine that blocks forever and is never reclaimed.
- **Concurrency vs parallelism** — structuring independent tasks vs executing them simultaneously.

# Options and Trade-offs

| Need | Tool | Note |
| ---- | ---- | ---- |
| Run work in the background | `go f()` | Returns immediately; you must arrange to wait |
| Wait for N goroutines | `sync.WaitGroup` | `Add` before launch, `Done` on finish, `Wait` to block |
| Pass results between goroutines | channels (next lesson) | The idiomatic way to communicate |
| Limit parallelism | a worker pool / semaphore | Bound resource use (later lesson) |
| Cancel long-running goroutines | `context` (later lesson) | Prevents leaks |

# Worked Example

Without waiting, a program can exit before its goroutines run. Watch a `WaitGroup` fix it:

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	var wg sync.WaitGroup
	results := make([]int, 3)

	for i := 0; i < 3; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			results[idx] = idx * idx // each goroutine writes a DIFFERENT index
		}(i)
	}
	wg.Wait()
	fmt.Println(results)
}
```

Output:

```text
[0 1 4]
```

Each goroutine writes to a distinct slice index, so there's no conflict, and `wg.Wait()` guarantees
all writes finish before we print. (Because they touch different elements, no lock is needed here — but
two goroutines writing the *same* variable would be a data race, the subject of the next two lessons.)

# Real World Analogy

Starting a goroutine is like **handing a task to a helper and immediately walking away** — you don't
stand there watching them work. A `WaitGroup` is the **clipboard at the exit**: before each helper
starts you add a tally mark (`Add`), each helper crosses theirs off when done (`Done`), and you wait
at the door until the clipboard reads zero (`Wait`) before locking up. And the "main goroutine exits =
program ends" rule is like the **manager leaving and turning off the building's power**: it doesn't
matter that helpers are mid-task; when the manager goes home, the lights go out.

# Examples

## Example 1 — Basic: launch and wait

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		fmt.Println("work done")
	}()
	wg.Wait() // without this, main might exit before the goroutine prints
	fmt.Println("main done")
}
```

**Why this works:** `Add(1)`/`Done`/`Wait` guarantees `main` blocks until the goroutine finishes, so
both lines reliably print.

## Example 2 — Real-world: fetching several URLs concurrently

```go
func fetchAll(urls []string) {
	var wg sync.WaitGroup
	for _, url := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			resp, err := http.Get(u)
			if err != nil {
				log.Println("error:", u, err)
				return
			}
			resp.Body.Close()
			log.Println("fetched:", u, resp.Status)
		}(url)
	}
	wg.Wait()
}
```

**Why this works:** each request runs in its own goroutine, so slow network calls overlap instead of
running one after another; `wg.Wait()` returns only when every fetch has completed or errored.

## Example 3 — Pitfall: a leaked goroutine

```go
func leak() {
	ch := make(chan int) // unbuffered, nobody will ever receive
	go func() {
		ch <- 42 // blocks forever — this goroutine never returns
	}()
	// function returns; the goroutine is stuck sending, leaked
}
```

**Why this bites:** the goroutine blocks on a send that no one receives, so it lives forever, holding
memory. Every goroutine needs a guaranteed path to completion — a receiver, a closed channel, or a
cancellation signal.

# Common Mistakes

- **Forgetting to wait.** Without `WaitGroup`/channels, `main` may exit before goroutines run.
- **Calling `Add` inside the goroutine.** Add before launching, or `Wait` can race and miss it.
- **Assuming an order.** Goroutine scheduling is nondeterministic; never rely on run order.
- **Leaking goroutines.** Ensure every goroutine can finish; block-forever bugs are silent.

# Best Practices

- Give every goroutine a clear finish condition; pair launches with `WaitGroup` or channels.
- Keep shared mutable state to a minimum; prefer passing data via channels (next lesson).
- Pass loop values as arguments to goroutine closures for clarity (and safety pre-Go 1.22).
- Run with the **race detector** (`go run -race`) during development to catch unsynchronized access.

# Summary

- A **goroutine** is a cheap, runtime-scheduled thread started with `go`; the statement returns
  immediately.
- The scheduler multiplexes goroutines onto OS threads (**M:N**); `GOMAXPROCS` bounds parallelism.
- When **`main` returns, the program exits** — you must explicitly wait for goroutines.
- **`sync.WaitGroup`** (`Add`/`Done`/`Wait`) coordinates a set of goroutines.
- **Concurrency** (structure) differs from **parallelism** (simultaneous execution); avoid goroutine
  **leaks**.

# Flash Cards

Q: What does the `go` keyword do, and does it wait for the function to finish?
A: It starts the function call as a new goroutine and returns immediately — it does not wait, and doesn't even guarantee the goroutine has begun running.

Q: What happens to other goroutines when `main` returns?
A: The whole program exits immediately; it does not wait for other goroutines, so you must explicitly synchronize if you need them to finish.

Q: What are the three steps of using a `sync.WaitGroup`?
A: `Add(n)` before launching goroutines, `Done()` (often deferred) as each finishes, and `Wait()` to block until the counter reaches zero.

Q: Why must `wg.Add` be called before starting the goroutine, not inside it?
A: If `Add` runs inside the goroutine, `Wait` may execute before the counter is incremented, letting the program proceed or exit before the goroutine is accounted for.

Q: What is a goroutine leak?
A: A goroutine that blocks forever (e.g. on a channel nobody services) and therefore never returns, permanently holding memory.

Q: What is the difference between concurrency and parallelism?
A: Concurrency is structuring a program as independent tasks that can progress independently; parallelism is actually running tasks at the same instant, which requires multiple cores.

# Exercises

### Easy
Launch three goroutines that each print their number, using a `sync.WaitGroup` so `main` waits for all
of them. Run it a few times and note that the print order varies.

### Medium
Write a function that squares each number in a `[]int` concurrently — one goroutine per element,
writing into a result slice at the matching index — and returns the results after a `WaitGroup.Wait()`.
Explain why writing to distinct indices avoids a data race.

### Challenging
Reproduce a goroutine leak: start a goroutine that sends on an unbuffered channel no one receives from,
and confirm (conceptually or with `runtime.NumGoroutine()`) that the goroutine never exits. Then fix
it so the goroutine can finish, and describe the change.

# Further Reading

- *A Tour of Go* — Goroutines: <https://go.dev/tour/concurrency/1>
- *Effective Go* — Goroutines: <https://go.dev/doc/effective_go#goroutines>
- *Concurrency is not parallelism* (Rob Pike talk): <https://go.dev/blog/waza-talk>
- *`sync` package* (`WaitGroup`): <https://pkg.go.dev/sync#WaitGroup>
