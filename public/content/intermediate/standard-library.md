---
id: lesson-16
slug: standard-library
title: "A Tour of the Standard Library"
level: intermediate
order: 16
duration: 22
tags:
  - standard-library
  - fmt
  - strings
  - io
  - encoding-json
summary: "The batteries that ship with Go — formatting with fmt, text handling with strings/strconv/strings.Builder, the io.Reader/Writer abstractions and bufio, files and environment with os, time, and encoding/decoding JSON, with the small-composable-interfaces philosophy that ties them together."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Format and print values with **`fmt`** and its verbs.
- Handle text with **`strings`**, **`strconv`**, and **`strings.Builder`**.
- Read and write through the **`io.Reader`/`io.Writer`** interfaces and **`bufio`**.
- Work with files, arguments, and environment via **`os`**, and times via **`time`**.
- Encode and decode **JSON** with `encoding/json`, respecting exported fields and tags.

# Why It Matters

Go is "batteries included": a large, high-quality **standard library** ships with the language, so you
can build real programs — servers, CLIs, data tools — with few or no third-party dependencies. Just
as important, the standard library is built around a few **small, composable interfaces** (especially
`io.Reader` and `io.Writer`), so once you learn them, packages plug into each other. This tour hits
the packages you'll use daily.

# Concept Explanation

### fmt: formatting and printing

`fmt` handles formatted I/O. The core functions and verbs:

```go
fmt.Println("a", 1, true)          // space-separated, newline
fmt.Printf("%s=%d\n", "x", 42)     // formatted
s := fmt.Sprintf("%.2f", 3.14159)  // format into a string: "3.14"
```

Common verbs: `%v` (default), `%+v` (struct with field names), `%#v` (Go syntax), `%T` (the type),
`%d` (integer), `%s` (string), `%q` (quoted string), `%t` (bool), `%f` (float), `%p` (pointer), and
`%w` (wrap an error, in `fmt.Errorf` only). A type with a `String() string` method controls its own
`%v`/`%s` output (the `fmt.Stringer` interface).

### strings, strconv, and Builder

`strings` operates on text; strings are immutable, so these return new strings:

```go
strings.ToUpper("hi")            // "HI"
strings.Contains("seafood", "foo") // true
strings.Split("a,b,c", ",")      // ["a" "b" "c"]
strings.TrimSpace("  hi  ")      // "hi"
strings.ReplaceAll("aaa", "a", "b") // "bbb"
```

`strconv` converts between strings and other types:

```go
n, err := strconv.Atoi("42")     // string -> int
s := strconv.Itoa(42)            // int -> string
f, err := strconv.ParseFloat("3.14", 64)
```

To build a string in a loop **efficiently**, use `strings.Builder` instead of `+=` (which allocates a
new string each time):

```go
var b strings.Builder
for i := 0; i < 3; i++ {
	fmt.Fprintf(&b, "line %d\n", i)
}
result := b.String()
```

### io: Reader and Writer

Two tiny interfaces underpin most I/O in Go:

```go
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
```

Files, network connections, buffers, and HTTP bodies all satisfy them, so functions written against
`io.Reader`/`io.Writer` work with any of them. `io.Copy(dst, src)` streams from any reader to any
writer. `bufio` wraps a reader/writer with a buffer and adds conveniences like reading a line at a
time (`bufio.Scanner`).

### os: files, args, environment

`os` is your gateway to the operating system:

```go
data, err := os.ReadFile("config.txt")     // whole file into []byte
err = os.WriteFile("out.txt", data, 0o644)  // write bytes to a file
args := os.Args                              // command-line args (Args[0] is the program)
home := os.Getenv("HOME")                    // environment variable
```

For streaming rather than reading the whole file, `os.Open` returns an `*os.File` (an `io.Reader`).

### time

`time` handles instants and durations:

```go
now := time.Now()
later := now.Add(2 * time.Hour)
elapsed := time.Since(now)          // a Duration
time.Sleep(500 * time.Millisecond)
```

Durations are typed (`time.Second`, `time.Millisecond`), so arithmetic reads naturally. Formatting
uses Go's **reference time** `Mon Jan 2 15:04:05 MST 2006` as the layout — you write the layout as
that specific date/time, e.g. `now.Format("2006-01-02")`.

### encoding/json

