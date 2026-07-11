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
    return { decision: 'deny', deny_code: 'POLICY_SIGNATURE_INVALID', simulated: true, governed: false, source: 'mock-pdp' };
  }

  if (tool === 'execute_shell' || tool === 'exec') {
    return { decision: 'deny', deny_code: 'HIGH_BLAST', simulated: true, governed: false, source: 'mock-pdp' };
  }

  return {
    decision: 'allow',
    simulated: true,
    governed: false,
    source: 'mock-pdp',
    passport: {
      status: 'issued',
      passport_id: 'pass-mock-openclaw-read-file',
      schema_id: 'passport.schema.coding.prod_change.v1',
      decision_sku: 'openclaw.trusted_mode.authorize.v1',
      tenant_id: 'mock-tenant',
      authority: { authorized_action: request.tool_name || 'read_file' },
      scope: {
        target: request.params?.path || 'read_file',
        environment: 'dev',
      },
      expires_at: '2999-01-01T00:00:00Z',
      revocation_status: 'not_revoked',
      proof: { signature_status: 'mock' },
      verify_contract: { failure_behavior: 'refuse' },
    },
  };
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
  console.log('SIMULATED ONLY: this mock PDP is not the licensed dexgate SDE runtime and does not produce governed evidence.');
});
