# API Specification

Base path

/api/v1/

---

# Authentication

POST /api/v1/auth/login

POST /api/v1/auth/forgot-password

POST /api/v1/auth/reset-password

POST /api/v1/auth/force-password-change

POST /api/v1/auth/activate

GET /api/v1/auth/me

Password rules enforced server-side for password-setting endpoints:

* minimum 8 characters
* at least 1 uppercase letter
* at least 1 lowercase letter
* at least 1 number
* at least 1 special character

Validation applies to:

* account activation / first password setup
* reset password
* forced password change
* temporary admin password creation in platform tenant provisioning

---

# Student

GET /api/v1/students/profile

PUT /api/v1/students/profile

POST /api/v1/students/resume

GET /api/v1/students/jobs

POST /api/v1/students/applications

GET /api/v1/students/applications/my

GET /api/v1/jobs

POST /api/v1/applications

GET /api/v1/applications/my

---

# Recruiter

GET /api/v1/recruiters/jobs

GET /api/v1/recruiters/jobs/:jobId/applicants

PATCH /api/v1/recruiters/applications/:id

---

# Admin

POST /api/v1/admin/jobs

GET /api/v1/admin/jobs

GET /api/v1/admin/recruiters

POST /api/v1/admin/students

POST /api/v1/admin/recruiters

GET /api/v1/admin/candidates

GET /api/v1/admin/dashboard
