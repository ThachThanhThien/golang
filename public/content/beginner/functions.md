---
id: lesson-04
slug: functions
title: "Functions and Multiple Returns"
level: beginner
order: 4
duration: 18
tags:
  - functions
  - multiple-returns
  - defer
  - closures
  - variadic
summary: "How Go organizes behavior into functions — declaring them, returning multiple values (the idiom behind error handling), named returns, variadic parameters, functions as first-class values and closures, and defer for guaranteed cleanup."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Declare functions with parameters and return types.
- Return and consume **multiple values**, the basis of Go's error handling.
- Use **variadic** parameters and understand named returns.
- Treat functions as **values** and write **closures**.
- Use **`defer`** for cleanup, and predict exactly when deferred calls run.

# Why It Matters

Functions are how you name and reuse behavior. Go adds two ideas that shape almost all Go code:
functions can return **several values at once** (which is how a function reports both a result and
whether it failed), and **`defer`** guarantees that cleanup happens no matter how a function exits.
Master these and idiomatic Go — `result, err := doThing()` followed by `defer file.Close()` — becomes
second nature.

# Concept Explanation

### Declaring a function

A function has a name, a parameter list (each with a type), and optional return types:

```go
func add(a int, b int) int {
	return a + b
}
```

When consecutive parameters share a type you can write it once: `func add(a, b int) int`. Functions
are called by name: `sum := add(2, 3)`.

### Multiple return values

A Go function can return more than one value. The overwhelmingly common pattern is **(result,
error)** — return the useful value plus an `error` that is `nil` on success:

```go
import (
	"errors"
	"fmt"
)

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("divide by zero")
	}
	return a / b, nil
}

func main() {
	q, err := divide(10, 2)
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println("result:", q)
}
```

The caller checks `err` first. This explicit style — no hidden exceptions — is central to Go and gets
a full lesson later.

If you want to ignore one of the returned values, assign it to the **blank identifier** `_`:

```go
_, err := divide(10, 0) // keep the error, discard the quotient
```

### Named return values

You may name the return values; they act like variables initialized to their zero value, and a bare
`return` returns their current values:

```go
func split(sum int) (x, y int) {
	x = sum * 4 / 9
	y = sum - x
	return // returns x and y
}
```

Named returns can improve readability for short functions, but overusing them (especially the bare
`return` in long functions) can obscure what's returned. Use them sparingly.

### Variadic functions

A final parameter written `...T` accepts any number of arguments, received as a slice `[]T`:

```go
func sum(nums ...int) int {
	total := 0
	for _, n := range nums {
		total += n
	}
	return total
}

// sum(1, 2, 3) == 6 ; sum() == 0
// pass an existing slice with ...:  sum(xs...)
```

`fmt.Println` is variadic — that's why it takes any number of arguments.

### Functions as values and closures

Functions are **first-class values**: you can store them in variables, pass them as arguments, and
return them. A **closure** is a function that captures variables from the scope where it was created:

```go
func counter() func() int {
	n := 0
	return func() int {
		n++
		return n
	}
}

// c := counter(); c() == 1; c() == 2; c() == 3
```

Each call to `counter()` gets its own `n`; the returned function "closes over" it.

### defer

A **`defer`** statement schedules a function call to run when the surrounding function returns —
whether it returns normally or through a panic. Two rules to memorize:

1. **Arguments are evaluated immediately**, when the `defer` runs — not when the deferred call later
   executes.
2. **Deferred calls run last-in, first-out (LIFO)** when the function returns.

```go
func demo() {
	defer fmt.Println("1: runs last")
	defer fmt.Println("2: runs first")
	fmt.Println("body")
}
// prints: body, then "2: runs first", then "1: runs last"
```

`defer` shines for cleanup that must happen no matter which path exits the function — closing files,
unlocking mutexes, and so on:

```go
f, err := os.Open("data.txt")
if err != nil {
	return err
}
defer f.Close() // guaranteed to run when the function returns
```

A deferred closure can even modify a **named** return value before the function truly returns — a
trick used for cleanup that adjusts the result.

# Key Terminology

- **Parameter / argument** — the declared input in a function signature / the actual value passed.
- **Multiple return values** — returning several results at once, typically `(value, error)`.
- **Blank identifier `_`** — a placeholder that discards a value you don't need.
- **Named return values** — return parameters given names; a bare `return` returns their values.
- **Variadic parameter** — a trailing `...T` that accepts any number of arguments as a `[]T`.
- **First-class function** — a function usable as a value: stored, passed, and returned.
- **Closure** — a function that captures variables from its surrounding scope.
- **`defer`** — schedules a call to run when the surrounding function returns (LIFO order).

# Options and Trade-offs

| Situation | Option A | Option B | How to choose |
| --------- | -------- | -------- | ------------- |
| Reporting failure | Return `(value, error)` | Panic | Return an error for anything expected; reserve panic for truly unrecoverable bugs |
| Naming returns | Named returns + bare `return` | Explicit `return a, b` | Named returns for very short functions or `defer`-adjusted results; explicit otherwise |
| Cleanup | `defer resource.Close()` | Manual close at each exit | `defer` — it can't be forgotten and runs on every path, including panics |
| Many similar args | Variadic `...T` | A slice parameter `[]T` | Variadic for ergonomic call sites; a slice when callers already hold one |

