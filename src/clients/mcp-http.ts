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

/** The server no longer knows the session, as after its idle timeout. */
class SessionLost extends Error {}

/** One MCP session against a streamable-HTTP endpoint. */
class McpHttp {
  private session?: string

  constructor(
    readonly url: string,
    readonly init: JsonRpc,
  ) {}

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
    // The spec answers a session the server has ended with 404.
    if (res.status === 404 && this.session) {
      throw new SessionLost(`${res.status} ${await res.text()}`)
    }
    const sid = res.headers.get('mcp-session-id')
    if (sid) this.session = sid
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`)
    }
    return parse(await res.text(), res.headers.get('content-type') ?? '')
  }
}

/**
 * The current session, replaced when the bridge re-points at another bank, and
 * reopened when the server has ended it.
 */
export class McpUpstream {
  private current?: McpHttp

  constructor(private readonly onReopen: (url: string) => void = () => {}) {}

  /** Open a session at `url` and replay `init`, returning its replies. */
  async connect(url: string, init: JsonRpc): Promise<JsonRpc[]> {
    const { replies } = await this.open(url, init)
    return replies
  }

  async post(message: JsonRpc): Promise<JsonRpc[]> {
    const current = this.current
    if (!current) return []
    try {
      return await current.post(message)
    } catch (error) {
      if (!(error instanceof SessionLost)) throw error
      // The server refused the message without acting on it, so it is safe to resend.
      const { http } = await this.open(current.url, current.init)
      this.onReopen(current.url)
      return http.post(message)
    }
  }

  private async open(url: string, init: JsonRpc) {
    const http = new McpHttp(url, init)
    const replies = await http.post(init)
    await http.post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    this.current = http
    return { http, replies }
  }
}
