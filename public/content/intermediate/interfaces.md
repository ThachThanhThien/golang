---
id: lesson-09
slug: interfaces
title: "Interfaces and Composition"
level: intermediate
order: 9
duration: 20
tags:
  - interfaces
  - polymorphism
  - composition
  - type-assertions
  - any
summary: "Go's interfaces — sets of method signatures satisfied implicitly, how interface values hold a (type, value) pair, the empty interface (any), type assertions and type switches, and the famous typed-nil gotcha, plus the idiom of accepting interfaces and returning concrete types."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Define **interfaces** and explain Go's **implicit** satisfaction.
- Describe how an interface value holds a **(type, value)** pair.
- Use the **empty interface** (`any`), **type assertions**, and **type switches**.
- Recognize and avoid the **typed-nil** interface gotcha.
- Apply "**accept interfaces, return structs**" and keep interfaces small.

# Why It Matters

Interfaces are how Go achieves **polymorphism** — writing code that works with many types through a
shared set of behaviors. But Go's take is unusual: a type satisfies an interface just by having the
right methods, with no `implements` declaration anywhere. That looseness makes Go code flexible and
testable, and it's why the standard library's small interfaces (`io.Reader`, `io.Writer`,
`fmt.Stringer`) compose so well. There's also one genuinely tricky corner — the typed nil — that
bites nearly everyone once; better to meet it here.

# Concept Explanation

### An interface is a set of methods

An **interface** lists method signatures. Any type that has **all** those methods **satisfies** the
interface — automatically, with no keyword:

```go
type Shape interface {
	Area() float64
}

type Circle struct{ R float64 }
func (c Circle) Area() float64 { return math.Pi * c.R * c.R }

type Rect struct{ W, H float64 }
func (r Rect) Area() float64 { return r.W * r.H }

func totalArea(shapes []Shape) float64 {
	sum := 0.0
	for _, s := range shapes {
		sum += s.Area() // works for any type with an Area() method
	}
	return sum
}
```

`Circle` and `Rect` never say "I implement Shape" — they simply have an `Area()` method, so they can
be used anywhere a `Shape` is expected. This is called **structural typing** or **implicit
satisfaction**, and it means you can write an interface *after* the concrete types already exist,
even for types you don't own.

### Interface values hold a (type, value) pair

An interface variable stores two things: the **concrete type** stored in it and the **value** of that
type. When you call a method on an interface, Go dispatches to the concrete type's method. This pair
is the key to understanding assertions and the nil gotcha below.

### The empty interface: any

An interface with **no methods** — `interface{}`, spelled **`any`** since Go 1.18 — is satisfied by
*every* type, so it can hold any value:

```go
var x any
x = 42
x = "hello"
x = []int{1, 2, 3}
```

