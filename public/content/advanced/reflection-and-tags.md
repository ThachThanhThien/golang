---
id: lesson-21
slug: reflection-and-tags
title: "Reflection and Struct Tags"
level: advanced
order: 21
duration: 20
tags:
  - reflection
  - struct-tags
  - reflect
  - encoding
  - interfaces
summary: "Inspecting and manipulating values at runtime — the reflect package's Type and Value, the difference between Kind and Type, reading struct fields and tags (how encoding/json works), the settability rule for changing values, and why reflection is powerful but should be a last resort."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what **reflection** is and when it's needed.
- Use **`reflect.TypeOf`** and **`reflect.ValueOf`**, and the difference between **`Kind`** and
  **`Type`**.
- Read **struct fields and tags** the way `encoding/json` does.
- Understand the **settability** rule for modifying values via reflection.
- Weigh reflection's power against its **costs** and prefer alternatives.

# Why It Matters

Most Go code knows its types at compile time — that's the point of static typing. But some tools need
to work with types they **don't** know in advance: JSON encoders, ORMs, form binders, and generic
printers. **Reflection** is the mechanism that makes those possible, letting a program examine and
manipulate values at runtime. You'll rarely write reflection yourself, but understanding it demystifies
how `encoding/json` and similar libraries operate — and teaches you why to reach for it only when
nothing simpler works.

# Concept Explanation

### What reflection is

**Reflection** is the ability of a program to inspect its own values' types and structure at runtime,
and even to modify them. Go's `reflect` package provides it, built on the fact that an interface value
holds a **(type, value)** pair (recall the interfaces lesson). Reflection reads and acts on that pair.

### Type and Value

The two entry points:

```go
import "reflect"

t := reflect.TypeOf(x)  // a reflect.Type — the static type information
v := reflect.ValueOf(x) // a reflect.Value — the runtime value, inspectable
```

`reflect.Type` answers questions about the type (its name, kind, fields, methods); `reflect.Value`
lets you read (and sometimes write) the actual data.

### Kind vs Type

A crucial distinction:

- **`Type`** is the specific, named type: `main.Celsius`, `[]int`, `map[string]User`.
- **`Kind`** is the underlying category: `Float64`, `Slice`, `Map`, `Struct`, `Ptr`, `Int`, …

```go
type Celsius float64
c := Celsius(21)
reflect.TypeOf(c).String() // "main.Celsius"
reflect.TypeOf(c).Kind()   // reflect.Float64
```

You switch on **`Kind`** to handle categories of types generically, while **`Type`** identifies the
exact type.

### Reading struct fields and tags

Reflection can walk a struct's fields and read their **tags** — this is exactly how `encoding/json`
finds field names:

```go
type User struct {
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
}

func printTags(x any) {
	t := reflect.TypeOf(x)
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		fmt.Printf("%s -> json tag %q\n", f.Name, f.Tag.Get("json"))
	}
}
// printTags(User{}) prints:
// Name  -> json tag "name"
// Email -> json tag "email,omitempty"
```

`f.Tag.Get("json")` reads the `json:"..."` portion of the field's tag. Only **exported** fields can be
fully inspected and set — the same reason encoders ignore unexported fields.

### Settability: modifying values

To *change* a value through reflection, the `reflect.Value` must be **settable**, which requires it to
be **addressable** — you must reflect over a **pointer** and take its `Elem()`:

```go
x := 10
v := reflect.ValueOf(&x).Elem() // Elem() dereferences the pointer -> settable
if v.CanSet() {
	v.SetInt(42)
}
// x is now 42
```

Reflecting over a plain value (`reflect.ValueOf(x)`) gives a **copy**, which is not settable — trying
to set it panics. This mirrors the pointer-receiver rule: to mutate, you need a pointer.

### The laws of reflection

Rob Pike's three "laws" summarize it:

1. Reflection goes from an **interface value to a reflection object** (`TypeOf`/`ValueOf`).
2. Reflection goes from a **reflection object back to an interface value** (`Value.Interface()`).
3. To modify a reflection object, its value must be **settable** (addressable).

### The cost, and alternatives

