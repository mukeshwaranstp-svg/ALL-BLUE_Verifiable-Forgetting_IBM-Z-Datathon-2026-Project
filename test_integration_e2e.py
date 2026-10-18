"""End-to-end integration test: frontend proxy -> backend API."""
import urllib.request
import json
import sys

BASE = "http://localhost:3000"

def get(ep):
    return json.loads(urllib.request.urlopen(f"{BASE}{ep}").read())

def main():
    print("=== FULL END-TO-END INTEGRATION TEST ===\n")
    ok = 0
    fail = 0

    # 1. Health
    h = get("/api/v1/health")
    assert h["status"] == "healthy", f"Health unhealthy: {h}"
    print(f"1. Health: {h['status']} v{h['version']} - {h['enclaveTarget']}")
    ok += 1

    # 2. Dashboard
    d = get("/api/v1/dashboard/summary")
    assert "total" in d and "confirmed" in d
    print(f"2. Dashboard: {d['total']} total, {d['confirmed']} confirmed, {d['failed']} failed")
    ok += 1

    # 3. Customers (camelCase check)
    c = get("/api/v1/customers")
    assert len(c) > 0, "No customers returned"
    assert "id" in c[0] and "accountType" in c[0], f"Missing camelCase keys: {list(c[0].keys())[:5]}"
    print(f"3. Customers: {len(c)} records (camelCase OK)")
    ok += 1

    # 4. Models
    m = get("/api/v1/models")
    assert len(m) >= 2
    names = [x["name"] for x in m]
    print(f"4. Models: {len(m)} models: {names}")
    ok += 1

    # 5. Baseline model
    b = get("/api/v1/models/baseline")
    assert "layerSizes" in b and "neuralNetwork" in b
    print(f"5. Baseline: {b['name']} arch={b['layerSizes']} acc={b['testAccuracyBaseline']}%")
    ok += 1

    # 6. Deletions
    dels = get("/api/v1/deletions")
    confirmed = [x for x in dels if x["status"] == "CONFIRMED"]
    print(f"6. Deletions: {len(dels)} total, {len(confirmed)} confirmed")
    ok += 1

    # 7. Sub-endpoints for a confirmed request
    if confirmed:
        rid = confirmed[0]["id"]
        cid = confirmed[0]["customerId"]
        print(f"7. Sub-endpoints for {rid} ({cid}):")
        for name, ep in [
            ("stages", f"/api/v1/deletions/{rid}/stages"),
            ("progress", f"/api/v1/deletions/{rid}/progress"),
            ("model-evidence", f"/api/v1/deletions/{rid}/model-evidence"),
            ("storage-evidence", f"/api/v1/deletions/{rid}/storage-evidence"),
            ("evidence", f"/api/v1/deletions/{rid}/evidence"),
            ("receipt", f"/api/v1/deletions/{rid}/receipt"),
        ]:
            try:
                r = get(ep)
                print(f"   OK  {name}")
                ok += 1
            except Exception as e:
                print(f"   FAIL {name}: {e}")
                fail += 1

    # 8. Collections
    exps = get("/api/v1/experiments")
    evid = get("/api/v1/evidence")
    rcpts = get("/api/v1/receipts")
    print(f"8. Experiments: {len(exps)}, Evidence: {len(evid)}, Receipts: {len(rcpts)}")
    ok += 1

    print(f"\n=== RESULT: {ok} passed, {fail} failed ===")
    sys.exit(1 if fail > 0 else 0)

if __name__ == "__main__":
    main()
