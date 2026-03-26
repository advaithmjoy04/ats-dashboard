# Database Schema

Collections

Users
StudentProfiles
Jobs
Applications
EmailLogs

---

# Users

Fields

email
password
role
active
mustChangePassword
loginAttempts
lockUntil
passwordResetToken
passwordResetExpires
createdAt

Roles

ADMIN
RECRUITER
STUDENT

---

# StudentProfiles

userId
fullName
usn
branch
semester
cgpa
phone
skills[]
resumeUrl
profileCompleted

---

# Jobs

jobId
companyName
role
description
minCgpa
assignedRecruiters
active
createdAt

---

# Applications

studentId
jobId
status
createdAt

Statuses

APPLIED
SHORTLISTED
REJECTED
SELECTED

---

# EmailLogs

email
type
status
sentAt
userId
