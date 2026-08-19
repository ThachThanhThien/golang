---
id: lesson-07
slug: structs-and-methods
title: "Structs and Methods"
level: beginner
order: 7
duration: 20
tags:
  - structs
  - methods
  - receivers
  - embedding
  - composition
summary: "Modeling data and behavior in Go — defining structs and creating them, attaching methods with value versus pointer receivers (and when each matters), constructor conventions, and building bigger types by embedding smaller ones instead of using inheritance."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Define **structs** and create them with literals and pointers.
- Attach **methods** to a type and choose **value vs pointer receivers**.
- Explain how the receiver choice affects mutation and interface satisfaction.
- Use the **`NewXxx`** constructor convention.
- Build larger types with **embedding** (composition) instead of inheritance.

# Why It Matters

Structs are how Go groups related data, and methods are how you attach behavior to that data. There
are no classes in Go — a struct plus its methods plays that role. The one decision you'll make over
and over is **value or pointer receiver**, and getting it right determines whether your methods can
change the object and whether your type satisfies an interface. Go's approach to reuse — **composition
by embedding** rather than inheritance — is also different from many languages, and learning it early
prevents a lot of "where's my base class?" confusion.

# Concept Explanation

### Defining and creating structs

A **struct** is a typed collection of named fields:

```go
type Point struct {
	X int
	Y int
}
```

Create values a few ways:

```go
p1 := Point{X: 1, Y: 2}  // keyed literal (preferred — clear and order-independent)
p2 := Point{3, 4}        // positional literal (fragile if fields change)
var p3 Point             // zero value: {X: 0, Y: 0}
p4 := &Point{X: 5, Y: 6} // pointer to a new Point
```

Access fields with a dot: `p1.X`. Go automatically dereferences struct pointers, so `p4.X` works
without writing `(*p4).X`. The **zero value** of a struct has every field at its own zero value, which
often makes a struct usable with no initialization.

### Methods and receivers

A **method** is a function with a **receiver** — the value it's attached to, written before the name:

```go
func (p Point) Distance() float64 {
	return math.Sqrt(float64(p.X*p.X + p.Y*p.Y))
}
// call it: p1.Distance()
```

The receiver can be a **value** (`p Point`) or a **pointer** (`p *Point`):

- A **value receiver** operates on a **copy**, so it can't change the original. Use it for small
  types or methods that only read.
- A **pointer receiver** operates on the original, so it **can mutate** it — and it avoids copying a
  large struct. Use it when the method must modify the receiver, or the struct is big.

```go
func (p *Point) MoveBy(dx, dy int) {
	p.X += dx // modifies the original because the receiver is a pointer
	p.Y += dy
}
```

**Consistency rule:** if any method of a type needs a pointer receiver, give *all* its methods pointer
receivers, so the type's method set is uniform.

Methods aren't limited to structs — you can attach a method to **any named type**, e.g.
`type Celsius float64` with a `func (c Celsius) String() string`.

### Constructors: the NewXxx convention

Go has no special constructor syntax. The convention is a package-level function named `NewT` (or
`New` if the package is named after the type) that returns a ready-to-use value:

```go
func NewCounter(start int) *Counter {
	return &Counter{count: start}
}
```

Constructors are the place to validate inputs and set up fields that shouldn't be left at their zero
value.

### Embedding: composition over inheritance

Go has **no inheritance**. Instead you **embed** one type inside another to reuse its fields and
methods. Write the embedded type with no field name:

```go
type Animal struct {
	Name string
}

func (a Animal) Speak() string { return a.Name + " makes a sound" }

type Dog struct {
	Animal // embedded — Dog gets Animal's fields and methods
	Breed  string
}

func main() {
	d := Dog{Animal: Animal{Name: "Rex"}, Breed: "Corgi"}
	fmt.Println(d.Name)     // promoted field from Animal
	fmt.Println(d.Speak())  // promoted method from Animal
}
```

The embedded type's exported fields and methods are **promoted** to the outer type, so `d.Name` and
`d.Speak()` work directly. This is composition: `Dog` *has an* `Animal`, and reuses its behavior,
without a class hierarchy. You can override a promoted method simply by defining a method with the
same name on the outer type.

# Key Terminology

- **Struct** — a composite type grouping named, typed fields.
- **Field** — a named member of a struct.
- **Method** — a function attached to a type via a receiver.
- **Receiver** — the value a method operates on (value or pointer).
- **Value receiver / pointer receiver** — operate on a copy / on the original.
- **Method set** — the methods callable on a type (differs between `T` and `*T`).
- **Constructor (`NewXxx`)** — a function that builds and returns a ready-to-use value.
- **Embedding** — placing one type inside another so its fields/methods are **promoted**.

# Options and Trade-offs

| Question | Value receiver | Pointer receiver | Choose |
| -------- | -------------- | ---------------- | ------ |
| Method mutates the receiver? | can't | can | Pointer if it must change fields |
| Struct is large? | copies each call | no copy | Pointer to avoid copying |
| Type is small & immutable (e.g. `Point`)? | fine | also fine | Value is simplest |
| Consistency | — | — | Make all methods the same kind |

| Reuse approach | Inheritance (other languages) | Embedding (Go) |
| -------------- | ----------------------------- | -------------- |
| Relationship | "is-a" subclassing | "has-a" composition with promotion |
| Overriding | override base methods | define a same-named method on the outer type |

# Worked Example

See how receiver choice decides whether a change sticks:

```go
package main

import "fmt"

type Counter struct{ n int }

func (c Counter) IncValue()  { c.n++ } // operates on a copy — no effect
func (c *Counter) IncPtr()   { c.n++ } // operates on the original

func main() {
	c := Counter{}
	c.IncValue()
	fmt.Println("after IncValue:", c.n) // 0
	c.IncPtr()
	fmt.Println("after IncPtr:", c.n)   // 1
}
```

