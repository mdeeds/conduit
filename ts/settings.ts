export class S {
  private static cache = new Map<string, number>();
  private static default = new Map<string, number>();

  static {
    S.default.set('m', 1.0);
  }

  public static float(name: string): number {
    if (S.cache.has(name)) {
      return S.cache.get(name);
    }
    const url = new URL(document.URL);
    const stringVal = url.searchParams.get(name);
    if (!stringVal) {
      S.cache.set(name, S.default.get(name));
    } else {
      const val = parseFloat(stringVal);
      S.cache.set(name, val);
    }
    return S.cache.get(name);
  }
}