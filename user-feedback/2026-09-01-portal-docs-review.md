# Docs review: "my Mantine modal opens in the main window, not in the popup"

**Date:** 2026-09-01
**Target:** Documentation coverage of portal-based content (modals, dropdowns, tooltips, floating overlays) inside popup windows, in `README.md`, `skills/getting-started/SKILL.md`, `skills/popup-content/SKILL.md`, and the consumer-visible example sources under `docs/src/examples/` of `@jielga/react-popup-window` at `c:\s\jielga\react-popup-window`
**Lens:** A React developer who installed the package from npm, uses Mantine, knows React portals in general, is new to this library, and has never read the library source

## Must not miss

1. The README's only Mantine recipe is a link to `docs/src/examples/SameWindowPortals.tsx`, and `docs/` is not shipped in the npm package, so a reader of the installed README gets the diagnosis but no working code.
2. Modals are never actually covered: the word "modals" appears once in the README list, but every explanation, every code sample, every example and the wrapper's own docstring talk about menus, popovers and tooltips only.
3. The Mantine knobs a Mantine developer will reach for first - `withinPortal`, `portalProps`, `target` on the component - appear nowhere in the README, the skills or the examples (zero matches in the repo outside `node_modules`).
4. The docs stop at the portal target and never warn about the second-order breakage: Mantine's `Modal` binds its Escape handler with `useWindowEvent` on the opener window, so Escape pressed inside the popup does not close a modal that is otherwise correctly rendered there.
5. The actual mechanism is never stated in one sentence: popup content runs in the opener's JavaScript realm, so the bare `document` global is the opener's document, while `node.ownerDocument` is the popup's document. Without this, a reader cannot transfer the fix to any library other than Mantine.

## The task

I was asked to judge whether a developer can diagnose and fix one concrete bug from the shipped documentation alone.
The bug: a modal opened from content inside `<Popup>` appears in the main window instead of the popup window.
I read only what a consumer of the published package can read, plus the library source where I needed to check whether a documentation claim is true.
I treated "the docs" as the README (the `intent.docs` entry point), the two shipped skills, and the example sources under `docs/src/examples/` that back the demo site.

## How I saw it

I read these files in full: `README.md`, `skills/getting-started/SKILL.md`, `skills/popup-content/SKILL.md`, `docs/src/examples/SameWindowPortals.tsx`, `src/usePopupWindow.ts`, `src/types.ts`, `src/index.ts`, and `package.json`.
I read `docs/src/App.tsx` at lines 40-120 and 180-210, which is where the demo site's portal card and its code snippet live.
I read the two call sites of the wrapper: `docs/src/examples/DataTableExample.tsx:49-70` and `docs/src/examples/PanelsExample.tsx:124-138`.

I ran one repository-wide grep for `SameWindowPortals|withinPortal|portalProps|ownerDocument|Modal` over `*.ts`, `*.tsx` and `*.md`, excluding `node_modules` and `.git`, to measure keyword coverage.
`withinPortal` and `portalProps` returned zero matches.

To check whether the documented recipe actually reaches a Mantine `Modal`, I read the installed Mantine 9.5.1 sources under `node_modules/@mantine/core/esm/`: `components/Portal/Portal.mjs`, `components/Portal/OptionalPortal.mjs`, `components/ModalBase/ModalBase.mjs`, `components/ModalBase/use-modal.mjs`, and `node_modules/@mantine/hooks/esm/use-window-event/use-window-event.mjs`.
This is outside the consumer surface the brief named; I did it only to confirm or deny claims the docs make, and I say below exactly which findings depend on it.

No browser, no build, no install, no test run, as the brief required.

## What I did not do

I did not run anything.
Every statement about runtime behaviour in this report comes from reading source, not from observing a popup.
In particular, I did not verify by execution that the `SameWindowPortals` wrapper makes a Mantine `Modal` render in the popup, and I did not verify by execution that Escape fails to close it; both are read from Mantine 9.5.1 source and should be confirmed with a real popup before acting on them.

