---
id: lesson-14
slug: testing
title: "Testing, Benchmarks, and Coverage"
level: intermediate
order: 14
duration: 20
tags:
  - testing
  - benchmarks
  - table-driven
  - coverage
  - examples
summary: "Go's built-in testing toolkit — writing tests in _test.go files with the testing package, the idiomatic table-driven style with subtests, measuring performance with benchmarks, verifying documentation with example tests, and reading coverage."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Write and run tests with the **`testing`** package and `go test`.
- Structure tests in the idiomatic **table-driven** style with **subtests**.
- Write **benchmarks** and interpret their output.
- Write **example tests** that double as verified documentation.
- Measure **coverage** and use test helpers like `t.Helper` and `t.Cleanup`.

# Why It Matters

Testing in Go needs no third-party framework — it's built into the toolchain and the standard library.
Because tests are just Go code and `go test` is one command, there's little friction to writing them,
and the ecosystem expects it. Learning the idioms — table-driven tests, subtests, benchmarks,
examples — lets you write thorough tests quickly and keep them readable, which is exactly what Go
optimizes for.

# Concept Explanation

### Test files and functions

Tests live in files ending in **`_test.go`**, in the same package as the code they test. A test is a
function named **`TestXxx`** taking a **`*testing.T`**:

```go
// math.go
package mathx
func Add(a, b int) int { return a + b }
```

```go
// math_test.go
package mathx

import "testing"

func TestAdd(t *testing.T) {
	got := Add(2, 3)
	if got != 5 {
		t.Errorf("Add(2, 3) = %d; want 5", got)
	}
}
```

Run it with `go test` (add `-v` for verbose output, `./...` for the whole module).

- **`t.Errorf`** reports a failure but keeps the test running.
- **`t.Fatalf`** reports and **stops** the current test immediately (use when continuing is pointless).

Go has no built-in `assert`; you compare values yourself and call `t.Error`/`t.Fatal`. This keeps the
failure message explicit about what was expected.

### Table-driven tests

The idiomatic way to test many cases is a **table** — a slice of input/expected structs — looped over
with **`t.Run`** subtests, so each case reports independently:

```go
func TestAbs(t *testing.T) {
	cases := []struct {
		name string
		in   int
		want int
	}{
		{"positive", 3, 3},
		{"negative", -3, 3},
		{"zero", 0, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Abs(c.in); got != c.want {
				t.Errorf("Abs(%d) = %d; want %d", c.in, got, c.want)
			}
		})
	}
}
```

Subtests give each case a name in the output and let you run one with `go test -run TestAbs/negative`.

### Benchmarks

A **benchmark** measures performance. It's named **`BenchmarkXxx`**, takes a **`*testing.B`**, and
loops **`b.N`** times — the framework adjusts `b.N` until the timing is stable:

```go
func BenchmarkAdd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Add(2, 3)
	}
}
```

Run with `go test -bench=.`. Output looks like `BenchmarkAdd-8   1000000000   0.30 ns/op`, meaning it
ran that many iterations at ~0.30 nanoseconds each on 8 cores. Add `-benchmem` to also report
allocations per operation. Treat the numbers as **relative** measurements on your machine, not
absolute truths — say "as of this run."

### Example tests as verified documentation

An **`ExampleXxx`** function with an `// Output:` comment is compiled, run, and its printed output is
**checked** against the comment. It shows up in the package's documentation *and* fails the build if
it drifts:

```go
func ExampleAdd() {
	fmt.Println(Add(2, 3))
	// Output: 5
}
```

If `Add` ever returns something other than `5`, `go test` fails — documentation that can't go stale.

### Coverage and helpers

Measure how much code your tests exercise:

```bash
go test -cover ./...                       # prints a coverage percentage
go test -coverprofile=cov.out ./... && go tool cover -html=cov.out  # visual report
```

Useful helpers on `*testing.T`:

- **`t.Helper()`** — marks a function as a test helper so failures report the caller's line, not the
  helper's.
- **`t.Cleanup(func())`** — registers cleanup that runs when the test finishes (like `defer`, but
  composable across helpers).
