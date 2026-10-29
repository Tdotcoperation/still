# Architecture

- React application owns panel navigation; one persistent Web Audio engine lives outside panels.
- Audio is six original synthesized and rendered stereo loops; no remote playback dependency. AudioContext begins only from user gestures. Buffer sources are stopped and released on pause; decoded buffers are bounded to six tracks.
- Settings and absolute-deadline timer use versioned LocalStorage. Imported settings are validated and allowlisted. Worry text lives only in an unpersisted component, cleared on unmount/release/cancel.
- Background loads decode before replacing the displayed image; generation sequence prevents stale loads replacing a newer choice. Distinct portrait artwork is selected for portrait viewports.
- Cache Storage holds explicit user-saved media under a 100 MiB limit. IndexedDB tracks saved URLs. Service worker precaches only the versioned app shell and font, never the whole image/audio library.
- Workers serves static assets. Optional `/r2/` route reads an R2 binding with no list/write endpoints. Local bundled media is the default for reproducible builds; a manifest and upload script support moving originals/large assets to R2.
- Wall-clock timer deadlines survive reload/background suspension. Breath sessions use elapsed timestamps and pause accounting.
- No analytics, cookies, authentication, server-side worry storage, or AI analysis endpoint.
