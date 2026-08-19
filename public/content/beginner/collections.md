---
id: lesson-06
slug: collections
title: "Arrays, Slices, and Maps"
level: beginner
order: 6
duration: 22
tags:
  - slices
  - maps
  - arrays
  - append
  - collections
summary: "Go's built-in collections — fixed-size arrays that copy by value, slices (the workhorse) with their pointer/length/capacity header and the append and aliasing rules that trip people up, and maps for key/value lookup with the comma-ok idiom and nil-map pitfall."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Distinguish **arrays** (fixed-size values) from **slices** (dynamic views).
- Explain a slice's **pointer/length/capacity** header and how `append` grows it.
- Avoid the classic **aliasing** and **`append`** pitfalls.
- Use **maps** for key/value data, including the **comma-ok** idiom.
- Know when a nil map is safe and when it panics.

# Why It Matters

Slices and maps are the two collections you'll reach for constantly, and they're where most
newcomer bugs live. A slice looks simple but shares memory with other slices in ways that can
silently corrupt data if you don't understand `append`. Maps are wonderfully convenient but have a
few sharp edges — a nil map, a "missing vs zero" ambiguity, randomized order. Learn the mechanics
once and these become reliable tools instead of mysteries.

# Concept Explanation

### Arrays: fixed size, copied by value

An **array** has a fixed length that is part of its type: `[3]int` and `[4]int` are different types.
Arrays are **values** — assigning one or passing it to a function **copies** all its elements:

```go
a := [3]int{10, 20, 30}
b := a      // b is a full copy
b[0] = 99   // does NOT change a
// a is still {10, 20, 30}
```

Because of this copy behavior and the rigid size, you rarely use arrays directly. They mostly appear
as the backing storage behind slices.

### Slices: the workhorse

A **slice** is a lightweight view into an underlying array. Internally it is a small header of three
fields:

- a **pointer** to the first element in the backing array,
- a **length** (`len`) — how many elements the slice currently holds,
- a **capacity** (`cap`) — how many elements fit before the backing array must grow.

```go
s := []int{1, 2, 3}        // slice literal, len 3, cap 3
t := make([]int, 0, 8)     // len 0, cap 8 — room for 8 before regrowth
u := s[1:3]                // view of s: elements 1..2, shares the same array
```

Slicing `s[low:high]` creates a new header pointing into the **same** backing array — no elements are
copied. That sharing is powerful but is the source of the pitfalls below.

### append and reallocation

`append` adds elements to a slice and **returns a (possibly new) slice** — you must use the return
value:

```go
s := []int{1, 2, 3}
s = append(s, 4) // always assign back
```

Here's the crucial rule: if the backing array has spare **capacity**, `append` writes in place and
returns a slice over the same array. If it doesn't, `append` **allocates a new, larger array**, copies
the elements, and returns a slice pointing there. You can't predict which happens, so **never assume
`append` keeps the same backing array** — always write `s = append(s, ...)`.

A `nil` slice is a perfectly good starting point: `var s []int` has `len == cap == 0` and you can
`append` to it directly.

### Copying and the three-index slice

To get an independent copy, use the built-in `copy` or the three-index form to bound capacity:

```go
dst := make([]int, len(src))
copy(dst, src) // dst no longer shares memory with src

low := src[0:2:2] // len 2, cap 2 — appending to low can't overwrite src
```

The three-index slice `s[i:j:k]` sets `cap` to `k-i`, so a later `append` is forced to allocate
rather than clobber elements beyond `j`.

### Maps: key/value lookup

A **map** stores unordered key→value pairs. Create one with a literal or `make`:

```go
ages := map[string]int{"Ada": 36, "Alan": 41}
counts := make(map[string]int)
counts["x"]++ // reading a missing key gives the zero value (0), then we add 1
```

Read with the **comma-ok** idiom to tell "present" from "zero":

```go
v, ok := ages["Grace"]
// ok == false, v == 0 (the zero value) because "Grace" is absent
```

Delete with `delete(ages, "Ada")`. Iterating a map (`for k, v := range m`) visits keys in a
**randomized** order.

**The nil-map trap:** a map's zero value is `nil`. You can **read** a nil map (you get zero values),
but **writing** to a nil map **panics**. Always initialize a map with a literal or `make` before
adding to it. Maps are also **not safe for concurrent use** — concurrent writes (or a write during a
read) can crash the program; protect shared maps with a mutex.

# Key Terminology

- **Array** — a fixed-length, value-type sequence; its length is part of its type.
- **Slice** — a `{pointer, length, capacity}` view over a backing array.
- **`len` / `cap`** — the number of elements a slice holds / can hold before regrowth.
- **`append`** — adds elements to a slice, returning a possibly reallocated slice.
- **Aliasing** — two slices sharing the same backing array, so a change to one affects the other.
- **`make`** — allocates and initializes slices, maps, and channels.
- **Comma-ok idiom** — `v, ok := m[k]` to detect whether a key is present.
- **nil map** — a map's zero value; readable but panics on write.

# Options and Trade-offs

| Need | Use | Why |
| ---- | --- | --- |
| A resizable list | slice | Grows with `append`; the default choice |
| A truly fixed, small buffer | array | Size known at compile time; value semantics |
| Key/value lookup | map | O(1) average access by key |
| An independent copy of a slice | `copy` into a new slice | Avoids shared-array surprises |
| Preallocate known size | `make([]T, 0, n)` | Avoids repeated reallocation in a loop |

# Worked Example

The aliasing pitfall, made visible:

```go
package main

import "fmt"

func main() {
	base := []int{1, 2, 3, 4, 5}
	head := base[0:2] // len 2, cap 5 — shares base's array!
	head = append(head, 99) // cap allows it, so this overwrites base[2]
	fmt.Println("head:", head)
	fmt.Println("base:", base)
}
```

