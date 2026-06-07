# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |

## Reporting a Vulnerability

DVAP is an intentionally vulnerable platform for security research and education. The labs inside DVAP are **designed to be exploited** as part of the learning experience.

However, if you discover a vulnerability in the **platform itself** (the API, dashboard, database, or infrastructure code) rather than inside a lab, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities in the platform.**

### How to Report

Send details to: **sonuoffsec@icloud.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

### What to Expect

- Acknowledgement within 48 hours
- Status update within 7 days
- Credit in release notes if you wish

## Scope

### In Scope
- Authentication or authorization issues in the platform API
- Remote code execution outside of lab containers
- Data exposure from the platform database
- Container escape from lab instances to the host

### Out of Scope
- Vulnerabilities inside the lab environments (those are intentional)
- Attacks requiring physical access to the host machine
- Social engineering

## Responsible Disclosure

We follow responsible disclosure practices. We ask that you give us reasonable time to address a valid vulnerability before making it public.

Thank you for helping keep DVAP secure.
