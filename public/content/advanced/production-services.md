---
id: lesson-23
slug: production-services
title: "Production Go: Config, Logging, and Graceful Shutdown"
level: advanced
order: 23
duration: 22
tags:
  - production
  - logging
  - configuration
  - graceful-shutdown
  - slog
summary: "Taking a Go service to production — reading configuration from flags and environment variables, structured logging with log/slog, and shutting down gracefully on a signal so in-flight requests finish and resources are released cleanly."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Read **configuration** from command-line flags and environment variables.
- Emit **structured logs** with the standard **`log/slog`** package.
- Handle OS **signals** and trigger a **graceful shutdown**.
- Drain in-flight HTTP requests with **`http.Server.Shutdown`**.
- Wire config, logging, server, and shutdown into a clean `main`.

# Why It Matters

A program that runs on your laptop isn't yet a production service. Real services need to be
**configured** without recompiling, to **log** in a form machines can parse, and to **shut down
cleanly** — finishing in-flight work and releasing resources — when the platform sends a stop signal
(a deploy, a scale-down, a restart). Go's standard library covers all three, and this lesson combines
what you learned about `context` and `net/http` into the shape of a well-behaved service.

# Concept Explanation

### Configuration: flags and environment

The standard **`flag`** package parses command-line options; environment variables are read with
**`os.Getenv`**. A common pattern is to let env vars provide defaults that flags can override:

```go
import (
	"flag"
	"os"
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	addr := flag.String("addr", getenv("ADDR", ":8080"), "listen address")
	flag.Parse()
	// use *addr
}
```

Twelve-factor style favors environment variables for deployment config (they're easy to set per
environment and keep secrets out of source); flags are convenient for local runs and overrides.
Validate configuration early and fail fast with a clear message if something required is missing.

### Structured logging with log/slog

Since **Go 1.21**, the standard library includes **`log/slog`** for **structured logging** — logs as
key/value pairs rather than free-form text, so they're easy to filter and query in a log system:

```go
import "log/slog"

logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("server starting", "addr", ":8080", "env", "prod")
logger.Error("db connect failed", "err", err, "attempt", 3)
```

Output (JSON handler):

```json
{"time":"...","level":"INFO","msg":"server starting","addr":":8080","env":"prod"}
```

You can attach common fields with `logger.With("service", "api")` and choose a text handler for local
development. Structured logs beat `fmt.Println` in production because tools can index the fields.

### Signals and graceful shutdown

When a platform stops your service, it sends a signal — typically **SIGINT** (Ctrl-C) or **SIGTERM**
(orchestrators). You want to catch it and shut down **gracefully**: stop accepting new requests, let
in-flight ones finish, then exit. `signal.NotifyContext` turns those signals into a cancellable
context:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
// ctx is cancelled when SIGINT/SIGTERM arrives
```

For an HTTP server, `Shutdown(ctx)` stops accepting new connections and waits for active requests to
complete (up to the context's deadline):

```go
<-ctx.Done() // wait for the stop signal
shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
	logger.Error("graceful shutdown failed", "err", err)
	srv.Close() // force-close as a last resort
}
```

The timeout bounds how long you'll wait for stragglers before giving up — so shutdown can't hang
forever.

### A health check

Orchestrators probe a **health endpoint** to know whether your service is alive/ready. A minimal one:

```go
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
})
```

Keep it cheap and dependency-light so a probe doesn't itself cause load or fail for unrelated reasons.

# Key Terminology

- **Configuration** — runtime settings from flags/env, not hardcoded or recompiled.
- **`flag`** — the standard command-line flag parser.
- **`log/slog`** — the standard structured-logging package (Go 1.21+).
- **Structured logging** — logs as key/value pairs for machine querying.
- **Signal (SIGINT/SIGTERM)** — an OS message asking a process to stop.
- **`signal.NotifyContext`** — turns signals into a cancellable context.
- **Graceful shutdown** — stop accepting new work, finish in-flight work, then exit.
- **`http.Server.Shutdown`** — drains active requests before closing the server.
- **Health check** — an endpoint a platform probes to check liveness/readiness.

# Options and Trade-offs

| Concern | Option A | Option B | Guidance |
| ------- | -------- | -------- | -------- |
| Config source | Flags | Environment variables | Env for deploy/secret config; flags for local overrides |
| Logging | `fmt`/`log` text | `log/slog` structured | Structured in production; text handler locally |
| Log format | JSON handler | Text handler | JSON for log systems; text for human reading |
| Shutdown | `srv.Close()` (abrupt) | `srv.Shutdown(ctx)` (graceful) | Graceful with a timeout; `Close` only as fallback |
| Shutdown timeout | Long | Short | Long enough to drain requests, short enough not to hang deploys |

# Worked Example

A complete, production-shaped `main` tying it all together:

```go
package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	addr := flag.String("addr", envOr("ADDR", ":8080"), "listen address")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	srv := &http.Server{
		Addr:         *addr,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Cancel this context on SIGINT/SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("server starting", "addr", *addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("listen failed", "err", err)
			stop() // trigger shutdown on a fatal listen error
		}
	}()

	<-ctx.Done() // block until a signal arrives
	logger.Info("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "err", err)
	}
	logger.Info("server stopped cleanly")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

Pressing Ctrl-C (or the platform sending SIGTERM) cancels `ctx`; the server then stops accepting
connections and drains in-flight requests within 10 seconds before the program exits. Note that
`ListenAndServe` returns `http.ErrServerClosed` on a clean shutdown, which we deliberately ignore.

# Real World Analogy

