# PyjamaHR-Style Job Flow: Step-by-Step Process

This document provides a clear implementation sequence for building the new job workflow.

The target outcome is:

* multi-step job creation
* job-specific application forms
* custom screening questions
* job-specific hiring pipeline
* recruiter-owned job management
* candidate pipeline management

---

# Step 1: Update the Job Data Model

Status: `Done`

First, extend the existing job schema so it can store all the new job setup information.

Add support for:

* department
* client
* work mode
* location
* salary details
* experience range
* employment type
* industry type
* education requirements
* number of openings
* required skills
* draft or published state

Also add nested data for:

* application form fields
* screening questions
* hiring flow stages

Goal of this step:

* the backend should be able to represent a complete PyjamaHR-style job configuration

---

# Step 2: Update the Application Data Model

Status: `Done`

Next, update the application schema so it stores job-specific application data instead of depending only on a reusable student profile.

Add support for:

* submitted personal details
* submitted professional details
* screening question answers
* uploaded files
* stage or stage history

Goal of this step:

* one application should fully capture one student’s response to one job

---

# Step 3: Add Publish Validation and Ownership Support

Status: `Done`

Before building the frontend flow, make the backend support safe job publication and recruiter ownership.

Add:

* publish support
* validation rules for published jobs
* recruiter auto-ownership for recruiter-created jobs
* institute-specific job IDs such as `MITE-001`

Goal of this step:

* only valid jobs can be published
* admin-published jobs always have a recruiter assigned
* recruiter-created jobs stay visible to admin and isolated from other recruiters

---

# Step 4: Build the About Job Step

Status: `Done`

Create the first step of the job creation wizard.

Include:

* job title
* client
* department
* work mode
* locations
* job description
* required skills
* salary
* experience
* employment type
* industry type
* education
* openings

Add validation for required values before moving to the next step.

Goal of this step:

* recruiter or admin can define the complete basic job setup

---

# Step 5: Build the Application Form Step

Status: `Done`

Create the second step of the wizard for form configuration.

Include standard fields such as:

* name
* email
* contact number
* address
* resume
* work experience
* education details
* notice period
* work link or portfolio

For each field, allow:

* mandatory
* optional
* off

Also add:

* custom screening questions
* question type selection
* live application form preview

Goal of this step:

* every job can define its own candidate application form

---

# Step 6: Build the Hiring Flow Step

Status: `Done`

Create the third step of the wizard for pipeline setup.

Add default stages such as:

* sourced
* applied
* contacted
* interview
* offered
* rejected

Allow:

* stage rename
* optional custom stage addition if required
* stage order validation

Goal of this step:

* every job has its own hiring pipeline

---

# Step 7: Build the Review and Publish Step

Status: `Done`

Create the last step of the wizard.

Show:

* About Job summary
* Application Form summary
* Hiring Flow summary

Provide actions for:

* edit
* publish

Goal of this step:

* the creator can verify everything before making the job live
* the active job creation flow stays publish-only

---

# Step 8: Replace the Student Profile-Based Apply Flow

Status: `Done`

Now update the student-side experience.

Instead of relying on one reusable profile for every job:

* fetch the selected job’s application form schema
* render the dynamic form
* show job-specific required fields
* show job-specific screening questions
* allow resume or file upload if required

Goal of this step:

* students submit data specifically for each job they apply to

---

# Step 9: Save Job-Specific Application Responses

Status: `Done`

When the student submits the form:

* validate required fields
* validate uploaded files
* validate custom question answers
* store everything in the application record

Goal of this step:

* the backend stores the exact form response for that specific job

---

# Step 10: Build the Candidate Pipeline Board

Status: `Done`

After jobs and applications work, build the job-wise candidate board.

Show:

* candidates grouped by stage
* counts per stage
* job-level filters

Support:

* moving candidates between stages
* viewing candidate lists for each stage

Goal of this step:

* recruiter and admin can manage candidates visually through the hiring flow

---

# Step 11: Build the Candidate Detail View

Status: `Done`

Create the candidate detail panel or modal.

Show:

* resume
* application form responses
* screening question answers
* attachments
* comments
* feedback
* timeline

Goal of this step:

* recruiter and admin can review one candidate completely without leaving the job context

---

# Step 12: Enforce Recruiter Ownership Rules

Status: `Done`

Now tighten permissions.

Ensure:

* admin can manage all tenant jobs
* recruiter can create jobs
* recruiter can edit only jobs they created
* recruiter cannot manage another recruiter’s job

Goal of this step:

* job ownership remains secure

---

# Step 13: Add Audit Logging

Status: `Done`

Audit the sensitive job and candidate actions.

Log:

* job creation
* publish
* stage configuration changes
* candidate stage movement
* application form configuration changes

Goal of this step:

* changes are traceable for security and accountability

---

# Step 14: Test the Entire Flow

Status: `Done`

Test these scenarios:

* admin creates and publishes a job
* recruiter creates and publishes a job
* recruiter cannot edit another recruiter’s job
* student applies to a job with dynamic fields
* student submits screening question answers
* candidate appears in the correct stage
* recruiter moves candidate through stages
* tenant isolation remains intact

Goal of this step:

* the full workflow behaves correctly from job creation to candidate management

---

# Step 15: Polish and Roll Out

Status: `Done`

Once the workflow is stable:

* refine the UI
* improve validations and inline errors
* migrate older jobs if required
* clean up unused old profile dependencies
* remove the old student profile page from the active student navigation
* keep the final job flow publish-only for admins and recruiters

Goal of this step:

* ship a polished production-ready job workflow

---

# Final Outcome

When all steps are complete, the platform will support:

* structured multi-step job creation
* PyjamaHR-style application form configuration
* job-specific candidate submissions
* per-job hiring pipelines
* job-level candidate review and movement
* secure recruiter ownership and tenant isolation