- **`t.TempDir()`** — a temporary directory removed automatically after the test.
- **`t.Parallel()`** — marks a test to run in parallel with other parallel tests.

# Key Terminology

- **`_test.go`** — files holding tests, compiled only during `go test`.
- **`TestXxx(t *testing.T)`** — a test function; fail with `t.Error`/`t.Fatal`.
- **Table-driven test** — a slice of cases looped over, usually with `t.Run` subtests.
- **Subtest (`t.Run`)** — a named, independently reported test case.
- **`BenchmarkXxx(b *testing.B)`** — a performance test looping `b.N` times.
- **Example test** — an `ExampleXxx` with `// Output:` that is verified and documented.
- **Coverage** — the fraction of code executed by tests (`-cover`).
- **`t.Helper` / `t.Cleanup` / `t.TempDir`** — helper, cleanup registration, and temp-dir utilities.

# Options and Trade-offs

| Goal | Use | Note |
| ---- | --- | ---- |
| Verify correctness | `TestXxx` + comparisons | No assert library needed |
| Cover many inputs | Table-driven + `t.Run` | Each case named and isolated |
| Measure speed | `BenchmarkXxx` + `-bench` | Numbers are relative to the machine |
| Keep docs correct | `ExampleXxx` + `// Output:` | Fails the build if output changes |
| Find untested code | `-cover` / `-coverprofile` | High % ≠ good tests, but low % flags gaps |
| Isolate error line | `t.Helper()` | Failure points at the caller |

# Worked Example

A complete, idiomatic test file combining a table-driven test, a benchmark, and an example:

```go
package mathx

import (
	"fmt"
	"testing"
)

func TestMax(t *testing.T) {
	cases := []struct{ a, b, want int }{
		{1, 2, 2},
		{5, 3, 5},
		{4, 4, 4},
	}
	for _, c := range cases {
		t.Run(fmt.Sprintf("Max(%d,%d)", c.a, c.b), func(t *testing.T) {
			if got := Max(c.a, c.b); got != c.want {
				t.Errorf("got %d, want %d", got, c.want)
			}
		})
	}
}

func BenchmarkMax(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Max(3, 7)
	}
}

func ExampleMax() {
	fmt.Println(Max(3, 7))
	// Output: 7
}
```

Running `go test -v -bench=.` runs each subtest by name, checks the example's output against `7`, and
reports the benchmark's nanoseconds per operation.

# Real World Analogy

A table-driven test is like a **checklist on a clipboard**: instead of writing a separate paragraph
for every item to inspect, you list the items in a table (input → expected) and walk down the column,
ticking each. Adding a new case is adding a row, not writing new prose. Example tests are the
**"as seen in the manual" photos** that a quality inspector actually re-shoots on every batch — if the
product no longer matches the photo in the manual, the line stops. And coverage is the
**highlighter you run over the blueprint** to see which rooms the inspector never walked into.

# Examples

## Example 1 — Basic: a first failing-then-passing test

```go
func TestReverse(t *testing.T) {
	got := Reverse("abc")
	want := "cba"
	if got != want {
		t.Errorf("Reverse(\"abc\") = %q; want %q", got, want)
	}
}
```

**Why this works:** the test states the input, the expected output, and a clear message. `go test`
compiles the `_test.go` file, runs `TestReverse`, and passes silently when `got == want`.

## Example 2 — Real-world: table-driven with error cases

```go
func TestParsePort(t *testing.T) {
	cases := []struct {
		name    string
		in      string
		want    int
		wantErr bool
	}{
		{"valid", "8080", 8080, false},
		{"empty", "", 0, true},
		{"non-numeric", "abc", 0, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := ParsePort(c.in)
			if (err != nil) != c.wantErr {
				t.Fatalf("err = %v, wantErr = %v", err, c.wantErr)
			}
			if got != c.want {
				t.Errorf("got %d, want %d", got, c.want)
			}
		})
	}
}
```

**Why this works:** one table covers both success and failure paths, including whether an error was
expected — a compact, complete spec of `ParsePort`'s behavior.

## Example 3 — Pitfall: a benchmark the compiler optimizes away

