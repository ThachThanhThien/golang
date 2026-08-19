---
id: lesson-15
slug: generics
title: "Generics and Type Parameters"
level: intermediate
order: 15
duration: 20
tags:
  - generics
  - type-parameters
  - constraints
  - comparable
  - any
summary: "Writing code that works across types without giving up type safety — type parameters and constraints (added in Go 1.18), the any and comparable constraints, type sets with unions and the ~ approximation, generic data structures, call-site inference, and when generics are the right tool."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what **generics** solve and when to use them.
- Write **generic functions** with **type parameters** and **constraints**.
- Use the built-in constraints **`any`** and **`comparable`**, and constraint interfaces.
- Define **generic types** like a type-safe stack.
- Recognize generics' **limits** and avoid over-using them.

# Why It Matters

Before generics, writing a function that worked for many types meant either copying it for each type
or using `interface{}` and losing all compile-time type safety (and paying for runtime type
assertions). **Generics**, added in **Go 1.18**, let you write one function or data structure that
works over many types **while keeping full type checking**. They're a sharp tool — great for
containers and algorithms, easy to overuse — so learning *when* to reach for them matters as much as
the syntax.

# Concept Explanation

### The problem generics solve

Suppose you want the maximum of two values. Without generics you'd write `MaxInt`, `MaxFloat64`,
`MaxString`… all identical but for the type. With generics you write it once:

```go
import "cmp"

func Max[T cmp.Ordered](a, b T) T {
	if a > b {
		return a
	}
	return b
}

// Max(3, 5) == 5 ; Max("a", "b") == "b" ; Max(2.5, 1.0) == 2.5
```

`[T cmp.Ordered]` declares a **type parameter** `T` **constrained** to ordered types (numbers and
strings). The function body is written once and type-checks for every `T` the constraint allows.

### Type parameters and constraints

A **type parameter** goes in square brackets after the function name; each has a **constraint** — an
interface describing which types are allowed:

```go
func PrintAll[T any](items []T) {
	for _, it := range items {
		fmt.Println(it)
	}
}
```

- **`any`** (alias for `interface{}`) allows any type — used when the body doesn't need special
  operations.
- **`comparable`** allows types usable with `==` and `!=` — needed for map keys or equality checks:

```go
func Contains[T comparable](s []T, target T) bool {
	for _, v := range s {
		if v == target { // == requires the comparable constraint
			return true
		}
	}
	return false
}
```

### Constraints are type sets

A constraint interface can list **methods** (like any interface) *and* a **type set** — an explicit
set of allowed underlying types, joined with `|`:

```go
type Number interface {
	~int | ~int64 | ~float64
}

func Sum[T Number](nums []T) T {
	var total T
	for _, n := range nums {
		total += n // + is allowed because every type in the set supports it
	}
	return total
}
```

The **`~`** ("approximation") means "any type whose **underlying type** is this" — so a
`type Celsius float64` still satisfies `~float64`. The standard `cmp.Ordered` constraint (Go 1.21) is
defined this way, covering all ordered built-in types.

### Generic types

Types can take type parameters too — the basis for type-safe containers:

```go
type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }

func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	v := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return v, true
}

// use: var s Stack[int]; s.Push(1); v, ok := s.Pop()
```

`Stack[int]` and `Stack[string]` are distinct, fully type-checked types — no `interface{}`, no
assertions when popping.

### Type inference

You usually don't write the type argument explicitly — the compiler **infers** it from the
arguments:

```go
Max(3, 5)          // T inferred as int
Contains([]string{"a"}, "a") // T inferred as string
```

You can be explicit when inference can't tell (`Max[float64](3, 5)`), but that's rare.

### Limits

- **Methods cannot have their own type parameters** — only the receiver type's parameters are
  available. (`func (s Stack[T]) Map[U any](...)` is not allowed.)
- Generics don't replace interfaces. Use an **interface** when you want dynamic dispatch over
  different behaviors; use **generics** when you want one algorithm over many types with the same
  operations.
- Since Go 1.21, the standard **`slices`** and **`maps`** packages provide generic helpers
  (`slices.Contains`, `slices.Sort`, `maps.Keys`, …) so you often don't need to write your own.

# Key Terminology

- **Generics** — code parameterized over types, added in Go 1.18.
- **Type parameter** — a placeholder type in brackets, e.g. `[T any]`.
- **Constraint** — an interface limiting which types a type parameter accepts.
- **`any`** — alias for `interface{}`; the "no restriction" constraint.
- **`comparable`** — the constraint for types usable with `==`/`!=`.
- **Type set** — the set of concrete types a constraint permits, joined with `|`.
- **`~T` (approximation)** — matches any type whose underlying type is `T`.
- **Type inference** — the compiler deducing type arguments from the call.

# Options and Trade-offs

| Situation | Generics | Interface | Copy per type |
| --------- | -------- | --------- | ------------- |
| Same algorithm over many types | Best fit | Loses type info, needs assertions | Duplication |
| Different behaviors behind one API | Awkward | Best fit (dynamic dispatch) | — |
| Type-safe container (stack, set) | Best fit | `interface{}` + assertions | — |
| Just one concrete type | Overkill | — | Simplest |

The rule of thumb: reach for generics to **remove real duplication** across types with identical
operations. If you have one type, or you need runtime polymorphism over different behaviors, generics
aren't the answer.

# Worked Example

A generic `Map` function transforming a slice of one type into another:

```go
package main

import (
	"fmt"
	"strconv"
)

// Map applies f to each element, producing a new slice of type []U.
func Map[T, U any](in []T, f func(T) U) []U {
	out := make([]U, len(in))
	for i, v := range in {
		out[i] = f(v)
	}
	return out
}

func main() {
	nums := []int{1, 2, 3}
	strs := Map(nums, func(n int) string { return strconv.Itoa(n * n) })
	fmt.Println(strs)
}
```

