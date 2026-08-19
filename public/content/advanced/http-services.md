---
id: lesson-18
slug: http-services
title: "Building HTTP Services with net/http"
level: advanced
order: 18
duration: 24
tags:
  - net-http
  - handlers
  - servemux
  - middleware
  - json-api
summary: "Building web services with Go's standard net/http — handlers and the Handler interface, routing with ServeMux (including Go 1.22 method-and-path patterns), reading and writing JSON, middleware by wrapping handlers, and configuring a production http.Server with timeouts."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Write HTTP **handlers** and understand the **`http.Handler`** interface.
- Route requests with **`http.ServeMux`**, including method+path patterns (Go 1.22+).
- Read a request and write a **JSON** response with correct status codes and headers.
- Add cross-cutting behavior with **middleware** by wrapping handlers.
- Configure a production **`http.Server`** with **timeouts** and graceful behavior.

# Why It Matters

Go is a first-class language for web back-ends, and its **`net/http`** package is powerful enough to
build real services with **no framework**. The standard library gives you routing, a production HTTP
server, and everything needed for JSON APIs. Learning `net/http` directly means you understand what
frameworks are doing under the hood, and for many services you won't need a framework at all.

# Concept Explanation

### Handlers and the Handler interface

At the core of `net/http` is a one-method interface:

```go
type Handler interface {
	ServeHTTP(w http.ResponseWriter, r *http.Request)
}
```

- **`http.ResponseWriter`** is where you write the response (headers, status, body).
- **`*http.Request`** holds the incoming request (method, URL, headers, body, context).

You rarely implement the interface directly; instead you write a function of that shape and adapt it
with **`http.HandlerFunc`**:

```go
func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello!")
}
// http.HandlerFunc(hello) turns the function into an http.Handler
```

### Routing with ServeMux

A **`ServeMux`** ("multiplexer") maps request patterns to handlers. Since **Go 1.22**, patterns can
include the **HTTP method** and **path wildcards**:

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /health", healthHandler)
mux.HandleFunc("GET /users/{id}", getUser)     // {id} is a path wildcard
mux.HandleFunc("POST /users", createUser)

// read a wildcard inside the handler:
id := r.PathValue("id")
```

Then start the server:

```go
http.ListenAndServe(":8080", mux)
```

Before Go 1.22 the built-in mux matched paths only (no method or wildcard support), which is why many
projects reached for third-party routers; the enhanced mux narrows that gap.

### Reading and writing JSON

A JSON API decodes the request body and encodes the response, setting the `Content-Type` header and an
appropriate status code:

```go
type CreateUserReq struct {
	Name string `json:"name"`
}

func createUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest) // 400
		return
	}
	// ... create the user ...
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201
	json.NewEncoder(w).Encode(map[string]string{"id": "123", "name": req.Name})
}
```

Order matters: set headers, then call `WriteHeader(status)`, then write the body. Once you write the
body, the status is locked in.

### Middleware

**Middleware** is a function that wraps a handler to add behavior (logging, auth, timing) before or
after the inner handler runs. It takes an `http.Handler` and returns one:

```go
func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r) // call the wrapped handler
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

// wrap the whole mux: handler := logging(mux)
```

Because both the input and output are `http.Handler`, middleware **composes** — you can stack several.

### A production server

`http.ListenAndServe` uses a default server with **no timeouts**, which is risky in production (a slow
client can tie up a connection indefinitely). Configure an explicit `http.Server`:

```go
srv := &http.Server{
	Addr:         ":8080",
	Handler:      handler,
	ReadTimeout:  5 * time.Second,
	WriteTimeout: 10 * time.Second,
	IdleTimeout:  120 * time.Second,
}
log.Fatal(srv.ListenAndServe())
```

Timeouts bound how long the server waits on slow reads/writes. (Graceful shutdown with
`srv.Shutdown(ctx)` is covered in the production lesson.)

# Key Terminology

- **`http.Handler`** — the `ServeHTTP(w, r)` interface every handler satisfies.
- **`http.HandlerFunc`** — an adapter turning a function into a `Handler`.
- **`http.ResponseWriter` / `*http.Request`** — the response sink / the incoming request.
- **`ServeMux`** — the request router; matches method+path patterns (Go 1.22+).
- **Path wildcard / `PathValue`** — `{id}` in a pattern, read with `r.PathValue("id")`.
- **Middleware** — a handler-wrapping function that adds cross-cutting behavior.
- **`http.Server`** — the configurable server, notably its timeout fields.

# Options and Trade-offs

| Concern | Standard library | Third-party framework |
| ------- | ---------------- | --------------------- |
| Routing | `ServeMux` (method+path, wildcards, Go 1.22+) | Richer routing, param binding |
| Dependencies | None | Extra deps to manage |
| Learning what happens | Explicit and transparent | More magic, faster scaffolding |
| Middleware | Compose `http.Handler` wrappers | Built-in middleware chains |

For many services the standard library is enough; reach for a framework when you need features it
lacks and the trade in transparency is worth it.

| Response step | Do | Not |
| ------------- | -- | --- |
| Set headers | Before `WriteHeader` | After writing the body |
| Set status | `w.WriteHeader(code)` once | Multiple times |
| Errors | `http.Error(w, msg, code)` | Silently writing 200 |

# Worked Example

A tiny JSON API with routing, a wildcard, and logging middleware:

```go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("GET /greet/{name}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"hello": name})
	})

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      logging(mux),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	log.Println("listening on :8080")
	log.Fatal(srv.ListenAndServe())
}
```

A request to `/greet/Ada` returns `{"hello":"Ada"}` and logs `GET /greet/Ada (123µs)`. The mux routes
by method and path, the wildcard captures the name, and every request passes through the logging
wrapper.

# Real World Analogy

Think of your server as a **restaurant**. The `ServeMux` is the **host at the door** who reads the
reservation ("GET /users/{id}") and walks you to the right table (handler). The handler is the
**waiter** who takes your order (`*http.Request`) and brings your food (`http.ResponseWriter`).
Middleware is the **manager standing by the kitchen pass**, stamping every order with a timestamp and
noting it in the log on the way in and out — without the waiters having to remember to do it. And the
server timeouts are the **policy that a table can't be held forever** by a guest who never orders.

# Examples

## Example 1 — Basic: the smallest handler

```go
func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello, web!")
	})
	http.ListenAndServe(":8080", nil) // nil uses the default mux
}
```

**Why this works:** `http.HandleFunc` registers the function on the default mux, and
`ListenAndServe(":8080", nil)` serves it. Visiting `http://localhost:8080/` returns the greeting.