```go
func BenchmarkSquare(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Square(42) // result unused — the optimizer may delete the call!
	}
}
```

**Why this bites:** if the result is never used, the compiler can eliminate the work, making the
benchmark meaninglessly fast. Assign the result to a package-level `var sink` (or otherwise consume
it) so the call can't be optimized out.

# Common Mistakes

- **Expecting an `assert`.** Go has none; compare and call `t.Error`/`t.Fatal` yourself.
- **Confusing `t.Error` and `t.Fatal`.** `Fatal` stops the test; `Error` lets it continue.
- **Ignoring benchmark result usage.** Consume results so the optimizer doesn't delete the work.
- **Chasing 100% coverage.** Coverage shows what ran, not whether assertions are meaningful.
- **Sharing loop state across parallel subtests.** With `t.Parallel()`, be careful capturing loop
  variables (safe as of Go 1.22, but pass values to be sure).

# Best Practices

- Prefer **table-driven tests** with `t.Run`; name cases so failures are easy to locate.
- Keep tests in the **same package** for white-box tests; use `package foo_test` for black-box tests
  of the public API.
- Add **example tests** for public functions so docs stay correct.
- Run `go test -race ./...` for concurrent code and `-cover` to find gaps.
- Use `t.Helper()` in assertion helpers and `t.TempDir()`/`t.Cleanup()` for setup/teardown.

# Summary

- Tests are `TestXxx(t *testing.T)` in `_test.go` files, run with `go test`; fail via `t.Error`
  (continue) or `t.Fatal` (stop).
- The idiomatic style is **table-driven** tests looped with **`t.Run`** subtests.
- **Benchmarks** (`BenchmarkXxx`, loop `b.N`) measure relative performance with `-bench`.
- **Example tests** with `// Output:` are compiled, verified, and shown in docs.
- Measure **coverage** with `-cover`; use `t.Helper`, `t.Cleanup`, and `t.TempDir` to keep tests
  clean.

# Flash Cards

Q: What must a test file be named, and what is a test function's signature?
A: The file ends in `_test.go`, and a test is `func TestXxx(t *testing.T)`, run with `go test`.

Q: What's the difference between `t.Error`/`t.Errorf` and `t.Fatal`/`t.Fatalf`?
A: `Error` records a failure but lets the test continue; `Fatal` records the failure and stops the current test immediately.

Q: What is a table-driven test?
A: A test that defines a slice of input/expected cases and loops over them (usually with `t.Run` subtests), so many cases share one compact structure.

Q: How does a benchmark function work?
A: It's `func BenchmarkXxx(b *testing.B)` and loops `for i := 0; i < b.N; i++`; the framework tunes `b.N` for a stable measurement, run with `go test -bench`.

Q: What makes an `ExampleXxx` function special?
A: If it has an `// Output:` comment, `go test` runs it and verifies the printed output matches, and it appears in the package documentation — so docs can't silently go stale.

Q: Why might a benchmark report an unrealistically fast time?
A: If the computed result is never used, the compiler can optimize the work away; consume the result (e.g. assign to a package-level sink) to prevent that.

# Exercises

### Easy
Write a function `IsPalindrome(s string) bool` and a table-driven test covering an empty string, a
palindrome, and a non-palindrome, using `t.Run` for each case.

### Medium
Add a benchmark for `IsPalindrome` on a long string, ensuring the result is consumed so it isn't
optimized away. Run `go test -bench=. -benchmem` and note the ns/op and allocations, labeling them "as
of this run."

### Challenging
Write an `ExampleIsPalindrome` with an `// Output:` line, then measure coverage with
`go test -cover`. Deliberately leave one branch untested, observe the coverage drop, add a case to
cover it, and explain what coverage does and doesn't tell you about test quality.

# Further Reading

- *`testing` package* — <https://pkg.go.dev/testing>
- *A Tour of Go* / *How to Write Go Code* — Testing: <https://go.dev/doc/code#Testing>
- *Go blog* — *Using Subtests and Sub-benchmarks*: <https://go.dev/blog/subtests>
- *`go test` flags* (`go help testflag`): <https://pkg.go.dev/cmd/go#hdr-Testing_flags>