Use `any` when you genuinely must handle unknown types (like `fmt.Println`'s arguments), but prefer a
specific interface when you can — `any` throws away all compile-time type information.

### Type assertions and type switches

To get the concrete value back out of an interface, use a **type assertion**. Always use the two-value
form so a wrong guess doesn't panic:

```go
var i any = "hello"
s, ok := i.(string) // s == "hello", ok == true
n, ok := i.(int)    // n == 0, ok == false (no panic)
```

To branch on several possible types, use a **type switch**:

```go
func describe(i any) string {
	switch v := i.(type) {
	case int:
		return fmt.Sprintf("int: %d", v)
	case string:
		return fmt.Sprintf("string of length %d", len(v))
	case nil:
		return "nil"
	default:
		return fmt.Sprintf("unknown type %T", v)
	}
}
```

### The typed-nil gotcha

An interface is `nil` **only when both its type and its value are nil**. If you store a nil concrete
pointer in an interface, the interface has a **type**, so it is **not nil** — even though the value
inside is nil:

```go
type MyError struct{}
func (e *MyError) Error() string { return "boom" }

func doWork() error {
	var p *MyError = nil
	return p // BUG: returns a non-nil error holding a nil *MyError!
}

func main() {
	if err := doWork(); err != nil {
		fmt.Println("got an error:", err) // this runs — surprise!
	}
}
```

The fix: return a literal `nil` for "no error", and don't return a typed nil pointer as an interface.

# Key Terminology

- **Interface** — a named set of method signatures.
- **Implicit satisfaction / structural typing** — a type satisfies an interface just by having the
  methods; no declaration.
- **Interface value** — the `(concrete type, value)` pair an interface holds.
- **Empty interface / `any`** — an interface with no methods, satisfied by all types.
- **Type assertion** — `x.(T)` to extract a concrete type from an interface (use the comma-ok form).
- **Type switch** — `switch v := x.(type)` to branch on the concrete type.
- **Typed nil** — a nil concrete value stored in an interface, making the interface itself non-nil.

# Options and Trade-offs

| Situation | Prefer | Avoid | Why |
| --------- | ------ | ----- | --- |
| A function's parameters | The smallest interface it needs | A concrete type | Flexibility and easy testing/mocking |
| A function's return type | A concrete struct/pointer | An interface | Callers keep full type information |
| Handling truly unknown data | `any` + type switch | `any` everywhere | Keep type safety wherever possible |
| Extracting a concrete type | `v, ok := x.(T)` | `v := x.(T)` | The single-value form panics on mismatch |

The guideline "**accept interfaces, return structs**" makes functions flexible in what they take while
giving callers concrete, fully typed results.

# Worked Example

The standard library's `io.Writer` interface is a single method, yet it lets one function write to a
file, a network connection, or an in-memory buffer:

```go
package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
)

// report accepts ANY io.Writer.
func report(w io.Writer, name string) {
	fmt.Fprintf(w, "Report for %s\n", name)
}

func main() {
	report(os.Stdout, "screen")      // writes to the terminal
	var buf bytes.Buffer
	report(&buf, "memory")           // writes into a buffer
	fmt.Print("captured: ", buf.String())
}
```

Output:

```text
Report for screen
captured: Report for memory
```

`report` doesn't care *where* the bytes go — only that its argument has a `Write` method. `os.Stdout`
and `*bytes.Buffer` both satisfy `io.Writer`, so the same function serves both.

# Real World Analogy

An interface is like a **job description**, not a family tree. If the description says "must be able
to `Area()`," then *anyone* who can do that job qualifies — you don't have to inherit from an "areas
department." A power outlet is another good picture: the wall doesn't care what brand of device you
plug in, only that the **plug shape** (the method set) matches. And the typed-nil gotcha is like an
**empty box that still has a shipping label on it**: from the outside it looks like a real package
(non-nil, because it has a type/label), even though there's nothing inside.

# Examples

## Example 1 — Basic: the Stringer interface

```go
type Celsius float64

func (c Celsius) String() string { return fmt.Sprintf("%.1f°C", float64(c)) }

func main() {
	t := Celsius(21.5)
	fmt.Println(t) // 21.5°C — fmt notices the String() method
}
```

**Why this works:** `fmt` checks whether a value satisfies `fmt.Stringer` (`String() string`). By
adding that one method, `Celsius` controls how it prints — no changes to `fmt` needed.

## Example 2 — Real-world: an interface for testability

```go
type Notifier interface {
	Send(msg string) error
}

func alertOnError(n Notifier, err error) {
	if err != nil {
		n.Send("failure: " + err.Error())
	}
}
```

**Why this works:** production code passes a real email/SMS `Notifier`; a test passes a fake that
records messages in a slice. Because `alertOnError` depends on the *interface*, it needs no changes to
be tested — the fake satisfies `Notifier` implicitly.

## Example 3 — Pitfall: returning a typed nil

```go
func find(id int) error {
	var e *NotFoundError // nil pointer
	if id < 0 {
		e = &NotFoundError{ID: id}
	}
	return e // BUG: even when e is nil, the returned error is non-nil
}
```

**Why this bites:** returning the pointer variable wraps a (type, nil-value) pair in the `error`
interface, so callers' `err != nil` checks are always true. Return `nil` explicitly on success:
`if e != nil { return e }; return nil`.

# Common Mistakes

- **Using the single-value assertion `x.(T)`.** It panics on mismatch; use `v, ok := x.(T)`.
- **Returning a typed nil pointer as an interface.** Return a literal `nil` for the "none" case.
- **Overusing `any`.** It discards type checking; prefer a specific interface.
- **Designing huge interfaces.** "The bigger the interface, the weaker the abstraction" — keep them
  small.

# Best Practices

- Keep interfaces **small** (often one or two methods) and define them where they're **used**, not
  where the concrete type lives.
- **Accept interfaces, return concrete types.**
- Use the comma-ok assertion and type switches for safe type inspection.
- Lean on standard interfaces (`io.Reader`, `io.Writer`, `fmt.Stringer`, `error`) so your types plug
  into the ecosystem.

# Summary

- An **interface** is a set of method signatures satisfied **implicitly** by any type with those
  methods.
- Interface values hold a **(type, value)** pair; method calls dispatch to the concrete type.
- **`any`** (the empty interface) holds anything; recover concrete types with **assertions** and
  **type switches** (comma-ok to avoid panics).
- An interface is nil only if **both** its type and value are nil — beware returning a **typed nil**.
- Prefer **small interfaces**, accept interfaces and return structs.

# Flash Cards

Q: How does a type declare that it satisfies an interface in Go?
A: It doesn't declare anything — satisfaction is implicit; a type satisfies an interface simply by having all of the interface's methods.

Q: What two things does an interface value hold?
A: A concrete type and a value of that type — the (type, value) pair that method calls dispatch on.

Q: When is an interface value equal to nil?
A: Only when both its type and its value are nil; storing a nil concrete pointer gives it a type, so the interface is non-nil (the typed-nil gotcha).

Q: What is the safe form of a type assertion, and why?
A: `v, ok := x.(T)` — the comma-ok form sets `ok` to false on a mismatch instead of panicking like the single-value form.

Q: What is `any` and what satisfies it?
A: `any` is an alias for the empty interface `interface{}`; every type satisfies it because it requires no methods.

Q: What does "accept interfaces, return structs" mean?
A: Take the smallest interface a function needs as input (for flexibility and testing), but return concrete types so callers keep full type information.

# Exercises

### Easy
Define a `Speaker` interface with a `Speak() string` method. Implement it for `Dog` and `Cat` types,
put a few in a `[]Speaker`, and print what each says in a loop.

### Medium
Write `stringify(vals []any) []string` that converts a mixed slice to strings using a type switch:
format ints and floats numerically, strings as-is, and anything else via `%v`. Test it with a mixed
slice.

### Challenging
Reproduce the typed-nil gotcha: write a function returning `error` that assigns a nil `*MyError` and
returns it, and show that the caller's `err != nil` is unexpectedly true. Then fix it, and explain in
one or two sentences exactly why the original returned a non-nil interface.

# Further Reading

- *A Tour of Go* — Interfaces and type switches: <https://go.dev/tour/methods/9>
- *Effective Go* — Interfaces and methods: <https://go.dev/doc/effective_go#interfaces>
- *The Go Programming Language Specification* — Interface types: <https://go.dev/ref/spec#Interface_types>
- *Go Code Review Comments* — Interfaces: <https://go.dev/wiki/CodeReviewComments#interfaces>
