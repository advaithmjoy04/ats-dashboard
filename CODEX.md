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

# Production Safety Rules

Before modifying any file:

1. Analyze all dependencies of the file.
2. Identify routes, controllers, services, and models affected.
3. Explain the planned change.
4. Estimate risk level.

Never modify without explicit reason:

* API contracts
* Route paths
* Request payload structures
* Response payload structures
* Authentication flows
* Authorization flows
* Database schemas
* Multi-tenant architecture

If a change may affect existing functionality:

STOP and explain the impact before proceeding.

---

# Frontend Rules

Frontend changes must:

* Preserve all API calls
* Preserve all route navigation
* Preserve all business logic
* Preserve all validation rules
* Preserve state management

Frontend redesigns may modify:

* Styling
* Layout
* Components
* Typography
* Responsiveness
* Accessibility

Only presentation-layer changes are allowed unless explicitly requested.

---

# Backend Rules

Backend changes must:

* Remain backward compatible
* Preserve all API endpoints
* Preserve all response structures
* Preserve authentication behavior
* Preserve role permissions

Focus on:

* Security
* Scalability
* Logging
* Monitoring
* Error handling
* Performance optimization

---

# Multi-Tenant Rules

The system supports multiple institutes.

Always preserve:

* Tenant isolation
* Institute-specific settings
* Institute-specific SMTP configurations
* Institute branding
* Institute user separation

Never allow data leakage across tenants.

---

# Email System Rules

Email delivery must support:

* Account invitations
* Password reset
* Application confirmation
* Application status updates

Each institute may have its own SMTP configuration.

Never hardcode SMTP credentials.

---

# Verification Checklist

After every task verify:

□ Routes still work
□ APIs still work
□ Authentication works
□ Role permissions work
□ Student applications work
□ Recruiter review flow works
□ Admin workflow works
□ Email workflow works
□ Existing UI remains functional

Changes are not complete until verification passes.

---

# Current State & Features

The platform is in a production-ready multi-tenant SaaS state, featuring the following implementations:

### 1. Unified Dark Theme Branding (inspired by MNGO)
*   **Typography**: Outfitted with **Hanken Grotesk** google fonts as the primary typography.
*   **Theme**: Vibrant dark-green and pulp-orange accented dark-mode layout with glassmorphic cards, custom scrollbar styling, and smooth transition animations.
*   **Branding Logo**: Embedded custom MNGO vector brand mark into the login layout and sidebar branding header.

### 2. Isolated SaaS Console Architecture
*   **Tenant vs. Control Plane Isolation**: The platform super admin console (`/platform/*`) is strictly isolated from tenant branding settings. Customized tenant colors (primary/secondary) are only applied when rendering tenant workspaces, while the Super Admin console remains uniform under standard platform styling.
*   **Multi-Tenant S3 Assets**: Resolves tenant assets (logos, favicons) dynamically on shared hosts using tenant-injected query slugs (`?tenant=slug`), ensuring correct branding resolution in local development and production.
*   **Relaxed Asset URLs**: Modified logo and favicon settings validations to accept both relative endpoints (e.g. `/api/v1/tenant/assets/...`) and absolute paths.

### 3. Core Workflow Implementations
*   **Deactivation & Deletion**: Fully operational across the entire project (recruiters, students, jobs, email groups), supported by clean Mongo `ObjectId` and `Date` serialization checks.
*   **Automated Verification**: Full suite of 5 integration test suites to assert authentication, security isolation, delete operations, and multi-tenant assets.

