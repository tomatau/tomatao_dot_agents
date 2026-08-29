import type { JsonRpc } from '../../clients/mcp-http'

// JSON-RPC codes: a server-defined condition, and an unexpected failure.
const NO_PROJECT = -32002
const INTERNAL = -32603

/** What the shell should do next. Every effect the bridge has is one of these. */
export type Action =
  | { do: 'reply'; message: JsonRpc }
  | { do: 'connect'; bank: string; init: JsonRpc }
  | { do: 'forward'; message: JsonRpc }
  | { do: 'ask-roots' }
  | { do: 'ensure-bank'; bank: string }
  | { do: 'log'; line: string }

/**
 * A client message, or an answer the shell resolved for us. Turning a root into
 * a bank needs git, so the shell does that and reports the result.
 */
export type Event =
  | { on: 'message'; message: JsonRpc }
  | { on: 'roots'; bank?: string }

/**
 * `bank` is undefined outside a git repo. While roots is outstanding the bank is
 * unsettled, so requests wait here rather than being answered against a guess.
 */
export interface Session {
  bank?: string
  init?: JsonRpc
  wantsRoots: boolean
  awaitingRoots: boolean
  queued: JsonRpc[]
}

export const newSession = (bank?: string): Session => ({
  bank,
  wantsRoots: false,
  awaitingRoots: false,
  queued: [],
})

const reply = (id: unknown, result: unknown): Action => ({
  do: 'reply',
  message: { jsonrpc: '2.0', id, result },
})

const fail = (id: unknown, code: number, message: string): Action => ({
  do: 'reply',
  message: { jsonrpc: '2.0', id, error: { code, message } },
})

/** The reply sent when an effect throws; the shell needs the message itself. */
export const internalError = (id: unknown, detail: string): JsonRpc =>
  ({ jsonrpc: '2.0', id, error: { code: INTERNAL, message: detail } })

/** With no bank there is nothing to proxy, so answer plainly and offer no tools. */
export function idle(message: JsonRpc): Action[] {
  if (message.method === 'initialize') {
    return [
      reply(message.id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'project-memory', version: '0' },
      }),
    ]
  }
  if (message.method === 'tools/list') return [reply(message.id, { tools: [] })]
  if (message.id === undefined) return []
  return [fail(message.id, NO_PROJECT, 'no project memory outside a git repo')]
}