I did not open the deployed demo site at `https://jielga.github.io/react-popup-window/`, so I judged the site only from `docs/src/App.tsx`.
I did not check how npm's registry page rewrites the README's relative link; I only confirmed that `docs/` is absent from the `files` array in `package.json`, which settles the installed-package case but not the npmjs.com rendering case.

I read `docs/src/examples/CounterExample.tsx` and the remainder of `docs/src/App.tsx` only as far as the grep output showed, not in full.
I did not read `src/copyStyles.ts`, because style synchronization is not the subject and the docs' claims about it were not in question.
I skimmed `e2e/popup.spec.ts` through grep output alone (one match, at line 124) and did not read the test.

I took on trust that the skills as published match the files in `skills/`, and that `@tanstack/intent` delivers them to an agent as written.

## Internal knowledge I could not unsee

I received the user's global `CLAUDE.md`, which sets writing conventions.
It contains nothing about this library, so it did not affect any finding.

I could see `package.json`, including the `files` array.
A consumer inspecting an installed package can see the same thing, so I treat finding 1 as legitimately consumer-visible, but I note that a consumer would discover it by clicking a dead link rather than by reading a manifest.

## Findings

### Answers to the four questions in the brief

**1. Do the docs explain that a portal targeting `document.body` escapes the popup, and why?**

They explain the *what*, not the *why*.
`README.md:186-189` says component libraries "mount overlays ... into `document.body`, which is the main window's body even for components rendered inside the popup".
`skills/popup-content/SKILL.md:141-143` says the same with the useful word "global": "Portal-based overlays default to the global `document.body`."
Neither text says *why* the global `document` is the opener's document.
The reason - portal content executes in the opener's JavaScript realm, so every bare global in that code is the opener's global - is stated in the docs, but only in a different section about a different symptom (`skills/popup-content/SKILL.md:196-199`, and `README.md:105-106`).
The word `ownerDocument` appears in the README exactly once (`README.md:193`), inside the description of the Mantine wrapper, never as the general rule.
The reader is therefore told the fact but not given the model, and the model is what lets them generalize.

**2. Do they give a working recipe?**

For Mantine, yes, but only in two of the three places a reader might look, and the recipe is Mantine-only.
`skills/popup-content/SKILL.md:55-92` contains the complete wrapper code and a correct before/after pair.
`docs/src/App.tsx:46-66` contains the same code as a snippet on the demo site.
The README contains no code for this at all; it links out (see finding 1).

For every other library the guidance is one sentence: "Radix, MUI, and similar: use the per-component portal `container` prop with `popupWindow.document.body`" (`README.md:195-196`, restated at `skills/popup-content/SKILL.md:90-92`).
That is correct but not actionable at the place the problem occurs, see finding 6.

There is no container exposed by the hook.
I confirmed this in `src/usePopupWindow.ts:155-157` and `src/types.ts:52-83`: the portal container div carries `data-popup-window-root`, but it stays in internal store state and is never returned.
`popupWindow` is the only handle, and the docs are consistent with that.

**3. How many steps from symptom to fix?**

For an AI agent with the skills loaded: one step.
The `popup-content` skill's frontmatter description ends with "Load when popup content renders unstyled, a theme change does not reach the popup, or menus, popovers, modals, and tooltips open in the main window instead of the popup" (`skills/popup-content/SKILL.md:8-10`).
That is symptom-keyed, it names modals, and it leads straight to the code.
This is the strongest part of the documentation.

For a human reading the README: three steps at best, and a dead end at worst.
Step 1 is to find the section, which works: searching "modal" in the README hits `README.md:186`, inside a section titled "Portal-based UI libraries".
Step 2 is to read the diagnosis, which is correct and short.
Step 3 is to follow the link to get the code, which fails for anyone whose README copy is the installed one.
Note that the heading itself contains none of the words a reader in trouble would search for - not "modal", not "overlay", not "dropdown", not "wrong window".
The demo site card has the same problem: its heading is "UI libraries that portal to `document.body`" (`docs/src/App.tsx:192`).
A reader who searches by symptom rather than by mechanism has to already suspect the mechanism to match the heading.

