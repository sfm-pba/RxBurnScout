/*
 * RxBurnScout Sync Server
 * Cloudflare Worker — Service Worker syntax
 *
 * Optional. Saves burn unit configurations so they can be
 * opened from other devices. Weather data never passes through here;
 * the app fetches forecasts directly from the NWS.
 *
 * KV Binding required: RXBURN_KV
 *
 * Endpoints:
 *   POST /sync/auth          — Register or verify a token
 *   GET  /sync/units         — Get all burn units for user
 *   PUT  /sync/units         — Replace all burn units for user
 *   ANY  /sync/health        — Health check
 *
 * Auth: Bearer token in Authorization header
 */

addEventListener('fetch', function (event) {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  var url = new URL(request.url)

  // Health check
  if (url.pathname === '/sync/health') {
    return jsonRes({ status: 'ok', timestamp: new Date().toISOString() }, 200)
  }

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  // All other routes require /sync/ prefix
  if (!url.pathname.startsWith('/sync/')) {
    return jsonRes({ error: 'Not found' }, 404)
  }

  // --- AUTH ENDPOINT ---
  if (url.pathname === '/sync/auth' && request.method === 'POST') {
    return handleAuth(request)
  }

  // --- PROTECTED ROUTES ---
  var token = getToken(request)
  if (!token) {
    return jsonRes({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' }, 401)
  }

  // Verify token exists in KV
  var userData = await RXBURN_KV.get('user:' + token)
  if (userData === null) {
    return jsonRes({ error: 'Invalid token. Register first via POST /sync/auth.' }, 403)
  }

  // Route: GET /sync/units
  if (url.pathname === '/sync/units' && request.method === 'GET') {
    return handleGetUnits(token)
  }

  // Route: PUT /sync/units
  if (url.pathname === '/sync/units' && request.method === 'PUT') {
    return handlePutUnits(token, request)
  }

  return jsonRes({ error: 'Not found' }, 404)
}

// ============================================================
// HANDLERS
// ============================================================

async function handleAuth(request) {
  var body
  try {
    body = await request.json()
  } catch (e) {
    return jsonRes({ error: 'Invalid JSON body' }, 400)
  }

  var token = body.token
  if (!token || typeof token !== 'string' || token.length < 16) {
    return jsonRes({ error: 'Token must be a string of at least 16 characters' }, 400)
  }

  // Check if token already exists
  var existing = await RXBURN_KV.get('user:' + token)
  if (existing !== null) {
    return jsonRes({ status: 'verified', message: 'Token is valid.' }, 200)
  }

  // Register new token
  var userData = {
    created: new Date().toISOString(),
    units: []
  }
  await RXBURN_KV.put('user:' + token, JSON.stringify(userData))
  return jsonRes({ status: 'registered', message: 'Token registered.' }, 201)
}

async function handleGetUnits(token) {
  var raw = await RXBURN_KV.get('user:' + token)
  var data = JSON.parse(raw)
  return jsonRes({ units: data.units || [] }, 200)
}

async function handlePutUnits(token, request) {
  var body
  try {
    body = await request.json()
  } catch (e) {
    return jsonRes({ error: 'Invalid JSON body' }, 400)
  }

  if (!Array.isArray(body.units)) {
    return jsonRes({ error: 'Body must contain a "units" array' }, 400)
  }

  // Validate units (basic sanity checks)
  for (var i = 0; i < body.units.length; i++) {
    var u = body.units[i]
    if (!u.name || typeof u.lat !== 'number' || typeof u.lon !== 'number') {
      return jsonRes({ error: 'Unit at index ' + i + ' is missing required fields (name, lat, lon)' }, 400)
    }
  }

  // Update KV
  var raw = await RXBURN_KV.get('user:' + token)
  var data = JSON.parse(raw)
  data.units = body.units
  data.lastSync = new Date().toISOString()
  await RXBURN_KV.put('user:' + token, JSON.stringify(data))

  return jsonRes({ status: 'saved', count: body.units.length, lastSync: data.lastSync }, 200)
}

// ============================================================
// HELPERS
// ============================================================

function getToken(request) {
  var auth = request.headers.get('Authorization') || ''
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }
  return null
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }
}

function jsonRes(data, status) {
  var headers = corsHeaders()
  headers['Content-Type'] = 'application/json'
  return new Response(JSON.stringify(data), { status: status, headers: headers })
}