Output:

```text
head: [1 2 99]
base: [1 2 99 4 5]
```

Because `head` had spare capacity (its cap was 5), `append` wrote `99` **into the shared array**,
silently changing `base[2]` from `3` to `99`. Using `base[0:2:2]` (capping capacity) would have forced
`append` to allocate a fresh array, leaving `base` untouched.

# Real World Analogy

A slice is like a **bookmark that marks a range of pages in a shared book**. Copying the bookmark is
cheap — you're still pointing at the same physical pages. If two people hold bookmarks over
overlapping pages and one of them scribbles in the margin (`append` within capacity), the other sees
the scribble too, because it's the same book. To truly work on your own version, you must
**photocopy the pages** first (`copy` into a new slice). A map, by contrast, is like a **coat check**:
you hand over a ticket (key) and get back exactly the item you checked (value) — but if you never set
up the coat-check counter (a nil map), trying to check a coat in fails loudly (a panic).

# Examples

## Example 1 — Basic: building a slice with append

```go
package main

import "fmt"

func main() {
	var nums []int // nil slice, ready to append
	for i := 1; i <= 5; i++ {
		nums = append(nums, i*i)
	}
	fmt.Println(nums, "len:", len(nums), "cap:", cap(nums))
}
```

**Why this works:** starting from a nil slice and appending is idiomatic; each `append` returns the
grown slice, which we assign back. The capacity may exceed the length because Go grows arrays in
chunks.

## Example 2 — Real-world: counting with a map

```go
func wordCounts(words []string) map[string]int {
	counts := make(map[string]int) // must initialize before writing
	for _, w := range words {
		counts[w]++ // missing key reads as 0, then increments
	}
	return counts
}
```

**Why this works:** reading a missing key yields the zero value `0`, so `counts[w]++` works even the
first time a word appears. Using `make` ensures the map isn't nil before we write.

## Example 3 — Pitfall: writing to a nil map

```go
var m map[string]int // nil map (never initialized)
m["x"] = 1           // panic: assignment to entry in nil map
```

**Why this bites:** a map's zero value is nil, and writing to nil panics. The one-line fix is
`m := make(map[string]int)` (or a map literal) before the first write.

# Common Mistakes

- **Ignoring `append`'s return value.** Always `s = append(s, ...)`; the backing array may change.
- **Assuming slices are independent.** Slicing shares memory; use `copy` for a real duplicate.
- **Writing to a nil map.** Initialize with `make` or a literal first.
- **Confusing "missing" with "zero".** Use `v, ok := m[k]` when the difference matters.
- **Sharing a map across goroutines without a lock.** Maps aren't concurrency-safe.

# Best Practices

- Preallocate with `make([]T, 0, n)` when you know the size, to avoid repeated regrowth.
- Use the three-index slice `s[i:j:k]` to bound capacity when handing out sub-slices.
- Reach for the comma-ok idiom to distinguish absent keys from zero values.
- Guard shared maps with a `sync.Mutex`, or use `sync.Map` for specific concurrent patterns.

# Summary

- **Arrays** are fixed-size values that copy wholesale; you'll rarely use them directly.
- **Slices** are `{pointer, len, cap}` views over a backing array; `append` may reallocate, so always
  use its return value.
- Slices **alias** shared memory; `copy` (or a capacity-bounded slice) gives independence.
- **Maps** offer key/value lookup; read a missing key for its zero value, or use comma-ok to detect
  absence.
- A **nil map** is readable but **panics on write**, and maps aren't safe for concurrent use.

# Flash Cards

Q: What three fields make up a slice header?
A: A pointer to the backing array, a length (`len`), and a capacity (`cap`).

Q: Why must you always write `s = append(s, x)` rather than just `append(s, x)`?
A: Because `append` may allocate a new backing array (when capacity is exceeded) and return a different slice; you must keep the returned value.

Q: What does reading a missing key from a map return, and how do you detect absence?
A: It returns the value type's zero value; use the comma-ok idiom `v, ok := m[k]` — `ok` is false when the key is absent.

Q: What happens when you write to a nil map versus read from one?
A: Reading a nil map returns zero values safely, but writing to a nil map panics — initialize it with `make` or a literal first.

Q: How do you make a slice that doesn't share memory with the original?
A: Allocate a new slice and use the built-in `copy`, e.g. `dst := make([]int, len(src)); copy(dst, src)`.

Q: Are Go maps safe for concurrent use by multiple goroutines?
A: No — concurrent writes (or a write during a read) can crash the program; protect shared maps with a mutex or use `sync.Map`.

# Exercises

### Easy
Create a slice of five integers, print its `len` and `cap`, append three more values in a loop, and
print `len`/`cap` again. Note whether the capacity grew and by how much.

### Medium
Write `unique(in []string) []string` that returns the input with duplicates removed, preserving first
occurrence order, using a `map[string]bool` to track what you've seen.

### Challenging
Demonstrate the aliasing pitfall: create a slice `base`, take `head := base[0:2]`, append a value to
`head`, and show that `base` changed. Then fix it two ways — with a capacity-bounded slice
`base[0:2:2]` and with an explicit `copy` — and explain the difference.

# Further Reading

- *Go Slices: usage and internals* (Go blog): <https://go.dev/blog/slices-intro>
- *Go maps in action* (Go blog): <https://go.dev/blog/maps>
- *Effective Go* — Slices, Two-dimensional slices, Maps: <https://go.dev/doc/effective_go#slices>
- *A Tour of Go* — Slices and Maps: <https://go.dev/tour/moretypes/7>
