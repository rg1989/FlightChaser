// client/scene/wxGather.worker.ts
// The worker that gathers a sky's clouds (weather3d.ts starts it): each job it is sent is done by its one gatherer (wxGather.ts,
// which Node tests cover) and the answer sent back.
import { gatherer, type GatherJob } from './wxGather.ts'

const scope = self as unknown as { onmessage: ((e: { data: GatherJob }) => void) | null; postMessage(message: unknown): void }
const gather = gatherer()
scope.onmessage = (e) => scope.postMessage(gather(e.data))
