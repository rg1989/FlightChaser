import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
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

export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`) },
  plugins: [
    scenarioIndex(),
    viteStaticCopy({
      targets: ['ThirdParty', 'Workers', 'Assets', 'Widgets'].map((d) => ({ src: `${cesiumSource}/${d}`, dest: cesiumBaseUrl, rename: { stripBase: 4 } })),
    }),
  ],
  server: {
    proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT ?? 8787}` }, // the Makefile's API_PORT
    // `tailscale serve` hands the tailnet's requests on with this Mac's *.ts.net name as the host (Vite blocks unknown hosts).
    allowedHosts: ['.ts.net'],
  },
})
