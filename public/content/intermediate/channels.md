---
id: lesson-12
slug: channels
title: "Channels"
level: intermediate
order: 12
duration: 22
tags:
  - channels
  - communication
  - buffered
  - closing
  - range
summary: "How goroutines communicate — typed channels for sending and receiving values, blocking semantics of unbuffered versus buffered channels, closing channels and the receive-from-closed rule, ranging over a channel, and the panic-inducing rules you must respect."
---

# Learning Objectives

By the end of this lesson you will be able to:

- Create and use **channels** to send and receive typed values.
- Explain the **blocking** behavior of unbuffered vs buffered channels.
- **Close** a channel and use the **comma-ok** receive and **`range`** over a channel.
- Recite the channel rules that cause **panics** or **deadlocks**.
- Use **directional** channel types to make intent clear.

# Why It Matters

Goroutines run independently; channels are how they safely hand data to one another. Go's motto —
"**Don't communicate by sharing memory; share memory by communicating**" — points at channels as the
first tool to reach for. Used well, they let you coordinate concurrent work without explicit locks.
But channels have precise rules — some operations *panic*, others *block forever* — and knowing them
cold is what separates smooth concurrent code from mysterious deadlocks.

# Concept Explanation

### Creating, sending, receiving

A **channel** carries values of one type. Create it with `make`:

```go
ch := make(chan int) // unbuffered channel of int
```

Send and receive with the arrow operator:

```go
ch <- 42      // send 42 into ch
v := <-ch     // receive a value from ch into v
```

### Blocking: the heart of channels

Channel operations **block** until the other side is ready, which is how they synchronize goroutines:

- On an **unbuffered** channel, a send blocks until some goroutine is ready to receive, and a receive
  blocks until some goroutine sends. The send and receive happen together — a **rendezvous**. This
  makes an unbuffered channel a synchronization point.
- On a **buffered** channel (`make(chan int, 3)`), a send blocks only when the buffer is **full**, and
  a receive blocks only when the buffer is **empty**. The buffer decouples sender and receiver up to
  its capacity.

```go
done := make(chan bool)
go func() {
	doWork()
	done <- true // signal completion
}()
<-done // blocks here until the goroutine sends — a clean way to wait
```

### Closing a channel

The sender can **`close`** a channel to signal "no more values will be sent." Receiving from a closed
channel returns immediately with the **zero value** and a **false** "ok" flag:

```go
v, ok := <-ch
// if the channel is closed and drained: v == zero value, ok == false
```

You typically **`range`** over a channel to receive values until it is closed:

```go
for v := range ch { // loops until ch is closed
	fmt.Println(v)
}
```

The producer sends values then `close(ch)`; the consumer's `range` ends automatically.

### The rules that panic or block forever

Memorize these — they explain most channel bugs:

- **Sending on a closed channel panics.**
- **Closing an already-closed channel panics.** **Closing a nil channel panics.**
- **Sending or receiving on a nil channel blocks forever** (a `nil` channel is never ready).
- **Only the sender should close** a channel, and only when it's done sending. Receivers never close.
- A **deadlock** occurs when all goroutines are blocked waiting on channels; the runtime detects the
  all-goroutines case and crashes with `fatal error: all goroutines are asleep - deadlock!`.

### Directional channels

Function parameters can restrict a channel to send-only or receive-only, documenting intent and
letting the compiler enforce it:

```go
func produce(out chan<- int) { out <- 1; close(out) } // send-only
func consume(in <-chan int)  { for v := range in { _ = v } } // receive-only
```

`chan<- int` is send-only; `<-chan int` is receive-only. A regular `chan int` converts to either.

# Key Terminology

- **Channel** — a typed conduit for passing values between goroutines.
- **Unbuffered channel** — capacity 0; send and receive rendezvous (each blocks for the other).
- **Buffered channel** — has capacity; send blocks only when full, receive only when empty.
- **`close`** — marks a channel as done; further sends panic, receives drain then report `ok == false`.
- **Comma-ok receive** — `v, ok := <-ch` to detect a closed, drained channel.
- **Directional channel** — a send-only (`chan<-`) or receive-only (`<-chan`) channel type.
- **Deadlock** — all goroutines blocked on channels with no way to proceed.

# Options and Trade-offs

| Choice | Unbuffered | Buffered |
| ------ | ---------- | -------- |
| Synchronization | Strong — sender waits for receiver | Looser — up to buffer size of slack |
| Use when | You want a handoff/rendezvous or a signal | Producer can run ahead; smoothing bursts |
| Risk | Deadlock if no receiver | Hidden backpressure; picking a wrong size |

| Task | Idiom |
| ---- | ----- |
| Signal "I'm done" | `done <- struct{}{}` or `close(done)` |
| Stream many values | producer sends then `close`; consumer `range`s |
| Detect closed channel | `v, ok := <-ch` |
| Enforce direction | `chan<- T` (send) / `<-chan T` (receive) parameters |

# Worked Example

A producer/consumer pipeline using close and range:

```go
package main

import "fmt"

func produce(out chan<- int, n int) {
	for i := 1; i <= n; i++ {
		out <- i * i
	}
	close(out) // no more values — lets the consumer's range end
}

func main() {
	nums := make(chan int)
	go produce(nums, 4)

	for v := range nums { // receives until produce closes the channel
		fmt.Println("got", v)
	}
	fmt.Println("channel closed, done")
}
```

Output:

```text
got 1
got 4
got 9
got 16
channel closed, done
```

