---
id: lesson-22
slug: modules-and-distribution
title: "Modules, Versioning, and Distributing Programs"
level: advanced
order: 22
duration: 22
tags:
  - modules
  - versioning
  - semver
  - cross-compilation
  - go-install
summary: "Shipping Go code — publishing a module with semantic version tags and the v2+ import-path rule, installing tools with go install, cross-compiling to other platforms with GOOS/GOARCH, static builds, and how the module proxy and checksum database keep dependencies reproducible and verified."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Publish a **module** with **semantic version** tags and follow the **v2+** path rule.
- Install command-line tools with **`go install pkg@version`**.
- **Cross-compile** to other operating systems and architectures with `GOOS`/`GOARCH`.
- Produce small, **static** binaries and stamp them with build metadata.
- Explain how the **module proxy** and **checksum database** make builds reproducible and verified.

# Why It Matters

One of Go's biggest wins is deployment: a program compiles to a **single self-contained binary** with
no runtime to install, and you can build that binary for another OS/architecture from your own machine.
On the flip side, when you publish a library, Go's module and versioning rules govern how others depend
on it reproducibly. This lesson covers both directions — distributing programs and publishing modules —
so your Go code travels well.

# Concept Explanation

### Publishing a module

A module is published simply by pushing it to a version-control host and tagging a **semantic
version**. There's no separate registry to upload to:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Consumers then `go get your.module/path@v1.0.0`. Semantic versioning (`vMAJOR.MINOR.PATCH`) carries a
promise:

- **PATCH** (`v1.0.1`) — backward-compatible bug fixes.
- **MINOR** (`v1.1.0`) — backward-compatible new features.
- **MAJOR** (`v2.0.0`) — **breaking** changes.

### The v2+ import path rule

Because a MAJOR bump means incompatibility, Go requires the **major version to appear in the module
path** for v2 and above. The `go.mod` module line and the import path both gain a `/v2` suffix:

```text
// go.mod for a v2 module
module github.com/you/lib/v2
```

```go
import "github.com/you/lib/v2"
```

This lets v1 and v2 of the same library coexist in one build — different import paths, no conflict. v0
and v1 use the bare path (no suffix).

### Installing tools

To install a Go program as a command on your machine, use `go install` with a version:

```bash
go install github.com/user/tool@latest   # or @v1.4.0
```

It builds the command and places the binary in your Go bin directory (`$(go env GOPATH)/bin`, on your
PATH). This is how most Go-based CLI tools are distributed and installed.

### Cross-compilation

Go cross-compiles trivially: set **`GOOS`** (target OS) and **`GOARCH`** (target CPU architecture)
and build. No cross-toolchain to install (for pure-Go programs):

```bash
GOOS=linux   GOARCH=amd64 go build -o app-linux    ./cmd/app
GOOS=windows GOARCH=amd64 go build -o app.exe       ./cmd/app
GOOS=darwin  GOARCH=arm64 go build -o app-mac-arm   ./cmd/app
```

Run `go tool dist list` to see all supported `GOOS/GOARCH` pairs.

### Static binaries and build metadata

Go binaries are largely self-contained already. For a fully **static** binary with no C dependencies
(handy for minimal container images), disable cgo:

```bash
CGO_ENABLED=0 go build -o app ./cmd/app
```

Useful build flags:

- `-ldflags "-X main.version=1.2.3"` — **stamp** a variable at build time (e.g. inject the version).
- `-ldflags "-s -w"` — strip the symbol table and debug info to shrink the binary.
- `-trimpath` — remove local filesystem paths from the binary for reproducible, cleaner builds.

```bash
go build -trimpath -ldflags "-s -w -X main.version=$(git describe --tags)" -o app ./cmd/app
```

### The module proxy and checksum database

By default, `go` fetches dependencies through the **module proxy** (`proxy.golang.org`) rather than
cloning repositories directly, and verifies every download against the **checksum database**
(`sum.golang.org`). Your `go.sum` records the expected checksums, so a dependency can't change under
you without detection. This is what makes Go builds **reproducible and tamper-evident**.

