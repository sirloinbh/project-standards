# Keep the AI shell conversation when the panel is closed (#856)

- `templates/ui/frontend/src/components/layout/ai-shell.tsx`: `useAiChat` and the draft text now live in `AiShellPanel`, above the `Sheet`, instead of in `ChatPanel`, which Radix unmounts on close. Closing the panel only hides it: the messages, an answer that is still streaming and a tool call that waits for Allow or Refuse stay with the top bar button. The stream is still aborted when the whole shell unmounts.
- Test: `ai-shell.test.tsx` writes a draft, closes the panel with Escape, reopens it and finds the earlier answer and the draft. The file passes (8 tests) in study-log, with eslint, prettier and tsc clean there.