The producer sends four squares and then closes the channel. The consumer's `range` receives each
value and exits cleanly when the close is observed — no manual "how many are left?" bookkeeping.

# Real World Analogy

An unbuffered channel is like **handing a baton in a relay race**: the runner can't let go until the
next runner's hand is there to take it — the handoff synchronizes them. A buffered channel is like a
**conveyor belt with room for a few boxes**: the packer can keep placing boxes until the belt is full,
and the picker can keep taking until it's empty, so they don't have to move in perfect lockstep.
Closing the channel is the packer flipping the belt's **"no more boxes coming" sign** — the picker
keeps taking what's left, then stops when the belt is empty and the sign is up.

# Examples

## Example 1 — Basic: a done signal

```go
func main() {
	done := make(chan struct{})
	go func() {
		fmt.Println("working...")
		close(done) // closing is a broadcast-friendly "finished" signal
	}()
	<-done // blocks until the goroutine closes done
	fmt.Println("finished")
}
```

**Why this works:** an empty struct channel (`chan struct{}`) carries no data, only timing.
Receiving from it blocks until the goroutine closes it — a zero-allocation completion signal.

## Example 2 — Real-world: fan-in results with a buffered channel

```go
func sumAll(nums []int, workers int) int {
	results := make(chan int, workers) // buffered so senders don't block on a slow reader
	chunk := len(nums) / workers
	for w := 0; w < workers; w++ {
		go func(part []int) {
			s := 0
			for _, n := range part {
				s += n
			}
			results <- s
		}(nums[w*chunk : (w+1)*chunk])
	}
	total := 0
	for w := 0; w < workers; w++ {
		total += <-results // collect each worker's partial sum
	}
	return total
}
```

**Why this works:** each worker computes a partial sum and sends it; the buffered channel lets all
workers report without waiting on the collector, which then receives exactly `workers` values.

## Example 3 — Pitfall: sending on a closed channel

```go
ch := make(chan int, 1)
close(ch)
ch <- 1 // panic: send on closed channel
```

**Why this bites:** once closed, a channel can never accept sends — this panics and crashes the
program. The rule "only the sender closes, and only when done" exists precisely so that no goroutine
sends after a close. (Receiving from the closed channel, by contrast, is fine and returns the zero
value with `ok == false`.)

# Common Mistakes

- **Sending after close.** It panics; ensure closing is the sender's final act.
- **Closing from the receiver, or closing twice.** Only the sender closes, exactly once.
- **Forgetting to close a channel you `range`.** The `range` blocks forever waiting for more.
- **Unbuffered channel with no receiver.** The send blocks forever — a deadlock or leak.
- **Using a nil channel by accident.** Operations on it block forever (occasionally used on purpose in
  `select`).

# Best Practices

- Let the **producer** own closing: send all values, then `close`, so consumers `range` cleanly.
- Prefer unbuffered channels for clear handoffs; add a buffer only for a concrete reason (burst
  smoothing, known counts).
- Use `chan struct{}` for pure signals and `close` for broadcast-style "done."
- Encode intent with **directional** channel parameters.
- Run with `-race` and watch for deadlock messages during development.

# Summary

- **Channels** pass typed values between goroutines and **block** to synchronize them.
- **Unbuffered** channels rendezvous (send waits for receive); **buffered** channels block only when
  full/empty.
- **`close`** signals completion; a receive from a closed channel returns the zero value with
  `ok == false`, and `range` ends.
- **Sending on a closed channel, or closing a closed/nil channel, panics**; nil-channel ops block
  forever.
- Only the **sender** closes; use **directional** types to document who sends and who receives.

# Flash Cards

Q: On an unbuffered channel, what does a send do until a receiver is ready?
A: It blocks — the send and the receive rendezvous, happening together, which synchronizes the two goroutines.

Q: What do you get when you receive from a closed, drained channel?
A: The channel type's zero value and a false "ok" flag (`v, ok := <-ch`), and a `range` over it ends.

Q: What happens if you send on a closed channel?
A: It panics ("send on closed channel"), crashing the program — which is why only the sender should close, and only after its last send.

Q: Who should close a channel, and how many times?
A: The sender (the goroutine that produces values), exactly once, when there are no more values to send; receivers never close.

Q: What happens with a send or receive on a nil channel?
A: It blocks forever — a nil channel is never ready — so an accidental nil channel causes a hang.

Q: When does a buffered channel's send block?
A: Only when the buffer is full; likewise a receive blocks only when the buffer is empty.

# Exercises

### Easy
Create an unbuffered `chan string`, start a goroutine that sends `"pong"`, and receive and print it in
`main`. Explain what would happen if no goroutine ever sent.

### Medium
Write a producer that sends the numbers 1–10 on a channel and then closes it, and a consumer in `main`
that `range`s the channel and prints only the even numbers. Confirm the loop ends on its own.

### Challenging
Build a two-stage pipeline: stage one sends integers 1–5 on channel A and closes it; stage two ranges
A, squares each value, sends on channel B, and closes B; `main` ranges B and prints. Explain how
closing propagates through the stages and why each stage closes its own output channel.

# Further Reading

- *A Tour of Go* — Channels, buffered channels, range and close: <https://go.dev/tour/concurrency/2>
- *Effective Go* — Channels: <https://go.dev/doc/effective_go#channels>
- *Share Memory By Communicating* (Go blog): <https://go.dev/blog/codelab-share>
- *The Go Programming Language Specification* — Channel types, Send/Receive: <https://go.dev/ref/spec#Channel_types>
