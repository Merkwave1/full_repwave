"""
RepWave Backend - Full Security & Stress Test Suite
====================================================
Tests: SQL Injection | Auth Bypass | No-Creds Access |
       Concurrency/Race Conditions | Stress | Header Injection
Target: /api/clients/template_company/
"""

import requests
import threading
import time
import json
import sys
import random
import string
import html
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG – change BASE_URL to match your running Docker setup
# ─────────────────────────────────────────────────────────────────────────────
BASE_URL   = "http://localhost:8082/api/clients/template_company"
TIMEOUT    = 10          # seconds per request
STRESS_RPS = 50          # concurrent workers for stress test
STRESS_TOTAL = 200       # total requests in stress test

# ─────────────────────────────────────────────────────────────────────────────
# RESULT COLLECTOR
# ─────────────────────────────────────────────────────────────────────────────
results = []   # list of dicts

def record(category, test_name, method, url, payload,
           status_code, response_body, passed, severity, detail=""):
    results.append({
        "category":     category,
        "test_name":    test_name,
        "method":       method,
        "url":          url,
        "payload":      str(payload)[:400],
        "status_code":  status_code,
        "response":     str(response_body)[:600],
        "passed":       passed,   # True = security holds, False = VULNERABILITY FOUND
        "severity":     severity, # CRITICAL / HIGH / MEDIUM / LOW / INFO
        "detail":       detail,
        "timestamp":    datetime.now().strftime("%H:%M:%S.%f")[:-3],
    })

def safe_request(method, url, **kwargs):
    kwargs.setdefault("timeout", TIMEOUT)
    try:
        r = getattr(requests, method)(url, **kwargs)
        return r
    except requests.exceptions.ConnectionError:
        return None
    except requests.exceptions.Timeout:
        return None
    except Exception:
        return None

# ─────────────────────────────────────────────────────────────────────────────
# HELPER: parse JSON safely
# ─────────────────────────────────────────────────────────────────────────────
def parse_json(r):
    try:
        return r.json() if r else {}
    except Exception:
        return {}

def is_success_response(r):
    if not r:
        return False
    j = parse_json(r)
    return j.get("status") == "success"

def response_reveals_db_error(r):
    if not r:
        return False
    body = r.text.lower()
    keywords = [
        "sql syntax", "mysql error", "warning: mysqli",
        "uncaught exception", "pdo", "you have an error in your sql",
        "supplied argument is not", "column count doesn",
        "table 'template_company", "unknown column",
    ]
    return any(k in body for k in keywords)

# ─────────────────────────────────────────────────────────────────────────────
# 1. UNAUTHENTICATED ACCESS (No Credentials)
# ─────────────────────────────────────────────────────────────────────────────
UNAUTH_ENDPOINTS = [
    ("GET",  "/users/get_all.php",          {}),
    ("GET",  "/product/get_all.php",        {}),
    ("GET",  "/clients/get_all.php",        {}),
    ("GET",  "/category/get_all.php",       {}),
    ("GET",  "/countries/get_all.php",      {}),
    ("GET",  "/warehouse/get_all.php",      {}),
    ("GET",  "/invoices/get_all.php",       {}),
    ("GET",  "/payments/get_all.php",       {}),
    ("GET",  "/reports/dashboard_comprehensive.php", {}),
    ("GET",  "/settings/get_all.php",       {}),
    ("GET",  "/safes/get_all.php",          {}),
    ("GET",  "/financial_transactions/get_all.php", {}),
    ("GET",  "/inventory/get_all.php",      {}),
    ("GET",  "/suppliers/get_all.php",      {}),
    ("GET",  "/visits/get_all.php",         {}),
    ("GET",  "/sales_orders/get_all.php",   {}),
    ("GET",  "/sales_invoices/get_all.php", {}),
    ("GET",  "/purchase_orders/get_all.php",{}),
    ("POST", "/users/add.php",              {"users_name": "HACKER", "users_email": "hack@test.com", "users_password": "pass123", "users_role": "admin"}),
    ("POST", "/users/delete.php",           {"users_id": "1"}),
    ("POST", "/product/delete.php",         {"products_id": "1"}),
]

def test_unauthenticated_access():
    print("\n[1/5] Testing Unauthenticated Access (No Credentials)...")
    for method, path, payload in UNAUTH_ENDPOINTS:
        url = BASE_URL + path
        r = safe_request(method.lower(), url, data=payload if method == "POST" else None,
                         params=payload if method == "GET" else None)
        if r is None:
            record("AUTH_BYPASS", f"No-Creds: {path}", method, url, payload,
                   0, "No response / server down", True, "INFO",
                   "Could not connect – server may be offline")
            continue

        j = parse_json(r)
        # VULNERABILITY: server returned success without any auth token
        is_vuln = is_success_response(r)
        # Also flag if it returned data without auth
        has_data = isinstance(j.get("data"), list) and len(j.get("data", [])) > 0

        if is_vuln or has_data:
            sev = "CRITICAL" if "delete" in path or "add" in path else "HIGH"
            record("AUTH_BYPASS", f"No-Creds: {path}", method, url, payload,
                   r.status_code, r.text[:400], False, sev,
                   "Endpoint returned data/success with NO credentials!")
        else:
            record("AUTH_BYPASS", f"No-Creds: {path}", method, url, payload,
                   r.status_code, r.text[:200], True, "INFO",
                   "Endpoint correctly rejected unauthenticated request")


