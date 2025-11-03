/**
 * A sorted items that uses binary search to insert items in sorted order.
 * @private
 */
export class SortedQueue<T> {
  _items: T[] = [];
  constructor(public readonly compare: (a: T, b: T) => number) {}

  push(item: T) {
    const len = this._items.length;

    let left = 0;
    let right = len - 1;
    let index = len;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.compare(item, this._items[mid]) < 0) {
        index = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    this._items.splice(index, 0, item);
  }

  pop() {
    return this._items.shift();
  }

  peek(): T | undefined {
    return this._items[0];
  }

  removeAll(predicate: (item: T) => boolean) {
    const len = this._items.length;
    this._items = this._items.filter((item) => !predicate(item));
    return this._items.length !== len;
  }

  clear() {
    this._items = [];
  }

  size() {
    return this._items.length;
  }
}