Output:

```text
[1 4 9]
```

`Map` has two type parameters: `T` (input element) and `U` (output element). The compiler infers
`T = int` and `U = string` from the arguments, and the result is a fully typed `[]string` — no casts
needed.

# Real World Analogy

A generic function is like a **cookie cutter with an adjustable shape**. The *recipe* (the algorithm)
is the same no matter what you're cutting; you just set the cutter to "star" or "circle" (the type
parameter) and stamp out perfectly typed cookies. The **constraint** is the rule "this cutter only
works on rolled dough, not soup" — it tells the compiler which materials (types) the cutter is
allowed to shape, so you can't accidentally try to stamp a liquid.

# Examples

## Example 1 — Basic: a generic Contains

```go
func Contains[T comparable](s []T, target T) bool {
	for _, v := range s {
		if v == target {
			return true
		}
	}
	return false
}

// Contains([]int{1, 2, 3}, 2) == true
// Contains([]string{"a", "b"}, "z") == false
```

**Why this works:** the `comparable` constraint permits `==`, and type inference figures out `T` from
each call — one function serves ints, strings, and any comparable type.

## Example 2 — Real-world: a type-safe Set

```go
type Set[T comparable] map[T]struct{}

func NewSet[T comparable](items ...T) Set[T] {
	s := make(Set[T])
	for _, it := range items {
		s[it] = struct{}{}
	}
	return s
}

func (s Set[T]) Has(v T) bool { _, ok := s[v]; return ok }
```

**Why this works:** `Set[string]` and `Set[int]` are separate, checked types built on a map with an
empty-struct value (zero memory). Membership tests are compile-time safe — no `interface{}` keys, no
assertions.

## Example 3 — Pitfall: reaching for generics when an interface fits

```go
// Overkill: these types have DIFFERENT behavior, not one shared algorithm
func Area[T Circle | Rectangle](shape T) float64 { /* ...how? */ }
```

**Why this bites:** `Circle` and `Rectangle` compute area *differently*, so there's no single generic
body — you'd need per-type logic anyway. The right tool is an **interface** (`Shape` with an
`Area()` method) and dynamic dispatch. Generics shine when the *operation is the same* across types,
not when the behavior differs.

# Common Mistakes

- **Using generics for polymorphism over different behaviors.** Use an interface instead.
- **Forgetting `comparable` for `==`.** `any` doesn't permit equality; use `comparable` when you
  compare.
- **Trying method type parameters.** Methods can only use the receiver's type parameters.
- **Reinventing `slices`/`maps` helpers.** Since Go 1.21 the standard library already has many.
- **Over-parameterizing.** If there's one concrete type, a plain function is clearer.

# Best Practices

- Use generics to eliminate genuine duplication across types with identical operations.
- Pick the **narrowest** constraint that works (`comparable`, `cmp.Ordered`, a custom type set) — it
  documents intent and catches misuse.
- Prefer the standard `slices`, `maps`, and `cmp` packages before writing your own generic helpers.
- Let **type inference** do the work; add explicit type arguments only when needed.

# Summary

- **Generics** (Go 1.18) let one function or type work across many types with full type safety.
- A **type parameter** carries a **constraint** — an interface of methods and/or a **type set**.
- **`any`** allows any type; **`comparable`** allows `==`/`!=`; `~T` matches underlying types.
- **Generic types** enable type-safe containers; the compiler usually **infers** type arguments.
- Methods can't add type parameters; use generics for shared algorithms and **interfaces** for
  differing behaviors — and lean on `slices`/`maps`/`cmp`.

# Flash Cards

Q: In which Go version were generics (type parameters) added?
A: Go 1.18 — along with the `any` alias for `interface{}`.

Q: What does the `comparable` constraint permit that `any` does not?
A: Use of the `==` and `!=` operators — needed for equality checks and map keys; `any` allows neither.

Q: What does `~float64` mean in a constraint?
A: "Any type whose underlying type is `float64`" — so a defined type like `type Celsius float64` also satisfies it, not just `float64` itself.

Q: Can a method declare its own type parameters?
A: No — a method may only use the type parameters of its receiver type; it cannot introduce new ones.

Q: When should you use an interface instead of generics?
A: When the types have different behaviors you want to dispatch on dynamically; generics fit one shared algorithm applied across many types with the same operations.

Q: What standard packages (added in Go 1.21) provide ready-made generic helpers?
A: `slices` and `maps` (with `cmp` for ordering) — e.g. `slices.Contains`, `slices.Sort`, `maps.Keys`.

# Exercises

### Easy
Write a generic `First[T any](s []T) (T, bool)` that returns the first element and `true`, or the zero
value and `false` for an empty slice. Call it with an `[]int` and a `[]string`.

### Medium
Write `Filter[T any](s []T, keep func(T) bool) []T` returning only the elements for which `keep`
returns true. Use it to keep even numbers from an `[]int` and short strings from a `[]string`.

### Challenging
Implement a generic `Set[T comparable]` with `Add`, `Has`, and `Union` methods. Then compare your
`Has` against `slices.Contains` on a slice, and explain the trade-offs (lookup speed, memory, ordering)
between a set and a slice for membership tests.

# Further Reading

- *Tutorial: Getting started with generics*: <https://go.dev/doc/tutorial/generics>
- *An Introduction To Generics* (Go blog): <https://go.dev/blog/intro-generics>
- *`cmp`*, *`slices`*, and *`maps`* packages: <https://pkg.go.dev/cmp> · <https://pkg.go.dev/slices> · <https://pkg.go.dev/maps>
- *The Go Programming Language Specification* — Type parameters: <https://go.dev/ref/spec#Type_parameter_declarations>
