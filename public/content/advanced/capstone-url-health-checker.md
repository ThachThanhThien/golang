---
id: lesson-24
slug: capstone-url-health-checker
title: "Capstone: A Concurrent URL Health Checker"
level: advanced
order: 24
duration: 26
tags:
  - capstone
  - concurrency
  - cli
  - context
  - http-client
summary: "A capstone that combines the whole course — build a command-line tool that checks many URLs concurrently using a bounded worker pool, per-request timeouts via context, the standard http.Client, structured results, a meaningful exit code, and a test with httptest."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Combine **flags**, **goroutines**, **channels**, and a **worker pool** into a real CLI.
- Bound each request with **`context`** and the **`http.Client`**.
- Collect and present **structured results** deterministically.
- Return a meaningful **exit code** for scripts and CI.
- **Test** HTTP code with **`net/http/httptest`**.

# Why It Matters

Individually, the pieces of this course — types, functions, structs, interfaces, errors, goroutines,
channels, context, HTTP, testing — are useful. Together they let you build real tools. This capstone
assembles them into a **URL health checker**: give it a list of URLs and it reports which are up,
concurrently and quickly, with a per-request timeout and an exit code your scripts can act on. Building
it end to end is the best way to see how idiomatic Go fits together.

# Concept Explanation

We'll build `urlcheck`, a command that checks each URL with a `GET` request and reports its status and
latency. The design uses a **bounded worker pool** so we make many requests concurrently without
launching an unbounded number of goroutines.

### The result type

First, a struct to hold each check's outcome — status code, how long it took, and any error:

```go
type Result struct {
	URL     string
	Status  int
	Latency time.Duration
	Err     error
}
```

### Checking one URL

A single check builds a request tied to a **context** (so it can be cancelled or time out), sends it
with an `http.Client`, and records the latency. Note the `defer resp.Body.Close()` — and that we only
close the body on success:

```go
func check(ctx context.Context, client *http.Client, url string) Result {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Result{URL: url, Err: err}
	}
	resp, err := client.Do(req)
	latency := time.Since(start)
	if err != nil {
		return Result{URL: url, Latency: latency, Err: err}
	}
	defer resp.Body.Close()
	return Result{URL: url, Status: resp.StatusCode, Latency: latency}
}
```

### The worker pool

Now the concurrency. A fixed number of workers pull URLs off a `jobs` channel and push `Result`s onto
a `results` channel. A `WaitGroup` tracks the workers, and a helper goroutine closes `results` once
they're all done so the collector's `range` ends cleanly:

```go
func runChecks(ctx context.Context, urls []string, workers int, timeout time.Duration) []Result {
	client := &http.Client{Timeout: timeout}
	jobs := make(chan string)
	results := make(chan Result)

	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for url := range jobs { // each worker drains jobs until it's closed
				reqCtx, cancel := context.WithTimeout(ctx, timeout)
				results <- check(reqCtx, client, url)
				cancel() // release the per-request context promptly
			}
		}()
	}

	go func() { // feed jobs, then close so workers stop ranging
		for _, u := range urls {
			jobs <- u
		}
		close(jobs)
	}()

	go func() { // once all workers finish, close results
		wg.Wait()
		close(results)
	}()

	var all []Result
	for r := range results { // collect until results is closed
		all = append(all, r)
	}
	return all
}
```

Every concurrency rule from earlier lessons shows up here: the producer owns closing `jobs`; workers
`range` until it closes; a `WaitGroup` coordinates completion; and `results` is closed exactly once,
after `wg.Wait()`, so the collector's `range` terminates. The `http.Client.Timeout` bounds each whole
request, and the per-request context lets a parent cancellation (say, Ctrl-C) abort in-flight checks
too.

### The main function

`main` parses flags, validates input, runs the checks, prints results **sorted** (so output is
deterministic despite concurrent completion), and sets the **exit code**:

