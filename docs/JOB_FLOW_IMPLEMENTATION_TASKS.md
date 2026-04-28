# PyjamaHR-Style Job Flow Implementation Tasks

This document breaks the new job architecture into practical implementation tasks.

The goal is to move the ATS from a simple job posting module to a structured hiring workflow with:

* multi-step job creation
* per-job application forms
* screening questions
* per-job hiring pipeline
* candidate pipeline management

---

# Phase 1: Data Model Updates

## Job Model

- [ ] extend the job schema with structured fields:
  - department
  - client
  - workMode
  - locations
  - salary configuration
  - experience range
  - employment type
  - industry type
  - education requirements
  - openings
  - skills
  - draft or publish state
- [ ] add nested application form configuration to the job
- [ ] add nested screening question configuration to the job
- [ ] add nested hiring pipeline stage configuration to the job
- [ ] add indexes needed for status, owner, and tenant-scoped querying

## Application Model

- [ ] extend the application schema to store job-specific form answers
- [ ] add screening question answers
- [ ] add uploaded file references
- [ ] add stage tracking or stage history support
- [ ] ensure one student can still apply only once per job unless the product rule changes

## Optional Supporting Structures

- [ ] define a reusable schema structure for application fields
- [ ] define a reusable schema structure for screening questions
- [ ] define a reusable schema structure for pipeline stages

---

# Phase 2: Backend Job Setup APIs

## Admin and Recruiter Job APIs

- [ ] create or update API for draft job creation
- [ ] create or update API for About Job details
- [ ] create or update API for Application Form step
- [ ] create or update API for Hiring Flow step
- [ ] create or update API for Review and Publish step
- [ ] allow save-as-draft support
- [ ] allow publish support
- [ ] allow preview support

## Ownership and Access Rules

- [ ] ensure admin can manage all jobs inside the tenant
- [ ] ensure recruiter can create jobs
- [ ] ensure recruiter can manage only jobs they created or explicitly own
- [ ] reject recruiter attempts to update another recruiter’s job

## Validation

- [ ] validate required fields in About Job
- [ ] validate application form field configuration
- [ ] validate screening question types
- [ ] validate pipeline stage structure
- [ ] validate draft vs published state rules

---

# Phase 3: Frontend Job Creation Wizard

## About Job Step

- [ ] build job basic details page
- [ ] add department, client, work mode, location fields
- [ ] add job description editor
- [ ] add skills selector
- [ ] add salary and experience fields
- [ ] add education, openings, and optional metadata
- [ ] add next-step validation

## Application Form Step

- [ ] build field toggles for mandatory, optional, off
- [ ] include standard fields like:
  - name
  - email
  - contact number
  - address
  - resume
  - work experience
  - education details
  - notice period
  - work link or portfolio
- [ ] build custom screening question creator
- [ ] support question types such as:
  - yes or no
  - single choice
  - text
  - file upload
  - URL
- [ ] add live preview of the candidate application form

## Hiring Flow Step

- [ ] build stage configuration UI
- [ ] preload default stages
- [ ] allow stage rename
- [ ] allow custom stage addition if desired
- [ ] validate stage order and structure

## Review and Publish Step

- [ ] build preview page or modal
- [ ] show job summary
- [ ] show application form summary
- [ ] show hiring flow summary
- [ ] add edit and publish actions

---

# Phase 4: Student Application Flow

- [ ] remove dependency on one reusable student profile for job submission
- [ ] fetch application form schema from the selected job
- [ ] render job-specific application form dynamically
- [ ] render screening questions dynamically
- [ ] support resume and attachment upload if configured
- [ ] validate required answers before submission
- [ ] submit form answers to application API
- [ ] show submission success and application tracking state

---

# Phase 5: Candidate Management

## Job Candidate Board

- [ ] build job-wise candidate pipeline board
- [ ] show candidates grouped by stage
- [ ] show counts per stage
- [ ] allow moving candidates between stages
- [ ] enforce recruiter ownership rules

## Candidate Detail View

- [ ] build candidate detail drawer or modal
- [ ] show resume
- [ ] show submitted application form answers
- [ ] show screening question responses
- [ ] add comments and feedback section placeholders
- [ ] add attachments section
- [ ] add timeline or activity section

## Filters

- [ ] add candidate filters
- [ ] add keyword filter
- [ ] add experience filter
- [ ] add stage filter
- [ ] add application status filter

---

# Phase 6: Security and Audit

- [ ] ensure all jobs remain tenant-scoped
- [ ] ensure all applications remain tenant-scoped
- [ ] ensure recruiters cannot manage jobs they do not own
- [ ] ensure students cannot access recruiter-only candidate data
- [ ] ensure uploaded files stay bound to the correct tenant and job
- [ ] add audit logging for:
  - job creation
  - job publish
  - job update
  - stage updates
  - candidate stage movement
  - screening question updates

---

# Phase 7: Cleanup and Migration

- [ ] review current student profile usage and identify what should remain
- [ ] migrate old jobs if necessary to default application form and default pipeline
- [ ] ensure old applications do not break new UI
- [ ] add backward compatibility handling where needed

---

# Phase 8: Testing

- [ ] test admin job creation flow
- [ ] test recruiter job creation flow
- [ ] test recruiter ownership restrictions
- [ ] test student application submission for a job-specific form
- [ ] test required field validation
- [ ] test screening question submissions
- [ ] test candidate stage movement
- [ ] test tenant isolation on jobs and applications
- [ ] test draft and publish behavior

---

# Suggested Order of Execution

1. update schemas
2. build backend draft and publish APIs
3. build About Job step
4. build Application Form step
5. build Hiring Flow step
6. build Review and Publish step
7. build student dynamic application flow
8. build candidate pipeline board
9. build candidate details view
10. add audit and final security checks

---

# Success Criteria

The implementation is complete when:

- [ ] admin can create a complete job in multiple steps
- [ ] recruiter can create and manage only their own jobs
- [ ] each job has its own application form
- [ ] each job has its own hiring flow
- [ ] students fill job-specific forms instead of relying only on one profile
- [ ] candidates can be managed in a stage-wise pipeline
- [ ] tenant isolation and recruiter ownership remain secure
