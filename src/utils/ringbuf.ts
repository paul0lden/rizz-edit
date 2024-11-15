type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

class RingBuffer<T extends TypedArrayConstructor> {
  private readonly _type: T;
  private readonly _capacity: number;
  private readonly buf: SharedArrayBuffer;
  private readonly write_ptr: Uint32Array;
  private readonly read_ptr: Uint32Array;
  private readonly storage: InstanceType<T>;

  static getStorageForCapacity(capacity: number, type: TypedArrayConstructor): SharedArrayBuffer {
    if (!type.BYTES_PER_ELEMENT) {
      throw new Error("Pass in a ArrayBuffer subclass");
    }
    const bytes = 8 + (capacity + 1) * type.BYTES_PER_ELEMENT;
    return new SharedArrayBuffer(bytes);
  }

  constructor(sab: SharedArrayBuffer, type: T) {
    if (!ArrayBuffer.__proto__.isPrototypeOf(type) &&
      type.BYTES_PER_ELEMENT !== undefined) {
      throw new Error("Pass a concrete typed array class as second argument");
    }

    this._type = type;
    this._capacity = (sab.byteLength - 8) / type.BYTES_PER_ELEMENT;
    this.buf = sab;
    this.write_ptr = new Uint32Array(this.buf, 0, 1);
    this.read_ptr = new Uint32Array(this.buf, 4, 1);
    this.storage = new type(this.buf, 8, this._capacity);
  }

  public type(): string {
    return this._type.name;
  }

  public push(elements: InstanceType<T>): number {
    const rd = Atomics.load(this.read_ptr, 0);
    const wr = Atomics.load(this.write_ptr, 0);

    if ((wr + 1) % this._storage_capacity() === rd) {
      // full
      return 0;
    }

    const to_write = Math.min(this._available_write(rd, wr), elements.length);
    const first_part = Math.min(this._storage_capacity() - wr, to_write);
    const second_part = to_write - first_part;

    this._copy(elements, 0, this.storage, wr, first_part);
    this._copy(elements, first_part, this.storage, 0, second_part);

    // publish the enqueued data to the other side
    Atomics.store(
      this.write_ptr,
      0,
      (wr + to_write) % this._storage_capacity()
    );

    return to_write;
  }

  public pop(elements: InstanceType<T>): number {
    const rd = Atomics.load(this.read_ptr, 0);
    const wr = Atomics.load(this.write_ptr, 0);

    if (wr === rd) {
      return 0;
    }

    const to_read = Math.min(this._available_read(rd, wr), elements.length);
    const first_part = Math.min(this._storage_capacity() - rd, to_read);
    const second_part = to_read - first_part;

    this._copy(this.storage, rd, elements, 0, first_part);
    this._copy(this.storage, 0, elements, first_part, second_part);

    Atomics.store(this.read_ptr, 0, (rd + to_read) % this._storage_capacity());

    return to_read;
  }

  public empty(): boolean {
    const rd = Atomics.load(this.read_ptr, 0);
    const wr = Atomics.load(this.write_ptr, 0);
    return wr === rd;
  }

  public full(): boolean {
    const rd = Atomics.load(this.read_ptr, 0);
    const wr = Atomics.load(this.write_ptr, 0);
    return (wr + 1) % this._storage_capacity() === rd;
  }

  public capacity(): number {
    return this._capacity - 1;
  }

  public available_read(): number {
    const rd = Atomics.load(this.read_ptr, 0);
    const wr = Atomics.load(this.write_ptr, 0);
    return this._available_read(rd, wr);
  }

  public available_write(): number {
    const rd = Atomics.load(this.read_ptr, 0);
    const wr = Atomics.load(this.write_ptr, 0);
    return this._available_write(rd, wr);
  }

  private _available_read(rd: number, wr: number): number {
    return (wr + this._storage_capacity() - rd) % this._storage_capacity();
  }

  private _available_write(rd: number, wr: number): number {
    return this.capacity() - this._available_read(rd, wr);
  }

  private _storage_capacity(): number {
    return this._capacity;
  }

  private _copy(
    input: ArrayLike<number>,
    offset_input: number,
    output: ArrayLike<number>,
    offset_output: number,
    size: number
  ): void {
    for (let i = 0; i < size; i++) {
      (output as any)[offset_output + i] = input[offset_input + i];
    }
  }
}

export { RingBuffer, type TypedArrayConstructor };
