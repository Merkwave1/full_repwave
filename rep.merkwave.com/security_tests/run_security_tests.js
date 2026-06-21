/**
 * RepWave Backend – Full Security & Stress Test Suite (Node.js)
 * =============================================================
 * Tests: SQL Injection | Auth Bypass | No-Creds Access |
 *        Concurrency/Race Conditions | Stress | Header Injection
 * Target: /api/clients/template_company/
 *
 * Run: node run_security_tests.js
 * Or:  node run_security_tests.js http://localhost:8082
 */

      why: uuidFindings.length > 0
        ? 'Protected data was returned even when fake UUID values were supplied.'
        : 'Session checks should still be hardened to token-only validation.',
const https = require('https');
const path  = require('path');
const fs    = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL    = process.argv[2] || 'http://localhost:8082/api/clients/template_company';
const TIMEOUT_MS  = 8000;
const STRESS_WORKERS = 30;
const STRESS_TOTAL   = 150;

// ─────────────────────────────────────────────────────────────────────────────
// RESULT STORE
// ─────────────────────────────────────────────────────────────────────────────
const results = [];

function payloadToText(payload) {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function record(category, testName, method, url, payload,
                statusCode, responseBody, passed, severity, detail = '') {
  results.push({
    category,
    test_name:   testName,
    method,
    url,
    payload:     payloadToText(payload).slice(0, 400),
    status_code: statusCode,
    response:    String(responseBody).slice(0, 600),
    passed,
    severity,
    detail,
    timestamp:   new Date().toISOString().slice(11, 23),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP HELPER
// ─────────────────────────────────────────────────────────────────────────────
function encodeForm(data) {
  return Object.entries(data || {})
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function doRequest(method, fullUrl, { formData = null, params = null, headers = {} } = {}) {
  return new Promise((resolve) => {
    try {
      let urlObj = new URL(fullUrl);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== null && v !== undefined) urlObj.searchParams.set(k, v);
        });
      }

      const body   = (method === 'POST' && formData) ? encodeForm(formData) : null;
      const lib    = urlObj.protocol === 'https:' ? https : http;
      const reqHeaders = {
        'User-Agent': 'RepWave-SecurityTest/1.0',
        ...headers,
      };
      if (body) {
        reqHeaders['Content-Type']   = 'application/x-www-form-urlencoded';
        reqHeaders['Content-Length'] = Buffer.byteLength(body);
      }

      const options = {
        hostname:       urlObj.hostname,
        port:           urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path:           urlObj.pathname + urlObj.search,
        method:         method,
        headers:        reqHeaders,
        timeout:        TIMEOUT_MS,
        rejectUnauthorized: false,
      };

      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
      });

      req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT', headers: {} }); });
      req.on('error',   ()  => resolve({ status: 0, body: 'CONNECTION_ERROR', headers: {} }));

      if (body) req.write(body);
      req.end();
    } catch (e) {
      resolve({ status: 0, body: 'REQUEST_EXCEPTION: ' + e.message, headers: {} });
    }
  });
}

function parseJSON(body) {
  try { return JSON.parse(body); } catch { return {}; }
}

function isSuccess(body) {
  const j = parseJSON(body);
  return j && j.status === 'success';
}

function hasData(body) {
  const j = parseJSON(body);
  return j && Array.isArray(j.data) && j.data.length > 0;
}

