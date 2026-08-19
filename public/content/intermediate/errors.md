---
id: lesson-10
slug: errors
title: "Errors and Error Handling"
level: intermediate
order: 10
duration: 20
tags:
  - errors
  - error-wrapping
  - panic
  - recover
  - errors-is-as
summary: "How Go handles failure — errors as ordinary values returned from functions, creating and wrapping them with fmt.Errorf and %w, inspecting them with errors.Is and errors.As, defining custom error types, and the narrow role of panic and recover."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain why Go treats **errors as values**, not exceptions.
- Create errors with `errors.New` and `fmt.Errorf`, and **wrap** them with `%w`.
- Inspect wrapped errors with **`errors.Is`** and **`errors.As`**.
- Define **custom error types** and sentinel errors.
- Use **`panic`** and **`recover`** correctly, and know when *not* to.

# Why It Matters

Error handling is where Go looks most different from languages you may know. There are no exceptions
and no `try`/`catch`; instead, functions **return** an `error` value and callers check it. This makes
every failure path visible in the code — a little more typing in exchange for programs whose behavior
under failure you can actually read. Wrapping and the `errors.Is`/`As` helpers then let you build
informative error chains without losing the ability to react to a specific cause.

# Concept Explanation

### error is just an interface

`error` is a built-in interface with a single method:

```go
type error interface {
	Error() string
}
```

Any value with an `Error() string` method is an error. Idiomatic functions return it **last**:

```go
func readConfig(path string) (Config, error) {
	// ... return zero Config and a non-nil error on failure ...
}

cfg, err := readConfig("app.toml")
if err != nil {
	return err // handle or propagate
}
```

The `if err != nil` check is the heartbeat of Go code. On success, return a `nil` error.

### Creating errors

Two everyday constructors:

```go
import "errors"

err := errors.New("file not found")                     // a fixed message
err := fmt.Errorf("reading %s failed", path)            // a formatted message
```

### Wrapping errors with %w

When you catch an error and want to add context while **keeping the original**, wrap it with the
special `%w` verb in `fmt.Errorf` (available since Go 1.13):

```go
if err != nil {
	return fmt.Errorf("load config: %w", err) // wraps err, preserving it
}
```

Wrapping builds a **chain**: the outer error's message includes context, and the inner cause is still
reachable. Use `%w` when callers might need to inspect the cause; use `%v` when you just want a
message and don't need the original preserved.

### Inspecting with errors.Is and errors.As

Because errors can be wrapped, don't compare with `==` (which only matches the outermost error). Use:

- **`errors.Is(err, target)`** — is `target` anywhere in the chain? Use for **sentinel** errors:

```go
if errors.Is(err, io.EOF) { /* reached end of input */ }
```

- **`errors.As(err, &target)`** — is there an error of a specific **type** in the chain? If so, it's
  assigned to `target` so you can read its fields:

```go
var perr *fs.PathError
if errors.As(err, &perr) {
	fmt.Println("failing path:", perr.Path)
}
```

### Sentinel errors and custom types

A **sentinel error** is a predefined value you compare against with `errors.Is`:

```go
var ErrNotFound = errors.New("not found")
// ...
return ErrNotFound
// caller: if errors.Is(err, ErrNotFound) { ... }
```

A **custom error type** carries structured data:

```go
type ValidationError struct {
	Field string
	Msg   string
}
func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Msg)
}
```

Callers use `errors.As` to pull out a `*ValidationError` and read `Field`.

### panic and recover

A **`panic`** stops normal flow and starts unwinding the stack, running deferred calls as it goes; if
nothing stops it, the program crashes with a stack trace. **`recover`**, called inside a **deferred**
function, stops the unwinding and returns the panic value:

```go
func safeRun(work func()) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("recovered: %v", r)
		}
	}()
	work()
	return nil
}
```

Reserve `panic` for **truly unrecoverable** situations (programmer bugs, impossible states) and
initialization failures. **Do not** use panic for ordinary, expected errors like a missing file or
bad input — return an `error` instead. A common legitimate use of `recover` is at the top of a
server's request handler, so one request's panic doesn't take down the whole process.

# Key Terminology

- **error** — the built-in interface with `Error() string`; errors are ordinary values.
- **Wrapping (`%w`)** — embedding a cause inside a new error while preserving it.
- **`errors.Is`** — reports whether a target error is anywhere in the chain (for sentinels).
- **`errors.As`** — finds an error of a given type in the chain and extracts it.
- **Sentinel error** — a predeclared error value used with `errors.Is`.
- **Custom error type** — a type implementing `error` that carries extra fields.
- **`panic` / `recover`** — abort and unwind / stop unwinding inside a deferred function.

# Options and Trade-offs

| Situation | Use | Not |
| --------- | --- | --- |
| Expected failure (bad input, missing file) | Return an `error` | `panic` |
| Add context to a propagated error | `fmt.Errorf("...: %w", err)` | Swallow it |
| Match a known cause through wrapping | `errors.Is(err, ErrX)` | `err == ErrX` |
| Read fields of a specific error type | `errors.As(err, &typed)` | A type assertion on `err` |
| Unrecoverable bug / impossible state | `panic` | Returning a vague error |

| Wrapping verb | Keeps the cause? | Use when |
| ------------- | ---------------- | -------- |
| `%w` | yes (inspectable) | Callers may need `errors.Is`/`As` |
| `%v` | no (message only) | You only want a human-readable string |

# Worked Example

Build and inspect an error chain:

```go
package main

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("not found")

func fetchUser(id int) error {
	return fmt.Errorf("fetchUser(%d): %w", id, ErrNotFound) // wrap the sentinel
}

func main() {
	err := fetchUser(7)
	fmt.Println("message:", err)
	fmt.Println("is ErrNotFound?", errors.Is(err, ErrNotFound))
}
```

