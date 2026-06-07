import http from 'http'
import fs from 'fs/promises'
import path from 'path'

const PORT = process.env.TOKEN_API_PORT ? Number(process.env.TOKEN_API_PORT) : 5175
const DATA_PATH = path.resolve(process.cwd(), 'public', 'initialTotal.json')

function sendJSON(res, status, obj) {
  const s = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(s),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(s)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost`)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (url.pathname === '/api/initialTotal' && req.method === 'GET') {
    try {
      const raw = await fs.readFile(DATA_PATH, 'utf8')
      const json = JSON.parse(raw)
      sendJSON(res, 200, json)
    } catch (err) {
      sendJSON(res, 500, { error: String(err) })
    }
    return
  }

  if (url.pathname === '/api/initialTotal' && req.method === 'POST') {
    try {
      let body = ''
      for await (const chunk of req) body += chunk
      const data = JSON.parse(body || '{}')
      const val = Number(data?.initialTotal)
      if (!Number.isFinite(val)) {
        sendJSON(res, 400, { error: 'invalid initialTotal' })
        return
      }
      const out = { initialTotal: val }
      await fs.writeFile(DATA_PATH, JSON.stringify(out, null, 2), 'utf8')
      sendJSON(res, 200, out)
    } catch (err) {
      sendJSON(res, 500, { error: String(err) })
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('not found')
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Token API server listening on http://localhost:${PORT}`)
})
