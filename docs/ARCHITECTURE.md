# System Architecture

The ATS platform currently follows a **multi-tenant SaaS architecture**.

Frontend -> Backend API -> Tenant Resolution + Auth -> Database / Storage / Email

---

# Core Architecture

## Frontend

The frontend is a React application that serves four user groups:

* Platform Super Admin
* Institute Admin
* Recruiter
* Student

The frontend loads institute branding dynamically and works in the context of a tenant (institute workspace).

## Backend

The backend is built with Node.js and Express.

It handles:

* tenant resolution
* authentication and authorization
* institute management
* job creation and management
* student applications
* email invitations and notifications
* audit logging

## Data Layer

MongoDB stores application data such as:

* tenants
* users
* jobs
* applications
* email groups
* audit logs

AWS S3 stores uploaded assets and documents such as:

* resumes
* institute logos
* favicons

---

# Tenant-Aware Design

Each institute is treated as a separate tenant workspace.

Every important record is scoped by `tenantId`, including:

* users
* jobs
* applications
* email groups
* audit logs

The backend resolves the tenant before handling the request and then applies role-based access control within that tenant.

## Institute-Specific Login Context

Each institute should have its own login entry point.

Supported login entry patterns now include:

* `/platform/login` for platform super admin
* `/t/{tenantSlug}/login` for institute-specific shared-host login
* custom domain login such as `https://ats.mite.edu/login`
* subdomain login such as `https://mite.yourapp.com/login`

Related auth flows follow the same tenant-specific pathing:

* `/t/{tenantSlug}/forgot-password`
* `/t/{tenantSlug}/reset-password`
* `/t/{tenantSlug}/activate`

This ensures that:

* institute admins sign in inside the correct workspace context
* tenant branding is loaded correctly before authentication
* activation and reset links land in the correct institute directory
* cross-institute login confusion is reduced

---

# Assigned Roles

## Platform Super Admin

Responsible for platform-level SaaS management.

Can:

* create institutes
* update institute settings
* activate or deactivate institutes
* delete institutes
* add or remove institute admins

## Institute Admin

Responsible for managing one institute workspace.

Can:

* invite students
* invite recruiters
* create jobs
* manage institute branding
* manage email groups
* view students, recruiters, and candidates

## Recruiter

Responsible for hiring workflow inside an institute.

Can:

* create jobs
* view the jobs created by them
* review applicants for their jobs
* update application status for their jobs

Constraint:

* a recruiter can manage only the jobs they created
* a recruiter cannot manage jobs owned by other recruiters
* admin can still view and manage recruiter-created jobs inside the same tenant

## Student

Responsible for applying to jobs within the institute.

Can:

* view available jobs
* submit an application for a job
* upload resume or required documents if needed
* track submitted applications

Updated behavior:

* instead of maintaining one reusable student profile for all jobs, the student fills the required details as part of the application flow
* this behaves like a form submission for each job
* students must enter the required information separately for every job application
* the old student profile page is no longer part of the active student navigation flow

---

# PyjamaHR-Style Job Architecture

The job module now follows a **guided multi-step job creation flow** inspired by PyjamaHR-style recruiting workflows.

Instead of a single simple job form, job setup is organized into structured steps.

## Job Creation Steps

### 1. About Job

This step captures the core job details.

Fields include:

* job title
* client or company
* department
* work mode such as in-office, hybrid, or remote
* location
* detailed job description
* required skills
* salary range
* work experience range
* employment type
* industry type
* education requirements
* number of openings

This step may also support preview before proceeding.

### 2. Application Form

Each job has its own configurable application form.

The recruiter or admin can decide which fields are:

* mandatory
* optional
* off

Supported standard fields include:

* first name
* last name
* email
* contact number
* address
* resume
* CGPA
* skills
* work experience
* education details
* notice period
* work link or portfolio

The application form also supports **custom screening questions**.

Possible question types include:

* yes or no
* single choice
* text input
* file upload
* URL

The system should show a live preview of the candidate-facing form during configuration, including newly added job-specific fields such as `CGPA` and `Skills`.

### 3. Hiring Flow

Each job has its own hiring pipeline.

Default stages can include:

* sourced
* applied
* contacted
* interview
* offered
* rejected

Additional stages can be configured for the job if needed.

This means candidate movement is handled per job and per pipeline stage.

### 4. Review and Publish

Before publishing, the recruiter or admin reviews:

* job details
* application form fields
* screening questions
* hiring stages

The active creation flow now ends with a direct publish action.

Rules:

