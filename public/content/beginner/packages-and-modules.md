---
id: lesson-08
slug: packages-and-modules
title: "Packages, Modules, and Program Structure"
level: beginner
order: 8
duration: 20
tags:
  - packages
  - modules
  - imports
  - exports
  - project-layout
summary: "How Go code is organized above the file level — packages as directories, exported versus unexported names, imports and the main package, modules and semantic versioning for dependencies, the init function, and the conventional project layout with internal and cmd directories."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Explain what a **package** is and how **exported** vs **unexported** names work.
- Write **imports**, including aliases and blank imports, and know the `main` package's role.
- Describe **modules**, module paths, and how **semantic versioning** governs dependencies.
- Recognize the conventional project layout (`cmd/`, `internal/`, `pkg/`).
- Understand `init` functions and why Go forbids circular imports.

# Why It Matters

Small programs live in one file, but real ones span many files and depend on other people's code.
Go's answer is simple and strict: **packages** group files, capitalization controls visibility, and
**modules** version your dependencies. These rules are few but rigid, and they shape how every Go
project is laid out. Learn them and you can navigate — and structure — any Go codebase.

# Concept Explanation

### Packages

A **package** is a directory of `.go` files that all begin with the same `package` clause. Code in the
same package can see all of each other's names directly (no imports needed within a package). The
package name is usually the last element of its directory.

**Visibility is controlled by capitalization**, not keywords:

- An identifier starting with an **uppercase** letter is **exported** — visible to other packages.
- An identifier starting with a **lowercase** letter is **unexported** — private to its package.

```go
package bank

type Account struct { // exported: other packages can use bank.Account
	balance int       // unexported: only code in package bank sees it
}

func (a *Account) Balance() int { return a.balance } // exported accessor
```

This one rule replaces `public`/`private` keywords entirely.

### Imports and the main package

Bring in another package with `import`, then refer to its exported names via the package name:

```go
import (
	"fmt"           // standard library
	"strings"       // standard library
	"example.com/x" // a dependency, by its module path
)

fmt.Println(strings.ToUpper("hi"))
```

Two special import forms:

- **Alias:** `import mrand "math/rand"` renames the package locally (useful to avoid a name clash).
- **Blank import:** `import _ "image/png"` imports **only for its side effects** (its `init`
  functions run) without referring to it directly — common for registering drivers or decoders.

An executable program is the **`main` package** with a `func main()`. A package that isn't `main` is a
**library**, compiled for other packages to import but not run directly.

### Modules and versioning

A **module** is a collection of packages versioned together, rooted at a `go.mod` file. `go.mod`
declares the **module path** (its identity, usually a repository URL), the Go version, and
dependencies with their versions:

```text
module example.com/greeter

go 1.xx

require github.com/google/uuid v1.6.0
```

Dependencies use **semantic versioning** (`vMAJOR.MINOR.PATCH`). Two rules matter:

- A change in **MAJOR** version signals a breaking change. For **v2 and above**, the major version
  becomes part of the **import path** (`github.com/foo/bar/v2`), so incompatible versions can coexist.
- Go uses **Minimal Version Selection (MVS)**: it builds with the *lowest* version that satisfies all
  requirements, making builds reproducible. `go.sum` records checksums so those versions are verified.

Everyday commands: `go get pkg@version` to add/upgrade, `go mod tidy` to sync `go.mod` with your
imports, `go list -m all` to see the full dependency set.

### The init function and initialization order

Besides `main`, a package may define one or more **`init()`** functions. They take no arguments,
return nothing, and run automatically at startup — **after** package-level variables are initialized
and **before** `main`. Initialization proceeds imported-packages-first, so a package's dependencies
are ready before it runs. Use `init` sparingly, for setup that truly must happen once at load time.

### Conventional project layout

Go doesn't force a layout, but conventions are widely followed:

```text
myapp/
  go.mod
  cmd/
    myapp/
      main.go        // package main — the entry point(s)
  internal/
    store/           // private packages, importable only within this module
  pkg/               // (optional) library code meant for external reuse
```

The **`internal/`** directory is special and enforced by the compiler: packages under `internal/` can
only be imported by code rooted in the same parent — a built-in way to keep implementation details
private to your module. Also note Go **forbids circular imports**: package A importing B which imports
A won't compile, which pushes you toward a clean, layered dependency structure.

# Key Terminology

- **Package** — a directory of `.go` files sharing a `package` clause.
- **Exported / unexported** — visible to other packages (capitalized) / private (lowercase).
- **`main` package** — an executable program, with `func main()` as its entry point.
- **Blank import** — `import _ "pkg"`, for side effects (its `init`) only.
- **Module** — packages versioned together, defined by a `go.mod` file.
- **Module path** — the module's identity, usually a repository URL.
- **Semantic versioning** — `vMAJOR.MINOR.PATCH`; MAJOR changes are breaking.
- **`init()`** — a function that runs once at package load, before `main`.
- **`internal/`** — a directory whose packages are importable only within the same module subtree.

# Options and Trade-offs

| Decision | Option A | Option B | How to choose |
| -------- | -------- | -------- | ------------- |
| Expose a name | Exported (capitalize) | Unexported (lowercase) | Export only what other packages truly need; keep the rest private |
| Reuse across projects | Put it in `pkg/` or its own module | Keep it in `internal/` | `internal/` unless you intend outside code to depend on it |
| Import for side effects | Blank import `_` | Normal import + use | Blank import when you only need registration (drivers, codecs) |
| Depend on a v2+ library | Import path ends in `/v2` | (no) | Required — the major version is part of the path for v2+ |

