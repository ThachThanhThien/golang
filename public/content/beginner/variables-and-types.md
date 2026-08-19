---
id: lesson-03
slug: variables-and-types
title: "Variables, Constants, and Basic Types"
level: beginner
order: 3
duration: 20
tags:
  - variables
  - types
  - constants
  - zero-values
  - iota
summary: "How Go stores data — declaring variables with var and :=, the basic types (bool, string, numeric types, byte, rune), zero values, type inference and explicit conversions, and constants including the iota generator for enumerations."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Declare variables with `var` and the short form `:=`, and know when each is allowed.
- Name Go's basic types and pick appropriate ones.
- Explain **zero values** and why Go has no uninitialized variables.
- Convert between types explicitly, and say why Go refuses implicit conversions.
- Declare **constants** and use **`iota`** to build enumerations.

# Why It Matters

Data is the raw material of every program, and Go is deliberate about how you name and type it.
Because Go is statically typed, getting types right up front means the compiler catches mismatches
before your program ever runs. And because Go gives every variable a predictable **zero value**, you
never read garbage from memory. These rules are simple, but they prevent a surprising number of bugs.

# Concept Explanation

### Declaring variables

There are two common ways to introduce a variable.

The `var` form works anywhere (including at package level) and can state the type, the value, or both:

```go
var count int          // declared, gets the zero value 0
var name string = "Ada" // explicit type and value
var ready = true        // type inferred as bool from the value
```

The short form `:=` infers the type from the value and works **only inside functions**:

```go
score := 42        // int
pi := 3.14159      // float64
greeting := "hi"   // string
```