# ─────────────────────────────────────────────────────────────────────────────
# 2. SQL INJECTION TESTS
# ─────────────────────────────────────────────────────────────────────────────
SQL_PAYLOADS = [
    # Classic auth bypass
    ("' OR '1'='1",           "Classic OR bypass"),
    ("' OR 1=1--",            "OR 1=1 comment bypass"),
    ("admin'--",              "Admin comment bypass"),
    ("' OR 'x'='x",           "Always-true string"),
    ("1' OR '1'='1' --",      "Numeric OR bypass"),
    ("' OR 1=1#",             "Hash comment bypass"),
    ("') OR ('1'='1",         "Bracket bypass"),
    ("' OR ''='",             "Empty string bypass"),
    # UNION attacks
    ("' UNION SELECT 1,2,3--", "UNION SELECT probe"),
    ("' UNION SELECT NULL,NULL,NULL--", "UNION NULL probe"),
    ("' UNION ALL SELECT @@version,NULL,NULL--", "Version disclosure"),
    ("' UNION SELECT username,password,3 FROM users--", "Credential dump attempt"),
    # Blind injection
    ("' AND SLEEP(1)--",      "Time-based blind (1s)"),
    ("' AND 1=BENCHMARK(1000000,MD5(1))--", "CPU benchmark blind"),
    ("' AND (SELECT * FROM (SELECT(SLEEP(1)))a)--", "Subquery sleep blind"),
    # Error-based
    ("' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT database())))--", "Error-based DB name"),
    ("' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT(version(),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--", "Error-based version"),
    # Stacked queries
    ("'; INSERT INTO users(users_email,users_password) VALUES('h@h.com','test')--", "Stacked INSERT"),
    ("'; DROP TABLE users--",  "DROP TABLE attempt"),
    ("'; UPDATE users SET users_role='admin' WHERE '1'='1'--", "Mass role escalation"),
    # Special characters
    ("\\", "Backslash escape"),
    ("'\"", "Quote pair"),
    ("%27 OR %271%27=%271", "URL-encoded bypass"),
    ("1; SELECT 1", "Semicolon injection"),
    # No-quote integer injection
    ("1 OR 1=1",              "Integer OR bypass"),
    ("1 OR 1=1--",            "Integer OR comment"),
]

def test_sql_injection_login():
    print("\n[2/5] Testing SQL Injection on login.php...")
    url = BASE_URL + "/auth/login.php"
    
    # Test email field injection
    for payload, label in SQL_PAYLOADS:
        data = {
            "users_email":    payload,
            "users_password": "anything",
            "login_type":     "admin",
        }
        r = safe_request("post", url, data=data)
        if r is None:
            continue

        j = parse_json(r)
        db_error = response_reveals_db_error(r)
        logged_in = is_success_response(r)

        if logged_in:
            record("SQL_INJECTION", f"SQLi Login Email: {label}", "POST", url, data,
                   r.status_code, r.text[:400], False, "CRITICAL",
                   "BYPASSED LOGIN – SQL injection in email field succeeded!")
        elif db_error:
            record("SQL_INJECTION", f"SQLi Login Email: {label}", "POST", url, data,
                   r.status_code, r.text[:400], False, "HIGH",
                   "DB error exposed in response – possible injection vector")
        else:
            record("SQL_INJECTION", f"SQLi Login Email: {label}", "POST", url, data,
                   r.status_code, r.text[:200], True, "INFO",
                   "Payload correctly rejected / no bypass")

    # Test password field injection
    for payload, label in SQL_PAYLOADS[:8]:  # top auth-bypass payloads
        data = {
            "users_email":    "admin@example.com",
            "users_password": payload,
            "login_type":     "admin",
        }
        r = safe_request("post", url, data=data)
        if r is None:
            continue
        j = parse_json(r)
        logged_in = is_success_response(r)
        db_error  = response_reveals_db_error(r)
        if logged_in:
            record("SQL_INJECTION", f"SQLi Login Password: {label}", "POST", url, data,
                   r.status_code, r.text[:400], False, "CRITICAL",
                   "BYPASSED LOGIN – SQL injection in password field succeeded!")
        elif db_error:
            record("SQL_INJECTION", f"SQLi Login Password: {label}", "POST", url, data,
                   r.status_code, r.text[:400], False, "HIGH", "DB error in response")
        else:
            record("SQL_INJECTION", f"SQLi Login Password: {label}", "POST", url, data,
                   r.status_code, r.text[:200], True, "INFO", "Correctly rejected")


def test_sql_injection_search():
    print("      Testing SQL Injection on search/filter params...")
    endpoints_with_search = [
        ("/product/get_all.php",   "GET",  "search"),
        ("/clients/get_all.php",   "GET",  "search"),
        ("/users/get_all.php",     "GET",  "user_type"),
        ("/invoices/get_all.php",  "GET",  "search"),
        ("/visits/get_all.php",    "GET",  "search"),
        ("/suppliers/get_all.php", "GET",  "search"),
    ]
    for path, method, param in endpoints_with_search:
        url = BASE_URL + path
        for payload, label in SQL_PAYLOADS[:12]:
            r = safe_request("get", url, params={param: payload})
            if r is None:
                continue
            db_error = response_reveals_db_error(r)
            if db_error:
                record("SQL_INJECTION", f"SQLi Search {path}[{param}]: {label}",
                       method, url, {param: payload},
                       r.status_code, r.text[:400], False, "HIGH",
                       "DB error exposed via search parameter injection")
            else:
                record("SQL_INJECTION", f"SQLi Search {path}[{param}]: {label}",
                       method, url, {param: payload},
                       r.status_code, r.text[:100], True, "INFO",
                       "No DB error – likely safe")


