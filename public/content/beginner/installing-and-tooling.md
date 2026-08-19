---
id: lesson-02
slug: installing-and-tooling
title: "Installing Go and the Toolchain"
level: beginner
order: 2
duration: 18
tags:
  - setup
  - go-command
  - gofmt
  - workspace
  - modules
summary: "Getting a working Go setup — installing the toolchain, verifying it with go version and go env, creating your first module with go mod init, and the everyday go subcommands (run, build, fmt, vet, test) plus the editor tooling that make Go pleasant to work in."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Install Go and confirm it works with `go version` and `go env`.
- Create a new project as a **module** with `go mod init`.
- Run and build programs with `go run` and `go build`.
- Use the core toolchain commands: `go fmt`, `go vet`, `go test`, `go get`.
- Explain what `go.mod`, `go.sum`, and the module cache are for.

# Why It Matters

Go's tooling is one of its best features: a single `go` command builds, tests, formats, and manages
dependencies, so there is no separate build tool, package manager, or formatter to learn. Getting
comfortable with these commands early means you spend your energy on the language, not on
configuration. And because every Go project uses the same commands, skills you build here transfer to
every codebase you touch.

# Concept Explanation

### Installing Go

Download the installer for your operating system from the official downloads page,
<https://go.dev/dl/>, and run it. It installs the `go` command and the standard library. Confirm the
install from a terminal:

```bash
go version
```

You should see something like `go version go1.xx.x <os>/<arch>`. To see how Go is configured, run:

```bash
go env
```

This prints environment values such as `GOOS`/`GOARCH` (the target operating system and CPU
architecture), `GOPATH`, and `GOMODCACHE` (where downloaded dependencies are cached). You rarely need
to change these to start.

### Modules: how Go organizes a project

Since Go 1.16, the default way to organize code is a **module**: a directory tree with a `go.mod`
file at its root. The `go.mod` file records the module's **path** (a name, usually a URL where the
code lives), the Go version, and any dependencies. You do not need to put your code inside a special
`GOPATH` folder anymore — that older style is legacy.

Create a new project like this:

```bash
mkdir hello && cd hello
go mod init example.com/hello
```

That writes a minimal `go.mod`:

```text
module example.com/hello

go 1.xx
```

Now add a `main.go`:

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello from a module!")
}
```

And run the whole package (the `.` means "the module/package in this directory"):

```bash
go run .
```

### The everyday commands

The `go` command is a toolbox. The ones you'll use constantly:

- `go run .` — compile and run the current package without leaving a binary behind. Great for
  iterating.
- `go build` — compile the package into an executable in the current directory (or a library, if it
  isn't `package main`). Ship this binary.
- `go install` — build and install a command into your Go bin directory so you can run it by name.
- `go fmt ./...` — format all Go files under the current directory tree with `gofmt`.
- `go vet ./...` — run static checks that catch likely bugs the compiler allows (for example a
  `Printf` format that doesn't match its arguments).
- `go test ./...` — run all tests in the module.
- `go get <module>` — add or upgrade a dependency (it updates `go.mod`/`go.sum`).
- `go mod tidy` — add any missing and remove any unused dependencies so `go.mod` matches your code.

The `./...` pattern means "this directory and everything under it" — a handy way to act on the whole
module.

### go.mod, go.sum, and the module cache

- **`go.mod`** lists your module path, Go version, and direct dependencies with their versions.
- **`go.sum`** records cryptographic checksums of every dependency (and its dependencies) so future
  downloads are verified to be byte-for-byte what you built against. Commit both files.
- The **module cache** (under `GOMODCACHE`) stores downloaded dependency source so repeated builds
  don't re-download.

### Editor tooling

The official language server, **`gopls`**, powers autocompletion, go-to-definition, inline errors,
and automatic formatting-on-save in editors like VS Code (with the Go extension) and GoLand. Most
editors install it for you when you open a Go file. With formatting-on-save enabled, you never
hand-format Go again.

# Key Terminology

- **Toolchain** — the `go` command plus the compiler, formatter, and other bundled tools.
- **Module** — a versioned collection of packages rooted at a `go.mod` file.
- **Module path** — the module's name/identity (often a repository URL) declared in `go.mod`.
- **`go.mod` / `go.sum`** — the files recording dependencies and their verified checksums.
- **`GOOS` / `GOARCH`** — the target operating system and CPU architecture for a build.
- **`gopls`** — the official Go language server that editors use for IDE features.
- **`go vet`** — a static analyzer that reports suspicious constructs the compiler still accepts.

# Options and Trade-offs

| Task | Command | When to use |
| ---- | ------- | ----------- |
| Try code quickly | `go run .` | Development loop; no binary needed |
| Produce a shippable binary | `go build` | Deployment, distributing a CLI |
| Install a tool by name | `go install pkg@version` | Getting a command onto your PATH |
| Format code | `go fmt ./...` | Before every commit (or on save) |
| Catch likely bugs | `go vet ./...` | Before every commit, in CI |
| Sync dependencies | `go mod tidy` | After adding/removing imports |

`go run` favors speed of iteration; `go build`/`go install` favor producing something you keep. Use
`go fmt` and `go vet` habitually — they're cheap and catch real problems.

# Worked Example

A full first-project session, from empty folder to running program:

```bash
$ mkdir greeter && cd greeter
$ go mod init example.com/greeter
go: creating new go.mod: module example.com/greeter
$ cat > main.go <<'EOF'
package main

