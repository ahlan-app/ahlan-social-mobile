#!/usr/bin/env python3
"""Ahlan Social — Automated Test Batch Runner & Committer

Usage: python3 scripts/run_batch.py <batch_number>
Batch numbers: 1-10 (see test_batches/ for content)
"""

import json
import os
import subprocess
import sys
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
BATCHES_DIR = os.path.join(SCRIPT_DIR, 'test_batches')
COUNTER_FILE = os.path.join(SCRIPT_DIR, '.batch_counter')

BATCH_METADATA = {
    1: {
        "name": "UserAvatar & Icon component tests",
        "commit": "test: add UserAvatar color logic and Icons component tests",
    },
    2: {
        "name": "FlagContent math function tests",
        "commit": "test: add FlagContent wave/star path geometry tests",
    },
    3: {
        "name": "API service edge case tests",
        "commit": "test: add API service error handling and edge case tests",
    },
    4: {
        "name": "Types edge case coverage tests",
        "commit": "test: add type definitions edge case and validation tests",
    },
    5: {
        "name": "UserAvatar getColorForUsername pure function tests",
        "commit": "test: add UserAvatar color utility pure function tests",
    },
    6: {
        "name": "Notifications service tests",
        "commit": "test: add notification service permission and registration tests",
    },
    7: {
        "name": "Icons exhaustive SVG rendering tests",
        "commit": "test: add Icons exhaustive SVG component tests",
    },
    8: {
        "name": "Cross-module type safety tests",
        "commit": "test: add cross-module type safety and interface compliance tests",
    },
    9: {
        "name": "Date formatting and utility function tests",
        "commit": "test: add date formatting and PostCard utility tests",
    },
    10: {
        "name": "Final coverage and edge case tests",
        "commit": "test: add final coverage and comprehensive edge case tests",
    },
}


def log(msg):
    print(f"[batch-runner] {msg}", flush=True)


def get_batch_number():
    if len(sys.argv) > 1:
        return int(sys.argv[1])
    # Auto-increment mode
    if os.path.exists(COUNTER_FILE):
        with open(COUNTER_FILE) as f:
            return int(f.read().strip()) + 1
    return 1


def find_test_file(batch_num):
    """Find the test file for this batch, supporting .ts or .ts extension."""
    for ext in ['.ts']:
        fname = f'batch_{batch_num:02d}{ext}'
        fpath = os.path.join(BATCHES_DIR, fname)
        if os.path.exists(fpath):
            return fpath
    raise FileNotFoundError(f"Batch {batch_num} file not found in {BATCHES_DIR}")


def extract_commit_message(content):
    """Extract commit message from first line comment in test file."""
    lines = content.strip().split('\n')
    for line in lines[:5]:
        m = re.match(r'//\s*commit:\s*(.+)', line)
        if m:
            return m.group(1).strip()
    return None


def run():
    batch_num = get_batch_number()

    if batch_num not in BATCH_METADATA:
        log(f"All batches completed! (batch {batch_num} out of range)")
        return

    meta = BATCH_METADATA[batch_num]
    log(f"=== Running batch {batch_num}/10: {meta['name']} ===")

    # Find and read the test file
    src_path = find_test_file(batch_num)
    with open(src_path) as f:
        content = f.read()

    # Determine target path from content or convention
    # Convention: first comment line like // target: __tests__/components/Foo.test.ts
    target_match = re.search(r'//\s*target:\s*(.+)', content)
    if target_match:
        rel_path = target_match.group(1).strip()
    else:
        # Default: create __tests__/batch_NN.test.ts
        rel_path = f'__tests__/batch_{batch_num:02d}.test.ts'

    target_path = os.path.join(PROJECT_DIR, rel_path)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)

    log(f"Writing {rel_path}...")
    with open(target_path, 'w') as f:
        f.write(content)

    # Run tests
    log("Running npm test...")
    result = subprocess.run(
        ['npm', 'test'],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=180,
    )

    if result.returncode != 0:
        log(f"❌ TESTS FAILED (exit code {result.returncode})")
        # Print last 30 lines of output
        output_lines = result.stdout.split('\n') + result.stderr.split('\n')
        for line in output_lines[-40:]:
            print(line)
        # Clean up the failed test file
        os.remove(target_path)
        sys.exit(1)

    log("✅ All tests passed!")

    # Commit
    commit_msg = meta['commit']
    log(f"Committing: {commit_msg}")

    subprocess.run(['git', 'add', rel_path], cwd=PROJECT_DIR, capture_output=True)
    commit_result = subprocess.run(
        ['git', 'commit', '-m', commit_msg],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
    )
    log(commit_result.stdout.strip())

    # Push
    log("Pushing to GitHub...")
    push_result = subprocess.run(
        ['git', 'push'],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if push_result.returncode != 0:
        log(f"⚠️ Push issue: {push_result.stderr.strip()}")
    else:
        log(push_result.stdout.strip())

    # Increment counter
    with open(COUNTER_FILE, 'w') as f:
        f.write(str(batch_num))

    log(f"✅ Batch {batch_num}/10 complete! ({meta['name']})")


if __name__ == '__main__':
    run()
