// Minimal in-memory stand-in for the subset of ioredis commands this app
// actually uses (sorted sets for rate limiting, get/set for dedup/caching).
export class FakeRedis {
  private sortedSets = new Map<string, Map<string, number>>();
  private strings = new Map<string, string>();

  async zremrangebyscore(key: string, min: number, max: number) {
    const set = this.sortedSets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const [member, score] of set) {
      if (score >= min && score <= max) {
        set.delete(member);
        removed++;
      }
    }
    return removed;
  }

  async zcard(key: string) {
    return this.sortedSets.get(key)?.size ?? 0;
  }

  async zrange(key: string, start: number, stop: number, withScores?: "WITHSCORES") {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
    const slice = sorted.slice(start, stop === -1 ? undefined : stop + 1);
    if (withScores === "WITHSCORES") {
      return slice.flatMap(([member, score]) => [member, String(score)]);
    }
    return slice.map(([member]) => member);
  }

  async zadd(key: string, score: number, member: string) {
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, new Map());
    this.sortedSets.get(key)!.set(member, score);
    return 1;
  }

  async pexpire(_key: string, _ms: number) {
    return 1;
  }

  async get(key: string) {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string, ..._args: unknown[]) {
    this.strings.set(key, value);
    return "OK";
  }

  reset() {
    this.sortedSets.clear();
    this.strings.clear();
  }
}
