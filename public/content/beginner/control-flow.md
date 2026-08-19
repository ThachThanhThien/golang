---
id: lesson-05
slug: control-flow
title: "Control Flow: if, for, switch"
level: beginner
order: 5
duration: 18
tags:
  - control-flow
  - for
  - switch
  - if
  - loops
summary: "Making decisions and repeating work in Go — if with an optional init statement, the single for loop in all its forms (including range over slices, maps, and strings), and switch with its no-fallthrough default and type-free multi-way form."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Write `if`/`else` including the optional init statement.
- Use Go's single loop keyword, **`for`**, in all its forms.
- Iterate collections and strings with **`range`**.
- Write **`switch`** statements and know why Go doesn't fall through by default.
- Understand how the loop variable behaves per iteration (Go 1.22+).

# Why It Matters

Every program branches and repeats. Go keeps control flow deliberately small: one loop keyword
instead of `for`/`while`/`do`, and a `switch` that's safer than in many languages because it doesn't
accidentally "fall through" from one case to the next. Fewer constructs means fewer surprises — but
each one has a couple of Go-specific twists worth learning up front.

# Concept Explanation

### if and the init statement

`if` needs no parentheses around the condition, and braces are always required:

```go
if score >= 60 {
	fmt.Println("pass")
} else {
	fmt.Println("fail")
}
```

`if` can start with a short **init statement** whose variables are scoped to the `if`/`else` — perfect
for the "call, then check" pattern:

```go
if err := doThing(); err != nil {
	return err
}
// err is not in scope here
```

Keeping `err` scoped to the `if` avoids leaking a name into the rest of the function.

### for: the only loop

Go has exactly one loop keyword, `for`, which covers every looping need.

The classic three-part form:

```go
for i := 0; i < 5; i++ {
	fmt.Println(i)
}
```

Drop the init and post to get a **while** loop:

```go
for count < 10 {
	count++
}
```

Drop the condition entirely for an **infinite** loop (exit with `break` or `return`):

```go
for {
	if done() {
		break
	}
}
```

Since Go 1.22 you can also range over an integer count:

```go
for i := range 3 { // i = 0, 1, 2
	fmt.Println(i)
}
```

### range: iterating collections

`for ... range` walks a slice, array, map, string, or channel:

```go
nums := []int{10, 20, 30}
for i, v := range nums {   // index and value
	fmt.Println(i, v)
}

for _, v := range nums {   // value only (discard index)
	fmt.Println(v)
}

scores := map[string]int{"Ada": 90, "Alan": 85}
for name, score := range scores { // key and value; order is randomized!
	fmt.Println(name, score)
}

for i, r := range "héllo" {        // byte index i, rune r
	fmt.Println(i, string(r))
}
```

Three things to remember: ranging a **map** visits keys in a **random** order; ranging a **string**
yields **runes** (with `i` the byte offset, so it can jump by more than one for multibyte
characters); and `range` copies each element into the loop value.

**Loop variable scope (Go 1.22+):** each iteration gets its own copy of the loop variable, so
capturing it in a goroutine or closure is safe. Before Go 1.22 the variable was shared across
iterations — the classic bug where every captured closure saw the final value.

### switch

`switch` compares a value against cases. Unlike C, Go **does not fall through** by default — the
matching case runs and the switch ends, so no `break` is needed:

```go
switch day {
case "Sat", "Sun":       // multiple values per case
	fmt.Println("weekend")
case "Fri":
	fmt.Println("almost weekend")
default:
	fmt.Println("weekday")
}
```

If you *want* to continue into the next case, add an explicit `fallthrough`. A `switch` with **no
expression** acts as a clean multi-way `if`/`else`:

```go
switch {
case score >= 90:
	grade = "A"
case score >= 80:
	grade = "B"
default:
	grade = "C"
}
```

There is also a **type switch** (`switch v := x.(type)`) for interfaces, covered in the interfaces
lesson.

### break, continue, and labels

`break` exits the innermost `for`/`switch`; `continue` skips to the next iteration. For nested loops,
a **label** lets you break or continue an outer loop:

```go
outer:
	for _, row := range grid {
		for _, cell := range row {
			if cell == target {
				break outer // leave both loops
			}
		}
	}
```

# Key Terminology

- **Init statement** — a short statement before an `if`/`switch` condition, scoped to that block.
- **`for`** — Go's only loop keyword; covers counting, while, infinite, and range loops.
- **`range`** — iterates a slice, array, map, string, or channel.
- **Fallthrough** — explicitly continuing into the next `switch` case (off by default in Go).
- **Type switch** — a `switch` on the dynamic type of an interface value.
- **Label** — a name on a loop so `break`/`continue` can target an outer loop.

# Options and Trade-offs

| Need | Use | Note |
| ---- | --- | ---- |
| Count a fixed number of times | `for i := 0; i < n; i++` or `for i := range n` | `range n` (Go 1.22+) is concise |
| Loop while a condition holds | `for cond {` | Go's "while" |
| Loop forever until an event | `for {` + `break`/`return` | Common in servers and workers |
| Walk a collection | `for i, v := range coll` | Use `_` to drop the index |
| Multi-way branch on a value | `switch value {` | Cleaner than long `if`/`else if` |
| Multi-way branch on conditions | `switch {` (no expression) | Reads like `if`/`else if` |

# Worked Example

Count how many vowels are in a word, correctly handling multibyte input by ranging over runes:

