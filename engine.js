"use strict";

(function (root) {
  const TEST_SIZE = 25;
  const PASSING_SCORE = 18;

  function shuffled(items, random) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function validateBank(bank) {
    const errors = [];
    const ids = new Set();
    if (!Array.isArray(bank) || bank.length < TEST_SIZE) errors.push("At least 25 questions are required.");
    (bank || []).forEach((q, index) => {
      if (!q || !q.id) errors.push(`Question ${index + 1} has no ID.`);
      else if (ids.has(q.id)) errors.push(`Duplicate question ID: ${q.id}`);
      else ids.add(q.id);
      if (!q || !q.verified) errors.push(`Question ${q && q.id ? q.id : index + 1} is not verified.`);
      if (!q || !Array.isArray(q.options) || q.options.length !== 4) errors.push(`Question ${q && q.id ? q.id : index + 1} must have four choices.`);
      if (q && Array.isArray(q.options)) {
        const optionIds = new Set(q.options.map(o => o.id));
        if (optionIds.size !== 4) errors.push(`Question ${q.id} has duplicate choice IDs.`);
        if (!optionIds.has(q.correct)) errors.push(`Question ${q.id} has an invalid correct answer.`);
      }
      if (!q || !q.source || !q.source.chapter || !q.source.section || !q.source.manualPage || !q.source.pdfPage) errors.push(`Question ${q && q.id ? q.id : index + 1} has an incomplete manual citation.`);
    });
    return errors;
  }

  function createTest(bank, seenIds, random = Math.random) {
    const verified = bank.filter(q => q.verified);
    const errors = validateBank(verified);
    if (errors.length) throw new Error(errors[0]);

    let seen = Array.isArray(seenIds) ? seenIds.filter(id => verified.some(q => q.id === id)) : [];
    let available = verified.filter(q => !seen.includes(q.id));
    let cycleReset = false;
    if (available.length < TEST_SIZE) {
      seen = [];
      available = verified.slice();
      cycleReset = true;
    }

    const groups = new Map();
    shuffled(available, random).forEach(question => {
      if (!groups.has(question.category)) groups.set(question.category, []);
      groups.get(question.category).push(question);
    });

    const categoryOrder = shuffled(Array.from(groups.keys()), random);
    const selected = [];
    while (selected.length < TEST_SIZE) {
      let added = false;
      for (const category of categoryOrder) {
        const group = groups.get(category);
        if (group && group.length) {
          selected.push(group.pop());
          added = true;
          if (selected.length === TEST_SIZE) break;
        }
      }
      if (!added) break;
    }
    if (selected.length !== TEST_SIZE || new Set(selected.map(q => q.id)).size !== TEST_SIZE) throw new Error("A unique 25-question test could not be generated.");

    const questions = shuffled(selected, random).map(q => ({
      id: q.id,
      optionIds: shuffled(q.options.map(option => option.id), random)
    }));
    return {questions, cycleReset, nextSeenIds:Array.from(new Set(seen.concat(questions.map(q => q.id))))};
  }

  function gradeTest(bank, test) {
    if (!test || !Array.isArray(test.questions) || test.questions.length !== TEST_SIZE) throw new Error("A complete 25-question test is required.");
    const byId = new Map(bank.map(q => [q.id, q]));
    let score = 0;
    const missed = [];
    const topicMisses = {};
    test.questions.forEach(item => {
      const q = byId.get(item.id);
      if (!q) throw new Error(`Missing question: ${item.id}`);
      const answerId = test.answers[item.id];
      if (!answerId) return;
      if (answerId === q.correct) score += 1;
      else {
        missed.push({id:q.id, answerId:answerId || null});
        topicMisses[q.category] = (topicMisses[q.category] || 0) + 1;
      }
    });
    return {score, percentage:Math.round((score / TEST_SIZE) * 100), passed:score >= PASSING_SCORE, missed, topicMisses};
  }

  root.PermitEngine = Object.freeze({TEST_SIZE, PASSING_SCORE, validateBank, createTest, gradeTest});
})(typeof window !== "undefined" ? window : globalThis);
