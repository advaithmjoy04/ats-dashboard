# ATS Platform

A production-ready **Applicant Tracking System (ATS)** designed for institutional placement management.

The platform allows:

* Admins to create job postings
* Recruiters to review applicants
* Students to apply for jobs
* Resume storage and management
* Email notifications
* Placement analytics

The system is designed with **secure and scalable architecture**.

---

# Tech Stack

Backend

* Node.js
* Express.js
* MongoDB (Mongoose)
* JWT Authentication

Frontend

* React.js
* React Router
* Axios

Infrastructure

* AWS EC2
* AWS S3
* MongoDB Atlas

---

# Development

Install dependencies

npm install

Run development server

npm run dev

Start production server

npm start

---

# Documentation

Project documentation:

* CODEX.md
* docs/PROJECT_PLAN.md
* docs/DATABASE_SCHEMA.md
* docs/API_SPEC.md
* docs/SECURITY_POLICY.md
* docs/DEPLOYMENT.md
* docs/ARCHITECTURE.md

---

# Password Security and UX

The authentication layer uses a shared password policy across the frontend and backend.

## Password visibility toggle

Auth-related forms use a reusable password input with a show/hide visibility toggle so users can verify what they typed without leaving the flow.

Applied in:

* login
* account activation / first-password setup
* reset password
* forced password change
* temporary password entry in platform admin provisioning flows

## Password validation rules

All newly set passwords must satisfy the following rules:

* minimum 8 characters
* at least 1 uppercase letter
* at least 1 lowercase letter
* at least 1 number
* at least 1 special character

## Frontend + backend validation

The password rules are enforced in two places:

* frontend validation for real-time guidance, disabled submit states, confirm-password matching, and smoother UX
* backend validation for final enforcement before any password is stored or updated

This keeps the user experience helpful while still ensuring invalid passwords cannot bypass the server.

## Security practices

Passwords are never stored in plain text.

The backend hashes passwords with `bcrypt` before storage and only compares hashes during authentication or password-confirmation checks.

## UX improvements

Password forms now provide:

* real-time password rule feedback while typing
* confirm-password mismatch detection
* non-intrusive validation that appears only on focus or input
* a consistent reusable password field across auth screens
