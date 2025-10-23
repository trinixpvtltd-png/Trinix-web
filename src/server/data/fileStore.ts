import { promises as fs } from "fs";
import path from "path";
import type { z } from "zod";

const LOCKS_SYMBOL: unique symbol = Symbol.for("trinix.fileLocks");

type MutexMap = Map<string, Mutex>;

type GlobalWithLocks = typeof globalThis & {
  [LOCKS_SYMBOL]?: MutexMap;
};

class Mutex {
  private mutex = Promise.resolve<void>(undefined);

  lock() {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.mutex.then(() => release);
    this.mutex = this.mutex.then(() => next);
    return current;
  }

  async runExclusive<T>(callback: () => Promise<T> | T): Promise<T> {
    const unlock = await this.lock();
    try {
      return await callback();
    } finally {
      unlock();
    }
  }
}

function getLocks(): MutexMap {
  const globalWithLocks = globalThis as GlobalWithLocks;
  if (!globalWithLocks[LOCKS_SYMBOL]) {
    globalWithLocks[LOCKS_SYMBOL] = new Map();
  }
  return globalWithLocks[LOCKS_SYMBOL] as MutexMap;
}

function getMutex(filePath: string): Mutex {
  const locks = getLocks();
  let mutex = locks.get(filePath);
  if (!mutex) {
    mutex = new Mutex();
    locks.set(filePath, mutex);
  }
  return mutex;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

async function ensureDirectory(filePath: string) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}

async function writeFileAtomic(filePath: string, payload: unknown) {
  const serialised = `${JSON.stringify(payload, null, 2)}\n`;
  await ensureDirectory(filePath);
  const tempFile = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  await fs.writeFile(tempFile, serialised, "utf8");
  await fs.rename(tempFile, filePath);
}

async function readOrInitialise<T>(filePath: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      const initial = schema.parse(cloneValue(fallback));
      await writeFileAtomic(filePath, initial);
      return initial;
    }
    throw error;
  }
}

export async function readJsonFile<T>(filePath: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  return readOrInitialise(filePath, schema, fallback);
}

export async function mutateJsonFile<T, R>(
  filePath: string,
  schema: z.ZodType<T>,
  mutator: (current: T) => Promise<{ data: T; result: R }> | { data: T; result: R },
  fallback: T
): Promise<R> {
  const mutex = getMutex(filePath);
  return mutex.runExclusive(async () => {
    const current = await readOrInitialise(filePath, schema, fallback);
    const { data, result } = await mutator(cloneValue(current));
    const next = schema.parse(data);
    await writeFileAtomic(filePath, next);
    return result;
  });
}