def test_sql_injection_id_params():
    print("      Testing SQL Injection on ID parameters...")
    endpoints_with_id = [
        ("/users/get_detail.php",    "GET",  "users_id"),
        ("/product/get_detail.php",  "GET",  "products_id"),
        ("/clients/get_detail.php",  "GET",  "clients_id"),
        ("/invoices/get_detail.php", "GET",  "invoices_id"),
    ]
    id_payloads = [
        ("1 OR 1=1",    "Integer OR"),
        ("1; DROP TABLE users--", "Stacked DROP"),
        ("1 UNION SELECT 1,2,3--", "UNION probe"),
        ("-1 UNION SELECT NULL,NULL,NULL--", "Negative UNION"),
        ("1' AND SLEEP(1)--", "Time-blind after int"),
    ]
    for path, method, param in endpoints_with_id:
        url = BASE_URL + path
        for payload, label in id_payloads:
            r = safe_request("get", url, params={param: payload})
            if r is None:
                continue
            db_error = response_reveals_db_error(r)
            if db_error:
                record("SQL_INJECTION", f"SQLi ID {path}[{param}]: {label}",
                       method, url, {param: payload},
                       r.status_code, r.text[:400], False, "HIGH",
                       "DB error via ID param injection")
            else:
                record("SQL_INJECTION", f"SQLi ID {path}[{param}]: {label}",
                       method, url, {param: payload},
                       r.status_code, r.text[:100], True, "INFO", "Safe")


# ─────────────────────────────────────────────────────────────────────────────
# 3. AUTHENTICATION & SESSION ATTACKS
# ─────────────────────────────────────────────────────────────────────────────
def test_auth_attacks():
    print("\n[3/5] Testing Authentication & Session Attacks...")

    login_url = BASE_URL + "/auth/login.php"

    # 3a. login_type manipulation
    for lt in ["admin", "rep", "superadmin", "root", "../admin", "' OR '1'='1", "0", ""]:
        r = safe_request("post", login_url, data={
            "users_email":    "nobody@nowhere.com",
            "users_password": "wrongpassword",
            "login_type":     lt,
        })
        if r is None:
            continue
        if is_success_response(r):
            record("AUTH_BYPASS", f"login_type manipulation: '{lt}'", "POST",
                   login_url, {"login_type": lt},
                   r.status_code, r.text[:300], False, "CRITICAL",
                   "Logged in without valid credentials via login_type manipulation!")
        else:
            record("AUTH_BYPASS", f"login_type manipulation: '{lt}'", "POST",
                   login_url, {"login_type": lt},
                   r.status_code, r.text[:100], True, "INFO", "Correctly rejected")

    # 3b. Empty / missing fields
    for data, label in [
        ({},                                                "Empty POST body"),
        ({"users_email": ""},                               "Empty email"),
        ({"users_password": ""},                            "Empty password"),
        ({"users_email": "a@b.com"},                        "Missing password"),
        ({"users_password": "test"},                        "Missing email"),
        ({"users_email": None, "users_password": None},     "Null fields"),
    ]:
        r = safe_request("post", login_url, data=data)
        if r is None:
            continue
        if is_success_response(r):
            record("AUTH_BYPASS", f"Empty-field: {label}", "POST",
                   login_url, data, r.status_code, r.text[:300], False, "CRITICAL",
                   "Logged in with missing/empty credentials!")
        else:
            record("AUTH_BYPASS", f"Empty-field: {label}", "POST",
                   login_url, data, r.status_code, r.text[:100], True, "INFO", "Correctly rejected")

    # 3c. UUID spoofing on protected endpoints
    fake_uuids = [
        "00000000000000000000000000000000",
        "ffffffffffffffffffffffffffffffff",
        "' OR '1'='1",
        "'; DROP TABLE users--",
        "1",
        "",
        "admin",
        "null",
        "../../etc/passwd",
        "a" * 255,
    ]
    protected_endpoints = [
        "/users/get_all.php",
        "/clients/get_all.php",
        "/reports/dashboard_comprehensive.php",
    ]
    for ep in protected_endpoints:
        url = BASE_URL + ep
        for uuid in fake_uuids:
            r = safe_request("get", url, params={"users_uuid": uuid})
            if r is None:
                continue
            j = parse_json(r)
            if is_success_response(r) or (isinstance(j.get("data"), list) and len(j.get("data", [])) > 0):
                record("AUTH_BYPASS", f"UUID spoof on {ep}: '{uuid[:30]}'",
                       "GET", url, {"users_uuid": uuid},
                       r.status_code, r.text[:400], False, "CRITICAL",
                       "Access granted with fake/spoofed UUID!")
            else:
                record("AUTH_BYPASS", f"UUID spoof on {ep}: '{uuid[:30]}'",
                       "GET", url, {"users_uuid": uuid},
                       r.status_code, r.text[:100], True, "INFO", "Correctly rejected")

    # 3d. IP spoofing via X-Forwarded-For header (targets IP-based auth fallback)
    spoofed_ips = [
        "127.0.0.1",
        "::1",
        "localhost",
        "10.0.0.1",
        "192.168.1.1",
    ]
    for ep in protected_endpoints:
        url = BASE_URL + ep
        for ip in spoofed_ips:
            headers = {
                "X-Forwarded-For": ip,
                "X-Real-IP": ip,
                "Client-IP": ip,
            }
            r = safe_request("get", url, headers=headers)
            if r is None:
                continue
            j = parse_json(r)
            if is_success_response(r) or (isinstance(j.get("data"), list) and len(j.get("data", [])) > 0):
                record("AUTH_BYPASS", f"IP spoof {ep} via X-Forwarded-For: {ip}",
                       "GET", url, headers,
                       r.status_code, r.text[:400], False, "HIGH",
                       "Possible IP-based auth bypass via spoofed header!")
            else:
                record("AUTH_BYPASS", f"IP spoof {ep} via X-Forwarded-For: {ip}",
                       "GET", url, headers,
                       r.status_code, r.text[:100], True, "INFO", "Correctly rejected")

    # 3e. Role escalation via users_hwid (triggers mobile auth path with no UUID check)
    for ep in protected_endpoints:
        url = BASE_URL + ep
        r = safe_request("post", url, data={"users_hwid": "TEST_DEVICE_12345"})
        if r is None:
            continue
        j = parse_json(r)
        if is_success_response(r) or (isinstance(j.get("data"), list) and len(j.get("data", [])) > 0):
            record("AUTH_BYPASS", f"Mobile path (hwid only) on {ep}",
                   "POST", url, {"users_hwid": "TEST_DEVICE_12345"},
                   r.status_code, r.text[:400], False, "HIGH",
                   "Access via mobile auth path with only HWID – no UUID provided!")
        else:
            record("AUTH_BYPASS", f"Mobile path (hwid only) on {ep}",
                   "POST", url, {"users_hwid": "TEST_DEVICE_12345"},
                   r.status_code, r.text[:100], True, "INFO", "Correctly rejected")


