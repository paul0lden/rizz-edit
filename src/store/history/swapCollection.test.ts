import { FastSwapCollection } from "./swapCollection";
import { describe, it, expect } from "vitest";

describe("FastSwapCollection", () => {
  describe("basic operations", () => {
    it("should create collection with initial items", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(collection.toArray()).toEqual(["a", "b", "c"]);
    });

    it("should return correct size", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(collection.size()).toBe(3);
    });

    it("should get item by index", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(collection.get(1)).toBe("b");
    });

    it("should return undefined for invalid index", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(collection.get(5)).toBeUndefined();
    });
  });

  describe("swap operation", () => {
    it("should swap two items", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      const swapped = collection.swap("a", "c");
      expect(swapped.toArray()).toEqual(["c", "b", "a"]);
      // Original should remain unchanged
      expect(collection.toArray()).toEqual(["a", "b", "c"]);
    });

    it("should maintain correct indices after swap", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      const swapped = collection.swap("a", "c");
      expect(swapped.find("a")).toBe(2);
      expect(swapped.find("c")).toBe(0);
    });

    it("should throw error when swapping non-existent items", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(() => collection.swap("a", "d")).toThrow("Items not found");
    });
  });

  describe("find operation", () => {
    it("should find item index", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(collection.find("b")).toBe(1);
    });

    it("should return -1 for non-existent item", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(collection.find("d")).toBe(-1);
    });
  });

  describe("iterator", () => {
    it("should be iterable with for...of", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      const result: string[] = [];
      for (const item of collection) {
        result.push(item);
      }
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should work with spread operator", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect([...collection]).toEqual(["a", "b", "c"]);
    });

    it("should work with Array.from", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      expect(Array.from(collection)).toEqual(["a", "b", "c"]);
    });
  });

  describe("immutability", () => {
    it("should create new instance on swap", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      const swapped = collection.swap("a", "c");
      expect(swapped).not.toBe(collection);
      expect(collection.toArray()).toEqual(["a", "b", "c"]);
    });

    it("should maintain separate state between instances", () => {
      const collection = new FastSwapCollection(["a", "b", "c"]);
      const swapped1 = collection.swap("a", "b");
      const swapped2 = collection.swap("b", "c");

      expect(collection.toArray()).toEqual(["a", "b", "c"]);
      expect(swapped1.toArray()).toEqual(["b", "a", "c"]);
      expect(swapped2.toArray()).toEqual(["a", "c", "b"]);
    });
  });
});

describe("update operation", () => {
  it("should update an item", () => {
    const collection = new FastSwapCollection(["a", "b", "c"]);
    const updated = collection.update("b", "x");
    expect(updated.toArray()).toEqual(["a", "x", "c"]);
    expect(updated.find("x")).toBe(1);
    expect(updated.find("b")).toBe(-1);
  });

  it("should maintain original collection after update", () => {
    const collection = new FastSwapCollection(["a", "b", "c"]);
    const updated = collection.update("b", "x");
    expect(collection.toArray()).toEqual(["a", "b", "c"]);
    expect(updated.toArray()).toEqual(["a", "x", "c"]);
  });

  it("should throw error when updating non-existent item", () => {
    const collection = new FastSwapCollection(["a", "b", "c"]);
    expect(() => collection.update("d", "x")).toThrow("Item not found");
  });

  it("should throw error when new item already exists", () => {
    const collection = new FastSwapCollection(["a", "b", "c"]);
    expect(() => collection.update("a", "b")).toThrow(
      "New item already exists in collection"
    );
  });
});
