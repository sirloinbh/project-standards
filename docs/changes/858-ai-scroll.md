# Scroll the AI shell conversation to the newest message (#858)

- `templates/ui/frontend/src/components/layout/ai-shell.tsx`: the conversation list scrolls to the bottom when the messages, an error or the limit notice change, unless the user has scrolled up (more than 48 px from the bottom, tracked in `onScroll`). A tool call that waits for Allow or Refuse is therefore in view.
- Tests: `ai-shell.test.tsx` (jsdom has no layout, so the log element gets a size and a remembered `scrollTop`): it follows the newest text, and it stays where the user scrolled to. The file passes (10 tests) in study-log, with eslint, prettier and tsc clean there.
