# API Specification

Base path

/api/v1/

---

# Authentication

POST /api/v1/auth/login

POST /api/v1/auth/forgot-password

POST /api/v1/auth/reset-password

GET /api/v1/auth/me

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
