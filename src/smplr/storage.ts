export type StorageResponse = {
  readonly status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<any>;
  text(): Promise<string>;
};

export type Storage = {
  fetch: (url: string) => Promise<StorageResponse>;
};

export const HttpStorage: Storage = {
  fetch(url) {
    return fetch(url);
  },
};

export class CacheStorage implements Storage {
  _cache: Promise<Cache>;

  constructor(name = "smplr") {
    if (typeof window === "undefined" || !("caches" in window)) {
      this._cache = Promise.reject("CacheStorage not supported");
    } else {
      this._cache = caches.open(name);
    }
  }

  async fetch(url: string): Promise<StorageResponse> {
    const request = new Request(url);
    try {
      return await this._tryFromCache(request);
    } catch (err) {
      const response = await fetch(request);
      await this._saveResponse(request, response);
      return response;
    }
  }

  async _tryFromCache(request: Request): Promise<StorageResponse> {
    const cache = await this._cache;
    const response = await cache.match(request);
    if (response) return response;
    else throw Error("Not found");
  }

  async _saveResponse(request: Request, response: Response) {
    try {
      const cache = await this._cache;
      await cache.put(request, response.clone());
    } catch (err) {}
  }
}
