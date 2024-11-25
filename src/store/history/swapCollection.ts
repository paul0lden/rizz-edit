import { List, Map as ImmutableMap } from 'immutable'

export class FastSwapCollection<T> implements Iterable<T> {
  private items: List<T>
  private lookupMap: ImmutableMap<T, number>

  constructor(items: T[]) {
    this.items = List(items)
    this.lookupMap = ImmutableMap(
      items.map((item, index) => [item, index])
    )
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items.values()
  }

  swap(a: T, b: T): FastSwapCollection<T> {
    const indexA = this.lookupMap.get(a)
    const indexB = this.lookupMap.get(b)

    if (indexA === undefined || indexB === undefined) {
      throw new Error('Items not found')
    }

    // Create only what's necessary using persistent data structures
    const newItems = this.items
      .set(indexA, b)
      .set(indexB, a)

    // Update map using Immutable.js operations
    const newLookupMap = this.lookupMap
      .set(a, indexB)
      .set(b, indexA)

    // Reuse the prototype
    const newCollection = Object.create(FastSwapCollection.prototype) as FastSwapCollection<T>
    newCollection.items = newItems
    newCollection.lookupMap = newLookupMap

    return newCollection
  }

  update(oldItem: T, newItem: T): FastSwapCollection<T> {
    const index = this.lookupMap.get(oldItem)

    if (index === undefined) {
      throw new Error('Item not found')
    }

    if (this.lookupMap.has(newItem)) {
      throw new Error('New item already exists in collection')
    }

    const newItems = this.items.set(index, newItem)
    const newLookupMap = this.lookupMap
      .remove(oldItem)
      .set(newItem, index)

    const newCollection = Object.create(FastSwapCollection.prototype) as FastSwapCollection<T>
    newCollection.items = newItems
    newCollection.lookupMap = newLookupMap

    return newCollection
  }

  find(item: T): number {
    return this.lookupMap.get(item) ?? -1
  }

  toArray(): T[] {
    return this.items.toArray()
  }

  size(): number {
    return this.items.size
  }

  get(index: number): T | undefined {
    return this.items.get(index)
  }
}
