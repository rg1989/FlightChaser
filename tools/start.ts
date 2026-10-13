// tools/start.ts
// Starts Flight Chaser for use, on any system Node runs on (`npm start`, and the launcher the installers write): what
// `make` does for development, without make or a POSIX shell. It installs the dependencies when they are missing,
// builds the client when there is no build or a source is newer than it, then runs the one server that serves the app
// and its data, and opens the browser.
//
//   node tools/start.ts [--port 8787] [--no-open] [--build]
//     --build    build the client even when it looks up to date
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

/** The oldest Node that runs the app: it runs TypeScript directly and knows import.meta.main. */
export const NODE_MIN: readonly [number, number] = [24, 2]

/** Whether a Node version ("24.2.0", "v25.1.0") runs the app. */
export function nodeOk(version: string): boolean {
  const m = /^v?(\d+)\.(\d+)/.exec(version)
  if (m === null) return false
  const [major, minor] = [Number(m[1]), Number(m[2])]
  return major > NODE_MIN[0] || (major === NODE_MIN[0] && minor >= NODE_MIN[1])
}

export interface StartArgs {
  port: number
  open: boolean
  build: boolean
}

/** The command line's options; throws an Error that names the option when one is unknown or its value is not a port. */
export function startArgs(argv: readonly string[]): StartArgs {
  const { values } = parseArgs({
    args: [...argv],
    options: { port: { type: 'string' }, 'no-open': { type: 'boolean' }, build: { type: 'boolean' } },
  })
  const port = values.port === undefined ? 8787 : Number(values.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`--port must be 1 to 65535, got "${values.port}"`)
  return { port, open: values['no-open'] !== true, build: values.build === true }
}

/**
 * What the server is started with, over the caller's environment: live traffic from adsb.fi as `make` sets it (paced
 * under its public limit of 1 request a second, whatever .env.local says), nothing recorded but the flights asked for
 * with the Record button. Those and the alerts go where the caller's environment says, else into data/.
 */
export function serverEnv(args: StartArgs, env: Readonly<Record<string, string | undefined>>): Record<string, string> {
  return {
    PORT: String(args.port), RECORD_DIR: '', ADSB_SOURCE: 'adsbfi', MAX_RPS: '0.9',
    FLIGHTS_DIR: env.FLIGHTS_DIR || 'data/flights', EVENTS_DIR: env.EVENTS_DIR || 'data/events',
  }
}

/** The command that opens a URL in the system's browser. */
export function openCommand(platform: NodeJS.Platform, url: string): [command: string, args: string[]] {
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', url]] // start's first quoted argument is a window title
  return [platform === 'darwin' ? 'open' : 'xdg-open', [url]]
}

/** The newest change (ms) among the paths, folders walked; a missing path counts for nothing. */
export function newestMs(paths: readonly string[]): number {
  let newest = 0
  const visit = (p: string): void => {
    let s
    try {
      s = statSync(p)
    } catch {
      return
    }
    if (s.isDirectory()) for (const name of readdirSync(p)) visit(join(p, name))
    else if (s.mtimeMs > newest) newest = s.mtimeMs
  }
  for (const p of paths) visit(p)
  return newest
}

/** What the client is built from: a change to any of it makes the build stale (.env.local holds the keys a build takes in; liveries/ is there once the airlines are folders of their own). */
export const BUILD_SOURCES = ['client', 'shared', 'public', 'liveries', 'index.html', 'vite.config.ts', 'package.json', '.env.local'] as const

/** Whether the client must be built: there is no build, or a source is newer than it. */
export function buildDue(root: string): boolean {
  const built = join(root, 'dist', 'index.html')
  if (!existsSync(built)) return true
  return newestMs(BUILD_SOURCES.map((p) => join(root, p))) > statSync(built).mtimeMs
}

/** Whether something already listens on the port (on this machine's loopback address, where the server listens). */
function portBusy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(true))
    probe.once('listening', () => probe.close(() => resolve(false)))
    probe.listen(port, '127.0.0.1')
  })
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

if (import.meta.main) {
  if (!nodeOk(process.versions.node)) {
    console.error(`Flight Chaser needs Node ${NODE_MIN.join('.')} or newer; this is ${process.version}`)
    process.exit(1)
  }
  let args: StartArgs
  try {
    args = startArgs(process.argv.slice(2))
  } catch (e) {
    console.error(`start: ${(e as Error).message}`)
    process.exit(1)
  }
  const root = join(import.meta.dirname, '..')
  process.chdir(root)
  // npm is a .cmd file on Windows, which Node starts only through a shell.
  const windows = process.platform === 'win32'
  const npm = (...a: string[]): void => {
    const r = spawnSync(windows ? 'npm.cmd' : 'npm', a, { stdio: 'inherit', shell: windows })
    if (r.status !== 0) process.exit(r.status ?? 1)
  }
  if (!existsSync('node_modules')) {
    console.log('Installing the dependencies (the first time only)…')
    npm('ci', '--no-audit', '--no-fund')
  }
  if (args.build || buildDue(root)) {
    console.log('Building the app…')
    npm('run', '--silent', 'build')
  }
  if (await portBusy(args.port)) {
    console.error(`Port ${args.port} is busy: Flight Chaser may be running already (two live servers would double the requests from this address). Stop it, or pick another port with --port.`)
    process.exit(1)
  }
  const server = spawn(process.execPath, ['--env-file-if-exists=.env.local', 'server/main.ts'], {
    stdio: 'inherit',
    env: { ...process.env, ...serverEnv(args, process.env) },
  })
  server.on('exit', (code) => process.exit(code ?? 0))
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void server.kill(signal))
  const url = `http://localhost:${args.port}/`
  let up = false
  for (let i = 0; i < 150 && !up; i++) {
    up = await fetch(`http://127.0.0.1:${args.port}/`).then((r) => r.ok, () => false)
    if (!up) await sleep(200)
  }
  if (!up) {
    console.error('The server did not answer.')
    server.kill()
    process.exit(1)
  }
  console.log(`\n  Flight Chaser → ${url}\n  Ctrl+C stops it.\n`)
  if (args.open) {
    const [command, a] = openCommand(process.platform, url)
    spawn(command, a, { stdio: 'ignore', detached: true }).on('error', () => undefined).unref() // no browser to open (a server, CI): the link is printed
  }
}
