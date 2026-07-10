# Security Policy

The ATS platform must implement strong security protections.

---

# Authentication

JWT authentication

bcrypt password hashing

Password rules for all newly set passwords:

* minimum 8 characters
* at least 1 uppercase letter
* at least 1 lowercase letter
* at least 1 number
* at least 1 special character

These rules are enforced on both the frontend and backend.

Frontend responsibilities:

* password visibility toggle
* real-time rule feedback
* confirm-password mismatch detection
* disabled submit until valid

Backend responsibilities:

* centralized password rule validation
* rejection of invalid passwords with clear messages
* hashing with `bcrypt` before persistence

Applied password flows:

* login visibility toggle
* account activation / first-password setup
* reset password
* forced password change
* temporary password assignment in platform provisioning

Passwords must never be stored, logged, or returned in plain text.

---

# Login Protection

Rate limiting

5 login attempts per minute.

Account lockout

5 failed attempts → 15 minute lock.

---

# API Security

All endpoints must verify:

authentication
authorization
input validation

---

# File Security

Files stored in AWS S3.

Allowed formats

PDF
DOC
DOCX

Maximum size

5MB

---

# Secrets

Secrets must be stored in environment variables.

Never commit

.env
AWS keys
JWT secrets