- **`GOPROXY`** configures the proxy (or `off` to require the cache/vendor).
- **`go mod vendor`** copies dependencies into a local `vendor/` directory, so builds need no network
  and use exactly that code — useful for locked-down or offline environments.

# Key Terminology

- **Semantic versioning** — `vMAJOR.MINOR.PATCH`; MAJOR is breaking, MINOR adds features, PATCH fixes.
- **v2+ path rule** — modules at v2 and up put `/vN` in the module path and imports.
- **`go install pkg@version`** — builds and installs a command onto your PATH.
- **`GOOS` / `GOARCH`** — target operating system / CPU architecture for a build.
- **`CGO_ENABLED=0`** — disables cgo for a fully static, pure-Go binary.
- **`-ldflags` / `-trimpath`** — inject/strip metadata / remove local paths for reproducibility.
- **Module proxy / checksum database** — services that serve and verify dependencies.
- **Vendoring** — copying dependencies into `vendor/` for network-free, pinned builds.

# Options and Trade-offs

| Goal | Command / setting | Note |
| ---- | ----------------- | ---- |
| Publish a library | `git tag vX.Y.Z` + push | No registry upload needed |
| Release a breaking version | `/vN` in module path (v2+) | v1 and v2 can coexist |
| Install a CLI tool | `go install pkg@version` | Lands in Go bin dir |
| Build for another OS/arch | `GOOS`/`GOARCH` | Pure-Go needs no cross toolchain |
| Minimal container binary | `CGO_ENABLED=0` static build | No libc dependency |
| Smaller binary | `-ldflags "-s -w"` | Drops debug/symbol info |
| Reproducible build | `-trimpath` | Removes local paths |
| Offline/locked builds | `go mod vendor` | Bundles deps in `vendor/` |

# Worked Example

Build release binaries for three platforms, stamped with a version:

```bash
#!/usr/bin/env bash
set -euo pipefail

VERSION="$(git describe --tags --always)"
LDFLAGS="-s -w -X main.version=${VERSION}"

for target in "linux/amd64" "darwin/arm64" "windows/amd64"; do
  os="${target%/*}"; arch="${target#*/}"
  ext=""; [ "$os" = "windows" ] && ext=".exe"
  out="dist/app-${os}-${arch}${ext}"
  echo "building ${out}"
  CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" \
    go build -trimpath -ldflags "$LDFLAGS" -o "$out" ./cmd/app
done
```

With `var version = "dev"` in `package main`, the `-X main.version=...` flag replaces it at build time,
so `app --version` reports the git tag. One machine produces static binaries for Linux, macOS (ARM),
and Windows — no target machines or cross-toolchains required.

# Real World Analogy

Distributing a Go program is like **shipping a fully assembled appliance rather than a flat-pack kit**.
There's no "some assembly required," no separate runtime to buy — you hand someone the binary and it
works. Cross-compilation is the factory being able to **stamp out the model for any country's power
outlets** from one production line (`GOOS`/`GOARCH`) without retooling. And the module proxy plus
checksum database are the **tamper-evident seal and serial number** on every part you source from
suppliers: if a supplier swaps a component, the seal (checksum) no longer matches and the line stops.

# Examples

## Example 1 — Basic: install and run a tool

```bash
go install golang.org/x/tools/cmd/stringer@latest
stringer --help   # now on your PATH from the Go bin directory
```

**Why this works:** `go install pkg@latest` fetches, builds, and drops the `stringer` binary into your
Go bin directory; because that directory is on your PATH, you run it by name.

## Example 2 — Real-world: a minimal container image

```text
# Dockerfile (multi-stage)
FROM golang:1 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /app ./cmd/app

FROM scratch
COPY --from=build /app /app
ENTRYPOINT ["/app"]
```

**Why this works:** `CGO_ENABLED=0` makes a static binary that needs no OS libraries, so it runs on the
empty `scratch` base image — yielding a tiny, secure container with just your program inside.

## Example 3 — Pitfall: forgetting the /v2 path

```text
// You released v2.0.0 but kept go.mod as:
module github.com/you/lib          // WRONG for v2+

// Consumers get: go: github.com/you/lib@v2.0.0: invalid version:
// module contains a go.mod file, so major version must be compatible...
```