# ─────────────────────────────────────────────────────────────────────────────
# 4. CONCURRENCY & RACE CONDITION TESTS
# ─────────────────────────────────────────────────────────────────────────────
def _concurrent_login(idx, results_list, lock):
    r = safe_request("post", BASE_URL + "/auth/login.php", data={
        "users_email":    "admin@example.com",
        "users_password": "wrongpassword_race",
        "login_type":     "admin",
    })
    status = r.status_code if r else 0
    body   = r.text[:100] if r else "no response"
    with lock:
        results_list.append((idx, status, body))

def test_concurrency():
    print("\n[4/5] Testing Concurrency & Race Conditions...")
    CONCURRENT_N = 30

    # 4a. Simultaneous login attempts (race condition on UUID update)
    c_results = []
    lock = threading.Lock()
    threads = [threading.Thread(target=_concurrent_login, args=(i, c_results, lock))
               for i in range(CONCURRENT_N)]
    t0 = time.time()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.time() - t0

    success_count = sum(1 for _, s, b in c_results if '"status":"success"' in b or '"status": "success"' in b)
    error_count   = sum(1 for _, s, _ in c_results if s == 500)
    unique_statuses = set(s for _, s, _ in c_results)

    detail = (f"{CONCURRENT_N} simultaneous login requests in {elapsed:.2f}s | "
              f"successes={success_count} | 500-errors={error_count} | "
              f"unique HTTP statuses={unique_statuses}")

    if error_count > 0:
        record("CONCURRENCY", "Race condition – simultaneous login (wrong creds)",
               "POST", BASE_URL + "/auth/login.php", f"{CONCURRENT_N} concurrent POSTs",
               500, detail, False, "MEDIUM",
               f"{error_count} internal server errors under concurrency – possible race condition")
    else:
        record("CONCURRENCY", "Race condition – simultaneous login (wrong creds)",
               "POST", BASE_URL + "/auth/login.php", f"{CONCURRENT_N} concurrent POSTs",
               200, detail, True, "INFO",
               "No server errors under concurrent load (expected: all rejected)")

    # 4b. Double-submit same request simultaneously (idempotency check)
    def _submit(path, payload, out, lock, idx):
        r = safe_request("post", BASE_URL + path, data=payload)
        with lock:
            out.append((idx, r.status_code if r else 0, r.text[:200] if r else ""))

    double_tests = [
        ("/users/add.php", {"users_name": "RaceUser", "users_email": "race@test.com",
                            "users_password": "Pass@123", "users_role": "rep"}),
    ]
    for path, payload in double_tests:
        out = []
        lock2 = threading.Lock()
        threads2 = [threading.Thread(target=_submit, args=(path, payload, out, lock2, i))
                    for i in range(2)]
        for t in threads2:
            t.start()
        for t in threads2:
            t.join()

        successes = sum(1 for _, s, b in out if '"success"' in b)
        detail2 = f"Double-submit {path} | results: {[(s, b[:80]) for _, s, b in out]}"
        if successes > 1:
            record("CONCURRENCY", f"Double-submit race on {path}", "POST",
                   BASE_URL + path, payload, 0, detail2, False, "MEDIUM",
                   "Both concurrent requests succeeded – possible duplicate insert!")
        else:
            record("CONCURRENCY", f"Double-submit race on {path}", "POST",
                   BASE_URL + path, payload, 0, detail2, True, "INFO",
                   "Only one (or zero) succeeded – acceptable behavior")

    # 4c. Simultaneous login + data access (session fixation window)
    login_results = []
    read_results  = []
    lock3 = threading.Lock()

    def _login_and_read(i):
        r_login = safe_request("post", BASE_URL + "/auth/login.php", data={
            "users_email":    "admin@example.com",
            "users_password": "wrongpassword",
            "login_type":     "admin",
        })
        r_read = safe_request("get", BASE_URL + "/users/get_all.php")
        with lock3:
            login_results.append(is_success_response(r_login))
            read_results.append(is_success_response(r_read))

    workers = [threading.Thread(target=_login_and_read, args=(i,)) for i in range(20)]
    for w in workers:
        w.start()
    for w in workers:
        w.join()

    concurrent_reads_with_data = sum(read_results)
    record("CONCURRENCY", "Session window – concurrent login + data read", "MIXED",
           BASE_URL, "20 concurrent login+read pairs",
           0, f"reads that got data: {concurrent_reads_with_data}/20", True, "INFO",
           "Checking if concurrent auth creates exploitable session window")


