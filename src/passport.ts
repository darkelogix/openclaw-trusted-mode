export type PassportValidation = {
  ok: boolean;
  error?: string;
};

function getField(record: Record<string, any> | undefined, snakeName: string, camelName?: string): any {
  if (!record || typeof record !== 'object') return undefined;
  if (record[snakeName] !== undefined) return record[snakeName];
  return camelName ? record[camelName] : undefined;
}

function isAuthorizingDecision(decision: unknown): boolean {
  return decision === 'allow' || decision === 'constrain';
}

function isMonitorModeBypass(body: any): boolean {
  return body?.enforcement_mode === 'monitor' && body?.enforcement_bypassed === true;
}

export function hasPdpAuthToken(pdpAuthToken?: string): boolean {
  return typeof pdpAuthToken === 'string' && pdpAuthToken.trim().length > 0;
}

export function validatePdpPassport(body: any): PassportValidation {
  if (!isAuthorizingDecision(body?.decision)) return { ok: true };
  if (isMonitorModeBypass(body)) return { ok: true };

  const passport = body?.passport;
  if (!passport || typeof passport !== 'object') {
    return { ok: false, error: 'PDP allow/constrain response did not include a passport' };
  }

  const status = getField(passport, 'status');
  const passportId = getField(passport, 'passport_id', 'passportId');
  const schemaId = getField(passport, 'schema_id', 'schemaId');
  const expiresAt = getField(passport, 'expires_at', 'expiresAt');
  const revocationStatus = getField(passport, 'revocation_status', 'revocationStatus');
  const proof = getField(passport, 'proof');
  const verifyContract = getField(passport, 'verify_contract', 'verifyContract');
  const scope = getField(passport, 'scope');
  const authority = getField(passport, 'authority');

  if (status !== 'issued') return { ok: false, error: `passport status is ${status || 'missing'}` };
  if (!passportId) return { ok: false, error: 'passport_id is missing' };
  if (schemaId !== 'passport.schema.coding.prod_change.v1') {
    return { ok: false, error: `unexpected passport schema_id ${schemaId || 'missing'}` };
  }
  if (!authority?.authorized_action && !authority?.authorizedAction) {
    return { ok: false, error: 'passport authority authorized_action is missing' };
  }
  if (!scope?.target) return { ok: false, error: 'passport scope.target is missing' };
  if (!scope?.environment) return { ok: false, error: 'passport scope.environment is missing' };
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) {
    return { ok: false, error: 'passport expires_at is missing or invalid' };
  }
  if (Date.parse(expiresAt) <= Date.now()) return { ok: false, error: 'passport is expired' };
  if (revocationStatus && revocationStatus !== 'not_revoked') {
    return { ok: false, error: `passport revocation_status is ${revocationStatus}` };
  }
  if (!proof || typeof proof !== 'object' || !proof.signature_status) {
    return { ok: false, error: 'passport proof.signature_status is missing' };
  }
  if (verifyContract?.failure_behavior && verifyContract.failure_behavior !== 'refuse') {
    return { ok: false, error: 'passport verify_contract failure_behavior must be refuse' };
  }

  return { ok: true };
}
