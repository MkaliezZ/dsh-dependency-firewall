export type Decision = 'ALLOW' | 'ASK' | 'BLOCK'
export interface Classification { decision: Decision; manager?: string; packages: string[]; reasons: string[] }

const MANAGERS: Record<string, RegExp> = {
  npm: /^npm\s+(?:i|install)\b/,
  pnpm: /^pnpm\s+(?:add|install)\b/,
  yarn: /^yarn\s+add\b/,
  pip: /^(?:python\s+-m\s+)?pip\s+install\b/,
  uv: /^uv\s+add\b/,
  cargo: /^cargo\s+add\b/,
}

function tokens(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean)
}

export function classifyDependencyCommand(command: string): Classification {
  const trimmed = command.trim()
  const manager = Object.entries(MANAGERS).find(([, re]) => re.test(trimmed))?.[0]
  if (!manager) return { decision: 'ALLOW', packages: [], reasons: ['not-a-supported-dependency-install'] }

  const parts = tokens(trimmed)
  const start = parts.findIndex(p => ['i', 'install', 'add'].includes(p)) + 1
  const args = start > 0 ? parts.slice(start) : []
  const packages = args.filter(p => !p.startsWith('-'))
  const reasons: string[] = []

  if (args.some(p => /^(?:https?:|git\+|git@|github:)/i.test(p))) reasons.push('remote-or-vcs-source')
  if (args.some(p => /^--(?:registry|index-url|extra-index-url)/.test(p))) reasons.push('alternate-registry')
  if (args.some(p => /--(?:global|system|break-system-packages|unsafe-perm|ignore-scripts=false)/.test(p))) reasons.push('elevated-or-install-script-flag')
  if (packages.length === 0) reasons.push('unbounded-or-implicit-install')

  const block = reasons.includes('alternate-registry') || reasons.includes('remote-or-vcs-source')
  if (block) return { decision: 'BLOCK', manager, packages, reasons }
  if (reasons.length > 0 || packages.some(p => !/[@=<>~^0-9]/.test(p))) return { decision: 'ASK', manager, packages, reasons: reasons.length ? reasons : ['new-unpinned-dependency'] }
  return { decision: 'ALLOW', manager, packages, reasons: ['explicit-versioned-dependency'] }
}

export const name = 'dependency-firewall'
export function apply(ctx: any, config: { protectedTools?: string[] } = {}): void {
  ctx.on('tools/pre-execute', async (call: any, next: () => Promise<any>) => {
    if (config.protectedTools?.length && !config.protectedTools.includes(call.name)) return next()
    const command = typeof call.arguments?.command === 'string' ? call.arguments.command : ''
    const result = classifyDependencyCommand(command)
    if (result.decision === 'ALLOW') return next()
    if (result.decision === 'ASK') return { action: 'ask', reason: `dependency-firewall:${result.reasons.join(',')}` }
    return { action: 'deny', reason: `dependency-firewall:${result.reasons.join(',')}` }
  })
}