`encoding/json` converts between Go values and JSON. Two rules to remember: only **exported** (capitalized) fields are included, and **struct tags** control the JSON names:

```go
type User struct {
	Name  string `json:"name"`
	Email string `json:"email,omitempty"` // omit if empty
	admin bool   // unexported: never marshaled
}

u := User{Name: "Ada"}
b, _ := json.Marshal(u)          // {"name":"Ada"}
var back User
json.Unmarshal(b, &back)         // fills exported fields, ignores unknown keys
```

Unmarshaling into an `any` yields generic shapes: `map[string]any`, `[]any`, `float64` for **all**
numbers, `string`, `bool`, or `nil`.

# Key Terminology

- **`fmt` verbs** — format specifiers like `%v`, `%d`, `%s`, `%q`, `%T`, `%w`.
- **`fmt.Stringer`** — the `String() string` interface controlling how a type prints.
- **`strings.Builder`** — an efficient accumulator for building strings in loops.
- **`io.Reader` / `io.Writer`** — the one-method streaming interfaces for input/output.
- **`bufio`** — buffered I/O and line scanning over readers/writers.
- **struct tags** — backtick metadata like `json:"name,omitempty"` that guide encoders.
- **reference time** — `2006-01-02 15:04:05` layout style used by `time.Format`.

# Options and Trade-offs

| Task | Reach for | Instead of |
| ---- | --------- | ---------- |
| Build a string in a loop | `strings.Builder` | Repeated `+=` (allocates each time) |
| Read a small whole file | `os.ReadFile` | Manual open/read/close |
| Stream a large file | `os.Open` + `io` / `bufio` | Loading it all into memory |
| Parse an int/float | `strconv` | Rolling your own parser |
| Write to file, buffer, or network uniformly | Code against `io.Writer` | Hard-coding one destination |
| Structured config/data interchange | `encoding/json` | Ad-hoc string parsing |

# Worked Example

Read numbers from standard input line by line and sum them, showcasing `bufio`, `strconv`, and `os`:

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	scanner := bufio.NewScanner(os.Stdin) // os.Stdin is an io.Reader
	sum := 0
	for scanner.Scan() { // one line at a time until EOF
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		n, err := strconv.Atoi(line)
		if err != nil {
			fmt.Fprintln(os.Stderr, "skipping:", line)
			continue
		}
		sum += n
	}
	fmt.Println("sum:", sum)
}
```

Given input lines `10`, `20`, `oops`, `12`, it prints `skipping: oops` to standard error and `sum: 42`
to standard output. `bufio.Scanner` reads lines from any `io.Reader`, `strconv.Atoi` parses each, and
errors are reported without crashing.

# Real World Analogy

The standard library is like a **fully stocked professional kitchen** that comes with the apartment.
You don't have to buy a stove, knives, and pots before you can cook — they're already there and they
all fit the same counters and burners. `io.Reader`/`io.Writer` are the **standard-size burners**: any
pot (a file, a socket, a buffer) fits any burner (a function), so you can swap what's cooking without
rebuilding the kitchen. That shared shape is why Go code composes so smoothly.

# Examples

## Example 1 — Basic: formatting a struct

```go
type Point struct{ X, Y int }
p := Point{1, 2}
fmt.Printf("%v\n", p)  // {1 2}
fmt.Printf("%+v\n", p) // {X:1 Y:2}
fmt.Printf("%#v\n", p) // main.Point{X:1, Y:2}
fmt.Printf("%T\n", p)  // main.Point
```

**Why this works:** each verb offers a different level of detail — `%+v` adds field names, `%#v` prints
Go syntax, `%T` prints the type — invaluable for debugging.

## Example 2 — Real-world: JSON round-trip with tags

```go
type Config struct {
	Port    int      `json:"port"`
	Hosts   []string `json:"hosts"`
	Verbose bool     `json:"verbose,omitempty"`
}

func main() {
	c := Config{Port: 8080, Hosts: []string{"a", "b"}}
	b, _ := json.MarshalIndent(c, "", "  ")
	fmt.Println(string(b))
}
```

Output:

```json
{
  "port": 8080,
  "hosts": [
    "a",
    "b"
  ]
}
```

**Why this works:** tags rename fields to JSON conventions, `omitempty` drops the zero-valued
`verbose`, and `MarshalIndent` pretty-prints. Only exported fields appear.

## Example 3 — Pitfall: unexported fields vanish in JSON

