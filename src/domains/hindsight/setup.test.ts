import { afterEach, expect, spyOn, test } from 'bun:test'
import { DRY_RUN } from '../../lib/mode'
import { loadHindsightConfig } from '../../settings/hindsight'
import { planMemoryInstall, setupMemory } from './setup'

let fetchMock: ReturnType<typeof spyOn> | undefined
let logMock: ReturnType<typeof spyOn> | undefined
afterEach(() => {
  fetchMock?.mockRestore()
  logMock?.mockRestore()
})

test.skipIf(process.platform !== 'darwin')(
  'plans fresh setup without querying banks on an absent server',
  async () => {
    fetchMock = spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('offline'),
    )
    const plan = await planMemoryInstall()
    expect(plan.slice(0, 2)).toEqual([
      { kind: 'install-tool' },
      { kind: 'install-service' },
    ])
    expect(
      plan
        .filter(action => action.kind === 'ensure-bank')
        .map(action => action.id),
    ).toEqual((await loadHindsightConfig()).banks.map(bank => bank.id))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toEndWith('/health')
  },
)

test('offline bank preview succeeds and never sends a write request', async () => {
  fetchMock = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
  logMock = spyOn(console, 'log').mockImplementation(() => {})
  await setupMemory('banks', DRY_RUN)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(logMock).toHaveBeenCalledWith(
    expect.stringContaining('would ensure bank'),
  )
})

test.skipIf(process.platform !== 'darwin')(
  'an answering server plans only its missing banks',
  async () => {
    const banks = (await loadHindsightConfig()).banks
    fetchMock = spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ status: 'ok' }))
      .mockResolvedValueOnce(
        Response.json({ banks: banks.map(bank => ({ bank_id: bank.id })) }),
      )
    expect(await planMemoryInstall()).toEqual([{ kind: 'install-tool' }])
  },
)