Use `:=` for local variables (it's the common case) and `var` when you need a package-level variable
or want the explicit zero value.

### Zero values

If you declare a variable without a value, Go gives it that type's **zero value** — never random
memory:

- `0` for all numeric types
- `false` for `bool`
- `""` (empty string) for `string`
- `nil` for pointers, slices, maps, channels, functions, and interfaces

```go
var n int      // 0
var s string   // ""
var ok bool    // false
```

This means code like "declare now, assign later" is always safe.

### The basic types

- **Boolean:** `bool` (`true`/`false`).
- **String:** `string` — an immutable sequence of bytes, conventionally UTF-8 text.
- **Integers:** `int` and `uint` (signed and unsigned, sized to the platform — 64-bit on modern
  machines), plus explicitly sized `int8`, `int16`, `int32`, `int64` and their `uint` versions.
- **Floating point:** `float32` and `float64` (use `float64` unless you have a reason not to).
- **Complex:** `complex64`, `complex128` (rarely needed).

Two aliases matter for text:

- **`byte`** is an alias for `uint8` — a single 8-bit byte.
- **`rune`** is an alias for `int32` — a single Unicode **code point** (roughly, one character).

`int` is the default integer type; reach for a sized type only when you have a specific reason (a
binary format, memory pressure, or interfacing with a fixed-width protocol).

### Type inference and explicit conversion

Go infers types when it can, but it will **never** convert between types implicitly. Mixing types is
a compile error; you must convert explicitly with `T(value)`:

```go
var i int = 3
var f float64 = float64(i) // required — no automatic int→float64
var u uint = uint(f)       // required, and truncates toward zero
```

This strictness is on purpose: an implicit `int`-to-`float` conversion elsewhere is a classic source
of subtle rounding bugs. Making conversions visible keeps them honest.

### Constants and iota

A **constant** is a value fixed at compile time. Constants can be *untyped*, which lets them adapt to
context (an untyped numeric constant can be used where a `float64` or an `int` is expected):

```go
const Pi = 3.14159       // untyped float constant
const MaxRetries int = 3 // typed constant
```

For sequences of related constants, **`iota`** generates successive values within a `const` block. It
starts at 0 and increments by one for each line:

```go
const (
	Sunday = iota // 0
	Monday        // 1
	Tuesday       // 2
	Wednesday     // 3
)
```

`iota` is the idiomatic way to build an **enumeration** (a fixed set of named values). You can do
arithmetic with it too, e.g. `1 << iota` for powers of two.

# Key Terminology

- **Variable** — a named storage location holding a value of a fixed type.
- **`var` / `:=`** — the long declaration form (anywhere) and short inferred form (inside functions).
- **Zero value** — the default value a variable gets when declared without one.
- **Type inference** — the compiler deducing a type from a value.
- **Conversion** — explicitly changing a value's type with `T(v)`; Go never does this implicitly.
- **Constant** — a value fixed at compile time; may be typed or untyped.
- **`iota`** — a constant generator that produces 0, 1, 2, … within a `const` block.
- **`byte` / `rune`** — aliases for `uint8` (a byte) and `int32` (a Unicode code point).

# Options and Trade-offs

| Choice | Option A | Option B | How to choose |
| ------ | -------- | -------- | ------------- |
| Local declaration | `var x int = 0` | `x := 0` | `:=` for locals; `var` when you want the explicit zero value or a package-level var |
| Integer type | `int` | sized (`int64`, `uint8`, …) | Default to `int`; use sized types for binary formats or tight memory |
| Float type | `float32` | `float64` | `float64` by default (more precision); `float32` only to save space |
| Fixed set of names | many `const` lines | `iota` block | Use `iota` for enumerations so values stay ordered and gap-free |

# Worked Example

Watch how zero values and conversion interact:

```go
package main

import "fmt"

func main() {
	var total int       // zero value 0
	prices := []int{5, 8, 12}
	for _, p := range prices {
		total += p
	}
	count := len(prices)
	average := float64(total) / float64(count) // convert before dividing
	fmt.Printf("total=%d count=%d average=%.2f\n", total, count, average)
}
```

Output:

```text
total=25 count=3 average=8.33
```

The conversions `float64(total)` and `float64(count)` are required: dividing two `int`s would do
**integer** division (discarding the fraction) and give `8`, not `8.33`. Converting first keeps the
decimals.

# Real World Analogy

Think of variables as **labeled jars** on a shelf. When you set out a new jar you always put a
sensible default inside — an empty jar for a string, a zero for a number — so you never reach in and
grab something rotten (that's the zero value). And Go won't let you pour the contents of a "grams"
jar into a "liters" jar without deliberately measuring the conversion first — you must state the
conversion out loud (`float64(x)`), so unit mix-ups can't happen by accident.

# Examples

## Example 1 — Basic: declarations and zero values

```go
package main

import "fmt"

func main() {
	var a int
	var b string
	var c bool
	d := 3.5
	fmt.Printf("%d %q %t %v\n", a, b, c, d)
}
```

Output:

```text
0 "" false 3.5
```

**Why this works:** `a`, `b`, and `c` were declared without values, so they hold their zero values
(`0`, `""`, `false`). The `%q` verb quotes the empty string so you can see it's empty.

## Example 2 — Real-world: an enumeration with iota

```go
package main

import "fmt"

type LogLevel int

const (
	Debug LogLevel = iota
	Info
	Warn
	Error
)

func main() {
	level := Warn
	fmt.Println("level value:", int(level)) // 2
}
```

**Why this works:** `iota` numbers the levels 0–3 in order, so adding a new level in the middle later
just requires inserting a line. Defining a named type `LogLevel` makes the values self-documenting.

## Example 3 — Pitfall: integer division surprise

```go
package main

import "fmt"

func main() {
	ratio := 7 / 2         // both ints → integer division
	fmt.Println(ratio)     // 3, not 3.5
	real := 7.0 / 2.0      // at least one float → 3.5
	fmt.Println(real)
}
```

**Why this bites:** `7 / 2` uses integer division and throws away the remainder, giving `3`. To get
`3.5`, at least one operand must be a floating-point value (`7.0`, or `float64(x)`).

# Common Mistakes

- **Expecting decimals from integer division.** `7 / 2` is `3`; convert to `float64` first.
- **Trying implicit conversions.** `var f float64 = i` (where `i` is an `int`) won't compile; write
  `float64(i)`.
- **Using `:=` at package level.** The short form only works inside functions; use `var` outside.
- **Declaring a variable you never use.** Go treats an unused local variable as a **compile error**,
  not a warning.

# Best Practices

- Prefer `:=` for locals and `int`/`float64`/`string` unless you have a reason to be specific.
- Let zero values work for you: often you don't need to assign an initial value at all.
- Use `iota` for enumerations, wrapped in a named type for clarity.
- Keep conversions explicit and near where the units actually change.

# Summary

- Declare with `var` (anywhere) or `:=` (inside functions, type inferred).
- Every variable has a defined **zero value** — Go has no uninitialized memory.
- Basic types include `bool`, `string`, sized and platform integers, `float32`/`float64`, and the
  aliases `byte` (uint8) and `rune` (int32).
- Conversions are always **explicit** (`T(v)`); Go never converts types on its own.
- **Constants** are compile-time values; **`iota`** generates enumerations cleanly.

# Flash Cards

Q: What is the zero value of an `int`, a `string`, a `bool`, and a pointer?
A: `0`, `""` (empty string), `false`, and `nil`, respectively — Go gives every declared variable a defined zero value.

Q: Where can you use `:=` and where must you use `var`?
A: `:=` works only inside functions; `var` works anywhere, including package level, and is needed when you want just the zero value or a package-level variable.

Q: Why does `float64(x)` sometimes appear before a division?
A: Because dividing two `int`s does integer division (dropping the fraction); converting to `float64` first keeps the decimal result.

Q: What are `byte` and `rune` aliases for, and what do they represent?
A: `byte` is an alias for `uint8` (one 8-bit byte); `rune` is an alias for `int32` (one Unicode code point).

Q: What does `iota` produce inside a `const` block?
A: Successive integer values starting at 0 and incrementing by one per line — the idiomatic way to build enumerations.

Q: What happens if you declare a local variable and never use it?
A: Go refuses to compile — an unused local variable is a compile error, not a warning.

# Exercises

### Easy
Declare (using `var` and `:=`) one variable of each: `int`, `float64`, `string`, and `bool`. Print
them with a single `fmt.Printf` using the verbs `%d`, `%f`, `%q`, and `%t`.

### Medium
Write a program that converts a temperature. Store a Celsius value as an `int`, convert it to
`float64`, compute Fahrenheit as `c*9/5 + 32`, and print it with two decimals. Explain why the
conversion is necessary for a correct result.

### Challenging
Define a named type `Direction int` with an `iota` enumeration for `North`, `East`, `South`, `West`.
Add a `String()`-free lookup: make a `[]string` of names indexed by the direction, and print the name
for a given direction value. Then explain what would break if the order of the `const` block changed.

# Further Reading

- *A Tour of Go* — Basics (variables, types, constants): <https://go.dev/tour/basics/>
- *Effective Go* — Names and Constants: <https://go.dev/doc/effective_go#constants>
- *The Go Programming Language Specification* — Types and Constants: <https://go.dev/ref/spec#Types>
