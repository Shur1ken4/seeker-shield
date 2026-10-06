import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Runs the /api server functions inside `npm run dev`, so local testing
// doesn't need the Vercel CLI. On Vercel, the same files deploy as functions.
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        // Source files the app imports (e.g. /api/_lib/guard.ts) are served by Vite as modules.
        if (/\.[a-z]+$/i.test(url.pathname)) return next()
        // Same as production: every /api route goes through api/router.ts.
        const file = path.join(server.config.root, 'api', 'router.ts')
        if (url.pathname.includes('/_') || !fs.existsSync(file)) {
          res.statusCode = 404
          return res.end('Not found')
        }
        try {
          const mod = await server.ssrLoadModule(file)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end('Method not allowed')
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers,
            body: chunks.length && req.method !== 'GET' ? Buffer.concat(chunks) : undefined,
          })
          const response: Response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.config.logger.error(String((err as Error).stack ?? err))
          res.statusCode = 500
          res.end('Server error')
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Make .env.local visible to the dev /api functions (server only; never exposed to the browser).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), apiDev()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    server: { host: true },
  }
})