**4. Are the skills, the README, and the API consistent?**

On the API, yes.
Both skills and the README describe the same return value, and it matches `src/types.ts`.
Nothing claims an API that does not exist.

On this topic, there is a drift in scope.
The README lists four overlay kinds including modals (`README.md:186-187`).
The skill's Setup paragraph lists three and drops modals: "Component libraries mount menus, popovers, and tooltips into `document.body`" (`skills/popup-content/SKILL.md:51-53`).
The wrapper's own docstring also lists three and drops modals (`docs/src/examples/SameWindowPortals.tsx:6-8`).
The demo site lists three and drops modals (`docs/src/App.tsx:194`).
See finding 2.

There is also a smaller inconsistency in the skills' source citations, see finding 9.

### The modal case

**Finding 1 (high): the README's recipe is a link to a file the consumer does not have.**

`README.md:191-194` says: see [`SameWindowPortals`](docs/src/examples/SameWindowPortals.tsx).
`package.json` sets `"files": ["dist", "skills", "!skills/_artifacts"]`, so `docs/` is not in the published tarball.
A developer who installed the package and opened `node_modules/@jielga/react-popup-window/README.md` follows a relative path to a file that is not there.
The README never mentions that the same code exists in `skills/popup-content/SKILL.md`, which *is* shipped, and the "Agent skills" table (`README.md:226-230`) presents the skills as something for AI agents rather than as readable documentation.
The fix aims at making the README self-sufficient: inline the wrapper code in the README, or at minimum point at the shipped skill file and the live demo site URL instead of a repository path.

**Finding 2 (high): modals are claimed but never shown.**

The only place the word "modal" appears in the whole repository outside `node_modules` is `README.md:186` and `skills/popup-content/SKILL.md:9`.
Every worked example is a data grid column menu or a filter popover: `docs/src/examples/DataTableExample.tsx:59-68`, `docs/src/examples/PanelsExample.tsx:125-136`, and the single e2e assertion at `e2e/popup.spec.ts:124` which mentions a popover.
A modal is not a popover: it is full-screen, it has an overlay, it locks scroll, it traps focus, and it binds keyboard handlers.
A reader with a modal problem, reading a fix written for menus, has no evidence that the fix covers their case.

The fix does cover their case, as far as static reading shows.
I traced it: `Modal` renders `ModalBase`, which renders `OptionalPortal` (`node_modules/@mantine/core/esm/components/ModalBase/ModalBase.mjs:22-24`), which renders `Portal` (`node_modules/@mantine/core/esm/components/Portal/OptionalPortal.mjs`), which reads its defaults from the theme through `useProps("Portal", ...)` (`node_modules/@mantine/core/esm/components/Portal/Portal.mjs:34`).
So the theme override in the wrapper does reach a `Modal`.
This is exactly the reassurance the docs should be giving and do not.
The fix aims at one modal example - a `Modal` opened from inside `<Popup>`, on the demo site and in the skill - plus the word "modal" in the prose that describes the wrapper.

**Finding 3 (high): the Mantine props a Mantine developer already knows are absent.**

`withinPortal`, `portalProps` and `target` are the three knobs a Mantine user reaches for when an overlay is in the wrong place, and none of them appears anywhere in the docs.
This matters in two directions.
First, a reader searching the docs for the API they already know finds nothing and concludes the library has no answer.
Second, one of those knobs is a simpler fix than the documented one in the specific modal case: content rendered inside `<Popup>` is already in the popup document, so `withinPortal={false}` makes the modal render inline, in the popup, with no wrapper at all.
I confirmed the mechanism at `node_modules/@mantine/core/esm/components/Portal/OptionalPortal.mjs:7`, where `withinPortal: false` returns a plain `Fragment`.
The trade-offs of that route - stacking context, `overflow: hidden` ancestors - are real and are why the wrapper is the better default, but the docs should say so rather than not mention the option.
The fix aims at naming the alternatives and saying why the theme wrapper is preferred.

