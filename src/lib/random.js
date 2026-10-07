// Small helpers for picking random values. Question templates receive one of
// these "random kits" so the same template can produce many different variants.
//
// `rand` is any function that returns a number between 0 and 1. The app uses
// Math.random; the tests use a seeded version so their results are repeatable.
export function makeRandom(rand = Math.random) {
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
  const pick = (items) => items[int(0, items.length - 1)]
  const shuffle = (items) => {
    const arr = [...items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  const sample = (items, n) => shuffle(items).slice(0, n)
  const chance = (p = 0.5) => rand() < p
  return { rand, int, pick, shuffle, sample, chance }
}

// A seeded random number generator (mulberry32). The same seed always gives
// the same sequence, which makes test failures easy to reproduce.
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
