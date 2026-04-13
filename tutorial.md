# An Idiot's Guide to Brown Noise in Python

## What is brown noise?

Sound is just a speaker cone moving back and forth very fast. A Python program generates sound by producing a list of numbers - each number tells the speaker how far to move at that exact instant. Do this 44,100 times per second and you get audio.

**White noise** is what you get when those numbers are completely random with no relationship to each other. Every sample jumps to a totally new random value. Those wild, unpredictable jumps create a hissing sound with all frequencies equally present. Memory setting: 0 - no memory at all.

**Brown noise** is what you get when each number is influenced by the previous one. Instead of jumping around randomly, the values change gradually. Gradual changes = slow movement = low frequencies. That's what gives brown noise its deep, rumbling character. Memory setting: 0.995.

**Pink noise** sits between white and brown. It has more bass than white but more brightness than brown - many people find it the most natural sounding of the three. It can't be made with a single memory setting though. Instead you run 5 independent loops simultaneously on the same white noise, each with a different memory setting tuned to cover a different layer of the frequency spectrum:

- 0.99 - very deep, lowest layer
- 0.97 - deep
- 0.90 - mid-low
- 0.70 - mid
- 0.40 - upper-mid, brightest layer

Each loop has its own "last" value and runs independently. Add all five outputs together and the combined result has the gradual slope that pink noise needs. The specific numbers aren't obvious - someone worked them out mathematically and published them (the Paul Kellet filter).

---

## Step 1: Generate white noise

Generate an array of 2048 random floats. These are your raw white noise samples.

Why 2048? That's one "chunk" of audio - at 44,100 samples per second, 2048 samples is about 46ms. The sound card asks for audio in these chunks rather than one sample at a time.

---

## Step 2: Turn it brown

Take the white array, iterate over each item, take that item plus the memory amount of the "last" output. That result becomes the next item in the brown array and also becomes the new "last." Repeat until the end of the white array.

In plain terms: **new = today's random number + (memory setting x yesterday's output)**

### Why does this make it brown?

Think of it as **memory**. Each sample is today's random number plus some fraction of everything that came before it. The signal can't jump wildly from sample to sample because it's always carrying its past with it.

If yesterday's output was `-0.201` and today's random number is `0.8` - without memory you'd jump straight to `0.8`. But if the memory is 99.5% the signal remembers 99.5% of `-0.201`, so you land at `0.600` instead. It couldn't fully make that jump. Tomorrow will look a lot like today, which looked a lot like yesterday. The signal can never move fast. Fast movement is high frequency. No fast movement = no high frequencies = deep rumbling brown noise.

### Why does the memory setting matter?

The memory setting controls how much of the past survives into each new sample.

- **Short memory (e.g. 0.5)** - yesterday is half as important as today. The sample before that is a quarter. The past fades quickly, so today's random number has a lot of freedom to go wherever it wants. The signal jumps around. Not much bass.

- **Perfect memory (1.0)** - yesterday is just as important as today. The day before too. Every random number ever generated still has full influence and never fades. The accumulated weight of all that history pushes the signal further and further off scale - not just drifting a little, but running off toward infinity with nothing to correct it.

- **Almost-perfect memory (e.g. 0.995)** - the past fades just slowly enough to keep the signal deep and smooth, but fast enough that it stays anchored and never runs away.

---

## Step 3: Keep continuity between chunks

The sound card asks for 2048 samples at a time, over and over. Each time it asks, you generate a fresh white noise array and run the loop.

The problem: if the loop always starts with "last = 0", there's a tiny glitch at the start of every chunk - a click 22 times per second.

The fix: save the last output of each chunk and hand it in as the starting "last" for the next chunk. One number. That's it. It's not an array that grows - it stays exactly 1 element forever. It just carries the memory across the chunk boundary so the signal stays continuous.

---

## Step 4: Fix the volume

Running the loop amplifies the signal. The stronger the memory setting, the more the past accumulates, and the bigger the amplification. Left uncorrected, the numbers get too large and the sound card clips - the speaker tries to move further than it physically can and you get distorted crackle.

The correction factor is calculated from the memory setting. At 0.995 it works out to roughly 10x amplification. Divide the brown array by that to bring it back down to a sane range, then multiply by 0.3 to land at a comfortable volume. 0.3 is just a choice - 1.0 would be maximum volume, 0.1 would be quieter. It's a volume knob baked into a constant.

---

## Step 5: Play it continuously

The sound card runs on a background thread. Every ~46ms it calls your callback function asking for the next chunk of audio. Your only job in that callback is to fill the output buffer with samples before returning.

The main thread just sleeps to keep the program alive. Without it the stream would close immediately.

---

## Mono vs stereo

The sound card expects values between -1.0 and 1.0, one per channel. For mono, that's one column of numbers. For stereo, two columns - one for each ear.

**Dual mono** is the same signal sent to both ears. It sounds wide but both ears hear exactly the same thing.

**True stereo** generates two completely independent brown noise arrays - one for the left ear, one for the right. Each channel has its own "last" value to maintain continuity. Because each ear gets a different signal, your brain tries to place the sound in space. It can feel like it's all around you rather than inside your head - the same way standing in front of an ocean sounds different from having it piped directly into your skull.
