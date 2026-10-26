# Brief: analyse FLIGHT LAB textbook chapters for a rewrite (read-only)

You analyse one or more chapters of the FLIGHT LAB textbook (Japanese) so that it can be rewritten into a clearer textbook
for complete beginners (cadets BEFORE their English ground school). Do NOT edit any file in the repository (read only).
Write your result as JSON files: /tmp/claude-0/-home-user-otinti/e36be4be-eb02-5e47-97a9-4c6291a09b23/scratchpad/analysis/<chapterId>.json
(one per chapter, schema below), then reply with a 5-line summary per chapter.

SCRATCH=/tmp/claude-0/-home-user-otinti/e36be4be-eb02-5e47-97a9-4c6291a09b23/scratchpad

## Where things are
Repository: /home/user/otinti (branch claude/bold-gates-5yjvno). Textbook source in flight-lab/src/: book-core.js (frame: R references,
PARTS, bk writing helpers key/warn/f/q/sim/calc/see/t/src/fact/est/photo), book-figs.js (FIG: inline SVG figures and tables; calculators
FL.bookCalc incl. ARCHER_WB), book-1.js (intro, aero, sys, perf), book-2.js (wx, law, hf), book-comm.js (radio1..radio5, inserted before hf),
book-3.js (ground, ops, tl, emg, solo), book-4.js (navp, navr, navd, ifr, ifrp), book-5.js (me, oei, crm, jet, sim).
Teaching aircraft data: flight-lab/src/physics.js (FL.physics.AIRCRAFT: pa28 = Archer, pa44 = Seminole; .v speeds, .phys).
App parts that reference the book (they will NOT be changed; report mismatches with the book): syllabus.js (lessons: book:[section ids],
goals, standards), school.js, quiz.js (ground-school banks linked to sections), radio.js (radio practice; FLIGHT phases link to sections),
pages.js (app pages), app.js (the actual keys/controls), sanford-course.js (Sanford facts/diagram).
Helpers:
  node $SCRATCH/tools/render-ch.mjs <chapterId> --text    # sections as text (figures as [図: aria-label]) + end matter
  node $SCRATCH/tools/render-ch.mjs <chapterId>           # same with raw HTML incl. SVG
  node $SCRATCH/tools/figshot.mjs $SCRATCH/analysis/shots-<chapterId> <sectionId>...  # renders figures to PNG (390 px phone and 760 px), reports
      text outside the viewBox, overlapping labels, smallest rendered text (< 9.5 px at 390 is too small). LOOK at the 390 PNGs with Read.

## Fact checking
Use WebSearch / WebFetch to CHECK the chapter's key factual claims against current public sources (today is 2026-10-26): regulation numbers and
content (eCFR), AIM paragraph numbers, values (VFR minima, fuel reserves, speeds, distances...), and whether each cited handbook/ACS edition is
still current (name the newer edition and what matters if it changed). Prefer faa.gov, ecfr.gov, aviationweather.gov, noaa.gov, weather.gov.
Skip things that cannot matter to a beginner. DO NOT call the Wikimedia Commons API repeatedly (it is rate-limited and shared): at most 3
Commons requests in total; photo sourcing is done later. For photos give subjects and search hints.

## Rules the rewrite will follow (your proposals must fit them)
- Readers: Japanese beginners before English ground school. です・ます調, short sentences; a technical term is explained the first time as
  日本語（English）. Section shape: purpose (1–2 sentences) → figure → explanation → 「ここが大切」(bk.key, 2–4 short items ≤ ~60 chars; a game
  reads them aloud) → (optional) common mistakes / caution (bk.warn) → (optional) 考えてみよう (bk.q).
- Facts follow public sources (FAA handbooks, ACS, AIM, 14 CFR ...). Numbers are sourced reference values or the course's teaching values
  (FL.physics aircraft data) — the text says which. Never numbers that contradict the flight model.
- Keep: public fact vs guess (bk.fact / bk.est), safety notes ("実機は POH/AFM が優先"), fictional names (airspace LAB-A, airport LAB, call sign
  Archer Seven Lima Alpha), NOT FOR NAVIGATION, never look like an official airline/school manual, displays are "G1000 型" (except in a source
  title). App-usage parts (chapter sim, section intro.study, bk.sim boxes) stay, rewritten clearly; keys must match the CURRENT app (app.js/pages.js).
- Chapter/section ids never change; sections are not removed or merged (new sections with new ids are allowed).
- CADET (cadet/src/content/book.js; tests cadet/test/content.test.mjs) shows the book without intro/sim, drops sentences naming the real airline
  (ANA) / its training partner (Acron) / FLIGHT LAB's own UI (メニュー, キーボード, 実装, このシミュレータ, 本アプリ, key letters in brackets), and
  puts the FIRST <svg> of each section on a classroom screen: the first figure of each section must be its most important one.
- Figures: inline SVG in FIG, dark board #0b1422, colour set C, viewBox, role="img", aria-label, caption; readable on a 390 px phone (viewBox
  width 360–440, font-size ≥ 12); numbers drawn from data (FL.physics, FL.bookCalc.ARCHER_WB); charts/maps labelled 模式図 and NOT FOR NAVIGATION.
  Whole-book target 70–90 figures (now 22 SVG + 6 tables). Add figures where shape or position is hard to grasp from words.
- Photos (new): only public domain (US government: FAA, NASA, NOAA, NWS, USAF...), CC0, CC BY, CC BY-SA, licence checked per file. NOT allowed:
  airline / training-school photos, manufacturers' promo photos, photos of instrument screens, Google maps, clearly visible faces, unknown licence.
  Whole-book target 30–50 photos.
- End matter: terms, examples, cautions, quiz (3–5 four-choice questions per chapter, each with answer and reason), refs.

## JSON schema of <chapterId>.json
{
 "id": "...", "title": "...",
 "sections": [ { "id": "...", "title": "...", "gist": "1 sentence", "issues": ["concrete problems, quote Japanese"], "mainFigure": "what the FIRST figure of this section should show" } ],
 "problems": { "unclear": [], "order": [], "errors": ["claim → correct fact (source URL)"], "outdated": [], "duplicates": ["overlap with chapter X"], "numbers": ["disagreements with FL.physics / checklist / other chapters / quiz.js / radio.js / syllabus.js"] },
 "policy": "4–8 sentences: section order, what to explain first, what to cut/move, new sections (proposed new ids) if needed",
 "figuresExisting": [ { "key": "FIG key", "verdict": "keep|fix|redo|replace-by-photo", "why": "..." } ],
 "figuresNew": [ { "name": "camelCase FIG key", "section": "id", "what": "...", "data": "where numbers come from", "priority": "must|should|nice" } ],
 "photos": [ { "section": "id", "subject": "...", "search": "Commons category / NASA-NOAA library terms", "candidateUrl": "", "candidateLicence": "", "why": "..." } ],
 "endMatter": { "terms": [], "examples": [], "cautions": [], "quizReview": ["Q1: keep/fix (why)"], "quizProposals": [ { "q": "", "choices": ["","","",""], "answer": 0, "why": "" } ], "refs": ["add/remove/update with URLs"] },
 "appMismatches": ["file:line — what — which is right"],
 "factChecks": [ { "claim": "", "verdict": "correct|wrong|imprecise|outdated|unverified", "source": "URL", "note": "" } ],
 "cadetNotes": ["things to watch for CADET tests/filters"]
}
Be specific and concrete — quote passages, give section ids and URLs. Write valid JSON (UTF-8).
