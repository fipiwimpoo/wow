export class RNG {
  // Centralized random number generator.
  // Can be replaced with a deterministic PRNG later.
  static rollDie(sides: number = 8): number {
    return Math.floor(Math.random() * sides) + 1;
  }
}