```go
package main

import "fmt"

func main() {
	word := "gophér"
	vowels := 0
	for _, r := range word { // r is a rune, not a byte
		switch r {
		case 'a', 'e', 'i', 'o', 'u', 'é':
			vowels++
		}
	}
	fmt.Printf("%q has %d vowels\n", word, vowels)
}
```

Output:

```text
"gophér" has 2 vowels
```

Ranging with `range word` gives us each **rune**, so `é` is treated as one character. Iterating bytes
instead (`word[i]`) would split `é` into two bytes and miscount.

# Real World Analogy

Go's `switch` is like a **train switch (a set of points) at a junction**: the train takes exactly one
track and continues on its way — it doesn't magically hop onto the next track too. In many older
languages the train would keep rolling onto every track after the one it chose unless you slammed on
the brakes (`break`) at each. Go flips the default to the safe behavior: one track, then done. If you
really want to roll onto the next track, you must lay down a `fallthrough` rail on purpose.

# Examples

## Example 1 — Basic: FizzBuzz with switch

```go
package main

import "fmt"

func main() {
	for i := 1; i <= 15; i++ {
		switch {
		case i%15 == 0:
			fmt.Println("FizzBuzz")
		case i%3 == 0:
			fmt.Println("Fizz")
		case i%5 == 0:
			fmt.Println("Buzz")
		default:
			fmt.Println(i)
		}
	}
}
```

**Why this works:** the expression-less `switch` checks each condition in order and runs the first
match, which reads more cleanly than a chain of `if`/`else if`.

## Example 2 — Real-world: retry with an infinite loop and break

```go
func fetchWithRetry(max int) error {
	for attempt := 1; ; attempt++ { // no condition = loop until we break/return
		err := fetch()
		if err == nil {
			return nil
		}
		if attempt >= max {
			return fmt.Errorf("giving up after %d attempts: %w", attempt, err)
		}
		time.Sleep(time.Second)
	}
}
```

**Why this works:** the conditionless `for` retries indefinitely, and the code inside decides when to
succeed (`return nil`) or give up (`return` an error) — a common, readable retry shape.

## Example 3 — Pitfall: relying on map iteration order

```go
scores := map[string]int{"a": 1, "b": 2, "c": 3}
for k := range scores {
	fmt.Print(k, " ") // order is different run to run!
}
```

**Why this bites:** Go randomizes map iteration order on purpose, so code that assumes a stable order
(for output, tests, or logic) will be flaky. If you need order, collect the keys into a slice and
`sort` them first.

# Common Mistakes

- **Expecting `switch` cases to fall through.** They don't in Go; use `fallthrough` only if you mean
  it.
- **Assuming map order is stable.** It's randomized; sort keys when order matters.
- **Indexing a string expecting characters.** `s[i]` is a byte; `range` gives runes.
- **Forgetting braces.** Go requires `{ }` on every `if`/`for`/`switch` body, even one line.

# Best Practices

- Use `if err := f(); err != nil { ... }` to keep short-lived variables tightly scoped.
- Prefer an expression-less `switch` over long `if`/`else if` chains.
- When you need a stable map order, extract keys to a slice and `sort` it.
- Use labeled `break`/`continue` sparingly, only to escape genuinely nested loops.

# Summary

- `if` needs no parentheses, always uses braces, and can carry a scoped **init statement**.
- **`for`** is the only loop: three-part, while-style, infinite, and `range` (including `range n`).
- **`range`** copies each element; map order is **randomized** and strings yield **runes**.
- **`switch`** does **not** fall through by default; multiple values per case and an expression-less
  form are idiomatic.
- Since Go 1.22 each loop iteration has its own loop variable, making capture safe.

# Flash Cards

Q: How many loop keywords does Go have, and what is it/are they?
A: Exactly one — `for` — which covers counting loops, while-style loops, infinite loops, and range iteration.

Q: Does a Go `switch` fall through to the next case by default?
A: No. The matching case runs and the switch ends; you must write an explicit `fallthrough` to continue into the next case.

Q: What order does ranging over a map visit its keys?
A: A randomized order that can differ each run — never rely on map iteration order; sort keys if you need a stable order.

Q: When you `range` over a string, what do you get for the value?
A: A rune (Unicode code point), with the index being the byte offset — so it can advance by more than one for multibyte characters.

Q: What does an `if` init statement like `if err := f(); err != nil` give you?
A: A variable (`err`) scoped only to the `if`/`else`, so it doesn't leak into the surrounding function.

Q: Since which Go version does each loop iteration get its own copy of the loop variable?
A: Go 1.22 — before that the loop variable was shared across iterations, a classic source of closure/goroutine bugs.

# Exercises

### Easy
Write a `for` loop that prints the even numbers from 2 to 20 inclusive. Then rewrite it using
`for i := range n` style (Go 1.22+) if your Go version supports it.

### Medium
Given a `[]string` of words, use `switch` on the first letter to count how many start with a vowel
versus a consonant, ignoring case. Print both counts.

### Challenging
Write a function that takes a `map[string]int` and prints its entries in **sorted key order**.
Explain why you had to sort, and what would go wrong (especially in tests) if you ranged the map
directly.

# Further Reading

- *A Tour of Go* — Flow control (for, if, switch): <https://go.dev/tour/flowcontrol/1>
- *Effective Go* — Control structures: <https://go.dev/doc/effective_go#control-structures>
- *The Go Programming Language Specification* — For statements and Switch statements: <https://go.dev/ref/spec#For_statements>