```go
type Account struct {
	Name    string
	balance int // lowercase: unexported
}

b, _ := json.Marshal(Account{Name: "Ada", balance: 100})
fmt.Println(string(b)) // {"Name":"Ada"} — balance is GONE
```

**Why this bites:** `encoding/json` (like all reflection-based encoders) can only see **exported**
fields. The `balance` field silently disappears from the output and can't be unmarshaled back.
Capitalize fields you want serialized, and add a `json:"balance"` tag for the JSON name you want.

# Common Mistakes

- **Building strings with `+=` in hot loops.** Use `strings.Builder` to avoid repeated allocations.
- **Expecting unexported fields in JSON.** Only exported fields are encoded/decoded.
- **Ignoring the error from `strconv`/`json`.** Bad input is expected; handle it.
- **Guessing `time.Format` layouts.** The layout is the reference date `2006-01-02 15:04:05`, not
  `YYYY-MM-DD`.
- **Reading a huge file with `os.ReadFile`.** Stream with `bufio`/`io` when size is large.

# Best Practices

- Write functions against **`io.Reader`/`io.Writer`** so they work with files, buffers, and networks
  alike.
- Use `strings.Builder` for string assembly and `bufio.Scanner` for line-oriented input.
- Give JSON structs explicit `json:"..."` tags and export every field you serialize.
- Reach for the standard library first; add dependencies only when it genuinely lacks something.

# Summary

- **`fmt`** formats and prints; verbs like `%+v`, `%q`, `%T`, `%w` cover most needs, and `fmt.Stringer`
  customizes output.
- **`strings`/`strconv`** manipulate and convert text; **`strings.Builder`** builds strings
  efficiently.
- **`io.Reader`/`io.Writer`** are the universal streaming interfaces; **`bufio`** buffers and scans.
- **`os`** reaches files, args, and the environment; **`time`** handles instants and durations.
- **`encoding/json`** marshals only **exported** fields, guided by **struct tags**.

# Flash Cards

Q: Which `fmt` verb prints a struct with its field names, and which prints the value's type?
A: `%+v` prints the struct with field names; `%T` prints the value's Go type.

Q: Why use `strings.Builder` instead of `+=` when assembling a string in a loop?
A: Strings are immutable, so `+=` allocates a new string each iteration; `strings.Builder` accumulates into one growing buffer, avoiding repeated allocations.

Q: What two tiny interfaces underpin most I/O in Go?
A: `io.Reader` (a single `Read` method) and `io.Writer` (a single `Write` method); files, buffers, and network connections all satisfy them.

Q: Which struct fields does `encoding/json` marshal and unmarshal?
A: Only exported (capitalized) fields; unexported fields are invisible to it, and `json:"..."` tags control the JSON names.

Q: What is the reference time used by `time.Format` layouts?
A: `Mon Jan 2 15:04:05 MST 2006` — you specify the layout by writing that exact date/time (e.g. `"2006-01-02"`).

Q: When you unmarshal JSON into an `any`, what Go type do all numbers become?
A: `float64` — JSON numbers decode to `float64` by default, alongside `map[string]any`, `[]any`, `string`, `bool`, or `nil`.

# Exercises

### Easy
Write a program that reads your name from `os.Args` (or a prompt), and prints a greeting formatted with
`fmt.Printf`. Include the current date using `time.Now().Format("2006-01-02")`.

### Medium
Define a `Book` struct with `Title`, `Author`, and `Year` fields and JSON tags. Marshal a `Book` to
indented JSON, then unmarshal that JSON back into a new `Book` and confirm the fields round-trip.

### Challenging
Write a function `wordFrequency(r io.Reader) map[string]int` that reads text from any `io.Reader` using
`bufio.Scanner` (word split), lowercases with `strings.ToLower`, and counts words. Test it with a
`strings.NewReader` and explain why accepting an `io.Reader` (not a filename) makes it easy to test.

# Further Reading

- *Standard library index* — <https://pkg.go.dev/std>
- *`fmt`* — <https://pkg.go.dev/fmt> · *`strings`* — <https://pkg.go.dev/strings> · *`io`* — <https://pkg.go.dev/io>
- *JSON and Go* (Go blog): <https://go.dev/blog/json>
- *`encoding/json`* — <https://pkg.go.dev/encoding/json> · *`time`* — <https://pkg.go.dev/time>