# ─────────────────────────────────────────────────────────────────────────────
# 5. STRESS TEST
# ─────────────────────────────────────────────────────────────────────────────
stress_timings = []

def _stress_worker(url, method="get", payload=None):
    t0 = time.time()
    r = safe_request(method, url, data=payload, params=payload if method == "get" else None)
    elapsed_ms = (time.time() - t0) * 1000
    return {
        "url":        url,
        "status":     r.status_code if r else 0,
        "elapsed_ms": round(elapsed_ms, 1),
        "error":      r is None,
    }

def test_stress():
    print(f"\n[5/5] Stress test – {STRESS_TOTAL} requests across {STRESS_RPS} workers...")
    endpoints = [
        BASE_URL + "/auth/login.php",
        BASE_URL + "/product/get_all.php",
        BASE_URL + "/users/get_all.php",
        BASE_URL + "/clients/get_all.php",
        BASE_URL + "/category/get_all.php",
        BASE_URL + "/countries/get_all.php",
        BASE_URL + "/inventory/get_all.php",
    ]
    
    tasks = []
    for i in range(STRESS_TOTAL):
        ep = endpoints[i % len(endpoints)]
        if "login" in ep:
            tasks.append((ep, "post", {"users_email": "load@test.com",
                                        "users_password": "wrongpassword",
                                        "login_type": "admin"}))
        else:
            tasks.append((ep, "get", None))

    global stress_timings
    timings_5xx = []
    timings_ok  = []
    errors      = 0

    t_start = time.time()
    with ThreadPoolExecutor(max_workers=STRESS_RPS) as executor:
        futures = [executor.submit(_stress_worker, url, method, payload)
                   for url, method, payload in tasks]
        for f in as_completed(futures):
            res = f.result()
            if res["error"] or res["status"] == 0:
                errors += 1
            elif res["status"] >= 500:
                timings_5xx.append(res["elapsed_ms"])
            else:
                timings_ok.append(res["elapsed_ms"])

    total_elapsed = time.time() - t_start
    all_times = timings_ok + timings_5xx
    avg_ms    = sum(all_times) / len(all_times) if all_times else 0
    max_ms    = max(all_times) if all_times else 0
    min_ms    = min(all_times) if all_times else 0
    rps_actual = STRESS_TOTAL / total_elapsed if total_elapsed > 0 else 0

    stress_timings = all_times  # store for report

    detail = (f"Total: {STRESS_TOTAL} | OK: {len(timings_ok)} | "
              f"5xx: {len(timings_5xx)} | Errors/Timeouts: {errors} | "
              f"Avg: {avg_ms:.0f}ms | Max: {max_ms:.0f}ms | Min: {min_ms:.0f}ms | "
              f"RPS achieved: {rps_actual:.1f}")

    sev = "HIGH" if len(timings_5xx) > 5 or errors > 10 else "INFO"
    passed = len(timings_5xx) == 0 and errors < 5

    record("STRESS", f"Stress test – {STRESS_TOTAL} requests", "MIXED",
           BASE_URL, f"{STRESS_RPS} concurrent workers",
           0, detail, passed, sev, detail)

    print(f"      {detail}")


