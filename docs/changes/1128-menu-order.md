# #1128 One menu order in every app

User requirement (2026-11-26) for all web apps.

## Change

`docs/layout.md` has a new "Menu order (every app)" section: day log (the start page `/`), Week, 12 weeks, the app's other pages, Dashboard, Settings last. It also says what to do when an app has no Week or 12-week view (leave the item out; the app card decides with the user). The example `nav` in "Applying it to an app" follows the order.

## Not done

The optional standards-check rule (first item `/`, last item Settings) was not added: each app's `nav` is plain TypeScript, so a text check would be fragile and give false results. Review and the app cards check the order.

## Tracking

The issue stays open until the eight app cards are closed (listed in #1128). This PR only references it.
