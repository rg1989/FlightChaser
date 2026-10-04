// client/scene/fieldBuilder.ts
// Who makes a weather field (wxFieldJob.ts makeField): a worker of its own, so that the frames do not wait for it (the field, its
// images and the first time the noise took 65 ms, and 140 to 700 ms the first time, of the frame loop); or, where there is no worker
// (Node's tests), where it cannot be started, and from the moment it fails, the caller's own thread, at once.
// One field is made at a time. An ask that comes meanwhile waits, and a later one takes its place: a field nobody will draw is not
// made. Every field made is told, also when a later ask waits: the caller draws it until the next has come.
// The same serves any work of a worker's that has a stand-in on the caller's thread (builder): the gathering of a sky's clouds is
// asked for through it too (weather3d.ts, wxGather.ts). An ask may name arrays of its job to hand over to the worker, not copy
// (the satellite's pictures, 1.3 MB: copying them held the frame that asked 3 to 4 ms): they go with the job when it is sent, and
// are the caller's no longer. A job done on the caller's thread hands nothing over; one that the worker had when it failed is done
// here with those arrays gone, and its work must stand that (wxGather.ts says a frame without its pixels is missing).
import { makeField, type FieldJob, type FieldMade } from './wxFieldJob.ts'

export interface Builder<J, M> {
  /** Has this job done; `done` is told when it is: later (a worker's), or before this returns (done here). transfer: arrays of the job handed over to a worker with it, not copied. */
  ask(job: J, done: (made: M) => void, transfer?: Transferable[]): void
  /** Ends the worker. Nothing is told after. */
  destroy(): void
}
export type FieldBuilder = Builder<FieldJob, FieldMade>

/** What of a Worker the builder uses (a stand-in in tests). */
export interface WorkerLike<J = FieldJob, M = FieldMade> {
  onmessage: ((e: { data: M }) => void) | null
  onerror: ((e: unknown) => void) | null
  onmessageerror: ((e: unknown) => void) | null
  postMessage(job: J, transfer?: Transferable[]): void
  terminate(): void
}

/** The browser's worker for the field (Vite bundles the file named here); none outside a page. */
const startWorker = typeof Worker === 'undefined' || typeof document === 'undefined' ? null
  : (): WorkerLike => new Worker(new URL('./wxField.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike

/** A field's builder: with the worker `start` gives, or none (null: fields are made at once, here). */
export const fieldBuilder = (start: (() => WorkerLike) | null = startWorker): FieldBuilder => builder(start, makeField, 'the weather field\'s worker')

/** A builder of any work: with the worker `start` gives (`who`, in a warning), or none (null), and `here`, which does a job on the caller's thread. */
export function builder<J, M>(start: (() => WorkerLike<J, M>) | null, here: (job: J) => M, who: string): Builder<J, M> {
  interface Ask {
    job: J
    done: (made: M) => void
    transfer: Transferable[]
  }
  let worker: WorkerLike<J, M> | null = null
  let busy: Ask | null = null // with the worker
  let next: Ask | null = null // waiting for it
  let destroyed = false

  /** The worker has failed: it is ended, and what was asked of it last is done here. */
  const fall = (why: unknown): void => {
    if (worker === null) return
    console.warn(`FlightHopper: ${who} failed; its work is done on the main thread from now on:`, why)
    worker.terminate()
    worker = null
    const last = next ?? busy
    busy = next = null
    if (last !== null) last.done(here(last.job))
  }
  const send = (a: Ask): void => {
    busy = a
    try {
      worker!.postMessage(a.job, a.transfer)
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
      console.warn(`FlightHopper: ${who} did not start; its work is done on the main thread:`, e)
      worker = null
    }
  }
  return {
    ask(job, done, transfer = []) {
      if (destroyed) return
      if (worker === null) done(here(job))
      else if (busy === null) send({ job, done, transfer })
      else next = { job, done, transfer }
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
