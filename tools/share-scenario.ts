// tools/share-scenario.ts
// A link to one scenario, for someone who has nothing installed: builds the app with that scenario alone and no keys (a copy of the tree in
// .work/share/<id>, without .env.local and data/), serves it, read only, with no /api at all, and opens a Cloudflare quick tunnel to it. The
// address opens straight in the scenario. Ctrl-C ends the link. The scenario's local/ files (its recording) are served too.
//
//   node tools/share-scenario.ts <id> [--no-tunnel]
// ponytail: no password: whoever has the address can watch. Upgrade: a named tunnel with Cloudflare Access.
import { spawn, spawnSync } from 'node:child_process'
import { createReadStream, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
  '.m4a': 'audio/mp4', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.xml': 'application/xml', '.bin': 'application/octet-stream',
}

/** The file a request's path names under root, or null when it is the API or lies outside root. */
export function fileFor(root: string, urlPath: string): string | null {
  let p: string
  try {
    p = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (p === '/api' || p.startsWith('/api/') || p.includes('\0')) return null
  const file = path.resolve(root, `.${p === '/' ? '/index.html' : p}`)
  return file === root || file.startsWith(root + path.sep) ? file : null
}

/** A Range header's first and last byte for a file of this size; null: none, or not one this answers (the whole file goes). */
export function rangeOf(header: string | undefined, size: number): [number, number] | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '')
  if (m === null || (m[1] === '' && m[2] === '')) return null
  const [from, to] = m[1] === '' ? [Math.max(0, size - Number(m[2])), size - 1] : [Number(m[1]), m[2] === '' ? size - 1 : Math.min(size - 1, Number(m[2]))]
  return from <= to && from < size ? [from, to] : null
}

function answer(root: string, id: string, req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://x')
  if (req.method !== 'GET' && req.method !== 'HEAD') return void res.writeHead(405).end()
  if (url.pathname === '/' && !url.searchParams.has('scenario')) return void res.writeHead(302, { location: `/?setup=0&scenario=${id}` }).end()
  const file = fileFor(root, url.pathname)
  if (file === null || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end()
  const size = statSync(file).size
  const range = rangeOf(req.headers.range, size)
  const head = { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=600' }
  if (range !== null) res.writeHead(206, { ...head, 'content-length': range[1] - range[0] + 1, 'content-range': `bytes ${range[0]}-${range[1]}/${size}` })
  else res.writeHead(200, { ...head, 'content-length': size })
  if (req.method === 'HEAD') return void res.end()
  createReadStream(file, range === null ? {} : { start: range[0], end: range[1] }).pipe(res)
}

/** The app built with this scenario alone, and no keys: its output folder. */
function build(repo: string, id: string): string {
  const tree = path.join(repo, '.work', 'share', id)
  rmSync(tree, { recursive: true, force: true })
  mkdirSync(path.join(tree, 'public', 'scenarios'), { recursive: true })
  const leave = new Set(['node_modules', '.git', 'dist', 'data', '.work', '.claude', '.planning', '.superpowers', 'third_party', 'tv', 'public'])
  const copy = (from: string, to: string, skip: (name: string) => boolean): void => {
    for (const name of readdirSync(from)) if (!skip(name)) cpSync(path.join(from, name), path.join(to, name), { recursive: true })
  }
  copy(repo, tree, (name) => leave.has(name) || name.startsWith('.env'))
  copy(path.join(repo, 'public'), path.join(tree, 'public'), (name) => name === 'scenarios')
  cpSync(path.join(repo, 'public', 'scenarios', id), path.join(tree, 'public', 'scenarios', id), { recursive: true })
  symlinkSync(path.join(repo, 'node_modules'), path.join(tree, 'node_modules'))
  const made = spawnSync('npx', ['vite', 'build', '--logLevel', 'warn'], { cwd: tree, stdio: 'inherit' })
  if (made.status !== 0) throw new Error('the build failed')
  return path.join(tree, 'dist')
}

if (import.meta.main) {
  const [id] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const repo = path.resolve(import.meta.dirname, '..')
  if (id === undefined || !existsSync(path.join(repo, 'public', 'scenarios', id, 'scenario.json'))) throw new Error('usage: node tools/share-scenario.ts <scenario id>')
  console.log(`Building ${id} alone…`)
  const root = build(repo, id)
  const port = Number(process.env.PORT ?? 5300)
  createServer((req, res) => answer(root, id, req, res)).listen(port, '127.0.0.1', () => {
    console.log(`Serving on http://127.0.0.1:${port}/`)
    if (process.argv.includes('--no-tunnel')) return
    const tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`], { stdio: ['ignore', 'ignore', 'pipe'] })
    tunnel.stderr.on('data', (d: Buffer) => {
      const link = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(d.toString())?.[0]
      if (link !== undefined) console.log(`\n  Send this link: ${link}\n\nCtrl-C ends it.`)
    })
    process.on('exit', () => tunnel.kill())
    process.on('SIGINT', () => process.exit(0))
  })
}
