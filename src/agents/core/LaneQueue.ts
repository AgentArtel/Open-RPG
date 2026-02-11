/**
 * LaneQueue — per-agent serial execution queue
 *
 * Ensures each NPC processes one task at a time. The caller (e.g. bridge)
 * enqueues work with enqueue(agentId, task). isProcessing and getQueueLength
 * support backpressure and debugging.
 *
 * @see docs/openclaw-patterns.md — Pattern 1: Lane Queue
 */

import type { ILaneQueue } from './types'

type LaneState = {
  promise: Promise<void>
  queue: Array<() => Promise<void>>
  queueLength: number
  isProcessing: boolean
}

export class LaneQueue implements ILaneQueue {
  private lanes = new Map<string, LaneState>()

  private getOrCreateLane(agentId: string): LaneState {
    let lane = this.lanes.get(agentId)
    if (!lane) {
      lane = {
        promise: Promise.resolve(),
        queue: [],
        queueLength: 0,
        isProcessing: false,
      }
      this.lanes.set(agentId, lane)
    }
    return lane
  }

  enqueue(agentId: string, task: () => Promise<void>): Promise<void> {
    const lane = this.getOrCreateLane(agentId)
    lane.queue.push(task)
    lane.queueLength = lane.queue.length

    const runNext = (): Promise<void> => {
      const next = lane.queue.shift()
      lane.queueLength = lane.queue.length
      if (!next) {
        lane.isProcessing = false
        return Promise.resolve()
      }
      lane.isProcessing = true
      return next()
        .catch((err) => {
          console.error(`[LaneQueue:${agentId}]`, err)
        })
        .finally(() => runNext())
    }

    lane.promise = lane.promise.then(runNext)
    return lane.promise
  }

  isProcessing(agentId: string): boolean {
    const lane = this.lanes.get(agentId)
    return lane?.isProcessing ?? false
  }

  getQueueLength(agentId: string): number {
    const lane = this.lanes.get(agentId)
    return lane?.queueLength ?? 0
  }
}
