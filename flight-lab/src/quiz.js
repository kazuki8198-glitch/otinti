// FLIGHT LAB — quiz.js : the ground-school test banks (4 choices, the reason for each answer).
// [question, [choices], index of the right choice, why]. Sources: the textbook chapters (and their references).
(function (FL) {
  'use strict';
  const BANKS = [];
  const add = (id, title, desc, book, qs) => BANKS.push({ id, title, desc, book, qs });
  FL.quiz = { BANKS, add };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