**Why this bites:** Go's tooling enforces that v2+ modules carry `/v2` in their module path. Tagging
`v2.0.0` without updating the `go.mod` module line (and imports) breaks resolution. The fix: set
`module github.com/you/lib/v2` and update import paths before tagging the v2 release.

# Common Mistakes

- **Tagging v2+ without the `/vN` path.** The module path must include the major version.
- **Committing platform-specific binaries instead of cross-compiling.** Build per target with
  `GOOS`/`GOARCH`.
- **Assuming cgo-free.** If you import cgo-using packages, `CGO_ENABLED=0` may fail — check your deps.
- **Not committing `go.sum`.** It's what makes dependency downloads verifiable.
- **Hardcoding a version string.** Inject it with `-ldflags -X` at build time instead.

# Best Practices

- Follow semantic versioning honestly; reserve MAJOR bumps for real breaking changes.
- Put `/vN` in the module path for v2+ and update imports before tagging.
- Distribute CLIs via `go install pkg@version`; document the exact path.
- Cross-compile release artifacts with `GOOS`/`GOARCH`, `-trimpath`, and a stamped version.
- Commit `go.mod` and `go.sum`; rely on the proxy and checksum DB for reproducibility.

# Summary

- Publish a module by **tagging a semantic version**; there's no separate registry.
- **v2+** modules must carry the major version in the **module path** and imports (`/v2`), letting
  versions coexist.
- Install tools with **`go install pkg@version`**; they land on your PATH.
- **Cross-compile** with `GOOS`/`GOARCH`, build **static** binaries with `CGO_ENABLED=0`, and stamp
  metadata with `-ldflags -X`.
- The **module proxy** and **checksum database** (plus `go.sum`) make dependencies reproducible and
  tamper-evident; **vendoring** bundles them for offline builds.

# Flash Cards

Q: How do you publish a new version of a Go module?
A: Tag the commit with a semantic version (e.g. `git tag v1.2.0`) and push it; consumers fetch it with `go get module@v1.2.0` — there's no separate registry upload.

Q: What must change when you release v2.0.0 of a module?
A: The major version must appear in the module path and imports — `module .../v2` in `go.mod` and `/v2` in import paths — because a MAJOR bump signals breaking changes.

Q: How do you cross-compile a Go program for another OS and CPU?
A: Set the `GOOS` and `GOARCH` environment variables and run `go build` (e.g. `GOOS=linux GOARCH=arm64 go build`); pure-Go programs need no cross-toolchain.

Q: How do you build a fully static Go binary, and why would you?
A: Set `CGO_ENABLED=0` when building; the resulting binary has no libc dependency, so it runs on minimal images like `scratch`.

Q: What do the module proxy and checksum database provide?
A: The proxy serves dependency versions and the checksum database verifies them against `go.sum`, making builds reproducible and detecting any tampering with a dependency.

Q: What does `-ldflags "-X main.version=1.2.3"` do?
A: It injects the value `1.2.3` into the `main.version` variable at build time, so you can stamp a binary with its version without hardcoding it in source.

# Exercises

### Easy
Cross-compile a small "hello" program for a platform different from your own using `GOOS`/`GOARCH`, and
confirm a binary is produced. List a few available targets with `go tool dist list`.

### Medium
Add a `var version = "dev"` to a `main` package that prints it on `--version`, then build with
`-ldflags "-X main.version=1.0.0"` and confirm the flag overrode the default. Also build with
`-ldflags "-s -w"` and compare binary sizes.

### Challenging
Take a module at v1, introduce a breaking API change, and prepare a proper v2 release: update the
`go.mod` module path to end in `/v2`, fix all internal import paths, and describe (in a short note) how
a consumer would import both v1 and v2 simultaneously and why that's possible.

# Further Reading

- *Go Modules Reference* — <https://go.dev/ref/mod>
- *Developing and publishing modules* — <https://go.dev/doc/modules/developing>
- *Module version numbering* — <https://go.dev/doc/modules/version-numbers>
- *`go` command documentation* (`build`, `install`, environment) — <https://go.dev/cmd/go/>
