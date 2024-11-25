import { describe, it, expect, beforeEach } from 'vitest';
import { RingBuffer } from './ringbuf';

describe('RingBuffer', () => {
  describe('Initialization', () => {
    it('should create buffer with correct capacity', () => {
      const capacity = 16;
      const sab = RingBuffer.getStorageForCapacity(capacity, Float32Array);
      const rb = new RingBuffer(sab, Float32Array);
      expect(rb.capacity()).toBe(capacity);
    });

    it('should throw on invalid type', () => {
      const sab = RingBuffer.getStorageForCapacity(16, Float32Array);
      expect(() => new RingBuffer(sab, {} as any)).toThrow();
    });
  });

  describe('Basic Operations', () => {
    let ringBuffer: RingBuffer<Float32ArrayConstructor>;
    let sab: SharedArrayBuffer;

    beforeEach(() => {
      sab = RingBuffer.getStorageForCapacity(16, Float32Array);
      ringBuffer = new RingBuffer(sab, Float32Array);
    });

    it('should start empty', () => {
      expect(ringBuffer.empty()).toBe(true);
      expect(ringBuffer.full()).toBe(false);
    });

    it('should handle basic push and pop', () => {
      const data = new Float32Array([1, 2, 3, 4]);
      const written = ringBuffer.push(data);
      expect(written).toBe(4);

      const output = new Float32Array(4);
      const read = ringBuffer.pop(output);
      expect(read).toBe(4);
      expect(Array.from(output)).toEqual([1, 2, 3, 4]);
    });

    it('should handle wrapping around', () => {
      // Fill most of the buffer
      const data1 = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      ringBuffer.push(data1);

      // Read some data
      const output1 = new Float32Array(6);
      ringBuffer.pop(output1);

      // Write more data that will wrap around
      const data2 = new Float32Array([11, 12, 13, 14, 15]);
      ringBuffer.push(data2);

      // Read all remaining data
      const output2 = new Float32Array(9);
      const read = ringBuffer.pop(output2);
      expect(read).toBe(9);
      expect(Array.from(output2.slice(0, read)))
        .toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15]);
    });

    it('should handle push when full', () => {
      // Fill the buffer
      const data1 = new Float32Array(ringBuffer.capacity());
      const written1 = ringBuffer.push(data1);
      expect(written1).toBe(ringBuffer.capacity());
      expect(ringBuffer.full()).toBe(true);

      // Try to write more
      const data2 = new Float32Array([1]);
      const written2 = ringBuffer.push(data2);
      expect(written2).toBe(0);
    });

    it('should handle pop when empty', () => {
      const output = new Float32Array(1);
      const read = ringBuffer.pop(output);
      expect(read).toBe(0);
    });
  });

  describe('Available Space Calculation', () => {
    let ringBuffer: RingBuffer<Float32ArrayConstructor>;
    let sab: SharedArrayBuffer;

    beforeEach(() => {
      sab = RingBuffer.getStorageForCapacity(8, Float32Array);
      ringBuffer = new RingBuffer(sab, Float32Array);
    });

    it('should correctly report available read/write space', () => {
      expect(ringBuffer.available_read()).toBe(0);
      expect(ringBuffer.available_write()).toBe(8);

      const data = new Float32Array([1, 2, 3]);
      ringBuffer.push(data);

      expect(ringBuffer.available_read()).toBe(3);
      expect(ringBuffer.available_write()).toBe(5);
    });

    it('should maintain correct available space after operations', () => {
      const data = new Float32Array([1, 2, 3, 4]);
      ringBuffer.push(data);

      const output = new Float32Array(2);
      ringBuffer.pop(output);

      expect(ringBuffer.available_read()).toBe(2);
      expect(ringBuffer.available_write()).toBe(6);
    });
  });
});