* institute admin must assign a recruiter before publishing
* recruiter does not select another recruiter when creating their own job
* recruiter-created jobs are automatically owned by that recruiter
* admin can still view and manage recruiter-created jobs inside the tenant

## Job Listing Layout

The active job listing experience follows an ATS-style card layout.

Current behavior:

* jobs are displayed in a three-column dashboard-style grid on larger screens
* the old candidate stats row is not shown inside the listing cards
* each card highlights job title, company, location, employment type, created date, job ID, openings, and other role metadata
* card click is the primary interaction pattern instead of relying only on small inner buttons

Card click behavior:

* admin job card click opens the job management view
* recruiter job card click opens the candidate pipeline for that recruiter-owned job
* student job card click opens the application form for that job

---

# Job Management Flow

Both **Admin** and **Recruiter** are able to create jobs.

## Admin Job Flow

Admin can:

* create institute-wide jobs
* assign a recruiter before publishing a job
* configure application forms
* configure hiring stages
* monitor candidates across the institute

Admin publish rule:

* a job cannot be published from the admin flow unless at least one valid recruiter is assigned

## Recruiter Job Flow

Recruiter can:

* create a new job
* configure the job-specific application form
* configure the hiring stages for that job
* publish their own job without selecting another recruiter
* update only the jobs they created
* review applicants for those jobs
* move candidates through the stages of that job pipeline

This ensures recruiter ownership and prevents cross-recruiter job management.

Ownership and visibility rules:

* recruiter-created jobs receive the tenant-scoped institute job ID format such as `MITE-001`
* admin can access all jobs in the tenant, including recruiter-created jobs
* the recruiter who created the job can access it
* other recruiters cannot access or manage that recruiter-owned job

---

# Student Application Flow

The student application flow is now **job-specific and form-driven**.

## Current Flow

1. Student signs in to the institute workspace
2. Student views open jobs
3. Student selects a job
4. Student fills the application form configured for that specific job
5. Student answers custom screening questions if present
6. Student uploads resume or required files if requested
7. Student submits the application
8. Backend stores the application under the correct tenant and job

This means application data is collected for each job separately instead of relying on a single persistent profile for all jobs.

Important flow rule:

* students can open the job-specific application form directly from the job card
* job requirements such as CGPA and required resume presence are validated when the application is submitted
* the old profile-based eligibility badge is no longer the primary gate for opening the form
* the student uploads the resume as part of each job application form

Because of this shift, the student-facing profile page has been removed from the active navigation and application journey. The main student experience is now:

* open jobs
* job-specific application forms
* application tracking

---

# Candidate Management Flow

Candidate management is centered around each job and its hiring pipeline.

For each job, admin or recruiter can:

* view all candidates in a stage-wise board
* filter candidates
* open candidate details
* review resume
* review submitted application form data
* review attachments
* track comments and feedback
* move candidates between hiring stages

This creates a complete job-wise candidate tracking system instead of a simple application list.

---

# Implementation Plan

## Schema Changes

The current data model needs to be extended to support PyjamaHR-style job setup.

### Job Schema

The job entity should store structured job setup data instead of only basic posting information.

Additional fields should include:

* department
* client or business unit
* work mode
* locations
* salary configuration
* experience range
* employment type
* industry type
* education requirements
* openings
* required skills
* draft or publish state

The job should also contain nested configuration for:

* application form fields
* custom screening questions
* hiring pipeline stages

### Application Schema

The application entity should store job-specific form submissions.

Additional fields should include:

* submitted personal details
* submitted professional details
* screening question answers
* uploaded files
* stage history
* candidate notes or metadata if required later

This ensures that each application represents one complete response to one specific job form.

### Optional Supporting Schemas

To keep the design clean, the following can be modeled inside the job document or as separate reusable structures later:

* job application form field schema
* custom screening question schema
* hiring stage schema
* candidate timeline entries

---

## Backend Changes

### Controllers

The backend controllers will need to support the new flow.

#### Admin and Recruiter Job Controllers

Must support:

* creating jobs step-by-step or in one structured payload
* publishing jobs
* updating application form configuration
* updating hiring flow configuration
* validating recruiter assignment before admin publish
* auto-assigning the creator for recruiter-owned jobs

#### Student Controllers

Must support:

* fetching job-specific application form configuration
* validating required fields for that job
* accepting job-specific application answers
* storing screening question responses
* storing uploaded files and resume references per application

#### Candidate Management Controllers

Must support:

* listing candidates by job and stage
* moving candidates between stages
* fetching full candidate details for a job
* reading resume, form answers, and attachments together
* logging stage transitions and status updates

