# The Woodland Library · 숲속의 서재

An original Korean and English illustrated storybook library with physical page turns, distinct character voices, locally synthesized narrators, timed reading highlights, and optional automatic page advance.

This is the independent `dalmook/woodland-storybooks` repository. The earlier personal-homepage repository is preserved separately.

## Run locally

Use an existing Node.js installation and run `node server.mjs`, then open `http://localhost:4188/`. No packages or cloud API keys are required for playback. The server binds to loopback only. `src/books.json` contains the books, language variants, per-book casting, MP3 paths and measured reading cues.

## Read

Choose a volume in the illustrated library. Use the page arrows, chapter menu, drag/swipe, or left/right keys. Space plays or pauses; Escape returns to the library. Korean/English and female/male narrator controls reset the previous audio. Character voices remain fixed. Auto-next is optional and waits until the actual narration ends; the last chapter stops. Reduced motion follows the system setting and can be toggled in the header.

See [sources and licenses](SOURCES.md). Raw voice references, private transcripts, cloning prompts, models, caches and credentials are excluded from this repository. Browser/media verification does not constitute a claim of direct subjective listening.
