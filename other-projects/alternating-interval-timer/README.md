# Alternating Interval Timer

A standalone, mobile-friendly browser timer that alternates between two intervals for a fixed overall duration.

## Example

- Overall duration: 5 minutes
- Interval A: 20 seconds
- Interval B: 30 seconds
- Start with A, then switch to B and back to A repeatedly.
- Play one beep on every switch (two distinct pitches identify the intervals).
- At 5 minutes, stop even if an interval would otherwise continue, and play a completion signal.

## Features

- Editable overall minutes and seconds (up to 999:59)
- Editable A and B durations in seconds (1–3,600 each)
- Large overall and interval countdowns with progress bars
- Start, pause, resume, restart, and reset controls
- Sound toggle and test beep (Web Audio API; no audio files)
- Last-used settings saved in browser local storage
- Requests a screen wake lock while running, when supported
- Works without dependencies, accounts, a backend, or network access after loading

## Run

Open \`index.html\` in a modern browser, or use the GitHub Pages URL if Pages is enabled for the parent repository:

https://uranusskisfigmustard.github.io/TheHub/other-projects/alternating-interval-timer/

## Notes

Browser audio must be initiated by user interaction. Click **Start** or **Test beep** to initialize audio. Mobile operating systems may pause background scripts or mute browser audio when a tab is backgrounded or the phone locks. The timer recalculates remaining time from wall-clock elapsed time when the page becomes active again, but it cannot guarantee missed background transition beeps.
