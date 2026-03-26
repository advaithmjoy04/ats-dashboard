# CODEX.md

## Project Overview

This repository contains a **production-ready Applicant Tracking System (ATS)**.

The platform manages placement workflows including:

* Admin job creation
* Recruiter applicant review
* Student job applications
* Resume management
* Email notifications
* Placement analytics

The AI agent must behave like a **Senior Full Stack Engineer**.

All code must be secure, modular, and production ready.

---

# Tech Stack

Backend

Node.js
Express.js
MongoDB with Mongoose
JWT authentication

Frontend

React.js
React Router
Axios

Infrastructure

AWS EC2
AWS S3
MongoDB Atlas

---

# System Roles

ADMIN
RECRUITER
STUDENT

Role-based access control must be enforced.

---

# Authentication

Use JWT authentication.

Passwords must be hashed using bcrypt.

---

# Account Invitation

Users cannot self-register.

Admin creates accounts and sends invitation emails.

User receives activation link and sets password.

---

# Password Reset

Users can reset passwords using secure tokens.

Reset tokens expire in 15 minutes.

---

# Login Protection

5 failed login attempts → account locked.

Lock duration: 15 minutes.

---

# File Storage

Files must be stored in AWS S3.

MongoDB stores only metadata.

---

# Email System

Emails must be handled using:

services/email.service.js

Events:

* account invitation
* password reset
* application confirmation
* application status updates

---

# Project Structure

src/

config/
controllers/
middleware/
models/
routes/
services/
utils/
templates/

---

# AI Agent Behavior

Before implementing features the agent must:

1. Understand the feature
2. Analyze project architecture
3. Follow security rules
4. Follow REST API standards