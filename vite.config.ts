import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { readManifest } from './tools/models/packages.ts'
import { packageIds } from './tools/scenarios/packages.ts'

// Cesium needs its Workers/Assets/Widgets/ThirdParty served as static files at CESIUM_BASE_URL.
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = 'cesiumStatic'

/**
 * scenarios/index.json (the list the Scenarios panel shows) is the folders under public/scenarios, read each time it is
 * asked for: a package dropped in there shows after a reload, with no list to edit. A build writes the list as a file.
 */
function scenarioIndex(): Plugin {
  let dir = 'public/scenarios'
  const body = (): string => JSON.stringify({ scenarios: packageIds(dir) })
  return {
    name: 'fh-scenario-index',
    configResolved: (c) => void (dir = path.join(c.publicDir, 'scenarios')),
    configureServer(server) {
      server.middlewares.use('/scenarios/index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(body())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'scenarios/index.json', source: body() })
    },
  }
}

/**
 * A livery is the folder liveries/<CODE>/: design.ts (bundled: client/livery/designs/index.ts finds it) and the logos and
 * fonts it draws with. The dev server serves those from the folder; a build copies them to the same address.
 */
function liveryFiles(): Plugin {
  return {
    name: 'fh-livery-files',
    generateBundle() {
      for (const code of readdirSync('liveries')) {
        const dir = path.join('liveries', code)
        if (!statSync(dir).isDirectory()) continue
        for (const f of readdirSync(dir)) if (!/\.(ts|md)$/.test(f)) this.emitFile({ type: 'asset', fileName: `liveries/${code}/${f}`, source: readFileSync(path.join(dir, f)) })
      }
    },
  }
}

/**
 * models/manifest.json (the models the app can draw) is the folders under public/models, read each time it is asked
 * for: a model package dropped in there is drawn after a reload, with no list to edit. A build writes the file.
 */
function modelManifest(): Plugin {
  let dir = 'public/models'
  const body = (): string => JSON.stringify(readManifest(dir))
  return {
    name: 'fh-model-manifest',
    configResolved: (c) => void (dir = path.join(c.publicDir, 'models')),
    configureServer(server) {
      server.middlewares.use('/models/manifest.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(body())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'models/manifest.json', source: body() })
    },
  }
}

export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`) },
  plugins: [
    scenarioIndex(),
    liveryFiles(),
    modelManifest(),
    viteStaticCopy({
      targets: ['ThirdParty', 'Workers', 'Assets', 'Widgets'].map((d) => ({ src: `${cesiumSource}/${d}`, dest: cesiumBaseUrl, rename: { stripBase: 4 } })),
    }),
  ],
  server: {
    hmr: process.env.FH_HMR !== '0', // 0: pages do not reload when a file changes (a shared QA server that many runs load from)
    proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT ?? 8787}` }, // the Makefile's API_PORT
    // `tailscale serve` hands the tailnet's requests on with this Mac's *.ts.net name as the host (Vite blocks unknown hosts).
    allowedHosts: ['.ts.net'],
  },
})
