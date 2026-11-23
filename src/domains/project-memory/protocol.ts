import type { JsonRpc } from '../../clients/mcp-http'

// JSON-RPC codes: a server-defined condition, and an unexpected failure.
const NO_PROJECT = -32002
const INTERNAL = -32603

/** What the shell should do next. Every effect the bridge has is one of these. */
export type Action =
  | { do: 'reply'; message: JsonRpc }
  | { do: 'connect'; bank: string; init: JsonRpc }
  | ({ do: 'forward' | 'list-tools'; message: JsonRpc } & UpstreamTarget)
  | { do: 'resolve-project'; message: JsonRpc }
  | { do: 'ask-roots' }
  | { do: 'ensure-bank'; bank: string }
  | { do: 'log'; line: string }

/**
 * A client message, or an answer the shell resolved for us. Turning a root or a
 * project path into a bank needs git, so the shell does that and reports the result.
 */
export type Event =
  | { on: 'message'; message: JsonRpc }
  | { on: 'roots'; bank?: string }
  | { on: 'project'; message: JsonRpc; path?: string; bank?: string }

type UpstreamTarget = { bank: string; init: JsonRpc }

type Route =
  | { kind: 'starting'; cwdBank?: string }
  | { kind: 'waiting'; cwdBank?: string; queued: JsonRpc[] }
  | { kind: 'fixed'; bank: string }
  | { kind: 'per-call' }

export interface Session {
  route: Route
  init?: JsonRpc
}

export const newSession = (cwdBank?: string): Session => ({
  route: { kind: 'starting', cwdBank },
})

/**
 * Lists the tools while no call has named a repo. Bank ids are normalised to
 * `[a-z0-9-]`, so no real bank can take this name, and listing tools does not
 * create the bank it names.
 */
export const CATALOGUE_BANK = '_tools'

/** The argument each tool gains when the bridge cannot tell the repo itself. */
export const PROJECT_PATH = 'project_path'

const PROJECT_PATH_SCHEMA = {
  type: 'string',
  description:
    'Absolute path of the git repository this memory is for: the one you are working in.',
}

interface ToolSchema {
  type?: string
  properties?: Record<string, unknown>
  required?: string[]
}

/** A `tools/list` reply with every tool requiring `project_path`. */
export function withProjectPath(message: JsonRpc): JsonRpc {
  const result = message.result as
    | { tools?: { inputSchema?: ToolSchema }[] }
    | undefined
  if (!result?.tools) return message
  const tools = result.tools.map(tool => {
    const schema: ToolSchema = tool.inputSchema ?? { type: 'object' }
    return {
      ...tool,
      inputSchema: {
        ...schema,
        properties: {
          ...schema.properties,
          [PROJECT_PATH]: PROJECT_PATH_SCHEMA,
        },
        required: [...(schema.required ?? []), PROJECT_PATH],
      },
    }
  })
  return { ...message, result: { ...result, tools } }
}

const callArguments = (message: JsonRpc): Record<string, unknown> =>
  (message.params as { arguments?: Record<string, unknown> } | undefined)
    ?.arguments ?? {}

/** The `project_path` a tool call names, if it names one as a string. */
export function projectPath(message: JsonRpc): string | undefined {
  const path = callArguments(message)[PROJECT_PATH]
  return typeof path === 'string' ? path : undefined
}

/** A tool call as Hindsight expects it, without the argument the bridge added. */
export function withoutProjectPath(message: JsonRpc): JsonRpc {
  const { [PROJECT_PATH]: _, ...rest } = callArguments(message)
  return {
    ...message,
    params: { ...(message.params as object), arguments: rest },
  }
}

const reply = (id: unknown, result: unknown): Action => ({
  do: 'reply',
  message: { jsonrpc: '2.0', id, result },
})

const fail = (id: unknown, code: number, message: string): Action => ({
  do: 'reply',
  message: { jsonrpc: '2.0', id, error: { code, message } },
})

/** The reply to a call whose `project_path` names no repo. */
export const noProject = (id: unknown, path?: string): Action =>
  fail(
    id,
    NO_PROJECT,
    `${PROJECT_PATH} must be the absolute path of a git repository; got ${JSON.stringify(path ?? null)}`,
  )

/** The reply sent when an effect throws; the shell needs the message itself. */
export const internalError = (id: unknown, detail: string): JsonRpc => ({
  jsonrpc: '2.0',
  id,
  error: { code: INTERNAL, message: detail },
})

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
