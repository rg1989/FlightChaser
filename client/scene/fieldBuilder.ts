// client/scene/fieldBuilder.ts
// Who makes a weather field (wxFieldJob.ts makeField): a worker of its own, so that the frames do not wait for it (the field, its
// images and the first time the noise took 65 ms, and 140 to 700 ms the first time, of the frame loop); or, where there is no worker
// (Node's tests), where it cannot be started, and from the moment it fails, the caller's own thread, at once.
// One field is made at a time. An ask that comes meanwhile waits, and a later one takes its place: a field nobody will draw is not
// made. Every field made is told, also when a later ask waits: the caller draws it until the next has come.
import { makeField, type FieldJob, type FieldMade } from './wxFieldJob.ts'

export interface FieldBuilder {
  /** Has this field made; `done` is told when it is: later (a worker's), or before this returns (made here). */
  ask(job: FieldJob, done: (made: FieldMade) => void): void
  /** Ends the worker. Nothing is told after. */
  destroy(): void
}

/** What of a Worker the builder uses (a stand-in in tests). */
export interface WorkerLike {
  onmessage: ((e: { data: FieldMade }) => void) | null
  onerror: ((e: unknown) => void) | null
  onmessageerror: ((e: unknown) => void) | null
  postMessage(job: FieldJob): void
  terminate(): void
}

interface Ask {
  job: FieldJob
  done: (made: FieldMade) => void
}

/** The browser's worker for the field (Vite bundles the file named here); none outside a page. */
const startWorker = typeof Worker === 'undefined' || typeof document === 'undefined' ? null
  : (): WorkerLike => new Worker(new URL('./wxField.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike

/** A builder: with the worker `start` gives, or none (null: fields are made at once, here). */
export function fieldBuilder(start: (() => WorkerLike) | null = startWorker): FieldBuilder {
  let worker: WorkerLike | null = null
  let busy: Ask | null = null // with the worker
  let next: Ask | null = null // waiting for it
  let destroyed = false

  /** The worker has failed: it is ended, and what was asked of it last is made here. */
  const fall = (why: unknown): void => {
    if (worker === null) return
    console.warn('FlightHopper: the weather field\'s worker failed; fields are made on the main thread from now on:', why)
    worker.terminate()
    worker = null
    const last = next ?? busy
    busy = next = null
    if (last !== null) last.done(makeField(last.job))
  }
  const send = (a: Ask): void => {
    busy = a
    try {
      worker!.postMessage(a.job)
    } catch (e) {
      fall(e)
    }
  }
  if (start !== null) {
    try {
      worker = start()
      worker.onmessage = (e) => {
        const told = busy
        busy = null
        if (next !== null) {
          const a = next
          next = null
          send(a)
        }
        told?.done(e.data)
      }
      worker.onerror = fall
      worker.onmessageerror = fall
    } catch (e) {
      console.warn('FlightHopper: the weather field\'s worker did not start; fields are made on the main thread:', e)
      worker = null
    }
  }
  return {
    ask(job, done) {
      if (destroyed) return
      if (worker === null) done(makeField(job))
      else if (busy === null) send({ job, done })
      else next = { job, done }
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      worker?.terminate()
      worker = null
      busy = next = null
    },
  }
}
