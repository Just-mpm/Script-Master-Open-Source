type FirestoreValue = Record<string, unknown>;

interface SetOptions {
  merge?: boolean;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeValue(current: FirestoreValue | undefined, next: FirestoreValue, merge: boolean): FirestoreValue {
  if (!merge || !current) {
    return cloneValue(next);
  }

  return {
    ...cloneValue(current),
    ...cloneValue(next),
  };
}

export class MockDocumentSnapshot {
  constructor(
    private readonly path: string,
    private readonly store: Map<string, FirestoreValue>,
  ) {}

  get exists(): boolean {
    return this.store.has(this.path);
  }

  data(): FirestoreValue | undefined {
    const value = this.store.get(this.path);
    return value ? cloneValue(value) : undefined;
  }
}

export class MockDocumentReference {
  constructor(
    public readonly path: string,
    private readonly store: Map<string, FirestoreValue>,
  ) {}

  async get(): Promise<MockDocumentSnapshot> {
    return new MockDocumentSnapshot(this.path, this.store);
  }

  async set(value: FirestoreValue, options?: SetOptions): Promise<void> {
    const current = this.store.get(this.path);
    this.store.set(this.path, mergeValue(current, value, options?.merge === true));
  }
}

class MockQueryDocumentSnapshot extends MockDocumentSnapshot {
  constructor(
    path: string,
    store: Map<string, FirestoreValue>,
    readonly ref: MockDocumentReference,
  ) {
    super(path, store);
  }
}

class MockQuerySnapshot {
  constructor(readonly docs: MockQueryDocumentSnapshot[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }
}

class MockQuery {
  constructor(
    private readonly collectionPath: string,
    private readonly store: Map<string, FirestoreValue>,
    private readonly filters: Array<{ field: string; value: unknown }> = [],
    private readonly maxDocs: number | null = null,
  ) {}

  where(field: string, _operator: string, value: unknown): MockQuery {
    return new MockQuery(this.collectionPath, this.store, [...this.filters, { field, value }], this.maxDocs);
  }

  limit(maxDocs: number): MockQuery {
    return new MockQuery(this.collectionPath, this.store, this.filters, maxDocs);
  }

  async get(): Promise<MockQuerySnapshot> {
    const prefix = `${this.collectionPath}/`;
    const docs = [...this.store.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .filter(([path]) => path.slice(prefix.length).split('/').length === 1)
      .filter(([, value]) => this.filters.every((filter) => value[filter.field] === filter.value))
      .slice(0, this.maxDocs ?? Number.MAX_SAFE_INTEGER)
      .map(([path]) => new MockQueryDocumentSnapshot(path, this.store, new MockDocumentReference(path, this.store)));

    return new MockQuerySnapshot(docs);
  }

  doc(id?: string): MockDocumentReference {
    const resolvedId = id ?? `auto-${Math.random().toString(36).slice(2, 10)}`;
    return new MockDocumentReference(`${this.collectionPath}/${resolvedId}`, this.store);
  }
}

class MockTransaction {
  private readonly writes: Array<{ ref: MockDocumentReference; value: FirestoreValue; options?: SetOptions }> = [];

  constructor(private readonly store: Map<string, FirestoreValue>) {}

  async get(ref: MockDocumentReference): Promise<MockDocumentSnapshot> {
    return new MockDocumentSnapshot(ref.path, this.store);
  }

  set(ref: MockDocumentReference, value: FirestoreValue, options?: SetOptions): void {
    this.writes.push({ ref, value, options });
  }

  commit(): void {
    for (const write of this.writes) {
      const current = this.store.get(write.ref.path);
      this.store.set(write.ref.path, mergeValue(current, write.value, write.options?.merge === true));
    }
  }
}

export class MockFirestore {
  private readonly store = new Map<string, FirestoreValue>();

  seed(path: string, value: FirestoreValue): void {
    this.store.set(path, cloneValue(value));
  }

  read(path: string): FirestoreValue | undefined {
    const value = this.store.get(path);
    return value ? cloneValue(value) : undefined;
  }

  doc(path: string): MockDocumentReference {
    return new MockDocumentReference(path, this.store);
  }

  collection(path: string): MockQuery {
    return new MockQuery(path, this.store);
  }

  async runTransaction<T>(runner: (transaction: MockTransaction) => Promise<T>): Promise<T> {
    const transaction = new MockTransaction(this.store);
    const result = await runner(transaction);
    transaction.commit();
    return result;
  }
}