import "fmt"

func main() {
	fmt.Println("It works!")
}
EOF
$ go fmt ./...
main.go
$ go vet ./...
$ go run .
It works!
$ go build
$ ./greeter
It works!
```

Notice `go vet` printed nothing — that means it found no problems. `go build` produced a `greeter`
binary you can run directly or copy to another machine with the same OS and architecture.

# Real World Analogy

The `go` command is like a **Swiss Army knife** for your project. Instead of carrying a separate
screwdriver, scissors, bottle opener, and file (a build tool, a formatter, a test runner, a package
manager), you carry one tool with each blade built in and clearly labeled. You learn the one knife
once, and it works the same on every trip.

# Examples

## Example 1 — Basic: check your install

```bash
go version
go env GOOS GOARCH
```

**Why this works:** `go version` proves the toolchain is on your PATH; asking `go env` for specific
keys prints just those values (your OS and CPU architecture), which you'll need when cross-compiling
later.

## Example 2 — Real-world: adding a dependency

```bash
go get github.com/google/uuid
```

Then in code:

```go
import "github.com/google/uuid"
// ...
id := uuid.NewString()
```

**Why this works:** `go get` records the exact version in `go.mod` and its checksum in `go.sum`, so
teammates and CI build against the identical dependency. Running `go mod tidy` afterward keeps those
files exactly in sync with what your code imports.

## Example 3 — Pitfall: forgetting to initialize a module

```text
$ go run .
go: go.mod file not found in current directory or any parent directory;
	see 'go help modules'
```

**Why this bites:** outside a module, Go doesn't know your package's identity or where dependencies
go. The fix is one command — `go mod init <path>` — which most newcomers simply forget on a brand-new
folder.

# Common Mistakes

- **Skipping `go mod init`.** A new project needs a module before `go run .` will work.
- **Not committing `go.sum`.** Without it, builds aren't verified against known-good checksums.
- **Hand-formatting code.** Let `go fmt`/`gopls` do it; manual formatting just creates noisy diffs.
- **Confusing `go get` and `go install`.** `go get` manages dependencies; `go install` puts a
  runnable command on your PATH.

# Best Practices

- Run `go fmt` and `go vet` before every commit (wire them into CI too).
- Run `go mod tidy` after changing imports so `go.mod` never drifts from the code.
- Commit both `go.mod` and `go.sum`.
- Enable **format-on-save** with `gopls` so formatting is automatic.

# Summary

- Install Go from <https://go.dev/dl/> and verify with `go version` and `go env`.
- Start a project with `go mod init <module-path>`; the `go.mod` file makes it a **module**.
- `go run` iterates, `go build`/`go install` produce binaries, `go fmt`/`go vet`/`go test` keep code
  clean and correct.
- `go.mod` and `go.sum` pin and verify dependencies; commit both.
- `gopls` gives your editor autocompletion, errors, and formatting-on-save.

# Flash Cards

Q: What command turns a plain directory into a Go module, and what does it create?
A: `go mod init <module-path>`, which creates a `go.mod` file recording the module path, Go version, and dependencies.

Q: What is the difference between `go run` and `go build`?
A: `go run` compiles and runs the program without keeping a binary; `go build` compiles it into a reusable executable you can ship.

Q: What is `go.sum` for?
A: It records verified cryptographic checksums of every dependency so future downloads are guaranteed to match what you originally built against.

Q: What does `go vet` do that the compiler does not?
A: It runs static analysis for likely bugs the compiler still accepts, such as `Printf` format strings that don't match their arguments.

Q: What does the `./...` pattern mean in a go command?
A: "The current directory and every package beneath it" — a way to run a command across the whole module.

Q: Which tool gives editors autocompletion, go-to-definition, and format-on-save for Go?
A: `gopls`, the official Go language server.

# Exercises

### Easy
Install Go if you haven't, then run `go version` and `go env GOOS GOARCH`. Write down your Go version
and your operating system and architecture.

### Medium
Create a new module named `example.com/tools`, add a `main.go` that prints the current time using the
`time` package (`time.Now()`), run it with `go run .`, then build a binary with `go build` and run
the binary directly.

### Challenging
In your module from the Medium exercise, add the dependency `github.com/google/uuid` with `go get`,
print a new UUID, then run `go mod tidy`. Open `go.mod` and `go.sum` and explain, in a sentence each,
what changed and why both files matter for a teammate rebuilding your project.

# Further Reading

- *Download and install* — <https://go.dev/doc/install>
- *How to Write Go Code* — modules, packages, and testing basics: <https://go.dev/doc/code>
- *Go Modules Reference* — <https://go.dev/ref/mod>
- *Command documentation* (the `go` command) — <https://go.dev/cmd/go/>