**Finding 4 (high): the docs stop at the portal target, and the modal is still broken afterwards.**

`node_modules/@mantine/core/esm/components/ModalBase/use-modal.mjs:14-16` binds the Escape handler with `useWindowEvent("keydown", ...)`, and `node_modules/@mantine/hooks/esm/use-window-event/use-window-event.mjs` implements that as `window.addEventListener` on the bare global.
Inside popup content, that global is the opener's window.
A key press inside the popup window fires on the popup's window object, so Escape does not reach the handler and does not close the modal.
The same file wires scroll locking through `RemoveScroll`, which manipulates `document.body` classes on the main document (`node_modules/react-remove-scroll/dist/es2015/SideEffect.js:30`), so the scroll lock lands on the wrong window.

The docs already contain the general rule that causes this.
`skills/popup-content/SKILL.md:173-199` has a "Listening on the wrong window object" entry that explains it precisely, but it is framed entirely as a mistake in *your own* `useEffect`.
It never says that third-party components make the same mistake by construction, that you cannot fix it from outside the component, and that this is the second thing you will hit after fixing the portal target.
The fix aims at connecting the two entries: after the portal target is corrected, window-level behaviour of the overlay - Escape, outside clicks, scroll lock, resize-based positioning - may still be bound to the opener, and that is a limitation of the component, not of this library.
This is the finding I am least certain about, because I did not execute it; it should be reproduced before being written up.

### The general case

**Finding 5 (medium): the mechanism is never stated as a rule.**

Covered under question 1 above.
The three facts the reader needs are all present in the docs but scattered across three sections and never joined: portal content runs in the opener's realm (`README.md:105-106`), so the `document` global is the opener's document, while `ownerDocument` of a mounted node is the popup's document (implied only by `docs/src/examples/SameWindowPortals.tsx:24-26`).
The fix aims at one short paragraph in the "Portal-based UI libraries" section that states all three in order, so the reader can apply it to a library the docs never mention.

**Finding 6 (medium): the non-Mantine advice is not usable where the problem is.**

"Use the per-component portal `container` prop with `popupWindow.document.body`" assumes the reader has `popupWindow` in scope.
`popupWindow` exists only in the component that calls `usePopupWindow`, and the library exports no context that carries it (`src/index.ts` exports the hook, `copyStyles`, and four types, nothing else).
The overlay that is misplaced is usually deep inside the popup content, several components away from the hook.
The reader is left to prop-drill or to write their own context, and neither is mentioned.
Meanwhile the generic answer is sitting in the Mantine example: a ref, `ownerDocument`, and a container passed down.
The fix aims at presenting the ref-plus-`ownerDocument` probe as the general technique, with Mantine's theme override as one way to distribute the result, and the per-component `container` prop as another.

**Finding 7 (low): `reuseTargetNode: false` is unexplained, and appears to do nothing.**

The prop appears in all three copies of the snippet: `docs/src/examples/SameWindowPortals.tsx:31`, `skills/popup-content/SKILL.md:71`, and `docs/src/App.tsx:57`.
No copy explains it.
Reading `getTargetNode` in `node_modules/@mantine/core/esm/components/Portal/Portal.mjs:17-30`, the first branch is `if (target) { ... return target }`, so `reuseTargetNode` is only consulted when no target is given.
In this wrapper a target is always given whenever the defaults are applied at all, so on Mantine 9.5.1 the flag has no effect.
It may have mattered on an earlier Mantine version.
Either way a reader copying the snippet cannot tell whether it is load-bearing.
The fix aims at removing it or explaining in one clause what it guards against.