Reflection is powerful but comes with real downsides: it's **slower** than direct code, it moves type
errors from **compile time to runtime** (a wrong assertion panics), and it makes code harder to read.
Prefer, in order: ordinary code, **interfaces**, **generics** (for type-parametric algorithms), and
only then reflection — when you truly must handle arbitrary, unknown types (writing a serializer, say).

# Key Terminology

- **Reflection** — inspecting/manipulating types and values at runtime via `reflect`.
- **`reflect.Type`** — runtime type information (name, kind, fields, methods).
- **`reflect.Value`** — the runtime value, which you can read and sometimes set.
- **`Kind`** — the underlying category of a type (`Int`, `Slice`, `Struct`, …).
- **Struct tag** — backtick metadata on a field, read with `Tag.Get("key")`.
- **Settable / addressable** — a value you can modify; requires reflecting through a pointer.
- **`Elem()`** — dereferences a pointer `Value` to the value it points to.

# Options and Trade-offs

| Need | Prefer | Reflection only when |
| ---- | ------ | -------------------- |
| Behavior over known types | Interfaces | — |
| One algorithm over many types | Generics | — |
| Print/inspect any value | `fmt` (uses reflection for you) | You need custom traversal |
| Encode/decode arbitrary structs | Existing encoders (`encoding/json`) | Writing a new serializer |
| Modify unknown fields at runtime | (rare) | An ORM/binder-style tool |

| | Direct code / generics | Reflection |
| - | ---------------------- | ---------- |
| Speed | Fast | Slower |
| Errors caught | Compile time | Runtime (can panic) |
| Readability | High | Lower |

# Worked Example

A small generic-printer that reports each exported field's name, type, value, and JSON tag — a
miniature of what an encoder does:

```go
package main

import (
	"fmt"
	"reflect"
)

type Product struct {
	SKU   string  `json:"sku"`
	Price float64 `json:"price"`
	name  string  // unexported: skipped
}

func describe(x any) {
	v := reflect.ValueOf(x)
	t := v.Type()
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if !f.IsExported() {
			continue
		}
		fmt.Printf("%-6s %-8s = %v (tag=%q)\n",
			f.Name, f.Type, v.Field(i), f.Tag.Get("json"))
	}
}

func main() {
	describe(Product{SKU: "A1", Price: 9.99, name: "widget"})
}
```

Output:

```text
SKU    string   = A1 (tag="sku")
Price  float64  = 9.99 (tag="price")
```

`describe` doesn't know `Product` ahead of time — it walks whatever struct it's handed, reads each
exported field's type/value/tag, and skips the unexported `name`. That's the essence of how
`encoding/json` decides what to emit.

# Real World Analogy

Reflection is like an **X-ray machine for your data**. Normal code is a doctor who already has the
patient's chart (the type is known at compile time) and treats accordingly. But a security scanner at
an airport doesn't know what's in each bag in advance — it uses an X-ray (reflection) to see the
contents of *any* bag and act on what it finds. X-rays are indispensable for that job, but you wouldn't
X-ray every patient for a routine checkup: it's slower, it's overkill when you already know what's
there, and pointing it at the wrong thing has consequences. Use it when you genuinely can't know the
contents ahead of time.

# Examples

## Example 1 — Basic: Type vs Kind

```go
var s []int
t := reflect.TypeOf(s)
fmt.Println(t.String(), t.Kind()) // "[]int" Slice

type ID int
var id ID = 7
fmt.Println(reflect.TypeOf(id).String(), reflect.TypeOf(id).Kind()) // "main.ID" Int
```

**Why this works:** `String()` gives the exact type name (`[]int`, `main.ID`), while `Kind()` gives the
broad category (`Slice`, `Int`) — you switch on `Kind` to handle whole categories generically.

## Example 2 — Real-world: reading a validation tag

```go
type SignupForm struct {
	Email string `validate:"required,email"`
	Age   int    `validate:"min=18"`
}

func rules(x any) {
	t := reflect.TypeOf(x)
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if rule := f.Tag.Get("validate"); rule != "" {
			fmt.Printf("%s must satisfy: %s\n", f.Name, rule)
		}
	}
}
```