Output:

```text
after IncValue: 0
after IncPtr: 1
```

`IncValue` incremented a **copy** that was thrown away when the method returned, so `c.n` stayed `0`.
`IncPtr` used a pointer receiver and changed the actual `c`.

# Real World Analogy

A value receiver is like giving someone a **photocopy of a form** and asking them to fill it in — the
original on your desk is unchanged no matter what they write. A pointer receiver is like handing them
**the original form itself** — their edits are the edits. Embedding is like building a **deluxe
kitchen appliance that contains a standard blender inside it**: you get all the blender's buttons for
free (promoted methods), and you can add your own buttons or relabel one (override) — but the blender
is a *component you contain*, not a parent you inherit from.

# Examples

## Example 1 — Basic: a struct with a method and a constructor

```go
package main

import "fmt"

type Rectangle struct{ W, H float64 }

func NewRectangle(w, h float64) Rectangle { return Rectangle{W: w, H: h} }

func (r Rectangle) Area() float64 { return r.W * r.H }

func main() {
	r := NewRectangle(3, 4)
	fmt.Println("area:", r.Area()) // 12
}
```

**Why this works:** `Area` only reads, so a value receiver is fine. The `NewRectangle` constructor is
a plain function returning a ready value — Go's idiom.

## Example 2 — Real-world: a mutable bank account with pointer receivers

```go
type Account struct{ balance int }

func (a *Account) Deposit(amount int)  { a.balance += amount }
func (a *Account) Withdraw(amount int) error {
	if amount > a.balance {
		return fmt.Errorf("insufficient funds: have %d, want %d", a.balance, amount)
	}
	a.balance -= amount
	return nil
}
```

**Why this works:** deposits and withdrawals must change the account, so both methods use pointer
receivers. `Withdraw` also returns an error for the expected failure case rather than panicking.

## Example 3 — Pitfall: value receiver that "loses" mutations

```go
type Config struct{ items map[string]string }

func (c Config) Set(k, v string) { c.items[k] = v } // works by accident!
```

**Why this bites:** `Set` uses a **value** receiver, so it copies the struct — yet the write "sticks"
because the copied `items` map header still points at the **same underlying map**. That accidental
success hides a real bug: a method that *looks* like it can't mutate is mutating shared state. If
`Set` instead needed to reassign a field (like a slice via `append`), the value receiver would
silently fail. Use a pointer receiver whenever a method is meant to modify the receiver, so the intent
is honest and correct in every case.

# Common Mistakes

- **Using a value receiver for a mutating method.** The change happens on a copy and is lost.
- **Mixing receiver kinds on one type.** Keep them consistent (all pointer or all value).
- **Positional struct literals.** `T{a, b}` breaks silently if fields are reordered; prefer keyed
  literals.
- **Looking for inheritance.** Go composes with embedding; there are no base classes.

# Best Practices

- Choose a pointer receiver when the method mutates the receiver or the struct is large; be
  consistent across the type.
- Use keyed struct literals (`T{Field: value}`) for clarity and resilience to field changes.
- Provide `NewXxx` constructors when a type needs validation or non-zero setup.
- Prefer embedding to share behavior; override by defining a same-named method on the outer type.

# Summary

- A **struct** groups named fields; its zero value has every field zeroed and is often usable as-is.
- **Methods** attach behavior via a **receiver**; **value** receivers get a copy, **pointer**
  receivers can mutate the original and avoid copying.
- Keep a type's receivers **consistent**, and use pointer receivers whenever mutation is intended.
- Constructors are ordinary `NewXxx` functions — Go has no special constructor syntax.
- Reuse comes from **embedding** (composition with promotion), not inheritance.

# Flash Cards

Q: What is the difference between a value receiver and a pointer receiver?
A: A value receiver operates on a copy (can't change the original); a pointer receiver operates on the original, so it can mutate it and avoids copying a large struct.

Q: If a method needs to modify its receiver, which receiver type must it use?
A: A pointer receiver (`func (t *T) ...`) — a value receiver would modify a discarded copy.

Q: How do you create a "constructor" in Go?
A: With an ordinary function, by convention named `NewT`, that builds and returns a ready-to-use value (often a pointer); Go has no special constructor syntax.

Q: How does Go reuse behavior across types without inheritance?
A: By embedding one type inside another; the embedded type's exported fields and methods are promoted to the outer type.

Q: Why prefer keyed struct literals like `Point{X: 1, Y: 2}` over positional ones?
A: Keyed literals are order-independent and don't break silently when fields are added or reordered.

Q: Can you attach methods to non-struct types?
A: Yes — you can define methods on any named type in the same package, such as `type Celsius float64`.

# Exercises

### Easy
Define a `Circle` struct with a `Radius float64`, give it an `Area()` method (value receiver), and a
`NewCircle` constructor. Print the area of a circle with radius 2.

### Medium
Define a `Stack` struct wrapping a `[]int`. Add `Push(v int)` and `Pop() (int, bool)` methods using
pointer receivers. Explain why pointer receivers are required here.

### Challenging
Model a `Manager` that embeds an `Employee` struct (with `Name` and a `Describe()` method). Override
`Describe()` on `Manager` to add the team size, and show that `manager.Name` (a promoted field) still
works. Explain how this differs from class inheritance.

# Further Reading

- *A Tour of Go* — Methods and pointer receivers: <https://go.dev/tour/methods/1>
- *Effective Go* — Structs, Methods, and Embedding: <https://go.dev/doc/effective_go#embedding>
- *The Go Programming Language Specification* — Struct types and Method sets: <https://go.dev/ref/spec#Struct_types>