**Finding 8 (low): where to put the wrapper is shown but never said.**

The wrapper must be inside the subtree that moves into the popup, because it resolves its document from its own mounted position.
Both examples get this right by putting it inside the element that is handed to `<Popup>` (`docs/src/examples/DataTableExample.tsx:59` sits inside `PeopleGrid`, which is the element moved at line 79; `docs/src/examples/PanelsExample.tsx:125` likewise).
The skill's correct-usage snippet shows `<Popup><SameWindowPortals>...` (`skills/popup-content/SKILL.md:133-139`), which is right but is a different shape from the detach pattern the same docs recommend elsewhere, where one element instance is rendered in one of two homes.
A reader combining the two patterns has to work out for themselves that the wrapper belongs inside the shared element, and that wrapping `<Popup>` from outside would not work.
The fix aims at one sentence stating the placement rule and the reason.

**Finding 9 (low): the skills cite README sections that do not exist.**

`skills/popup-content/SKILL.md:201` cites "README.md (Communicating with popup content)" and `skills/getting-started/SKILL.md:189` cites the same name; the README's heading is "Communication" (`README.md:169`).
`skills/getting-started/SKILL.md:165` cites "README.md (Remounting)"; there is no such heading, the content is in "Limitations" (`README.md:198`).
These citations are what an agent or a reader follows to check a claim.
The fix aims at making the cited names match the actual headings, and at keeping them matched when headings change.

**Finding 10 (low): the wrapper's first render has no target, and this is not mentioned.**

`docs/src/examples/SameWindowPortals.tsx:24-26` resolves the target in a `useEffect`, so on the first render the theme default props object is empty and any overlay mounted in that window lands in the main body.
In practice a user-triggered overlay opens long after mount, so this is unlikely to bite.
It is worth one clause because a reader adapting the pattern to a library that opens an overlay on mount would hit it and have no warning.

## What works

The `popup-content` skill's frontmatter description is the best piece of documentation on this topic in the package.
It is keyed on symptoms rather than on mechanisms, it names the exact wrong-window sentence a developer would type into a search box, and it names modals explicitly.
An agent that loads on that description lands directly on working code.

The "Common mistakes" format in both skills is well judged for this problem.
`skills/popup-content/SKILL.md:121-145` gives severity, a wrong snippet, a correct snippet, an explanation and a source, in that order, and the wrong snippet carries an inline comment naming the symptom.
That is more useful for a developer in trouble than the README's prose version of the same content.

The diagnosis itself is correct and is stated without hedging.
`README.md:186-189` gets the cause right in two lines, and the technique the wrapper uses is the right one: resolving the document from the mounted node rather than from a handle passed down means the same component works inline and inside the popup with no branching.
I traced Mantine's `Portal` resolution far enough to confirm that the theme override actually reaches the components the docs claim it does.

The examples practise what the docs preach.
Both grid examples wrap their content, in the right place, inside the element that moves between windows.

## Open questions

Does the documented fix produce a fully working modal, or only a correctly placed one?
I could not settle this without running it.
Settling it needs a Mantine `Modal` opened from inside `<Popup>` in a real browser, checking four things: that it renders in the popup, that Escape closes it, that clicking the overlay closes it, and which window's scroll gets locked.
`e2e/popup.spec.ts` appears to cover a popover only, so this may be untested as well as undocumented.

Does the README's relative link to `docs/src/examples/SameWindowPortals.tsx` resolve on npmjs.com?
The registry rewrites relative links against the `repository` field, which is present, so the link probably works on the web page even though it is dead in the installed package.
Settling it needs a published version and a look at the rendered page.

Does `Portal.extend` with theme default props behave the same on Mantine 8 and earlier?
I checked only version 9.5.1, the one in this repository's devDependencies.
The docs state no Mantine version requirement for the recipe, and a reader on an older major has no way to know whether it applies.