### Validation Rules

Backend validation must ensure:

* recruiters can update only their own jobs
* student applications match the configured job form
* required form fields are not skipped
* stage movement happens only within valid job stages
* tenant isolation remains enforced for all job and application operations

---

## Frontend Changes

### Job Creation UI

The current job creation interface should be replaced with a wizard-style flow.

Recommended steps:

* About Job
* Application Form
* Hiring Flow
* Review and Publish

Each step should support:

* validation before next step
* edit before final publish

Current publish UX rules:

* no saved-draft button is exposed in the active job creation experience
* admin must select a recruiter before the final publish action becomes valid
* recruiter creation hides recruiter assignment and publishes under the creator's ownership

### Application Form Builder UI

The interface should allow admins and recruiters to:

* toggle default fields as mandatory, optional, or off
* add custom screening questions
* choose question type
* preview the candidate-facing form live

### Candidate Pipeline UI

The job details page should show:

* pipeline columns by stage
* candidate cards inside each stage
* candidate detail panel or modal
* resume view
* application form responses
* comments, feedback, and timeline placeholders

### Search Behavior

The shared topbar search is intended to support practical ATS discovery across the current workspace.

Admin-side search should support fields such as:

* job ID
* role or title
* company name
* department
* required skills
* candidate name
* email
* USN
* branch

Recruiter-side search should support fields such as:

* recruiter-owned job ID
* role or title
* company name
* candidate name
* email
* USN
* branch
* current hiring stage
* matched skills and priority skills

### Student Application UI

Instead of showing only a profile form, the student should see:

* job details
* a job-specific application form
* required fields and uploads
* screening questions
* submit confirmation

---

## Route and API Changes

The API will need clearer separation between job setup and application submission.

Examples of required capabilities:

* update job basic details
* update job application form
* update hiring flow
* publish job
* fetch job form for student
* submit student application
* list candidates by stage
* move candidate to another stage
* fetch full candidate details for a job

---

## Security Considerations

Security must remain enforced while adding the richer workflow.

Important rules:

* all jobs must remain tenant-scoped
* all applications must remain tenant-scoped
* recruiters must not manage jobs created by other recruiters
* admin publish must fail safely if no valid recruiter assignment is present
* recruiter-owned job access must be enforced on the backend, not only hidden in the UI
* recruiter candidate pages must fail safely if candidate records are incomplete or partially missing
* students must not access internal recruiter-only job pipeline data
* custom question answers and uploaded files must stay tied to the correct tenant and job
* stage movement and candidate actions should be audit logged

---

## Recommended Build Order

1. Extend the job schema
2. Extend the application schema
3. Implement publish validation and recruiter ownership support
4. Build the About Job step
5. Build the Application Form step
6. Build the Hiring Flow step
7. Build the Review and Publish step
8. Replace student profile-based apply flow with job-specific application submission
9. Build job-wise candidate pipeline view
10. Add candidate detail drawer with resume and application answers

---

## Summary of the New Direction

The ATS is moving from a simple job posting system to a structured hiring workflow platform.

The new system will provide:

* richer job setup
* job-specific application forms
* customizable screening questions
* job-specific hiring stages
* structured candidate movement through the pipeline
* better recruiter and admin control over the hiring process

---

# Authentication Flow

1. User opens the correct institute login page
2. Frontend resolves tenant from the institute-specific route, custom domain, subdomain, or shared-host tenant path
3. Frontend sends login request with tenant context
4. Backend validates credentials and tenant access
5. Backend issues JWT token
6. Frontend includes token and tenant context in protected requests

Security checks include:

* tenant-aware authentication
* role-based access control
* tenant-aware CORS
* audit logging for sensitive operations
* institute-specific auth links for activation and password reset

---

# Email System

Email events are handled through the email service.

Supported email flows include:

* account invitation
* password reset
* application updates
* bulk activation through email groups

Emails are tenant-aware and use institute-specific branding and links where applicable.

---

# High-Level Data Flow

1. Frontend sends request
2. Backend resolves tenant
3. Backend authenticates user
4. Backend checks role permissions
5. Controller performs tenant-scoped business logic
6. Data is stored in MongoDB or files in S3
7. Notifications or emails are triggered when required

---

# Summary

The current ATS system is a **multi-tenant SaaS placement platform** with:

* a platform layer for super admin management
* institute-level workspaces
* admin and recruiter job creation
* recruiter-owned job management
* per-job student application forms
* tenant-aware security and branding