```go
func main() {
	workers := flag.Int("workers", 8, "number of concurrent workers")
	timeout := flag.Duration("timeout", 5*time.Second, "per-request timeout")
	flag.Parse()

	urls := flag.Args()
	if len(urls) == 0 {
		fmt.Fprintln(os.Stderr, "usage: urlcheck [-workers N] [-timeout D] URL...")
		os.Exit(2)
	}

	results := runChecks(context.Background(), urls, *workers, *timeout)
	sort.Slice(results, func(i, j int) bool { return results[i].URL < results[j].URL })

	failed := 0
	for _, r := range results {
		switch {
		case r.Err != nil:
			failed++
			fmt.Printf("DOWN  %-30s %v\n", r.URL, r.Err)
		case r.Status >= 400:
			failed++
			fmt.Printf("DOWN  %-30s HTTP %d (%s)\n", r.URL, r.Status, r.Latency.Round(time.Millisecond))
		default:
			fmt.Printf("UP    %-30s HTTP %d (%s)\n", r.URL, r.Status, r.Latency.Round(time.Millisecond))
		}
	}
	fmt.Printf("\n%d/%d healthy\n", len(results)-failed, len(results))
	if failed > 0 {
		os.Exit(1) // non-zero exit lets CI/scripts detect failures
	}
}
```

Put these pieces (with the imports `context`, `flag`, `fmt`, `net/http`, `os`, `sort`, `sync`, `time`)
in one `main.go` and you have a complete, working tool.

# Key Terminology

- **Worker pool** — a fixed set of goroutines consuming jobs from a channel (bounded concurrency).
- **`http.Client`** — the standard HTTP client; its `Timeout` bounds a whole request.
- **`http.NewRequestWithContext`** — builds a request tied to a context for cancellation/timeouts.
- **Exit code** — the process's return status; non-zero signals failure to scripts and CI.
- **`net/http/httptest`** — a package for spinning up test servers to test HTTP code.
- **Deterministic output** — sorting results so concurrency doesn't scramble the report.

# Options and Trade-offs

| Decision | Choice made | Alternative | Why |
| -------- | ----------- | ----------- | --- |
| Concurrency | Bounded worker pool | One goroutine per URL | Caps resource use for large inputs |
| Request timeout | `client.Timeout` + context | No timeout | Prevents one slow URL from hanging the run |
| Output order | Sort by URL | Print as they finish | Deterministic, testable output |
| Failure signaling | Exit code + text | Only text | Scripts/CI can branch on the exit code |
| HTTP method | `GET` | `HEAD` | `GET` is universal; `HEAD` is lighter but less supported |

# Worked Example

Running the tool against a few URLs (illustrative output):

```bash
$ urlcheck -workers 4 -timeout 3s https://example.com https://httpbin.org/status/500 https://nope.invalid
DOWN  https://httpbin.org/status/500 HTTP 500 (240ms)
DOWN  https://nope.invalid           Get "https://nope.invalid": dial tcp: lookup nope.invalid: no such host
UP    https://example.com            HTTP 200 (180ms)

1/3 healthy
$ echo $?
1
```

Four workers check three URLs concurrently. `example.com` is healthy; the `500` endpoint and the
non-resolving host are reported as down (one via status code, one via a transport error). Output is
sorted by URL, and the process exits `1` because at least one check failed — so a CI job or shell
script can detect the problem with `if ! urlcheck ...`. The exact latencies vary per run.

# Real World Analogy

This tool is like a **hotel's front-desk night check**. Rather than one clerk walking every floor in
sequence (slow), the manager sends out a **fixed team of four staff** (the worker pool), each grabbing
the next room from a shared list (the jobs channel) and reporting back "occupied / empty / no answer"
(results). Each knock has a **give-up time** so nobody waits forever at one door (the timeout). At the
end, the manager sorts the reports by room number for a tidy log (deterministic output) and, if any
room had a problem, flags the whole night's report as needing attention (non-zero exit code).

# Examples

## Example 1 — Basic: testing a single check with httptest

```go
func TestCheckOK(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	r := check(context.Background(), srv.Client(), srv.URL)
	if r.Err != nil {
		t.Fatalf("unexpected error: %v", r.Err)
	}
	if r.Status != http.StatusOK {
		t.Errorf("status = %d, want 200", r.Status)
	}
}
```

**Why this works:** `httptest.NewServer` starts a real local server returning `200`; `srv.Client()` is
an HTTP client already pointed at it. The test exercises `check` end to end without touching the
network — fast, reliable, and self-contained.

## Example 2 — Real-world: reading URLs from a file

```go
func readURLs(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var urls []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" && !strings.HasPrefix(line, "#") { // skip blanks and comments
			urls = append(urls, line)
		}
	}
	return urls, scanner.Err()
}
```

**Why this works:** it accepts a file of URLs (one per line, `#` comments allowed) using `bufio` from
the standard-library lesson, so the tool scales beyond command-line arguments — wire it into `main`
with a `-file` flag.

## Example 3 — Pitfall: leaking response bodies