# Worked Example

A two-package module showing exports and imports:

```text
greeter/
  go.mod                (module example.com/greeter)
  main.go               (package main)
  message/message.go    (package message)
```

```go
// message/message.go
package message

// Greeting is exported (capital G) so main can use it.
func Greeting(name string) string {
	return "Hello, " + name + "!"
}

// prefix is unexported — only package message can see it.
var prefix = "Hello, "
```

```go
// main.go
package main

import (
	"fmt"

	"example.com/greeter/message"
)

func main() {
	fmt.Println(message.Greeting("Ada"))
}
```

Output:

```text
Hello, Ada!
```

`main` imports the `message` package by its full path and calls the exported `Greeting`. It cannot
touch `prefix`, because that name is unexported.

# Real World Analogy

Think of a module as a **company**, packages as its **departments**, and exported names as the
**public front desk** of each department. Anyone in the building can walk up to a department's front
desk (call its exported functions), but the back offices (unexported names) are staff-only. Semantic
versioning is like the company's **product model numbers**: a bump in the big number (v1 → v2) warns
customers "this model isn't a drop-in replacement," so the v2 product even gets a new shelf label (a
`/v2` in the import path) to avoid confusion with the old one.

# Examples

## Example 1 — Basic: exported vs unexported

```go
package temperature

func CelsiusToF(c float64) float64 { return c*9/5 + 32 } // exported

func round(x float64) float64 { return math.Round(x) }   // unexported helper
```

**Why this works:** callers in other packages use `temperature.CelsiusToF`, while `round` stays a
private implementation detail — the capitalization alone decides.

## Example 2 — Real-world: a blank import for its side effect

```go
import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3" // registers the "sqlite3" driver via its init()
)

db, err := sql.Open("sqlite3", "app.db")
```

**Why this works:** you never call the driver package directly; importing it with `_` runs its `init`,
which registers the driver name so `sql.Open` can find it. Dropping the `_` would be a compile error
("imported and not used").

## Example 3 — Pitfall: a circular import

```text
package order imports package user
package user  imports package order   // compile error: import cycle not allowed
```

**Why this bites:** Go refuses to compile mutually importing packages. The fix is to extract the
shared types into a third package both can import, or to invert one dependency with an interface — a
nudge toward a cleaner, layered design.

# Common Mistakes

- **Expecting `public`/`private` keywords.** Visibility is capitalization; there are no such keywords.
- **Forgetting the `/v2` in a v2+ import path.** The major version is part of the path for v2 and up.
- **Leaving unused imports.** Go treats an unused import as a compile error; remove it or blank-import
  it if you need its side effects.
- **Creating import cycles.** Refactor shared pieces into a common package instead.

# Best Practices

- Export the minimum surface area; keep helpers unexported.
- Put private implementation packages under `internal/` so they can't leak out of your module.
- Run `go mod tidy` after changing imports so `go.mod`/`go.sum` stay accurate.
- Keep `init` functions rare and obvious; prefer explicit setup in constructors or `main`.

# Summary

- A **package** is a directory of files; **capitalization** decides what's exported.
- The **`main` package** with `func main()` is an executable; other packages are libraries.
- **Modules** (`go.mod`) version dependencies with **semantic versioning**; v2+ carries its major
  version in the import path, and MVS makes builds reproducible.
- **`init`** runs once per package at load, after variables and before `main`.
- Conventional layout uses `cmd/` for entry points and `internal/` for private packages; **circular
  imports are forbidden**.

# Flash Cards

Q: How does Go decide whether a name is visible to other packages?
A: By capitalization — an uppercase first letter means exported (public); lowercase means unexported (private to its package).

Q: What is the difference between a package and a module?
A: A package is a directory of files compiled together; a module is a versioned collection of packages rooted at a `go.mod` file, used for dependency management.

Q: For a v2+ dependency, where does the major version appear?
A: In the import path itself — e.g. `github.com/foo/bar/v2` — so incompatible major versions can coexist.

Q: What does a blank import (`import _ "pkg"`) do?
A: It imports the package only for its side effects (running its `init` functions), without referencing it directly — common for registering drivers or codecs.

Q: When do `init` functions run relative to `main`?
A: After all package-level variables are initialized and after imported packages are initialized, but before `main` runs.

Q: What happens if two packages import each other?
A: It's a compile error — Go forbids import cycles; refactor shared code into a third package or invert a dependency with an interface.

# Exercises

### Easy
Create a module with a `mathx` package exposing an exported `Double(n int) int` and an unexported
`helper`. Import `mathx` from `main` and call `Double`. Confirm you cannot call `helper` from `main`.

### Medium
Restructure a small program into `cmd/app/main.go` plus an `internal/greet` package. Verify it builds
with `go build ./...`, and explain what the `internal/` directory guarantees about who can import
`greet`.

### Challenging
Add a third-party dependency to a module with `go get`, use one of its exported functions, then run
`go mod tidy` and `go list -m all`. Explain what `go.mod`, `go.sum`, and the version you see tell you
about reproducibility, and what would change if the library released a `v2`.

# Further Reading

- *How to Write Go Code* — packages, modules, and testing: <https://go.dev/doc/code>
- *Go Modules Reference* — <https://go.dev/ref/mod>
- *Effective Go* — Names (package names, exported identifiers): <https://go.dev/doc/effective_go#names>
- *Organizing a Go module*: <https://go.dev/doc/modules/layout>
