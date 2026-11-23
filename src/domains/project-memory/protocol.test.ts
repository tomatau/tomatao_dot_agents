import { describe, expect, test } from 'bun:test'
import { PROJECT_PATH, withoutProjectPath, withProjectPath } from './protocol'

describe('the project_path argument', () => {
  test('is required by every listed tool, beside its own arguments', () => {
    // Arrange
    const listing = {
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: [
          {
            name: 'recall',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
          },
          { name: 'list_tags' },
        ],
      },
    }

    // Act
    const { tools } = withProjectPath(listing).result as {
      tools: {
        inputSchema: { properties: object; required: string[] }
      }[]
    }

    // Assert
    expect(tools[0].inputSchema.required).toEqual(['query', PROJECT_PATH])
    expect(Object.keys(tools[0].inputSchema.properties)).toEqual([
      'query',
      PROJECT_PATH,
    ])
    expect(tools[1].inputSchema.required).toEqual([PROJECT_PATH])
  })

  test('leaves a reply that lists no tools alone', () => {
    const error = { jsonrpc: '2.0', id: 2, error: { code: -1, message: 'x' } }
    expect(withProjectPath(error)).toBe(error)
  })

  test('is removed before a call reaches Hindsight', () => {
    // Arrange
    const call = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'recall',
        arguments: { query: 'why', [PROJECT_PATH]: '/code/repo' },
      },
    }

    // Act & Assert
    expect(withoutProjectPath(call).params).toEqual({
      name: 'recall',
      arguments: { query: 'why' },
    })
  })
})