# Worked Example

Let's trace `defer`'s "arguments evaluated immediately" rule, which surprises newcomers:

```go
package main

import "fmt"

func main() {
	i := 0
	defer fmt.Println("deferred sees:", i) // i is 0 right now
	i = 99
	fmt.Println("current i:", i)
}
```

Output:

```text
current i: 99
deferred sees: 0
```

The deferred `Println` captured `i`'s value (`0`) at the moment the `defer` statement ran, even though
`i` later became `99`. The *call* is delayed; the *arguments* are not.

# Real World Analogy

`defer` is like leaving a **sticky note on the door that says "turn off the lights on your way out."**
No matter which exit you take from the room — the normal door or the fire escape (a panic) — you pass
the note and do the task. And you write the note the moment you enter (arguments evaluated now), so it
already says exactly what to do, even if you rearrange the furniture afterward.

# Examples

## Example 1 — Basic: multiple returns with the comma-ok idiom

```go
package main

import "fmt"

func lookup(m map[string]int, key string) (int, bool) {
	v, ok := m[key]
	return v, ok
}

func main() {
	ages := map[string]int{"Ada": 36}
	if age, ok := lookup(ages, "Ada"); ok {
		fmt.Println("found:", age)
	} else {
		fmt.Println("not found")
	}
}
```

**Why this works:** returning a second boolean (`ok`) lets the caller distinguish "found the value"
from "value is missing" — a pattern you'll see all over Go.

## Example 2 — Real-world: defer for guaranteed cleanup

```go
func copyFile(dst, src string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
```

**Why this works:** both files are closed automatically whichever way the function returns — including
the early error returns — so no file handle leaks.

## Example 3 — Pitfall: defer inside a loop

```go
// Problem: none of these close until copyAll returns
func copyAll(paths []string) error {
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		defer f.Close() // piles up; runs only when copyAll returns
		// ... use f ...
	}
	return nil
}
```

**Why this bites:** `defer` runs at **function** exit, not at the end of each loop iteration, so open
files accumulate. Fix it by moving the work into a helper function (so each file closes per call), or
by closing explicitly at the end of the loop body.

# Common Mistakes

- **Expecting `defer` to run at end of block/loop.** It runs when the whole **function** returns.
- **Assuming deferred arguments are read later.** They're evaluated when the `defer` statement runs.
- **Ignoring returned errors.** If a function returns an `error`, handle it — don't discard it with
  `_` unless you truly mean to.
- **Overusing named returns.** In long functions a bare `return` hides what's being returned.

# Best Practices

- Return `(value, error)` and check the error immediately; keep the happy path un-indented.
- Use `defer` for cleanup right after you acquire a resource, so it can't be forgotten.
- Keep functions small and single-purpose; extract loop bodies into helpers when `defer` or clarity
  demands it.
- Reach for closures when you need to bundle behavior with a little private state.

# Summary

- Functions declare typed parameters and return types; consecutive same-typed params share the type.
- Go functions return **multiple values**, the foundation of `(value, error)` error handling.
- **Variadic** `...T` parameters accept any number of arguments as a slice.
- Functions are **first-class values**; **closures** capture their surrounding variables.
- **`defer`** guarantees cleanup on every exit path; arguments are evaluated immediately and calls run
  LIFO.

# Flash Cards

Q: What is the idiomatic multiple-return signature for a function that can fail?
A: `(result, error)` — return the value plus an `error` that is `nil` on success and non-nil on failure.

Q: When are the arguments to a deferred call evaluated?
A: Immediately, when the `defer` statement executes — not when the deferred call later runs.

Q: In what order do multiple `defer` statements run?
A: Last-in, first-out (LIFO) — the most recently deferred call runs first when the function returns.

Q: What is a closure?
A: A function value that captures and can read/modify variables from the scope where it was created.

Q: What does the blank identifier `_` do in `_, err := f()`?
A: It discards the value in that position, keeping only the ones you name (here, the error).

Q: Why can `defer f.Close()` inside a loop be a problem?
A: `defer` runs at function return, not per iteration, so resources pile up until the whole function exits; move the work into a helper or close explicitly.

# Exercises

### Easy
Write a function `minMax(nums ...int) (min, max int)` that returns the smallest and largest of its
arguments. Call it and print both results.

### Medium
Write `withTiming(label string, work func())` that records the time before calling `work`, calls it,
and uses `defer` to print how long it took (`time.Since`). Explain why `defer` is a good fit here even
if `work` might panic.

### Challenging
Write a closure-based `accumulator()` that returns two functions: one that adds a number to a running
total, and one that reads the current total. Show that two independent accumulators don't share state,
and explain how closures make that possible.

# Further Reading

- *A Tour of Go* — Functions, Multiple results, Closures: <https://go.dev/tour/moretypes/24>
- *Effective Go* — Functions and Defer: <https://go.dev/doc/effective_go#defer>
- *The Go Programming Language Specification* — Function types and `Defer` statements: <https://go.dev/ref/spec#Defer_statements>
