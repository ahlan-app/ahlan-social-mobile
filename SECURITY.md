# Security Policy

## Overview

Ahlan Social takes security seriously. This document outlines our approach to handling security vulnerabilities and provides guidance on what is and isn't a security concern in this project.

## What Is a Security Vulnerability

- **SQL injection** or other injection flaws in Supabase queries or RLS policies
- **Authentication bypass** — any way to access protected resources without valid credentials
- **Data exposure** — unintended leakage of private user data
- **Cross-site scripting** or other client-side injection vectors
- **Hardcoded secrets** — private keys, service role keys, or passwords committed to the repository

## What Is NOT a Security Vulnerability

- **The Supabase anon key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`)** being visible in client-side code. This key is **designed to be public** — it is shipped with every React Native app using Supabase. Access is governed by Row Level Security (RLS) policies on the database side, and the anon key cannot bypass RLS or perform admin operations.
- **Development configuration values** in `.env.example` — these are placeholder values, not real credentials.
- **General bug reports** — use [GitHub Issues](https://github.com/sametyilmaztemel/ahlan-social-mobile/issues) for non-security bugs.

## Reporting a Vulnerability

If you believe you've found a security vulnerability:

1. **Do not** open a public GitHub Issue for security vulnerabilities.
2. Use [GitHub Security Advisories](https://github.com/sametyilmaztemel/ahlan-social-mobile/security/advisories/new) to report privately.
3. Alternatively, email the maintainer directly if a contact is listed in their GitHub profile.
4. Please include:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We aim to acknowledge reports within 48 hours and provide a resolution timeline as soon as possible.

## Environment Files

- `.env.example` is tracked in git and contains only placeholder values — it is safe to commit.
- `.env.local` is **gitignored** and must never be committed. It contains real Supabase project credentials.
- **Never** commit a Supabase service role key (`supabase_service_role_key`). This key bypasses RLS and grants full admin access to your database.

## Supabase RLS

Ensure all database tables have appropriate Row Level Security policies. The anon key alone should never be sufficient to read or modify data that should be restricted.

## License

Ahlan Social is © 2026 Ahlan Social, licensed under the [Apache License 2.0](LICENSE). Coded by Samet Yilmaz Temel. Security research and responsible disclosure activities are authorized provided they comply with applicable law and the terms of the license.