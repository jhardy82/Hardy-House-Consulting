/**
 * Oracle scoring invariant tests.
 *
 * oracle.js cannot be imported in Jest (it uses window.THREE and the DOM), so
 * this module duplicates the ORACLE_QUESTIONS array and scoring logic here.
 * If you edit the questions in oracle.js, mirror the change in this file.
 */

const ORACLE_QUESTIONS = [
  { el: ['fire', 'earth'] },
  { el: ['aether', 'earth'] },
  { el: ['water', 'air'] },
  { el: ['water', 'fire'] },
  { el: ['aether', 'air'] },
];

function tally(answers) {
  const scores = { fire: 0, earth: 0, air: 0, water: 0, aether: 0 };
  answers.forEach((aIdx, qIdx) => {
    scores[ORACLE_QUESTIONS[qIdx].el[aIdx]]++;
  });
  return scores;
}

function resolveWinner(scores) {
  const max = Math.max(...Object.values(scores));
  const tied = Object.keys(scores).filter(el => scores[el] === max);
  return tied;
}

function allCombos() {
  const results = [];
  for (let mask = 0; mask < 32; mask++) {
    const answers = Array.from({ length: 5 }, (_, q) => (mask >> (4 - q)) & 1);
    results.push(answers);
  }
  return results;
}

describe('Oracle question mappings', () => {
  test('exactly 5 elements defined', () => {
    const elements = new Set(ORACLE_QUESTIONS.flatMap(q => q.el));
    expect([...elements].sort()).toEqual(['aether', 'air', 'earth', 'fire', 'water']);
  });

  test('each question maps exactly 2 distinct elements', () => {
    ORACLE_QUESTIONS.forEach(q => {
      expect(q.el).toHaveLength(2);
      expect(q.el[0]).not.toBe(q.el[1]);
    });
  });

  test('every element appears in at least 2 questions', () => {
    const freq = { fire: 0, earth: 0, air: 0, water: 0, aether: 0 };
    ORACLE_QUESTIONS.forEach(q => q.el.forEach(e => freq[e]++));
    Object.values(freq).forEach(count => {
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Oracle scoring invariants', () => {
  const combos = allCombos();

  test('all 5 elements are reachable across 32 answer combinations', () => {
    const reachable = new Set();
    combos.forEach(answers => {
      const scores = tally(answers);
      resolveWinner(scores).forEach(el => reachable.add(el));
    });
    expect([...reachable].sort()).toEqual(['aether', 'air', 'earth', 'fire', 'water']);
  });

  test('each element wins or ties in at least 4 of 32 combinations', () => {
    const winCount = { fire: 0, earth: 0, air: 0, water: 0, aether: 0 };
    combos.forEach(answers => {
      const scores = tally(answers);
      resolveWinner(scores).forEach(el => winCount[el]++);
    });
    Object.values(winCount).forEach(count => {
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  test('maximum possible score for any element is 2', () => {
    let maxObserved = 0;
    combos.forEach(answers => {
      const scores = tally(answers);
      maxObserved = Math.max(maxObserved, ...Object.values(scores));
    });
    expect(maxObserved).toBe(2);
  });

  test('air wins outright (sole max) in at least 4 combinations', () => {
    const soleWins = combos.filter(answers => {
      const scores = tally(answers);
      const winners = resolveWinner(scores);
      return winners.length === 1 && winners[0] === 'air';
    });
    expect(soleWins.length).toBeGreaterThanOrEqual(4);
  });

  test('air scores 2 points when Q3=stillness and Q5=collaborative', () => {
    // Q3 index 2, answer B (index 1) = air; Q5 index 4, answer B (index 1) = air
    const answers = [0, 0, 1, 0, 1];
    const scores = tally(answers);
    expect(scores.air).toBe(2);
  });
});