Output:

```text
message: fetchUser(7): not found
is ErrNotFound?: true
```

The outer error adds context (`fetchUser(7): ...`) while `errors.Is` still finds the wrapped
`ErrNotFound` deep in the chain — so callers can react to the specific cause without string-matching
the message.

# Real World Analogy

Wrapping errors is like a **package tracking history**. Each handoff adds a stamp — "left the
warehouse," "arrived at the depot," "failed delivery: address not found" — without erasing the
earlier stamps. `errors.Is` is you scanning that history asking "was this a *not-found* problem
anywhere along the way?", and `errors.As` is pulling out the specific *failed-delivery slip* to read
the address it complained about. A `panic`, meanwhile, is the fire alarm: you pull it only for a real
emergency, not because a package was late.

# Examples

## Example 1 — Basic: return and check an error

```go
func atoiPositive(s string) (int, error) {
	n, err := strconv.Atoi(s)
	if err != nil {
		return 0, fmt.Errorf("parse %q: %w", s, err)
	}
	if n < 0 {
		return 0, errors.New("must be positive")
	}
	return n, nil
}
```

**Why this works:** the function returns `(value, error)`, wraps the parse failure for context, and
uses a plain error for the business rule — all expected failures, all returned as values.

## Example 2 — Real-world: a custom error type inspected with errors.As

```go
type HTTPError struct {
	Code int
	URL  string
}
func (e *HTTPError) Error() string { return fmt.Sprintf("%s -> %d", e.URL, e.Code) }

func handle(err error) {
	var he *HTTPError
	if errors.As(err, &he) && he.Code == 404 {
		fmt.Println("not found:", he.URL) // read structured fields
	}
}
```

**Why this works:** `errors.As` finds the `*HTTPError` even if it was wrapped, letting the caller
branch on the status code — impossible with a plain string message.

## Example 3 — Pitfall: using panic for ordinary errors

```go
// Anti-pattern: crashing on expected input
func mustParse(s string) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		panic(err) // a bad string from a user should NOT crash the program
	}
	return n
}
```

**Why this bites:** user input being non-numeric is an *expected* condition; panicking turns a routine
validation problem into a crash. Return an `error` and let the caller decide. (A `MustXxx` helper that
panics is only acceptable for programmer-controlled inputs, like compiling a constant regexp at
startup.)

# Common Mistakes

- **Ignoring returned errors.** Handle or propagate them; don't discard with `_` unless truly
  intended.
- **Comparing wrapped errors with `==`.** Use `errors.Is` so wrapping doesn't hide the cause.
- **Using `panic` for expected failures.** Return errors; reserve panic for unrecoverable bugs.
- **Over-wrapping.** Add context that helps (`"load config: %w"`), not redundant noise at every layer.

# Best Practices

- Return errors as the last value and check them immediately; keep the success path un-indented.
- Wrap with `%w` and a short, lowercase context prefix; let callers use `errors.Is`/`As`.
- Define sentinel errors (`ErrX`) or custom types for causes callers must distinguish.
- Recover from panics only at well-chosen boundaries (e.g. a server request handler), not everywhere.

# Summary

- Go handles failure with **errors as values**, returned and checked explicitly — no exceptions.
- Create with `errors.New`/`fmt.Errorf`; **wrap** with `%w` to preserve the cause.
- Inspect chains with **`errors.Is`** (sentinels) and **`errors.As`** (typed errors).
- Define **sentinel errors** and **custom error types** for causes callers need to distinguish.
- **`panic`/`recover`** are for the exceptional and unrecoverable — not for ordinary error handling.

# Flash Cards

Q: What is the `error` type in Go?
A: A built-in interface with a single method, `Error() string`; any value implementing it is an error, and errors are returned as ordinary values.

Q: What does wrapping an error with `%w` in `fmt.Errorf` accomplish?
A: It adds context while preserving the original error in a chain, so it can still be found later with `errors.Is` or `errors.As`.

Q: When do you use `errors.Is` versus `errors.As`?
A: `errors.Is` checks whether a specific sentinel value is in the chain; `errors.As` finds an error of a given type in the chain and extracts it so you can read its fields.

Q: Why shouldn't you compare errors with `==` after they might be wrapped?
A: `==` only matches the outermost error; wrapping hides the cause, so use `errors.Is` to match through the chain.

Q: Where must `recover` be called to stop a panic?
A: Inside a deferred function — `recover` only has an effect when called directly from a deferred call during unwinding.

Q: When is `panic` appropriate versus returning an error?
A: Panic is for truly unrecoverable situations (programmer bugs, impossible states, startup failures); expected failures like bad input or a missing file should return an error.

# Exercises

### Easy
Write `safeDivide(a, b int) (int, error)` that returns an error when `b == 0` and the quotient
otherwise. Call it twice (once dividing by zero) and print the results, handling the error.

### Medium
Define a sentinel `ErrEmpty` and a function `first(s []int) (int, error)` that returns `ErrEmpty`
(wrapped with context) for an empty slice. In the caller, use `errors.Is` to detect the empty case
specifically.

### Challenging
Create a `RetryError` custom type holding the number of attempts and the last error, implement
`Error()` and an `Unwrap()` method returning the last error, and show that `errors.Is(retryErr,
someSentinel)` still finds a wrapped sentinel through your custom type. Explain what `Unwrap` enables.

# Further Reading

- *Working with Errors in Go 1.13* (Go blog): <https://go.dev/blog/go1.13-errors>
- *Error handling and Go* (Go blog): <https://go.dev/blog/error-handling-and-go>
- *`errors` package* — <https://pkg.go.dev/errors> · *Effective Go* — Errors, Panic, Recover: <https://go.dev/doc/effective_go#errors>