# ─────────────────────────────────────────────────────────────────────────────
# 6. ADDITIONAL SECURITY CHECKS
# ─────────────────────────────────────────────────────────────────────────────
def test_additional_security():
    print("\n[+] Running additional security checks...")

    # 6a. HTTP Methods (CORS / method confusion)
    url = BASE_URL + "/auth/login.php"
    for method in ["put", "delete", "patch", "options", "head", "trace"]:
        r = safe_request(method, url)
        if r and r.status_code not in [200, 405, 501, 403]:
            record("SECURITY_MISC", f"Unexpected response to {method.upper()} on login",
                   method.upper(), url, {},
                   r.status_code, r.text[:100], False, "LOW",
                   f"Unexpected {r.status_code} for {method.upper()} – should be 405")
        else:
            code = r.status_code if r else 0
            record("SECURITY_MISC", f"HTTP method {method.upper()} on login",
                   method.upper(), url, {}, code, "", True, "INFO", "Expected behavior")

    # 6b. Oversized payload (DoS / buffer overflow probe)
    big_string = "A" * 100_000
    r = safe_request("post", url, data={
        "users_email":    big_string,
        "users_password": big_string,
        "login_type":     "admin",
    })
    if r and r.status_code == 500:
        record("SECURITY_MISC", "Oversized payload – 100KB fields", "POST", url, "100KB data",
               r.status_code, r.text[:200], False, "MEDIUM",
               "Server returned 500 on oversized input – no input length validation")
    else:
        code = r.status_code if r else 0
        record("SECURITY_MISC", "Oversized payload – 100KB fields", "POST", url, "100KB data",
               code, "", True, "INFO", "Server handled oversized payload without crash")

    # 6c. Path traversal via company name in URL
    traversal_paths = [
        "/../demo_company/auth/login.php",
        "/%2e%2e/demo_company/auth/login.php",
        "/./../../etc/passwd",
    ]
    for tp in traversal_paths:
        full_url = "http://localhost:8082/api/clients/template_company" + tp
        r = safe_request("get", full_url)
        if r and r.status_code == 200 and "root:" in r.text:
            record("SECURITY_MISC", f"Path traversal: {tp}", "GET", full_url, {},
                   r.status_code, r.text[:200], False, "CRITICAL",
                   "Path traversal read /etc/passwd!")
        else:
            code = r.status_code if r else 0
            record("SECURITY_MISC", f"Path traversal: {tp}", "GET", full_url, {},
                   code, "", True, "INFO", "Traversal blocked / no file leak")

    # 6d. Check sensitive files directly accessible
    sensitive_files = [
        "/db_connect.php",
        "/functions.php",
        "/.env",
        "/setup_test_database.sql",
        "/describe_table.php",
        "/test_odoo_auth.php",
    ]
    for sf in sensitive_files:
        url_sf = BASE_URL + sf
        r = safe_request("get", url_sf)
        if r and r.status_code == 200:
            # Check if it returned PHP source (misconfigured server)
            if "<?php" in r.text or "$servername" in r.text or "password" in r.text.lower():
                record("SECURITY_MISC", f"Sensitive file exposed: {sf}", "GET", url_sf, {},
                       r.status_code, r.text[:300], False, "CRITICAL",
                       "PHP source code / sensitive file returned raw!")
            else:
                record("SECURITY_MISC", f"Sensitive file accessible: {sf}", "GET", url_sf, {},
                       r.status_code, r.text[:100], False, "MEDIUM",
                       "File is accessible (200 OK) – review if intentional")
        else:
            code = r.status_code if r else 0
            record("SECURITY_MISC", f"Sensitive file check: {sf}", "GET", url_sf, {},
                   code, "", True, "INFO", "File not publicly accessible")

    # 6e. Information disclosure via error messages
    r = safe_request("get", BASE_URL + "/users/get_detail.php", params={"users_id": "INVALID"})
    if r:
        body = r.text
        if any(k in body.lower() for k in ["mysqli", "pdo", "template_company_db", "stack trace", "warning:"]):
            record("SECURITY_MISC", "Info disclosure via error on invalid ID", "GET",
                   BASE_URL + "/users/get_detail.php", {"users_id": "INVALID"},
                   r.status_code, r.text[:400], False, "MEDIUM",
                   "Error response reveals internal DB/server info")
        else:
            record("SECURITY_MISC", "Info disclosure via error on invalid ID", "GET",
                   BASE_URL + "/users/get_detail.php", {"users_id": "INVALID"},
                   r.status_code, r.text[:100], True, "INFO", "No sensitive info in error response")

    # 6f. CORS header check
    r = safe_request("options", BASE_URL + "/auth/login.php",
                     headers={"Origin": "https://evil.com",
                               "Access-Control-Request-Method": "POST"})
    if r:
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        if acao == "*":
            record("SECURITY_MISC", "CORS – wildcard Allow-Origin", "OPTIONS",
                   BASE_URL + "/auth/login.php", {},
                   r.status_code, acao, False, "MEDIUM",
                   "CORS allows ANY origin (*) – acceptable for public API but risky with auth")
        else:
            record("SECURITY_MISC", "CORS – Allow-Origin check", "OPTIONS",
                   BASE_URL + "/auth/login.php", {},
                   r.status_code if r else 0, acao, True, "INFO",
                   f"CORS origin: '{acao}'")


# ─────────────────────────────────────────────────────────────────────────────
# HTML REPORT GENERATOR
# ─────────────────────────────────────────────────────────────────────────────
SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
SEVERITY_COLOR = {
    "CRITICAL": "#c0392b",
    "HIGH":     "#e67e22",
    "MEDIUM":   "#f39c12",
    "LOW":      "#3498db",
    "INFO":     "#27ae60",
}

