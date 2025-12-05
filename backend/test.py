#!/usr/bin/env python3
"""
xxiot_devices.py
Login -> get token -> request device list (uses header name "token")
Requires: pip install requests
"""

import requests
import sys

HOST = "https://api.shangxiang.ai-aroma.tech"
LOGIN_PATH = "/xxiot/api/login"
DEVICE_LIST_PATH = "/xxiot/api/device/list"

def login(account: str, password: str) -> str:
    url = HOST + LOGIN_PATH
    payload = {"account": account, "password": password}
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, json=payload, headers=headers, timeout=15)
    try:
        j = resp.json()
    except Exception:
        print("[LOGIN] Non-JSON response:", resp.text)
        return ""
    print("[LOGIN] status:", resp.status_code, "response:", j)
    # token sits at top-level "token" in your case
    return j.get("token", "")

def get_device_list(token: str):
    url = HOST + DEVICE_LIST_PATH
    # This API expects header name "token" (not "Authorization" or "Bearer")
    headers = {
        "token": token,
        "Content-Type": "application/json"
    }
    resp = requests.get(url, headers=headers, timeout=15)
    try:
        j = resp.json()
    except Exception:
        print("[DEVICES] Non-JSON response:", resp.text)
        return None
    print("[DEVICES] status:", resp.status_code, "response:", j)
    return j

def main():
    # <-- replace these with real credentials
    ACCOUNT = "shreyansh.sangwan@innovatiview.com"
    PASSWORD = "admin@123"

    token = login(ACCOUNT, PASSWORD)
    if not token:
        print("❌ Failed to get token. Check credentials or login response.")
        sys.exit(1)

    print("✅ Obtained token:", token)
    devices = get_device_list(token)
    if devices is None:
        print("❌ Failed to fetch device list.")
        sys.exit(2)

    # Example: print device names and ids (if present)
    try:
        records = devices.get("data", {}).get("records", [])
        print("\nDevices found:", len(records))
        for r in records:
            print("-", r.get("name"), "| id:", r.get("id"), "| status:", r.get("status"))
    except Exception:
        pass

if __name__ == "__main__":
    main()