**Why this works:** validation libraries read a `validate:"..."` tag per field via reflection, then
enforce those rules at runtime — the same tag-reading pattern as JSON, applied to a different key.

## Example 3 — Pitfall: trying to set a non-addressable value

```go
x := 10
v := reflect.ValueOf(x) // a COPY — not addressable
v.SetInt(42)            // panic: reflect: reflect.Value.SetInt using unaddressable value
```

**Why this bites:** `reflect.ValueOf(x)` reflects a copy, which can't be set — just like a value
receiver can't mutate the original. To modify `x`, reflect over its pointer and dereference:
`reflect.ValueOf(&x).Elem().SetInt(42)`.

# Common Mistakes

- **Reflecting a value instead of a pointer when you need to set.** Use `ValueOf(&x).Elem()`.
- **Confusing `Kind` and `Type`.** `Kind` is the category; `Type` is the specific type.
- **Expecting to see unexported fields.** Reflection (and encoders) can't fully access them.
- **Reaching for reflection first.** Try interfaces or generics before reflection.
- **Ignoring the runtime-panic risk.** Reflection errors surface at runtime, not compile time.

# Best Practices

- Prefer **interfaces** and **generics**; use reflection only for genuinely unknown types.
- Switch on **`Kind`** to handle type categories; use **`Type`** to identify exact types.
- Read tags with `field.Tag.Get("key")`; document the tag format your code expects.
- To mutate, reflect through a **pointer** and check **`CanSet()`** before setting.
- Keep reflection in a small, well-tested corner of the codebase; keep the hot path reflection-free.

# Summary

- **Reflection** inspects and manipulates values at runtime via `reflect`, using the interface
  (type, value) pair.
- **`reflect.Type`** and **`reflect.Value`** are the entry points; **`Kind`** is the category,
  **`Type`** the exact type.
- Reflection reads **struct fields and tags** — the mechanism behind `encoding/json`.
- To **set** a value it must be **settable/addressable**: reflect through a pointer and use `Elem()`.
- Reflection is powerful but **slow and runtime-checked** — prefer interfaces and generics; use it as a
  last resort.

# Flash Cards

Q: What is reflection in Go, and what package provides it?
A: The ability to inspect and manipulate values' types and structure at runtime; the `reflect` package provides it, built on the interface (type, value) pair.

Q: What is the difference between a value's `Type` and its `Kind`?
A: `Type` is the specific named type (e.g. `main.Celsius`, `[]int`); `Kind` is the underlying category (e.g. `Float64`, `Slice`) — you switch on `Kind` to handle categories generically.

Q: How does `encoding/json` know a struct field's JSON name?
A: It uses reflection to read the field's struct tag with `field.Tag.Get("json")`, and it only sees exported fields.

Q: What condition must a `reflect.Value` meet before you can set it, and how do you achieve it?
A: It must be settable (addressable) — reflect over a pointer and call `Elem()` (e.g. `reflect.ValueOf(&x).Elem()`); reflecting a plain value gives an unsettable copy.

Q: Why should reflection be a last resort?
A: It's slower than direct code, moves type errors from compile time to runtime (it can panic), and reduces readability — interfaces and generics are usually better.

Q: What are the two main entry points into the reflect package?
A: `reflect.TypeOf(x)` for the type information and `reflect.ValueOf(x)` for the runtime value.

# Exercises

### Easy
Write a function that prints the `Type` and `Kind` of several values: an `int`, a `[]string`, a
`map[string]int`, and a struct. Note which ones share a `Kind`.

### Medium
Write `fieldTags(x any, key string)` that prints each exported field's name and its tag value for the
given tag key. Test it on a struct with mixed `json` and `db` tags.

### Challenging
Write `setDefaults(x any)` that takes a pointer to a struct and, for every exported string field that
is empty, sets it to the value in that field's `default:"..."` tag. Handle the settability requirement
correctly, and explain why the function must take a pointer.

# Further Reading

- *The Laws of Reflection* (Go blog): <https://go.dev/blog/laws-of-reflection>
- *`reflect` package* — <https://pkg.go.dev/reflect>
- *`encoding/json`* (reflection-based encoding in practice): <https://pkg.go.dev/encoding/json>