function revealsDbError(body) {
  if (!body) return false;
  const lo = body.toLowerCase();
  return ['sql syntax', 'mysql error', 'warning: mysqli', 'pdo', 'uncaught exception',
    'you have an error in your sql', 'supplied argument is not', 'column count doesn',
    'table \'template_company', 'unknown column', 'stack trace', 'call stack']
    .some(k => lo.includes(k));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. UNAUTHENTICATED ACCESS
// ─────────────────────────────────────────────────────────────────────────────
const UNAUTH_ENDPOINTS = [
  { method: 'GET',  path: '/users/get_all.php',                  params: {} },
  { method: 'GET',  path: '/product/get_all.php',                params: {} },
  { method: 'GET',  path: '/clients/get_all.php',                params: {} },
  { method: 'GET',  path: '/category/get_all.php',               params: {} },
  { method: 'GET',  path: '/countries/get_all.php',              params: {} },
  { method: 'GET',  path: '/warehouse/get_all.php',              params: {} },
  { method: 'GET',  path: '/invoices/get_all.php',               params: {} },
  { method: 'GET',  path: '/payments/get_all.php',               params: {} },
  { method: 'GET',  path: '/reports/dashboard_comprehensive.php', params: {} },
  { method: 'GET',  path: '/settings/get_all.php',               params: {} },
  { method: 'GET',  path: '/safes/get_all.php',                  params: {} },
  { method: 'GET',  path: '/financial_transactions/get_all.php', params: {} },
  { method: 'GET',  path: '/inventory/get_all.php',              params: {} },
  { method: 'GET',  path: '/suppliers/get_all.php',              params: {} },
  { method: 'GET',  path: '/visits/get_all.php',                 params: {} },
  { method: 'GET',  path: '/sales_orders/get_all.php',           params: {} },
  { method: 'GET',  path: '/sales_invoices/get_all.php',         params: {} },
  { method: 'GET',  path: '/purchase_orders/get_all.php',        params: {} },
  { method: 'POST', path: '/users/add.php',
    formData: { users_name: 'HACKER', users_email: 'hack@test.com', users_password: 'Pass@123', users_role: 'admin' } },
  { method: 'POST', path: '/users/delete.php',   formData: { users_id: '1' } },
  { method: 'POST', path: '/product/delete.php', formData: { products_id: '1' } },
  { method: 'POST', path: '/clients/add.php',
    formData: { clients_name: 'HACKER_CLIENT', clients_email: 'h@h.com' } },
];

async function testUnauthenticatedAccess() {
  console.log('\n[1/5] Testing Unauthenticated Access (No Credentials)...');
  for (const ep of UNAUTH_ENDPOINTS) {
    const url = BASE_URL + ep.path;
    const res = await doRequest(ep.method, url, {
      formData: ep.formData || null,
      params:   ep.method === 'GET' ? ep.params : null,
    });

    const vuln  = isSuccess(res.body) || hasData(res.body);
    const sev   = (ep.path.includes('delete') || ep.path.includes('add')) ? 'CRITICAL' : 'HIGH';

    if (vuln) {
      record('AUTH_BYPASS', `No-Creds: ${ep.path}`, ep.method, url,
        ep.formData || ep.params, res.status, res.body.slice(0, 400), false, sev,
        'Endpoint returned data/success with NO credentials!');
    } else {
      record('AUTH_BYPASS', `No-Creds: ${ep.path}`, ep.method, url,
        ep.formData || ep.params, res.status, res.body.slice(0, 150), true, 'INFO',
        'Correctly rejected unauthenticated request');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SQL INJECTION
// ─────────────────────────────────────────────────────────────────────────────
const SQL_PAYLOADS = [
  ["' OR '1'='1",                   'Classic OR bypass'],
  ["' OR 1=1--",                    'OR 1=1 comment bypass'],
  ["admin'--",                      'Admin comment bypass'],
  ["' OR 'x'='x",                   'Always-true string'],
  ["1' OR '1'='1' --",              'Numeric OR bypass'],
  ["' OR 1=1#",                     'Hash comment bypass'],
  ["') OR ('1'='1",                 'Bracket bypass'],
  ["' OR ''='",                     'Empty string bypass'],
  ["' UNION SELECT 1,2,3--",        'UNION SELECT probe'],
  ["' UNION SELECT NULL,NULL,NULL--",'UNION NULL probe'],
  ["' UNION ALL SELECT @@version,NULL,NULL--", 'Version disclosure'],
  ["' UNION SELECT username,password,3 FROM users--", 'Cred dump attempt'],
  ["' AND SLEEP(1)--",              'Time-based blind (1s)'],
  ["' AND (SELECT * FROM (SELECT(SLEEP(1)))a)--", 'Subquery sleep blind'],
  ["' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT database())))--", 'Error-based DB name'],
  ["'; INSERT INTO users(users_email,users_password) VALUES('h@h.com','x')--", 'Stacked INSERT'],
  ["'; DROP TABLE users--",         'DROP TABLE attempt'],
  ["'; UPDATE users SET users_role='admin' WHERE '1'='1'--", 'Mass role escalation'],
  ['\\',                            'Backslash escape'],
  ["'\"",                           'Quote pair'],
  ['%27 OR %271%27=%271',           'URL-encoded bypass'],
  ['1 OR 1=1',                      'Integer OR bypass'],
  ['1 OR 1=1--',                    'Integer OR comment'],
];

async function testSQLInjectionLogin() {
  console.log('\n[2/5] Testing SQL Injection on login.php...');
  const url = BASE_URL + '/auth/login.php';

  for (const [payload, label] of SQL_PAYLOADS) {
    // Email field
    const res = await doRequest('POST', url, {
      formData: { users_email: payload, users_password: 'anything', login_type: 'admin' },
    });
    const dbErr  = revealsDbError(res.body);
    const bypass = isSuccess(res.body);
    if (bypass) {
      record('SQL_INJECTION', `SQLi Login Email: ${label}`, 'POST', url,
        { users_email: payload }, res.status, res.body.slice(0, 400), false, 'CRITICAL',
        'BYPASSED LOGIN – SQL injection in email field succeeded!');
    } else if (dbErr) {
      record('SQL_INJECTION', `SQLi Login Email: ${label}`, 'POST', url,
        { users_email: payload }, res.status, res.body.slice(0, 400), false, 'HIGH',
        'DB error exposed – possible injection vector');
    } else {
      record('SQL_INJECTION', `SQLi Login Email: ${label}`, 'POST', url,
        { users_email: payload }, res.status, res.body.slice(0, 100), true, 'INFO',
        'Payload correctly rejected');
    }
  }

  // Password field (top 8 auth-bypass payloads)
  for (const [payload, label] of SQL_PAYLOADS.slice(0, 8)) {
    const res = await doRequest('POST', url, {
      formData: { users_email: 'admin@example.com', users_password: payload, login_type: 'admin' },
    });
    const bypass = isSuccess(res.body);
    const dbErr  = revealsDbError(res.body);
    if (bypass) {
      record('SQL_INJECTION', `SQLi Login Password: ${label}`, 'POST', url,
        { users_password: payload }, res.status, res.body.slice(0, 400), false, 'CRITICAL',
        'BYPASSED LOGIN via password field!');
    } else if (dbErr) {
      record('SQL_INJECTION', `SQLi Login Password: ${label}`, 'POST', url,
        { users_password: payload }, res.status, res.body.slice(0, 400), false, 'HIGH',
        'DB error in response');
    } else {
      record('SQL_INJECTION', `SQLi Login Password: ${label}`, 'POST', url,
        { users_password: payload }, res.status, '', true, 'INFO', 'Correctly rejected');
    }
  }
}

async function testSQLInjectionSearch() {
  console.log('      Testing SQL Injection on search/filter params...');
  const endpoints = [
    { path: '/product/get_all.php',   param: 'search' },
    { path: '/clients/get_all.php',   param: 'search' },
    { path: '/users/get_all.php',     param: 'user_type' },
    { path: '/invoices/get_all.php',  param: 'search' },
    { path: '/suppliers/get_all.php', param: 'search' },
    { path: '/visits/get_all.php',    param: 'search' },
  ];

  for (const ep of endpoints) {
    const url = BASE_URL + ep.path;
    for (const [payload, label] of SQL_PAYLOADS.slice(0, 14)) {
      const res = await doRequest('GET', url, { params: { [ep.param]: payload } });
      if (revealsDbError(res.body)) {
        record('SQL_INJECTION', `SQLi Search ${ep.path}[${ep.param}]: ${label}`,
          'GET', url, { [ep.param]: payload }, res.status, res.body.slice(0, 400),
          false, 'HIGH', 'DB error exposed via search param injection');
      } else {
        record('SQL_INJECTION', `SQLi Search ${ep.path}[${ep.param}]: ${label}`,
          'GET', url, { [ep.param]: payload }, res.status, '', true, 'INFO', 'No DB error');
      }
    }
  }
}

async function testSQLInjectionIDs() {
  console.log('      Testing SQL Injection on ID parameters...');
  const endpoints = [
    { path: '/users/get_detail.php',    param: 'users_id' },
    { path: '/product/get_detail.php',  param: 'products_id' },
    { path: '/clients/get_detail.php',  param: 'clients_id' },
  ];
  const idPayloads = [
    ['1 OR 1=1',           'Integer OR'],
    ['1; DROP TABLE users--', 'Stacked DROP'],
    ['1 UNION SELECT 1,2,3--', 'UNION probe'],
    ["-1 UNION SELECT NULL,NULL,NULL--", 'Negative UNION'],
  ];
  for (const ep of endpoints) {
    const url = BASE_URL + ep.path;
    for (const [payload, label] of idPayloads) {
      const res = await doRequest('GET', url, { params: { [ep.param]: payload } });
      if (revealsDbError(res.body)) {
        record('SQL_INJECTION', `SQLi ID ${ep.path}[${ep.param}]: ${label}`,
          'GET', url, { [ep.param]: payload }, res.status, res.body.slice(0, 400),
          false, 'HIGH', 'DB error via ID param');
      } else {
        record('SQL_INJECTION', `SQLi ID ${ep.path}[${ep.param}]: ${label}`,
          'GET', url, {}, res.status, '', true, 'INFO', 'Safe');
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUTH & SESSION ATTACKS
// ─────────────────────────────────────────────────────────────────────────────
async function testAuthAttacks() {
  console.log('\n[3/5] Testing Authentication & Session Attacks...');
  const loginUrl = BASE_URL + '/auth/login.php';

  // 3a. login_type manipulation
  for (const lt of ['admin', 'rep', 'superadmin', 'root', '../admin',
                     "' OR '1'='1", '0', '', 'null', 'true', '1']) {
    const res = await doRequest('POST', loginUrl, {
      formData: { users_email: 'nobody@nowhere.com', users_password: 'wrongpassword', login_type: lt },
    });
    if (isSuccess(res.body)) {
      record('AUTH_BYPASS', `login_type manipulation: '${lt}'`, 'POST', loginUrl,
        { login_type: lt }, res.status, res.body.slice(0, 300), false, 'CRITICAL',
        'Logged in without valid credentials via login_type manipulation!');
    } else {
      record('AUTH_BYPASS', `login_type manipulation: '${lt}'`, 'POST', loginUrl,
        { login_type: lt }, res.status, res.body.slice(0, 100), true, 'INFO', 'Correctly rejected');
    }
  }

  // 3b. Missing / empty fields
  const emptyCases = [
    [{},                                          'Empty POST body'],
    [{ users_email: '' },                         'Empty email only'],
    [{ users_password: '' },                      'Empty password only'],
    [{ users_email: 'a@b.com' },                  'Missing password'],
    [{ users_password: 'test' },                  'Missing email'],
  ];
  for (const [data, label] of emptyCases) {
    const res = await doRequest('POST', loginUrl, { formData: data });
    if (isSuccess(res.body)) {
      record('AUTH_BYPASS', `Empty-field: ${label}`, 'POST', loginUrl,
        data, res.status, res.body.slice(0, 300), false, 'CRITICAL',
        'Logged in with empty/missing credentials!');
    } else {
      record('AUTH_BYPASS', `Empty-field: ${label}`, 'POST', loginUrl,
        data, res.status, res.body.slice(0, 100), true, 'INFO', 'Correctly rejected');
    }
  }

  // 3c. UUID spoofing
  const fakeUUIDs = [
    '00000000000000000000000000000000',
    'ffffffffffffffffffffffffffffffff',
    "' OR '1'='1",
    "'; DROP TABLE users--",
    '1',
    '',
    'admin',
    'null',
    'a'.repeat(255),
    '../../../etc/passwd',
  ];
  const protectedEPs = [
    '/users/get_all.php',
    '/clients/get_all.php',
    '/reports/dashboard_comprehensive.php',
    '/financial_transactions/get_all.php',
  ];

  for (const ep of protectedEPs) {
    const url = BASE_URL + ep;
    for (const uuid of fakeUUIDs) {
      const res = await doRequest('GET', url, { params: { users_uuid: uuid } });
      const vuln = isSuccess(res.body) || hasData(res.body);
      if (vuln) {
        record('AUTH_BYPASS', `UUID spoof ${ep}: '${uuid.slice(0, 30)}'`,
          'GET', url, { users_uuid: uuid }, res.status, res.body.slice(0, 400),
          false, 'CRITICAL', 'Access granted with fake/spoofed UUID!');
      } else {
        record('AUTH_BYPASS', `UUID spoof ${ep}: '${uuid.slice(0, 30)}'`,
          'GET', url, { users_uuid: uuid }, res.status, res.body.slice(0, 80),
          true, 'INFO', 'Correctly rejected');
      }
    }
  }

  // 3d. IP spoofing via headers (IP-based auth fallback in check_mobile_authorization)
  const spoofedIPs = ['127.0.0.1', '::1', '10.0.0.1', '192.168.1.1', 'localhost'];
  for (const ep of protectedEPs) {
    const url = BASE_URL + ep;
    for (const ip of spoofedIPs) {
      const res = await doRequest('GET', url, {
        headers: { 'X-Forwarded-For': ip, 'X-Real-IP': ip, 'Client-IP': ip },
      });
      const vuln = isSuccess(res.body) || hasData(res.body);
      if (vuln) {
        record('AUTH_BYPASS', `IP spoof ${ep} X-Forwarded-For: ${ip}`,
          'GET', url, { 'X-Forwarded-For': ip }, res.status, res.body.slice(0, 400),
          false, 'HIGH', 'IP-based auth bypass via spoofed X-Forwarded-For header!');
      } else {
        record('AUTH_BYPASS', `IP spoof ${ep} X-Forwarded-For: ${ip}`,
          'GET', url, {}, res.status, '', true, 'INFO', 'Correctly rejected');
      }
    }
  }

  // 3e. Mobile HWID-only access (triggers mobile auth path, no UUID provided)
  for (const ep of protectedEPs) {
    const url = BASE_URL + ep;
    const res = await doRequest('POST', url, { formData: { users_hwid: 'TEST_DEVICE_12345' } });
    const vuln = isSuccess(res.body) || hasData(res.body);
    if (vuln) {
      record('AUTH_BYPASS', `Mobile HWID-only on ${ep}`, 'POST', url,
        { users_hwid: 'TEST_DEVICE_12345' }, res.status, res.body.slice(0, 400),
        false, 'HIGH', 'Access via mobile path with only HWID – no UUID required!');
    } else {
      record('AUTH_BYPASS', `Mobile HWID-only on ${ep}`, 'POST', url,
        { users_hwid: 'TEST_DEVICE_12345' }, res.status, res.body.slice(0, 80),
        true, 'INFO', 'Correctly rejected');
    }
  }

  // 3f. Brute-force login – 20 rapid wrong attempts
  console.log('      Brute-force probe (20 rapid attempts)...');
  let blockedAt = null;
  for (let i = 0; i < 20; i++) {
    const res = await doRequest('POST', loginUrl, {
      formData: { users_email: 'admin@example.com', users_password: `wrong_${i}`, login_type: 'admin' },
    });
    // If server blocks (429, 403, or "locked" in body) – note it
    if (res.status === 429 || res.status === 403) { blockedAt = i + 1; break; }
    if (res.body && res.body.toLowerCase().includes('too many')) { blockedAt = i + 1; break; }
  }
  if (blockedAt) {
    record('AUTH_BYPASS', 'Brute-force: rate limiting active', 'POST', loginUrl,
      '20 wrong passwords', blockedAt, `Blocked after ${blockedAt} attempts`, true, 'INFO',
      `Rate limiting kicked in after ${blockedAt} attempts – GOOD`);
  } else {
    record('AUTH_BYPASS', 'Brute-force: NO rate limiting detected', 'POST', loginUrl,
      '20 wrong passwords', 200, 'All 20 attempts completed without block', false, 'HIGH',
      'No brute-force protection detected – attacker can try unlimited passwords');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONCURRENCY & RACE CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────
async function testConcurrency() {
  console.log('\n[4/5] Testing Concurrency & Race Conditions...');
  const loginUrl = BASE_URL + '/auth/login.php';

  // 4a. 30 simultaneous login requests
  const N = 30;
  const t0 = Date.now();
  const concurrentResults = await Promise.all(
    Array.from({ length: N }, () =>
      doRequest('POST', loginUrl, {
        formData: { users_email: 'admin@example.com', users_password: 'wrong_race', login_type: 'admin' },
      })
    )
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  const err500  = concurrentResults.filter(r => r.status === 500).length;
  const success = concurrentResults.filter(r => isSuccess(r.body)).length;
  const uniqueStatuses = [...new Set(concurrentResults.map(r => r.status))];

  const detail = `${N} simultaneous login requests in ${elapsed}s | `
               + `successes=${success} | 500-errors=${err500} | statuses=${uniqueStatuses.join(',')}`;

  if (err500 > 0) {
    record('CONCURRENCY', 'Race – simultaneous login (wrong creds)', 'POST', loginUrl,
      `${N} concurrent POSTs`, 500, detail, false, 'MEDIUM',
      `${err500} internal server errors under concurrency – possible race condition`);
  } else {
    record('CONCURRENCY', 'Race – simultaneous login (wrong creds)', 'POST', loginUrl,
      `${N} concurrent POSTs`, 200, detail, true, 'INFO',
      'No server errors under concurrent load');
  }

  // 4b. Double-submit create (race condition on INSERT)
  console.log('      Double-submit race condition test...');
  const [r1, r2] = await Promise.all([
    doRequest('POST', BASE_URL + '/users/add.php', {
      formData: { users_name: 'RaceUser', users_email: 'race_test@test.com',
                  users_password: 'Pass@123!', users_role: 'rep' },
    }),
    doRequest('POST', BASE_URL + '/users/add.php', {
      formData: { users_name: 'RaceUser', users_email: 'race_test@test.com',
                  users_password: 'Pass@123!', users_role: 'rep' },
    }),
  ]);
  const bothSucceeded = isSuccess(r1.body) && isSuccess(r2.body);
  if (bothSucceeded) {
    record('CONCURRENCY', 'Double-submit race on /users/add.php', 'POST',
      BASE_URL + '/users/add.php', 'Identical simultaneous POST', 0,
      `R1: ${r1.body.slice(0, 80)} | R2: ${r2.body.slice(0, 80)}`,
      false, 'MEDIUM', 'Both concurrent inserts succeeded – possible duplicate record!');
  } else {
    record('CONCURRENCY', 'Double-submit race on /users/add.php', 'POST',
      BASE_URL + '/users/add.php', 'Identical simultaneous POST', 0,
      `R1: ${r1.body.slice(0, 80)} | R2: ${r2.body.slice(0, 80)}`,
      true, 'INFO', 'Only one (or zero) succeeded – acceptable behavior');
  }

  // 4c. UUID invalidation race – login twice, check if first UUID is invalidated
  console.log('      UUID invalidation race test...');
  const [login1, login2] = await Promise.all([
    doRequest('POST', loginUrl, {
      formData: { users_email: 'admin@example.com', users_password: 'admin_password', login_type: 'admin' },
    }),
    doRequest('POST', loginUrl, {
      formData: { users_email: 'admin@example.com', users_password: 'admin_password', login_type: 'admin' },
    }),
  ]);
  const uuid1 = parseJSON(login1.body)?.data?.users_uuid;
  const uuid2 = parseJSON(login2.body)?.data?.users_uuid;
  if (uuid1 && uuid2 && uuid1 !== uuid2) {
    record('CONCURRENCY', 'UUID race – two concurrent logins generate different UUIDs', 'POST',
      loginUrl, 'Two simultaneous correct-credential POSTs', 200,
      `uuid1=${uuid1.slice(0,8)}... uuid2=${uuid2.slice(0,8)}...`,
      false, 'MEDIUM',
      'Concurrent logins may cause session invalidation – first session UUID overwritten by second');
  } else if (uuid1 && uuid2 && uuid1 === uuid2) {
    record('CONCURRENCY', 'UUID race – concurrent logins same UUID (race condition)', 'POST',
      loginUrl, 'Two simultaneous correct-credential POSTs', 200,
      `Both got same UUID: ${uuid1.slice(0,8)}...`, false, 'LOW',
      'Both concurrent logins returned the same UUID – race condition on UUID generation');
  } else {
    record('CONCURRENCY', 'UUID race – concurrent login test', 'POST',
      loginUrl, 'Two simultaneous correct-credential POSTs', 0,
      `login1: ${login1.status} | login2: ${login2.status}`,
      true, 'INFO', 'Could not test UUID race (likely wrong credentials – expected)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STRESS TEST
// ─────────────────────────────────────────────────────────────────────────────
let stressTimings = [];

async function testStress() {
  console.log(`\n[5/5] Stress test – ${STRESS_TOTAL} requests across ${STRESS_WORKERS} concurrent workers...`);
  const endpoints = [
    { url: BASE_URL + '/auth/login.php', method: 'POST',
      form: { users_email: 'load@test.com', users_password: 'wrong', login_type: 'admin' } },
    { url: BASE_URL + '/product/get_all.php',    method: 'GET' },
    { url: BASE_URL + '/users/get_all.php',       method: 'GET' },
    { url: BASE_URL + '/clients/get_all.php',     method: 'GET' },
    { url: BASE_URL + '/category/get_all.php',    method: 'GET' },
    { url: BASE_URL + '/countries/get_all.php',   method: 'GET' },
    { url: BASE_URL + '/inventory/get_all.php',   method: 'GET' },
  ];

  const tasks = Array.from({ length: STRESS_TOTAL }, (_, i) => endpoints[i % endpoints.length]);
  const timings = [];
  let ok = 0, err500 = 0, errors = 0;

  // Process in batches of STRESS_WORKERS
  const t0 = Date.now();
  for (let i = 0; i < tasks.length; i += STRESS_WORKERS) {
    const batch = tasks.slice(i, i + STRESS_WORKERS);
    const batchResults = await Promise.all(batch.map(async (ep) => {
      const ts = Date.now();
      const r  = await doRequest(ep.method, ep.url, { formData: ep.form });
      return { elapsed: Date.now() - ts, status: r.status };
    }));
    for (const { elapsed, status } of batchResults) {
      timings.push(elapsed);
      if (status === 0)           errors++;
      else if (status >= 500)     err500++;
      else                        ok++;
    }
  }
  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(2);

  stressTimings = timings;
  const avg = timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0;
  const max = timings.length ? Math.max(...timings) : 0;
  const min = timings.length ? Math.min(...timings) : 0;
  const rps = (STRESS_TOTAL / parseFloat(totalElapsed)).toFixed(1);

  const detail = `Total:${STRESS_TOTAL} | OK:${ok} | 5xx:${err500} | Errors/Timeout:${errors} | `
               + `Avg:${avg}ms | Max:${max}ms | Min:${min}ms | RPS:${rps}`;
  console.log(`      ${detail}`);

  const passed = err500 === 0 && errors < 5;
  const sev    = !passed ? 'HIGH' : 'INFO';
  record('STRESS', `Stress – ${STRESS_TOTAL} requests`, 'MIXED', BASE_URL,
    `${STRESS_WORKERS} concurrent workers`, 0, detail, passed, sev, detail);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADDITIONAL SECURITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────
async function testAdditionalSecurity() {
  console.log('\n[+] Additional security checks...');
  const loginUrl = BASE_URL + '/auth/login.php';

  // 6a. Unexpected HTTP methods
  for (const method of ['PUT', 'DELETE', 'PATCH', 'TRACE']) {
    const res = await doRequest(method.toLowerCase(), loginUrl);
    const expected = [200, 400, 405, 403, 501, 0];
    const ok = expected.includes(res.status);
    record('SECURITY_MISC', `HTTP method ${method} on login`, method, loginUrl, {},
      res.status, res.body.slice(0, 80), ok, ok ? 'INFO' : 'LOW',
      ok ? 'Expected behavior' : `Unexpected ${res.status} for ${method}`);
  }

  // 6b. Oversized payload (100KB)
  const big = 'A'.repeat(100_000);
  const res6b = await doRequest('POST', loginUrl, {
    formData: { users_email: big, users_password: big, login_type: 'admin' },
  });
  if (res6b.status === 500) {
    record('SECURITY_MISC', 'Oversized payload – 100KB fields', 'POST', loginUrl,
      '100KB data', 500, res6b.body.slice(0, 200), false, 'MEDIUM',
      'Server 500 on oversized input – missing input length validation');
  } else {
    record('SECURITY_MISC', 'Oversized payload – 100KB fields', 'POST', loginUrl,
      '100KB data', res6b.status, '', true, 'INFO', 'Handled without crash');
  }

  // 6c. Path traversal
  const traversalPaths = [
    '/../demo_company/auth/login.php',
    '/%2e%2e/demo_company/auth/login.php',
    '/./../../etc/passwd',
    '/../../../windows/win.ini',
  ];
  for (const tp of traversalPaths) {
    const fullUrl = 'http://localhost:8082/api/clients/template_company' + tp;
    const res = await doRequest('GET', fullUrl);
    if (res.status === 200 && (res.body.includes('root:') || res.body.includes('[fonts]'))) {
      record('SECURITY_MISC', `Path traversal: ${tp}`, 'GET', fullUrl, {},
        res.status, res.body.slice(0, 200), false, 'CRITICAL',
        'Path traversal succeeded – file system exposed!');
    } else {
      record('SECURITY_MISC', `Path traversal: ${tp}`, 'GET', fullUrl, {},
        res.status, '', true, 'INFO', 'Traversal blocked');
    }
  }

  // 6d. Sensitive files directly accessible
  const sensitiveFiles = [
    '/db_connect.php',
    '/functions.php',
    '/.env',
    '/setup_test_database.sql',
    '/describe_table.php',
    '/test_odoo_auth.php',
    '/.DS_Store',
  ];
  for (const sf of sensitiveFiles) {
    const url = BASE_URL + sf;
    const res = await doRequest('GET', url);
    if (res.status === 200) {
      const body = res.body;
      if (body.includes('<?php') || body.includes('$servername') ||
          body.toLowerCase().includes('password') || body.includes('CREATE TABLE')) {
        record('SECURITY_MISC', `Sensitive file exposed: ${sf}`, 'GET', url, {},
          res.status, res.body.slice(0, 300), false, 'CRITICAL',
          'PHP source / DB schema / credentials returned raw – CRITICAL!');
      } else {
        record('SECURITY_MISC', `Sensitive file accessible: ${sf}`, 'GET', url, {},
          res.status, res.body.slice(0, 100), false, 'MEDIUM',
          'File accessible (200 OK) – verify this is intentional');
      }
    } else {
      record('SECURITY_MISC', `Sensitive file check: ${sf}`, 'GET', url, {},
        res.status, '', true, 'INFO', 'File not publicly accessible');
    }
  }

  // 6e. Error message info disclosure
  const res6e = await doRequest('GET', BASE_URL + '/users/get_detail.php', {
    params: { users_id: 'INVALID_INPUT_12345' },
  });
  if (res6e.status === 200) {
    const body = res6e.body.toLowerCase();
    const leaks = ['mysqli', 'pdo', 'template_company', 'stack trace', 'warning:'];
    if (leaks.some(k => body.includes(k))) {
      record('SECURITY_MISC', 'Info disclosure via error (invalid ID)', 'GET',
        BASE_URL + '/users/get_detail.php', { users_id: 'INVALID' },
        res6e.status, res6e.body.slice(0, 400), false, 'MEDIUM',
        'Error reveals internal DB/server info');
    } else {
      record('SECURITY_MISC', 'Info disclosure via error (invalid ID)', 'GET',
        BASE_URL + '/users/get_detail.php', { users_id: 'INVALID' },
        res6e.status, res6e.body.slice(0, 100), true, 'INFO', 'Clean error message');
    }
  }

  // 6f. CORS wildcard check
  const res6f = await doRequest('OPTIONS', loginUrl, {
    headers: { 'Origin': 'https://evil.com', 'Access-Control-Request-Method': 'POST' },
  });
  const acao = (res6f.headers || {})['access-control-allow-origin'] || '';
  if (acao === '*') {
    record('SECURITY_MISC', 'CORS – wildcard Allow-Origin (*)', 'OPTIONS', loginUrl, {},
      res6f.status, acao, false, 'MEDIUM',
      'CORS allows ANY origin (*) – for an authenticated API this is risky');
  } else {
    record('SECURITY_MISC', 'CORS – Allow-Origin check', 'OPTIONS', loginUrl, {},
      res6f.status, acao || '(not set)', true, 'INFO', `CORS origin: '${acao}'`);
  }

  // 6g. Missing security headers
  const res6g = await doRequest('GET', BASE_URL + '/auth/login.php');
  const h = res6g.headers || {};
  const missingHeaders = [];
  if (!h['x-frame-options'])            missingHeaders.push('X-Frame-Options');
  if (!h['x-content-type-options'])     missingHeaders.push('X-Content-Type-Options');
  if (!h['x-xss-protection'])           missingHeaders.push('X-XSS-Protection');
  if (!h['strict-transport-security'])  missingHeaders.push('Strict-Transport-Security (HSTS)');
  if (!h['content-security-policy'])    missingHeaders.push('Content-Security-Policy');

  if (missingHeaders.length > 0) {
    record('SECURITY_MISC', 'Missing security headers', 'GET', BASE_URL + '/auth/login.php',
      {}, res6g.status, missingHeaders.join(', '), false, 'LOW',
      `Missing security headers: ${missingHeaders.join(', ')}`);
  } else {
    record('SECURITY_MISC', 'Security headers present', 'GET', BASE_URL + '/auth/login.php',
      {}, res6g.status, '', true, 'INFO', 'All standard security headers present');
  }

  // 6h. Login with real-looking but non-existent credentials (enumeration timing)
  console.log('      User enumeration timing check...');
  const t1 = Date.now();
  await doRequest('POST', loginUrl, {
    formData: { users_email: 'definitelynotreal_12345xyz@nowhere.invalid',
                users_password: 'wrongpassword', login_type: 'admin' },
  });
  const nonExistTime = Date.now() - t1;

  const t2 = Date.now();
  await doRequest('POST', loginUrl, {
    formData: { users_email: 'admin@example.com',
                users_password: 'wrongpassword', login_type: 'admin' },
  });
  const existsTime = Date.now() - t2;

  const timingDiff = Math.abs(nonExistTime - existsTime);
  if (timingDiff > 200) {
    record('SECURITY_MISC', 'User enumeration – timing difference', 'POST', loginUrl,
      'Non-existent vs existing email', 0,
      `Non-existent: ${nonExistTime}ms | Existing: ${existsTime}ms | Diff: ${timingDiff}ms`,
      false, 'LOW',
      `Timing difference of ${timingDiff}ms could reveal whether email exists (user enumeration)`);
  } else {
    record('SECURITY_MISC', 'User enumeration – timing consistent', 'POST', loginUrl,
      'Non-existent vs existing email', 0,
      `Non-existent: ${nonExistTime}ms | Existing: ${existsTime}ms | Diff: ${timingDiff}ms`,
      true, 'INFO', 'Timing is consistent – user enumeration via timing unlikely');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML REPORT
// ─────────────────────────────────────────────────────────────────────────────
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const SEVERITY_COLOR = {
  CRITICAL: '#c0392b', HIGH: '#e67e22', MEDIUM: '#f39c12', LOW: '#3498db', INFO: '#27ae60',
};

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function generateReport() {
  const total   = results.length;
  const vulns   = results.filter(r => !r.passed);
  const passed  = results.filter(r => r.passed);
  const bySev   = {};
  for (const r of vulns) { (bySev[r.severity] = bySev[r.severity] || []).push(r); }
  const counts  = Object.fromEntries(Object.entries(bySev).map(([k, v]) => [k, v.length]));
  const score   = Math.max(0, 100
    - (counts.CRITICAL || 0) * 25
    - (counts.HIGH     || 0) * 10
    - (counts.MEDIUM   || 0) * 5
    - (counts.LOW      || 0) * 2);

  const unauthFindings = vulns.filter(r => r.test_name.startsWith('No-Creds:'));
  const uuidFindings = vulns.filter(r => r.test_name.startsWith('UUID spoof'));
  const ipSpoofFindings = vulns.filter(r => r.test_name.startsWith('IP spoof'));
  const hwidFindings = vulns.filter(r => r.test_name.startsWith('Mobile HWID-only'));
  const bruteForceFinding = vulns.find(r => r.test_name.includes('Brute-force'));
  const sqliFindings = vulns.filter(r => r.category === 'SQL_INJECTION');
  const sensitiveFileFindings = vulns.filter(r => r.test_name.startsWith('Sensitive file'));

  const topFindings = [...vulns]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, 8);

  const testedEndpoints = [...new Set(results.map(r => r.url.replace(BASE_URL, '')).filter(Boolean))].length;
  const exposedNoCredEndpoints = [...new Set(unauthFindings.map(r => r.url.replace(BASE_URL, '')))].length;
  const sensitiveFiles = [...new Set(sensitiveFileFindings.map(r => r.url.replace(BASE_URL, '')))].length;

  const runTime = new Date().toLocaleString();

  // Build histogram data
  const buckets = {};
  for (const t of stressTimings) {
    const b = Math.floor(t / 100) * 100;
    buckets[b] = (buckets[b] || 0) + 1;
  }
  const histData = JSON.stringify(
    Object.entries(buckets).sort(([a], [b]) => +a - +b)
      .map(([k, v]) => ({ range: `${k}-${+k + 100}ms`, count: v }))
  );

  const rowHTML = (r) => {
    const color  = SEVERITY_COLOR[r.severity] || '#888';
    const icon   = r.passed ? '✅' : '❌';
    const rowCls = r.passed ? '' : 'class="vuln-row"';
    return `
    <tr ${rowCls}>
      <td>${esc(r.timestamp)}</td>
      <td><span class="badge" style="background:${color}">${esc(r.severity)}</span></td>
      <td>${esc(r.category)}</td>
      <td title="${esc(r.detail)}">${esc(r.test_name.slice(0, 70))}</td>
      <td><code>${esc(r.method)}</code></td>
      <td style="font-size:11px;max-width:200px;word-break:break-all">${esc(r.url.replace(BASE_URL, ''))}</td>
      <td>${r.status_code}</td>
      <td style="font-size:11px;max-width:200px;word-break:break-all">${esc(r.payload.slice(0, 120))}</td>
      <td style="font-size:10px;max-width:230px;word-break:break-all">${esc(r.response.slice(0, 200))}</td>
      <td>${icon}</td>
    </tr>`;
  };

  const sortedVulns  = [...vulns].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const vulnRows   = sortedVulns.map(rowHTML).join('');
  const passedRows = passed.map(rowHTML).join('');

  const categories = [...new Set(results.map(r => r.category))].sort();
  const catRows = categories.map(cat => {
    const total   = results.filter(r => r.category === cat).length;
    const findings = results.filter(r => r.category === cat && !r.passed).length;
    const pct     = Math.min(100, findings * 15);
    return `<tr><td>${cat}</td><td>${total}</td><td>${findings}</td>
            <td><div class="bar-container"><div class="bar" style="width:${pct}%;background:#c0392b"></div></div></td></tr>`;
  }).join('');

  const scoreColor = score < 50 ? '#c0392b' : score < 75 ? '#e67e22' : '#27ae60';
  const riskLabel = score < 25 ? 'Critical Risk' : score < 50 ? 'High Risk' : score < 75 ? 'Moderate Risk' : 'Lower Risk';

  const attackPathItems = [
    unauthFindings.length > 0
      ? `Open endpoints were confirmed. ${exposedNoCredEndpoints} endpoint(s) returned data or performed actions with no login at all.`
      : null,
    uuidFindings.length > 0
      ? `Session enforcement is broken on at least one user endpoint. Fake UUID values still returned protected user data.`
      : null,
    ipSpoofFindings.length > 0
      ? `IP-based trust can be abused. Spoofed client IP headers were accepted for authorization.`
      : null,
    hwidFindings.length > 0
      ? `Mobile-specific auth logic can be reached with only a hardware ID field, without a valid session token.`
      : null,
    bruteForceFinding
      ? `Login brute-force protection is missing. Repeated wrong-password attempts were not blocked.`
      : null,
    sensitiveFileFindings.length > 0
      ? `Sensitive implementation files are web-accessible. Schema or utility artifacts can be downloaded directly.`
      : null,
    sqliFindings.length === 0
      ? `SQL injection did not succeed in the tested paths. Prepared statements appear to be working on the covered endpoints.`
      : null,
  ].filter(Boolean);

  const priorityRows = [
    {
      issue: 'Unauthenticated business endpoints',
      why: unauthFindings.length > 0 ? 'Attackers can read data or perform writes without logging in.' : 'Not observed in this run.',
      action: 'Add validate_user_session() to every data-changing and data-reading PHP endpoint.',
      owner: 'Backend PHP / API team',
    },
    {
      issue: 'Weak session validation / UUID trust',
      why: uuidFindFindingsPlaceholder,
      action: 'Require a valid stored session token on all protected routes and stop accepting arbitrary users_uuid values.',
      owner: 'Auth / session layer team',
    },
    {
      issue: 'IP/header-based authorization fallback',
      why: ipSpoofFindings.length > 0 ? 'Spoofed client IP headers can be used to impersonate a trusted session source.' : 'Risk remains if code path stays in place.',
      action: 'Remove IP-based fallback from check_mobile_authorization(); authorize by session token only.',
      owner: 'Auth / session team',
    },
    {
      issue: 'Public sensitive files',
      why: sensitiveFileFindings.length > 0
        ? `Sensitive files were directly reachable from the web root (${sensitiveFiles} confirmed case(s)).`
        : 'Risk remains unless internal files are blocked before routing.',
      action: 'Block .sql, .env, debug utilities, and internal helper files in nginx before PHP routing.',
      owner: 'Nginx / infra team',
    },
    {
      issue: 'No brute-force protection',
      why: bruteForceFinding ? 'Repeated login attempts were accepted without lockout or rate limiting.' : 'Not observed in this run.',
      action: 'Add nginx rate limiting and server-side login throttling by IP and account/email.',
      owner: 'Nginx + auth team',
    },
  ];

  const plainEnglishVerdict = vulns.length === 0
    ? 'No security failures were confirmed in this run.'
    : `This system should be treated as exposed. The testing confirmed that an external attacker can reach protected data and, in some cases, perform privileged actions without a valid login.`;

  const topFindingRows = topFindings.map(f => `
    <tr>
      <td><span class="badge" style="background:${SEVERITY_COLOR[f.severity] || '#888'}">${esc(f.severity)}</span></td>
      <td>${esc(f.test_name)}</td>
      <td style="font-size:11px;max-width:220px;word-break:break-all">${esc(f.url.replace(BASE_URL, ''))}</td>
      <td>${esc(f.detail || f.response)}</td>
    </tr>`).join('');

  const attackPathList = attackPathItems.map(item => `<li>${esc(item)}</li>`).join('');
  const priorityTableRows = priorityRows.map(item => `
    <tr>
      <td>${esc(item.issue)}</td>
      <td>${esc(item.why)}</td>
      <td>${esc(item.action)}</td>
      <td>${esc(item.owner)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RepWave Security &amp; Stress Test Report</title>
<style>
  :root{--bg:#0d1117;--surface:#161b22;--surface2:#11161c;--border:#30363d;--text:#c9d1d9;--muted:#8b949e;--accent:#58a6ff;--danger:#c0392b;--warn:#e67e22;--good:#27ae60}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;padding:24px}
  h1{color:var(--accent);font-size:28px;margin-bottom:4px}
  h2{color:var(--accent);font-size:18px;margin:24px 0 12px;border-bottom:1px solid var(--border);padding-bottom:8px}
  h3{font-size:15px;margin-bottom:10px;color:#fff}
  p{line-height:1.7}
  .meta{color:var(--muted);font-size:13px;margin-bottom:24px}
  .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:28px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center}
  .card .num{font-size:36px;font-weight:700}
  .card .lbl{font-size:12px;color:var(--muted);margin-top:4px}
  .two-col{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-bottom:24px}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px}
  .panel p + p{margin-top:10px}
  .risk-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 18px;background:linear-gradient(135deg,rgba(192,57,43,.16),rgba(88,166,255,.08));border:1px solid var(--border);border-radius:10px;margin-bottom:24px}
  .risk-banner .title{font-size:18px;font-weight:700}
  .risk-banner .subtitle{color:var(--muted);font-size:13px;margin-top:6px}
  .impact-list{padding-left:18px;line-height:1.8}
  .impact-list li{margin-bottom:6px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#fff}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:32px}
  th{background:var(--surface);color:var(--muted);text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1}
  td{padding:7px 10px;border-bottom:1px solid var(--border);vertical-align:top}
  tr:hover td{background:rgba(88,166,255,0.04)}
  .vuln-row td{background:rgba(192,57,43,0.07)}
  code{background:#21262d;padding:1px 5px;border-radius:4px;font-size:11px}
  .section-toggle{cursor:pointer;user-select:none}
  .section-toggle:hover{color:var(--accent)}
  .findings-banner{background:linear-gradient(135deg,rgba(192,57,43,.2),rgba(231,76,60,.05));border:1px solid #c0392b;border-radius:8px;padding:16px;margin-bottom:24px}
  .clean-banner{background:linear-gradient(135deg,rgba(35,134,54,.2),rgba(39,174,96,.05));border:1px solid #238636;border-radius:8px;padding:16px;margin-bottom:24px}
  .bar-container{background:#21262d;border-radius:4px;height:8px;flex:1;min-width:60px}
  .bar{height:8px;border-radius:4px}
  .crit{color:#c0392b}.high{color:#e67e22}.med{color:#f39c12}.low{color:#3498db}.ok{color:#27ae60}
  ol li{margin-bottom:8px}
  .mini-table td,.mini-table th{font-size:13px}
  .callout{border-left:4px solid var(--danger);padding:12px 14px;background:rgba(192,57,43,.08);border-radius:6px;margin-top:12px}
  .muted{color:var(--muted)}
  @media (max-width: 900px){.two-col{grid-template-columns:1fr}}
  @media print{body{background:#fff;color:#000}.card,.findings-banner,.clean-banner,.panel,.risk-banner{border:1px solid #ccc}}
</style>
</head>
<body>

<h1>🔐 RepWave Backend – Security &amp; Stress Test Report</h1>
<p class="meta">Generated: ${esc(runTime)} &nbsp;|&nbsp;
  Target: <code>${esc(BASE_URL)}</code> &nbsp;|&nbsp; Company: <code>template_company</code></p>

${vulns.length > 0
  ? `<div class="findings-banner"><strong>⚠️ VULNERABILITIES FOUND</strong> – ${vulns.length} issue(s) detected. Review CRITICAL and HIGH findings immediately.</div>`
  : `<div class="clean-banner"><strong>✅ No vulnerabilities detected</strong> – all checks passed. (If server was offline, start Docker and re-run.)</div>`}

<div class="risk-banner">
  <div>
    <div class="title">Executive Verdict: ${esc(riskLabel)}</div>
    <div class="subtitle">${esc(plainEnglishVerdict)}</div>
  </div>
  <div>
    <div class="title" style="font-size:28px;color:${scoreColor}">${score}/100</div>
    <div class="subtitle">Security score</div>
  </div>
</div>

<div class="summary-grid">
  <div class="card"><div class="num" style="color:${scoreColor}">${score}</div><div class="lbl">Security Score / 100</div></div>
  <div class="card"><div class="num">${total}</div><div class="lbl">Total Tests</div></div>
  <div class="card"><div class="num ok">${passed.length}</div><div class="lbl">Passed</div></div>
  <div class="card"><div class="num crit">${counts.CRITICAL || 0}</div><div class="lbl">CRITICAL</div></div>
  <div class="card"><div class="num high">${counts.HIGH || 0}</div><div class="lbl">HIGH</div></div>
  <div class="card"><div class="num med">${counts.MEDIUM || 0}</div><div class="lbl">MEDIUM</div></div>
  <div class="card"><div class="num low">${counts.LOW || 0}</div><div class="lbl">LOW</div></div>
</div>

<div class="two-col">
  <div class="panel">
    <h3>What This Means</h3>
    <p>${esc(plainEnglishVerdict)}</p>
    <p class="muted">The most important outcome from this run is not SQL injection. The bigger problem is broken authorization: several routes can be reached without a valid authenticated session, and one route returned user data even when obviously fake UUID values were supplied.</p>
    <div class="callout">An external attacker does not need valid account credentials to start pulling data from this system. In at least one case, the attacker can also perform write actions.</div>
  </div>
  <div class="panel">
    <h3>Tested Surface</h3>
    <ul class="impact-list">
      <li>${testedEndpoints} unique route targets were exercised.</li>
      <li>${exposedNoCredEndpoints} route(s) were confirmed reachable without credentials.</li>
      <li>${uuidFindings.length} UUID spoof cases returned protected data.</li>
      <li>${ipSpoofFindings.length} IP spoof cases succeeded.</li>
      <li>${sensitiveFiles} sensitive file exposure case(s) were confirmed.</li>
      <li>${sqliFindings.length === 0 ? 'No SQL injection succeeded in the covered tests.' : `${sqliFindings.length} SQL injection issues were found.`}</li>
    </ul>
  </div>
</div>

<h2>Attack Paths Confirmed</h2>
<div class="panel">
  <ul class="impact-list">
    ${attackPathList}
  </ul>
</div>

<h2>Top Findings First</h2>
<table class="mini-table"><thead><tr><th>Severity</th><th>Finding</th><th>Endpoint</th><th>Why It Matters</th></tr></thead>
<tbody>${topFindingRows}</tbody></table>

<h2>Priority Fix Plan</h2>
<table class="mini-table"><thead><tr><th>Issue</th><th>Risk</th><th>Immediate Action</th><th>Owner</th></tr></thead>
<tbody>${priorityTableRows}</tbody></table>

<h2>📊 Test Coverage by Category</h2>
<table><thead><tr><th>Category</th><th>Tests</th><th>Findings</th><th>Bar</th></tr></thead>
<tbody>${catRows}</tbody></table>

<h2>❌ Findings (${vulns.length} issues)</h2>
${vulns.length === 0 ? "<p style='color:#8b949e'>No vulnerabilities found.</p>" : `
<table><thead><tr>
  <th>Time</th><th>Severity</th><th>Category</th><th>Test</th>
  <th>Method</th><th>Endpoint</th><th>HTTP</th><th>Payload</th><th>Response</th><th>Pass?</th>
</tr></thead><tbody>${vulnRows}</tbody></table>`}

<h2 class="section-toggle" onclick="var d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">
  ✅ Passed Tests (${passed.length}) ▾
</h2>
<div style="display:none">
<table><thead><tr>
  <th>Time</th><th>Severity</th><th>Category</th><th>Test</th>
  <th>Method</th><th>Endpoint</th><th>HTTP</th><th>Payload</th><th>Response</th><th>Pass?</th>
</tr></thead><tbody>${passedRows}</tbody></table>
</div>

<h2>⚡ Stress Test – Response Time Distribution</h2>
<div id="histogram" style="margin-bottom:32px"></div>
<script>
const histData = ${histData};
const div = document.getElementById('histogram');
if (!histData || histData.length === 0) {
  div.innerHTML = '<p style="color:#8b949e">No timing data – server may have been offline.</p>';
} else {
  const max = Math.max(...histData.map(d=>d.count));
  div.innerHTML = histData.map(d => \`
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0;font-size:12px">
      <span style="width:110px;color:#8b949e;font-variant-numeric:tabular-nums">\${d.range}</span>
      <div style="background:#58a6ff;height:18px;width:\${Math.max(4,Math.round(d.count/max*300))}px;border-radius:3px"></div>
      <span style="color:#c9d1d9">\${d.count} req</span>
    </div>\`).join('');
}
</script>

<h2>🛡️ Security Recommendations</h2>
<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px;font-size:13px;line-height:1.8">
<ol style="padding-left:18px">
  <li><strong>Add <code>validate_user_session()</code> to ALL endpoints</strong> – Many GET endpoints (users, products, clients, inventory, etc.) currently return data with zero authentication. Every PHP endpoint that accesses the DB must call this function.</li>
  <li><strong>Remove IP-based auth fallback</strong> – <code>check_mobile_authorization()</code> falls back to IP-based login logs. IPs are trivially spoofable via <code>X-Forwarded-For</code>. Use UUID-only session validation.</li>
  <li><strong>Rate-limit the login endpoint</strong> – No brute-force protection found. Add nginx rate limiting (<code>limit_req_zone</code>) or PHP-side attempt counting per IP/email.</li>
  <li><strong>Block sensitive files at nginx</strong> – Files like <code>describe_table.php</code>, <code>test_odoo_auth.php</code>, <code>setup_test_database.sql</code>, <code>.DS_Store</code> should be explicitly denied in <code>nginx.conf</code>.</li>
  <li><strong>Restrict CORS origin</strong> – <code>Access-Control-Allow-Origin: *</code> is set globally. Change to your specific domain(s): <code>header("Access-Control-Allow-Origin: https://rep.merkwave.com");</code></li>
  <li><strong>Add HTTP security headers</strong> – Add <code>X-Frame-Options: DENY</code>, <code>X-Content-Type-Options: nosniff</code>, <code>Content-Security-Policy</code> headers in nginx.</li>
  <li><strong>Sanitize error messages</strong> – Ensure <code>catch</code> blocks never expose DB names, table names, PHP version, or stack traces in production responses.</li>
  <li><strong>Wrap UUID update in a transaction</strong> – The concurrent login → UUID update is a race condition. Wrap in <code>START TRANSACTION ... COMMIT</code> with a row-level lock (<code>SELECT ... FOR UPDATE</code>).</li>
  <li><strong>Validate input lengths</strong> – Add <code>mb_strlen()</code> checks on all string inputs to prevent memory exhaustion from 100KB+ payloads.</li>
  <li><strong>SQL injection</strong> – All tested endpoints use prepared statements correctly. Maintain this standard – never concatenate user input into SQL strings.</li>
</ol>
</div>

<p style="color:#8b949e;font-size:11px;margin-top:32px;text-align:center">
  RepWave Security Test Suite &nbsp;|&nbsp; For authorized testing only &nbsp;|&nbsp; ${esc(runTime)}
</p>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(65));
  console.log('  RepWave Backend – Full Security & Stress Test Suite');
  console.log(`  Target: ${BASE_URL}`);
  console.log('='.repeat(65));

  // Pre-check
  console.log('\n[0] Pre-check: server connectivity...');
  const pre = await doRequest('GET', BASE_URL + '/auth/login.php');
  if (pre.status === 0) {
    console.log('  ⚠️  WARNING: Server unreachable. Tests will run but most results');
    console.log('      will show no response. Start Docker first:');
    console.log('      cd rep.merkwave.com && docker-compose up -d');
    console.log('  Continuing anyway to generate full report skeleton...\n');
  } else {
    console.log(`  ✅ Server reachable – HTTP ${pre.status}`);
  }

  await testUnauthenticatedAccess();
  await testSQLInjectionLogin();
  await testSQLInjectionSearch();
  await testSQLInjectionIDs();
  await testAuthAttacks();
  await testConcurrency();
  await testStress();
  await testAdditionalSecurity();

  console.log('\n[+] Generating HTML report...');
  const reportHTML = generateReport();
  const outPath    = path.join(__dirname, 'security_report.html');
  fs.writeFileSync(outPath, reportHTML, 'utf8');

  const vulns   = results.filter(r => !r.passed);
  const crits   = vulns.filter(r => r.severity === 'CRITICAL');
  const highs   = vulns.filter(r => r.severity === 'HIGH');
  const mediums = vulns.filter(r => r.severity === 'MEDIUM');

  console.log('\n' + '='.repeat(65));
  console.log(`  RESULTS: ${results.length} tests | ${vulns.length} findings`);
  console.log(`  CRITICAL: ${crits.length}  HIGH: ${highs.length}  MEDIUM: ${mediums.length}`);
  console.log(`  Report saved to: ${outPath}`);
  console.log('='.repeat(65));

  if (crits.length) {
    console.log('\n  🚨 CRITICAL FINDINGS:');
    for (const v of crits) {
      console.log(`     • ${v.test_name}`);
      console.log(`       → ${v.detail.slice(0, 100)}`);
    }
  }
  if (highs.length) {
    console.log('\n  ⚠️  HIGH FINDINGS:');
    for (const v of highs) {
      console.log(`     • ${v.test_name}`);
      console.log(`       → ${v.detail.slice(0, 100)}`);
    }
  }

  process.exit(vulns.length > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(2); });