```go
// BUG: body never closed on the success path
resp, err := client.Do(req)
if err != nil {
	return Result{URL: url, Err: err}
}
return Result{URL: url, Status: resp.StatusCode} // resp.Body leaks!
```

**Why this bites:** every successful response holds an open body that must be closed, or the underlying
connection can't be reused and resources leak over many requests. The fix is `defer resp.Body.Close()`
right after the error check (as in the real `check`), and for correctness under keep-alive you'd also
drain the body (e.g. `io.Copy(io.Discard, resp.Body)`) before closing.

# Common Mistakes

- **One goroutine per URL, unbounded.** Use a worker pool so huge inputs don't exhaust resources.
- **No timeout.** A single unresponsive host can hang the entire run; set `client.Timeout` and a
  context.
- **Not closing response bodies.** Leaks connections; always `defer resp.Body.Close()`.
- **Nondeterministic output.** Sort results before printing so runs (and tests) are stable.
- **Always exiting zero.** Return a non-zero code on failures so automation can react.

# Best Practices

- Bound concurrency with a worker pool sized by a `-workers` flag; close `jobs` from the producer and
  `results` after `wg.Wait()`.
- Give every request a timeout and thread a context so the whole run is cancellable.
- Close (and drain) response bodies; reuse a single `http.Client`.
- Make output deterministic (sort) and machine-friendly; signal failure via the exit code.
- Test HTTP code with `httptest`, covering success, error status, and transport-failure cases.

# Summary

- The capstone combines **flags, a worker pool (goroutines + channels), context timeouts, `http.Client`,
  error handling, and testing** into one CLI.
- A **bounded worker pool** checks many URLs concurrently without unbounded goroutines; the producer
  closes `jobs`, and `results` closes after `wg.Wait()`.
- Each request is bounded by **`client.Timeout`** and a **context**, and every response body is closed.
- Output is **sorted** for determinism and the process returns a **non-zero exit code** on failure.
- **`httptest`** makes the HTTP logic testable without the network — the finishing touch on
  production-quality Go.

# Flash Cards

Q: Why use a bounded worker pool instead of one goroutine per URL?
A: To cap concurrency and resource use — with thousands of URLs, one goroutine each could exhaust memory or file descriptors, while a fixed pool keeps usage predictable.

Q: In the worker pool, who closes the `jobs` channel and who closes `results`?
A: The producer closes `jobs` after sending all URLs; a separate goroutine closes `results` after `wg.Wait()` reports all workers are done — so each `range` ends cleanly.

Q: How is each HTTP request bounded in time?
A: By the `http.Client`'s `Timeout` (the whole request) and a per-request `context.WithTimeout`, which also lets a parent cancellation abort in-flight checks.

Q: Why sort the results before printing them?
A: Because workers finish in nondeterministic order; sorting by URL makes the output stable and the tool testable.

Q: Why does the program call `os.Exit(1)` when any check fails?
A: A non-zero exit code lets scripts and CI detect failure programmatically (e.g. `if ! urlcheck ...`), rather than having to parse the text output.

Q: How do you test HTTP client code without hitting the real network?
A: Use `net/http/httptest.NewServer` to run a local test server and `srv.Client()` (or `srv.URL`) to point your code at it, exercising success, error-status, and failure paths.

# Exercises

### Easy
Assemble the full `urlcheck` program from the pieces in this lesson into one `main.go`, `go build` it,
and run it against two or three public URLs. Confirm the exit code with `echo $?`.

### Medium
Add a `-file` flag that reads URLs from a file (using the `readURLs` helper), so URLs can come from
either the file or the command line. Handle a missing file with a clear error and a non-zero exit.

### Challenging
Extend the tool to retry failed checks up to `-retries` times with a short backoff, and to output
results as JSON when a `-json` flag is set (a slice of `Result` with the error rendered as a string).
Add `httptest`-based tests covering a healthy URL, a `500`, and a retried-then-successful URL, and
explain how each earlier lesson (context, channels, errors, testing) contributed.

# Further Reading

- *`net/http` client* — <https://pkg.go.dev/net/http#Client> · *`net/http/httptest`* — <https://pkg.go.dev/net/http/httptest>
- *`context` package* — <https://pkg.go.dev/context> · *`flag` package* — <https://pkg.go.dev/flag>
- *Go Concurrency Patterns: Pipelines and cancellation* (Go blog): <https://go.dev/blog/pipelines>
- *Effective Go* — Concurrency: <https://go.dev/doc/effective_go#concurrency>