Graceful shutdown is like a **shop closing for the night the right way**. When the "closing time"
signal comes, you **lock the front door to new customers** (stop accepting connections) but you **let
the people already inside finish checking out** (drain in-flight requests) before you turn off the
lights and leave. The shutdown timeout is the **"we really do have to leave by 10:10" rule** — you'll
wait for stragglers, but not all night. Abruptly killing the process is instead like **cutting the
power mid-transaction** — some customers lose their carts, and you may leave a mess to clean up.

# Examples

## Example 1 — Basic: a flag with an env default

```go
func main() {
	port := flag.String("port", envOr("PORT", "8080"), "server port")
	flag.Parse()
	fmt.Println("using port", *port)
}
```

**Why this works:** `PORT` from the environment provides the default; a `-port` flag overrides it for
local runs. Config comes from outside the binary, so no recompile is needed to change it.

## Example 2 — Real-world: structured logging with context fields

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With(
	"service", "checkout",
	"version", version,
)
logger.Info("order placed", "orderID", id, "amountCents", 1299)
logger.Warn("payment retry", "orderID", id, "attempt", 2)
```

**Why this works:** `With` attaches `service` and `version` to every log line, and each call adds
event-specific key/values. A log system can then filter by `service=checkout` or aggregate by
`orderID` — impossible with unstructured text.

## Example 3 — Pitfall: ignoring ErrServerClosed

```go
if err := srv.ListenAndServe(); err != nil {
	log.Fatal(err) // BUG: logs a fatal error on EVERY clean shutdown
}
```

**Why this bites:** a graceful `Shutdown` causes `ListenAndServe` to return `http.ErrServerClosed` —
which is **normal**, not a failure. Treating it as fatal makes every clean stop look like a crash in
your logs and alerts. Check `if err != nil && !errors.Is(err, http.ErrServerClosed)` before treating
it as an error.

# Common Mistakes

- **Hardcoding config.** Read from flags/env so behavior changes without recompiling.
- **Unstructured logs in production.** Use `log/slog` so logs are queryable.
- **No graceful shutdown.** In-flight requests get cut off and resources leak on restart.
- **Treating `http.ErrServerClosed` as an error.** It's the normal result of a clean shutdown.
- **Unbounded shutdown.** Always give `Shutdown` a timeout so a deploy can't hang forever.

# Best Practices

- Source deployment config (and secrets) from the **environment**; allow flag overrides; validate
  early.
- Log with **`log/slog`** as JSON in production and text locally; attach common fields with `With`.
- Convert stop signals to a context with **`signal.NotifyContext`** and shut down on `ctx.Done()`.
- Call **`srv.Shutdown(ctx)`** with a bounded timeout; fall back to `Close` only if it fails.
- Provide a cheap **health endpoint** for liveness/readiness probes.

# Summary

- Read **configuration** from flags and environment variables; don't hardcode or recompile to change
  behavior.
- Use **`log/slog`** for **structured**, queryable logs (JSON in prod, text locally).
- Turn **SIGINT/SIGTERM** into a cancellable context with **`signal.NotifyContext`**.
- **Gracefully shut down** with **`http.Server.Shutdown(ctx)`** under a timeout, ignoring
  `http.ErrServerClosed`.
- Expose a lightweight **health check**; validate config and fail fast on startup.

# Flash Cards

Q: Where should a production service get its configuration, and why?
A: From command-line flags and environment variables (not hardcoded), so behavior and secrets can change per environment without recompiling; env vars suit deployment config, flags suit local overrides.

Q: What does the standard `log/slog` package provide, and since when?
A: Structured logging as key/value pairs (queryable by log systems), available in the standard library since Go 1.21.

Q: How do you turn OS stop signals into something your program can wait on?
A: `signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)` returns a context that is cancelled when one of those signals arrives, plus a `stop` function to release it.

Q: What does `http.Server.Shutdown(ctx)` do that `Close` doesn't?
A: `Shutdown` stops accepting new connections and waits for in-flight requests to finish (up to the context deadline), whereas `Close` abruptly terminates connections.

Q: Why must you ignore `http.ErrServerClosed` from `ListenAndServe`?
A: It's the normal value returned after a graceful `Shutdown`; treating it as an error makes every clean shutdown look like a crash.

Q: Why give the shutdown context a timeout?
A: To bound how long you wait for in-flight requests to drain, so a stuck request can't make shutdown (and a deploy) hang indefinitely.

# Exercises

### Easy
Write a program that reads a `-name` flag defaulting to the `NAME` environment variable (or "world"),
and logs a greeting with `log/slog` including the name as a structured field.

### Medium
Build a small HTTP server with a `/healthz` route and add graceful shutdown on SIGINT using
`signal.NotifyContext` and `srv.Shutdown` with a 5-second timeout. Verify that pressing Ctrl-C logs a
clean shutdown instead of a crash.

### Challenging
Extend the worked-example server: add a slow handler (sleeps 3 seconds), start a request, then send the
shutdown signal while it's in flight. Confirm the in-flight request completes before the server exits,
and that a request started *after* the signal is refused. Explain how `Shutdown` produced that behavior.

# Further Reading

- *`log/slog` package* — <https://pkg.go.dev/log/slog> · *Structured Logging with slog* (Go blog): <https://go.dev/blog/slog>
- *`flag` package* — <https://pkg.go.dev/flag> · *`os/signal`* — <https://pkg.go.dev/os/signal>
- *`http.Server.Shutdown`* — <https://pkg.go.dev/net/http#Server.Shutdown>
- *The Twelve-Factor App* — Config: <https://12factor.net/config>