## Example 2 — Real-world: decode, validate, respond with a status

```go
func createTodo(w http.ResponseWriter, r *http.Request) {
	var t struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if t.Title == "" {
		http.Error(w, "title required", http.StatusUnprocessableEntity)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{"id": 1, "title": t.Title})
}
```

**Why this works:** it decodes JSON, returns precise error codes for bad or incomplete input (`400`,
`422`), and only on success writes `201 Created` with a JSON body — the shape of a well-behaved API
endpoint.

## Example 3 — Pitfall: writing the body before the status

```go
func bad(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("oops"))            // this implicitly sends 200 OK...
	w.WriteHeader(http.StatusInternalServerError) // ...too late; logs a warning, ignored
}
```

**Why this bites:** the first `Write` sends the header with an implicit `200 OK`, so the later
`WriteHeader(500)` has no effect (and Go logs "superfluous WriteHeader call"). Always set headers and
call `WriteHeader` **before** writing any body.

# Common Mistakes

- **Calling `WriteHeader` after writing the body.** Set status and headers first.
- **Using `ListenAndServe` with no timeouts in production.** Configure an `http.Server`.
- **Not closing `r.Body` when you read it manually.** (The server closes it for you, but be careful
  with clients.)
- **Ignoring the request `context`.** Use `r.Context()` to respect client cancellation for slow work.
- **Assuming the old mux matched methods.** Method/wildcard patterns require Go 1.22+.

# Best Practices

- Route with `ServeMux` method+path patterns; read wildcards via `r.PathValue`.
- Set `Content-Type`, then status, then body — in that order.
- Return specific status codes (`400`, `404`, `422`, `500`) with `http.Error`.
- Add logging/recovery/auth as composable middleware.
- Run a configured `http.Server` with read/write/idle timeouts; honor `r.Context()`.

# Summary

- Handlers satisfy **`http.Handler`** (`ServeHTTP`); write functions and adapt with
  **`http.HandlerFunc`**.
- **`ServeMux`** routes requests; since **Go 1.22** patterns include the method and path wildcards
  (`r.PathValue`).
- JSON APIs decode `r.Body` and encode responses, setting `Content-Type` and a status **before** the
  body.
- **Middleware** wraps `http.Handler`s to add logging, auth, and timing, and it composes.
- Use a configured **`http.Server`** with **timeouts** rather than the default in production.

# Flash Cards

Q: What single method defines the `http.Handler` interface?
A: `ServeHTTP(w http.ResponseWriter, r *http.Request)` — anything with that method is an HTTP handler.

Q: What does `http.HandlerFunc` do?
A: It adapts an ordinary function with the `(w, r)` signature into an `http.Handler`, so you don't have to define a type with a `ServeHTTP` method.

Q: What routing capability did Go 1.22 add to the standard `ServeMux`?
A: Patterns can specify the HTTP method and path wildcards (e.g. `GET /users/{id}`), with wildcard values read via `r.PathValue`.

Q: In what order must you set headers, status, and body on a response?
A: Set headers first, then call `WriteHeader(status)`, then write the body — writing the body first locks in an implicit `200 OK`.

Q: What is HTTP middleware in Go?
A: A function that takes an `http.Handler` and returns a new one that adds behavior (logging, auth, timing) around the wrapped handler; because types match, middleware composes.

Q: Why configure an `http.Server` instead of using `http.ListenAndServe` directly in production?
A: The default has no timeouts, so slow clients can tie up connections; an explicit `http.Server` lets you set `ReadTimeout`, `WriteTimeout`, and `IdleTimeout`.

# Exercises

### Easy
Write a server with a `GET /ping` route that responds with the text `pong`. Run it and confirm with a
browser or `curl http://localhost:8080/ping`.

### Medium
Add a `GET /square/{n}` route that parses `n` from the path (`r.PathValue`), returns
`{"n": N, "square": N*N}` as JSON with `Content-Type: application/json`, and returns `400` if `n`
isn't a valid integer.

### Challenging
Add a `recoverer` middleware that wraps a handler in a deferred `recover()` so a panic in any handler
returns `500` instead of crashing the server, plus the `logging` middleware from this lesson. Stack
both around your mux and demonstrate a handler that panics is handled gracefully.

# Further Reading

- *`net/http` package* — <https://pkg.go.dev/net/http>
- *Tutorial: Developing a RESTful API with Go and Gin* (concepts also apply to net/http): <https://go.dev/doc/tutorial/web-service-gin>
- *Routing enhancements for Go 1.22* (Go blog): <https://go.dev/blog/routing-enhancements>
- *Writing Web Applications*: <https://go.dev/doc/articles/wiki/>
