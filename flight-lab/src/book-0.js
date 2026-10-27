// FLIGHT LAB — book-0.js : the front part, 序部「出発の前に（日本で準備する）」 (textbook/rewrite/combined/DESIGN.md 3.1・3.3).
// This file adds the part p0 in front of Part 1 (FL.book.addPart: a part is added by the file of its chapters, so no
// product has a part it does not read). It is not called 第 0 部: the syllabus's stages are numbered from 第 1 段階 (the
// ground school, Part 1), and 0 must not name two things (DESIGN 3.1, decision 8).
// The part's chapters now are the two that were finished before it (moved here by W09, DESIGN 6.2 rule 2; their ids
// and sections did not change): 'intro' (book-1.js, the book's first chapter) and 'sim' (book-5.js, put in front of
// 'aero' so that it closes the front part). The front part's new chapters ('basics', 'english': W10) are written in this
// file and go in with before: 'aero' (after 'intro', before 'sim', which book-5.js puts in later). Loaded after
// book-1.js (its chapters go in front of 'aero') and before book-5.js; all three products read it (CADET leaves the
// chapters 'intro' and 'sim' out of its book, DESIGN 6.3).
(function (FL) {
  'use strict';
  const B = FL.book;
  B.addPart({ id: 'p0', title: '序部　出発の前に（日本で準備する）', before: 'p1' });
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
