const http = require('http');

const PORT = process.env.PDP_PORT ? Number(process.env.PDP_PORT) : 8001;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function decide(payload) {
  const variant = payload?.policy_variant || '';
  const tool = payload?.inputs?.action_request?.tool_name || '';

  if (variant.includes('malformed')) {
    return { malformed: true };
  }

  if (variant.includes('invalid')) {
    return { decision: 'deny', deny_code: 'POLICY_SIGNATURE_INVALID' };
  }

  if (tool === 'execute_shell') {
    return { decision: 'deny', deny_code: 'HIGH_BLAST' };
  }

  return { decision: 'allow' };
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/authorize') {
    return sendJson(res, 404, { error: 'not_found' });
  }

  let buf = '';
  req.on('data', (chunk) => {
    buf += chunk;
  });
  req.on('end', () => {
    try {
      const payload = buf ? JSON.parse(buf) : {};
      const out = decide(payload);
      return sendJson(res, 200, out);
    } catch (err) {
      return sendJson(res, 400, { error: 'bad_request' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mock PDP listening on http://localhost:${PORT}/v1/authorize`);
});
