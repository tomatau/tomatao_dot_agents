/** A JSON-RPC message; the bridge forwards these without inspecting most of them. */
export type JsonRpc = Record<string, unknown>

const ACCEPT = 'application/json, text/event-stream'

/** Messages carried in a streamable-HTTP reply, which may be JSON or SSE. */
function parse(body: string, contentType: string): JsonRpc[] {
  const text = body.trim()
  if (!text) return []
  if (!contentType.includes('text/event-stream')) {
    const one = JSON.parse(text)
    return Array.isArray(one) ? one : [one]
  }
  return text
    .split('\n')
    .filter(l => l.startsWith('data:'))
    .map(l => JSON.parse(l.slice(5).trim()))
}

/** One MCP session against a streamable-HTTP endpoint. */
export class McpHttp {
  private session?: string

  constructor(readonly url: string) {}

  /** Post a message and return whatever came back; a notification returns none. */
  async post(message: JsonRpc): Promise<JsonRpc[]> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: ACCEPT,
        ...(this.session ? { 'Mcp-Session-Id': this.session } : {}),
      },
      body: JSON.stringify(message),
    })
    const sid = res.headers.get('mcp-session-id')
    if (sid) this.session = sid
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`)
    }
    return parse(await res.text(), res.headers.get('content-type') ?? '')
  }
}

/** The current session, replaced when the bridge re-points at another bank. */
export class McpUpstream {
  private current?: McpHttp

  /** Open a session at `url` and replay `init`, returning its replies. */
  async connect(url: string, init: JsonRpc): Promise<JsonRpc[]> {
    const http = new McpHttp(url)
    const out = await http.post(init)
    await http.post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    this.current = http
    return out
  }

  async post(message: JsonRpc): Promise<JsonRpc[]> {
    return (await this.current?.post(message)) ?? []
  }
}
