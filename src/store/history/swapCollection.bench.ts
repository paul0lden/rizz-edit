import { bench, describe } from 'vitest'
import { FastSwapCollection } from './swapCollection'

describe('FastSwapCollection Benchmarks', () => {
  // Helper to create collections of different sizes
  const createCollection = (size: number) => {
    const items = Array.from({ length: size }, (_, i) => `item${i}`)
    return new FastSwapCollection(items)
  }

  // Small collection benchmarks (100 items)
  describe('Small Collection (100 items)', () => {
    const collection = createCollection(100)

    bench('construction', () => {
      new FastSwapCollection(Array.from({ length: 100 }, (_, i) => `item${i}`))
    })

    bench('iteration', () => {
      for (const _ of collection) {
        // Just iterate
      }
    })

    bench('find existing item', () => {
      collection.find('item50')
    })

    bench('find non-existing item', () => {
      collection.find('nonexistent')
    })

    bench('get by index', () => {
      collection.get(50)
    })

    bench('swap items', () => {
      collection.swap('item25', 'item75')
    })

    bench('update item', () => {
      collection.update('item50', 'newItem50')
    })

    bench('toArray', () => {
      collection.toArray()
    })
  })

  // Medium collection benchmarks (10,000 items)
  describe('Medium Collection (10,000 items)', () => {
    const collection = createCollection(10000)

    bench('construction', () => {
      new FastSwapCollection(Array.from({ length: 10000 }, (_, i) => `item${i}`))
    })

    bench('iteration', () => {
      for (const _ of collection) {
        // Just iterate
      }
    })

    bench('find existing item', () => {
      collection.find('item5000')
    })

    bench('find non-existing item', () => {
      collection.find('nonexistent')
    })

    bench('get by index', () => {
      collection.get(5000)
    })

    bench('swap items', () => {
      collection.swap('item2500', 'item7500')
    })

    bench('update item', () => {
      collection.update('item5000', 'newItem5000')
    })

    bench('toArray', () => {
      collection.toArray()
    })
  })

  // Large collection benchmarks (1,000,000 items)
  describe('Large Collection (1,000,000 items)', () => {
    const collection = createCollection(1000000)

    bench('construction', () => {
      new FastSwapCollection(Array.from({ length: 1000000 }, (_, i) => `item${i}`))
    })

    bench('iteration', () => {
      for (const _ of collection) {
        // Just iterate
      }
    })

    bench('find existing item', () => {
      collection.find('item500000')
    })

    bench('find non-existing item', () => {
      collection.find('nonexistent')
    })

    bench('get by index', () => {
      collection.get(500000)
    })

    bench('swap items', () => {
      collection.swap('item250000', 'item750000')
    })

    bench('update item', () => {
      collection.update('item500000', 'newItem500000')
    })

    bench('toArray', () => {
      collection.toArray()
    })
  })
})
