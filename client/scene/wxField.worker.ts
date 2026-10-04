// client/scene/wxField.worker.ts
// The weather field's worker (fieldBuilder.ts starts it): each job it is sent is done (wxFieldJob.ts makeField) and its answer sent
// back, the arrays handed over. Nothing else lives here: what it does is wxFieldJob.ts's, which Node tests cover.
import { makeField, transfers, type FieldJob } from './wxFieldJob.ts'

const scope = self as unknown as { onmessage: ((e: { data: FieldJob }) => void) | null; postMessage(message: unknown, transfer: Transferable[]): void }
scope.onmessage = (e) => {
  const made = makeField(e.data)
  scope.postMessage(made, transfers(made))
}
