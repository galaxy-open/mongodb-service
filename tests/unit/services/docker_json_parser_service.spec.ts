import { test } from '@japa/runner'
import sinon from 'sinon'
import DockerJsonParserService from '#services/docker_cli/commands/docker_json_parser_service'

// Helper to silence console.warn during tests
let warnStub: sinon.SinonStub

test.group('DockerJsonParserService', (group) => {
  const parser = new DockerJsonParserService()
  group.each.setup(() => {
    warnStub = sinon.stub(console, 'warn')
  })
  group.each.teardown(() => {
    warnStub.restore()
  })

  test('parse :: returns null for empty or whitespace-only stdout', async ({ assert }) => {
    assert.isNull(parser.parse(''))
    assert.isNull(parser.parse('   '))
    assert.isNull(parser.parse('\n\n'))
  })

  test('parse :: parses valid complete JSON object', async ({ assert }) => {
    const obj = { foo: 'bar', num: 42 }
    const result = parser.parse(JSON.stringify(obj))
    assert.deepEqual(result, obj)
  })

  test('parse :: parses valid complete JSON array', async ({ assert }) => {
    const arr = [{ a: 1 }, { b: 2 }]
    const result = parser.parse(JSON.stringify(arr))
    assert.deepEqual(result, arr)
  })

  test('parse :: parses single JSON line', async ({ assert }) => {
    const obj = { foo: 'bar' }
    const result = parser.parse(JSON.stringify(obj) + '\n')
    assert.deepEqual(result, obj)
  })

  test('parse :: parses multiple JSON lines, filters out invalid lines', async ({ assert }) => {
    const valid1 = { a: 1 }
    const valid2 = { b: 2 }
    const invalid = '{ not: valid json }'
    const input = `${JSON.stringify(valid1)}\n${invalid}\n${JSON.stringify(valid2)}\n`
    const result = parser.parse(input)
    assert.deepEqual(result, [valid1, valid2])
    assert.isTrue(warnStub.calledOnce)
    assert.match(warnStub.firstCall.args[0], /Failed to parse line 2/)
  })

  test('parse :: returns null if all JSON lines are invalid', async ({ assert }) => {
    const input = '{ invalid }\nnot json\n'
    const result = parser.parse(input)
    assert.isNull(result)
    assert.isTrue(warnStub.calledTwice)
  })

  test('parse :: returns null for empty after filtering lines', async ({ assert }) => {
    const input = '\n\n\n'
    const result = parser.parse(input)
    assert.isNull(result)
  })

  test('parse :: throws error if JSON lines parsing throws unexpectedly', async ({ assert }) => {
    // Simulate error in .split or .filter by passing an object with a broken split
    const brokenStdout = {
      trim: () => ({
        split: () => {
          throw new Error('split failed')
        },
      }),
    } as any
    // The outer try/catch should catch and rethrow as a new error
    try {
      parser.parse(brokenStdout as any)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.match(error.message, /Failed to parse Docker JSON output/)
    }
  })

  test('parseAsArray :: always returns an array (object, array, or null)', async ({ assert }) => {
    // Single object
    const obj = { foo: 'bar' }
    assert.deepEqual(parser.parseAsArray(JSON.stringify(obj)), [obj])
    // Array
    const arr = [{ a: 1 }, { b: 2 }]
    assert.deepEqual(parser.parseAsArray(JSON.stringify(arr)), arr)
    // Null
    assert.deepEqual(parser.parseAsArray(''), [])
    // Single line
    assert.deepEqual(parser.parseAsArray(JSON.stringify(obj) + '\n'), [obj])
    // Multiple lines
    const input = `${JSON.stringify({ x: 1 })}\n${JSON.stringify({ y: 2 })}`
    assert.deepEqual(parser.parseAsArray(input), [{ x: 1 }, { y: 2 }])
    // All lines invalid
    assert.deepEqual(parser.parseAsArray('not json\ninvalid'), [])
  })
})
