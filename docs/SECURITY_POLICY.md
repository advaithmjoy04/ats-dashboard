# Security Policy

The ATS platform must implement strong security protections.

---

# Authentication

JWT authentication

bcrypt password hashing

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
