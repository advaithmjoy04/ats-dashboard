# System Architecture

The ATS platform follows a **three layer architecture**.

Frontend → Backend API → Database

---

# Components

Frontend

React dashboard used by:

* Students
* Recruiters
* Admin

Backend

Node.js + Express REST API.

Handles:

* authentication
* job management
* applications
* analytics

Database

MongoDB stores structured data.

AWS S3 stores files.

---

# File Storage Flow

Student uploads resume

Frontend → request upload URL
Backend → generates S3 presigned URL
Frontend → uploads directly to S3
Backend → stores file URL in MongoDB

---

# Authentication Flow

User login

Frontend → login request
Backend → verify credentials
Backend → issue JWT token
Frontend → attach token in requests

---

# Email System

Email events are processed through:

email.service.js

Emails include:

* account invitation
* password reset
* application updates