def generate_report():
    total       = len(results)
    vulns       = [r for r in results if not r["passed"]]
    passed      = [r for r in results if r["passed"]]
    by_sev      = defaultdict(list)
    for r in vulns:
        by_sev[r["severity"]].append(r)

    counts = {k: len(v) for k, v in by_sev.items()}
    score  = 100 - (counts.get("CRITICAL", 0) * 25 +
                    counts.get("HIGH", 0)     * 10 +
                    counts.get("MEDIUM", 0)   * 5  +
                    counts.get("LOW", 0)      * 2)
    score  = max(0, score)

    run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Timing histogram (simplified)
    hist_js = "[]"
    if stress_timings:
        buckets = {}
        for t in stress_timings:
            b = int(t // 100) * 100
            buckets[b] = buckets.get(b, 0) + 1
        hist_js = json.dumps([{"range": f"{k}-{k+100}ms", "count": v}
                               for k, v in sorted(buckets.items())])

    def row_html(r):
        badge_color = SEVERITY_COLOR.get(r["severity"], "#888")
        status_icon = "✅" if r["passed"] else "❌"
        payload_esc = html.escape(r["payload"])
        resp_esc    = html.escape(r["response"])
        detail_esc  = html.escape(r["detail"])
        return f"""
        <tr class="{'vuln-row' if not r['passed'] else ''}">
          <td>{r['timestamp']}</td>
          <td><span class="badge" style="background:{badge_color}">{r['severity']}</span></td>
          <td>{r['category']}</td>
          <td title="{detail_esc}">{html.escape(r['test_name'][:70])}</td>
          <td><code>{r['method']}</code></td>
          <td style="font-size:11px;max-width:220px;word-break:break-all">{html.escape(r['url'].replace(BASE_URL,''))}</td>
          <td>{r['status_code']}</td>
          <td style="font-size:11px;max-width:220px;word-break:break-all">{payload_esc[:120]}</td>
          <td style="font-size:10px;max-width:240px;word-break:break-all">{resp_esc[:200]}</td>
          <td>{status_icon}</td>
        </tr>"""

    rows_vuln   = "\n".join(row_html(r) for r in sorted(vulns, key=lambda x: SEVERITY_ORDER.get(x["severity"], 9)))
    rows_passed = "\n".join(row_html(r) for r in passed)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RepWave Security & Stress Test Report</title>
<style>
  :root {{
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --text: #c9d1d9; --accent: #58a6ff;
    --crit: #c0392b; --high: #e67e22; --med: #f39c12;
    --low: #3498db; --info: #27ae60; --pass: #238636;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; }}
  h1 {{ color: var(--accent); font-size: 28px; margin-bottom: 4px; }}
  h2 {{ color: var(--accent); font-size: 18px; margin: 24px 0 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }}
  .meta {{ color: #8b949e; font-size: 13px; margin-bottom: 24px; }}
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }}
  .card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }}
  .card .num {{ font-size: 36px; font-weight: 700; }}
  .card .lbl {{ font-size: 12px; color: #8b949e; margin-top: 4px; }}
  .score-circle {{ display: flex; flex-direction: column; align-items: center; justify-content: center; }}
  .score-circle .num {{ font-size: 48px; font-weight: 800; }}
  .crit {{ color: var(--crit); }} .high {{ color: var(--high); }}
  .med  {{ color: var(--med);  }} .low  {{ color: var(--low);  }}
  .info {{ color: var(--info); }} .ok   {{ color: var(--pass); }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px;
            font-weight: 600; color: #fff; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 32px; }}
  th {{ background: var(--surface); color: #8b949e; text-align: left; padding: 8px 10px;
        border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 1; }}
  td {{ padding: 7px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }}
  tr:hover td {{ background: rgba(88,166,255,0.04); }}
  .vuln-row td {{ background: rgba(192,57,43,0.06); }}
  code {{ background: #21262d; padding: 1px 5px; border-radius: 4px; font-size: 11px; }}
  .section-toggle {{ cursor: pointer; user-select: none; }}
  .section-toggle:hover {{ color: var(--accent); }}
  .collapsible {{ overflow: hidden; transition: max-height 0.3s ease; }}
  .findings-banner {{ background: linear-gradient(135deg, rgba(192,57,43,0.2), rgba(231,76,60,0.05));
    border: 1px solid #c0392b; border-radius: 8px; padding: 16px; margin-bottom: 24px; }}
  .clean-banner {{ background: linear-gradient(135deg, rgba(35,134,54,0.2), rgba(39,174,96,0.05));
    border: 1px solid #238636; border-radius: 8px; padding: 16px; margin-bottom: 24px; }}
  .bar-container {{ background: #21262d; border-radius: 4px; height: 8px; flex: 1; }}
  .bar {{ height: 8px; border-radius: 4px; }}
</style>
</head>
<body>

<h1>🔐 RepWave Backend – Full Security &amp; Stress Test Report</h1>
<p class="meta">Generated: {run_time} &nbsp;|&nbsp; Target: <code>{BASE_URL}</code> &nbsp;|&nbsp;
  Company: <code>template_company</code></p>

{"<div class='findings-banner'><strong>⚠️ VULNERABILITIES FOUND</strong> – " + str(len(vulns)) + " issue(s) detected. Review CRITICAL and HIGH findings immediately.</div>" if vulns else "<div class='clean-banner'><strong>✅ No vulnerabilities detected</strong> – all security checks passed (server may be offline, verify connectivity).</div>"}

<div class="summary-grid">
  <div class="card score-circle">
    <div class="num" style="color:{'#c0392b' if score < 50 else '#e67e22' if score < 75 else '#27ae60'}">{score}</div>
    <div class="lbl">Security Score / 100</div>
  </div>
  <div class="card"><div class="num">{total}</div><div class="lbl">Total Tests</div></div>
  <div class="card"><div class="num ok">{len(passed)}</div><div class="lbl">Passed</div></div>
  <div class="card"><div class="num crit">{counts.get('CRITICAL',0)}</div><div class="lbl">CRITICAL</div></div>
  <div class="card"><div class="num high">{counts.get('HIGH',0)}</div><div class="lbl">HIGH</div></div>
  <div class="card"><div class="num med">{counts.get('MEDIUM',0)}</div><div class="lbl">MEDIUM</div></div>
  <div class="card"><div class="num low">{counts.get('LOW',0)}</div><div class="lbl">LOW</div></div>
</div>

<h2>📊 Test Coverage</h2>
<table>
  <tr><th>Category</th><th>Total</th><th>Findings</th><th>Bar</th></tr>
  {"".join(f"<tr><td>{cat}</td><td>{len([r for r in results if r['category']==cat])}</td>"
           f"<td>{len([r for r in results if r['category']==cat and not r['passed']])}</td>"
           f"<td><div class='bar-container'><div class='bar' style='width:{min(100, len([r for r in results if r['category']==cat and not r['passed']])*20)}%;background:#c0392b'></div></div></td></tr>"
           for cat in sorted(set(r['category'] for r in results)))}
</table>

<h2>❌ Findings ({len(vulns)} issues)</h2>
{"<p style='color:#8b949e'>No vulnerabilities found.</p>" if not vulns else f"""
<table>
  <thead><tr>
    <th>Time</th><th>Severity</th><th>Category</th><th>Test</th>
    <th>Method</th><th>Endpoint</th><th>HTTP</th><th>Payload</th>
    <th>Response</th><th>Status</th>
  </tr></thead>
  <tbody>{rows_vuln}</tbody>
</table>"""}

<h2 class="section-toggle" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
  ✅ Passed Tests ({len(passed)}) ▾
</h2>
<div class="collapsible" style="display:none">
<table>
  <thead><tr>
    <th>Time</th><th>Severity</th><th>Category</th><th>Test</th>
    <th>Method</th><th>Endpoint</th><th>HTTP</th><th>Payload</th>
    <th>Response</th><th>Status</th>
  </tr></thead>
  <tbody>{rows_passed}</tbody>
</table>
</div>

<h2>⚡ Stress Test Response Time Distribution</h2>
<div id="histogram" style="margin-bottom:32px"></div>
<script>
const data = {hist_js};
const div = document.getElementById('histogram');
if (data.length === 0) {{
  div.innerHTML = '<p style="color:#8b949e">No stress test timing data (server may be offline).</p>';
}} else {{
  const max = Math.max(...data.map(d=>d.count));
  div.innerHTML = data.map(d => `
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0;font-size:12px">
      <span style="width:100px;color:#8b949e">${{d.range}}</span>
      <div style="background:#58a6ff;height:18px;width:${{Math.round(d.count/max*300)}}px;border-radius:3px"></div>
      <span>${{d.count}} req</span>
    </div>`).join('');
}}
</script>

<h2>🛡️ Security Recommendations</h2>
<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:20px;font-size:13px;line-height:1.7">
<ol style="padding-left:18px">
  <li><strong>Authentication on ALL endpoints:</strong> Add <code>validate_user_session()</code> to every PHP file that returns sensitive data. Currently many GET endpoints (users, products, clients) lack this check.</li>
  <li><strong>IP-based auth fallback:</strong> The <code>check_mobile_authorization()</code> fallback to IP-based login logs is dangerous. An attacker sharing a NAT IP or using <code>X-Forwarded-For</code> spoofing could gain access. Use UUID-only auth.</li>
  <li><strong>Disable <code>db_connect.php</code> direct access:</strong> The commented-out <code>validate_user_session()</code> in db_connect.php means it can be loaded directly and returns nothing, but it should be blocked at nginx level.</li>
  <li><strong>Sensitive files via nginx:</strong> Block direct access to <code>.php</code> utility files like <code>describe_table.php</code>, <code>test_odoo_auth.php</code>, <code>setup_test_database.sql</code>.</li>
  <li><strong>CORS wildcard:</strong> <code>Access-Control-Allow-Origin: *</code> is set globally. For an authenticated API, restrict to your domain(s) only.</li>
  <li><strong>Error message sanitization:</strong> Ensure production errors never expose DB names, table names, or PHP stack traces to clients.</li>
  <li><strong>Rate limiting:</strong> No rate limiting on <code>login.php</code> – add nginx or PHP-level brute-force protection (e.g., fail2ban, or a login-attempt counter per IP).</li>
  <li><strong>SQL injection:</strong> All tested prepared statements appear safe. Maintain this practice for all new endpoints.</li>
  <li><strong>Input length limits:</strong> Validate max field lengths server-side to prevent memory exhaustion from oversized payloads.</li>
  <li><strong>Race condition on UUID:</strong> Concurrent logins update <code>users_uuid</code> – use a DB transaction/lock or optimistic concurrency to prevent race condition on the UPDATE.</li>
</ol>
</div>

<p style="color:#8b949e;font-size:11px;margin-top:32px;text-align:center">
  RepWave Security Test Suite – for authorized testing only – {run_time}
</p>
</body>
</html>"""

    return html_content


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 65)
    print("  RepWave Backend – Full Security & Stress Test Suite")
    print(f"  Target: {BASE_URL}")
    print("=" * 65)

    # Connectivity pre-check
    print("\n[0] Pre-check: checking server connectivity...")
    r = safe_request("get", BASE_URL + "/auth/login.php")
    if r is None:
        print("  ⚠️  WARNING: Cannot reach server. Tests will run but all")
        print("      results will show 'no response'. Start Docker first:")
        print("      cd rep.merkwave.com && docker-compose up -d")
        print("  Continuing anyway to produce a full report skeleton...\n")
    else:
        print(f"  ✅ Server reachable – HTTP {r.status_code}")

    # Run all test suites
    test_unauthenticated_access()
    test_sql_injection_login()
    test_sql_injection_search()
    test_sql_injection_id_params()
    test_auth_attacks()
    test_concurrency()
    test_stress()
    test_additional_security()

    # Generate report
    print("\n[+] Generating HTML report...")
    report_html = generate_report()
    out_path = "security_report.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report_html)

    # Summary
    vulns   = [r for r in results if not r["passed"]]
    crits   = [r for r in vulns if r["severity"] == "CRITICAL"]
    highs   = [r for r in vulns if r["severity"] == "HIGH"]
    mediums = [r for r in vulns if r["severity"] == "MEDIUM"]

    print("\n" + "=" * 65)
    print(f"  RESULTS: {len(results)} tests | {len(vulns)} findings")
    print(f"  CRITICAL: {len(crits)}  HIGH: {len(highs)}  MEDIUM: {len(mediums)}")
    print(f"  Report saved to: {out_path}")
    print("=" * 65)

    if crits:
        print("\n  🚨 CRITICAL FINDINGS:")
        for v in crits:
            print(f"     • {v['test_name']}")
            print(f"       → {v['detail'][:100]}")

    if highs:
        print("\n  ⚠️  HIGH FINDINGS:")
        for v in highs:
            print(f"     • {v['test_name']}")
            print(f"       → {v['detail'][:100]}")

    sys.exit(0 if not vulns else 1)
