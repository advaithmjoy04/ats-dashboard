# Security-First SaaS Task List

This file is the working task list for the remaining SaaS conversion of the ATS platform.

Rule for all future work:
- Security takes priority over speed, UI polish, and convenience.
- No multi-tenant feature is considered complete unless tenant isolation is verified.
- No domain, branding, or onboarding feature should weaken auth, access control, or data boundaries.

## Current Status

Already completed:
- tenant model and tenant ownership fields
- tenant middleware foundation
- tenant-aware auth foundation
- tenant branding context in frontend
- institute branding settings page
- logo and favicon upload support
- tenant-branded email sending
- first tenant-isolation cleanup pass

Partially completed:
- tenant isolation across controllers and services
- tenant-aware host resolution
- tenant-aware job and recruiter assignment checks

Not completed:
- full hostile tenant-isolation audit
- platform super-admin layer
- tenant provisioning workflow
- custom domain and subdomain onboarding
- strict tenant-aware CORS
- production-grade security and regression test coverage
- tenant-scoped email groups and bulk activation workflow

## Priority Order

1. Complete tenant-isolation audit and fixes
2. Add security tests for cross-tenant denial
3. Add platform super-admin role and APIs
4. Build tenant provisioning workflow
5. Build custom domain and subdomain onboarding
6. Tighten tenant-aware CORS and trusted host validation
7. Add audit logging for sensitive SaaS actions
8. Add platform admin UI
9. Add onboarding UI for institute creation
10. Run full regression and deployment verification

## Phase 1: Tenant Isolation Hardening

Objective:
- Ensure one institute can never access another institute's data.

Tasks:
- review every controller query for tenant scoping
- review every service query for tenant scoping
- review every `populate` for tenant-safe matching
- review every create flow so `tenantId` is assigned server-side only
- review every update and delete flow so tenant ownership is enforced
- review email, invite, reset, and activation flows for tenant binding
- review dashboard summary and aggregate queries for tenant filtering
- review file access URLs and asset URLs for tenant separation

Files to inspect closely:
- `src/controllers/adminController.js`
- `src/controllers/authController.js`
- `src/controllers/studentController.js`
- `src/controllers/recruiterController.js`
- `src/controllers/tenantController.js`
- `src/services/atsService.js`
- `src/services/email.service.js`
- `src/middleware/auth.js`
- `src/middleware/tenant.js`

Definition of done:
- no controller or service query is missing tenant filtering where required
- no request body can override tenant ownership
- no token can be used across tenants
- no recruiter or admin can act on foreign-tenant records

## Phase 2: Security Test Coverage

Objective:
- Prove tenant isolation with tests, not assumptions.

Tasks:
- add integration tests for admin cross-tenant access denial
- add integration tests for recruiter cross-tenant access denial
- add integration tests for student cross-tenant access denial
- add tests for invite token tenant mismatch
- add tests for password reset token tenant mismatch
- add tests for access token and refresh token tenant mismatch
- add tests for tenant asset access behavior
- add tests for tenant-aware onboarding and branding endpoints

Suggested test areas:
- `tests/auth.tenant.test.js`
- `tests/admin.isolation.test.js`
- `tests/recruiter.isolation.test.js`
- `tests/student.isolation.test.js`
- `tests/tenant.middleware.test.js`

Definition of done:
- hostile test cases pass
- cross-tenant access attempts return safe failures
- auth mismatch cases are blocked consistently

## Phase 3: Platform Super-Admin Backend

Objective:
- Separate SaaS-owner permissions from institute admin permissions.

Tasks:
- add `PLATFORM_SUPER_ADMIN` role
- add platform-only authorization middleware
- add platform tenant management controller
- add platform tenant management routes
- add secure list, create, update, activate, and deactivate operations for tenants
- add creation flow for first institute admin user

Files to add:
- `src/controllers/platformAdminController.js`
- `src/routes/platformAdmin.js`
- `src/middleware/requirePlatformRole.js` or equivalent

Files to update:
- `src/models/User.js`
- `src/routes/index.js`
- role-check middleware and auth-related files

Definition of done:
- institute admins cannot access platform routes
- platform admin can manage tenants safely

## Phase 4: Tenant Provisioning Workflow

Objective:
- Onboard a new institute without manual database edits.

Tasks:
- create tenant record with validated name and slug
- reserve and validate subdomain
- optionally store requested custom domain
- create first admin user bound to tenant
- send tenant-branded activation email
- fail safely if any onboarding step breaks
- add rollback or transactional handling for partial failures

Validation rules:
- tenant slug must be unique
- subdomain must be unique
- custom domain must be unique
- first admin email must be unique within tenant rules

Definition of done:
- new institute can be created from one controlled backend flow
- no partial broken tenant records remain after failures

## Phase 5: Domain and Subdomain Onboarding

Objective:
- Resolve the correct tenant from trusted domains only.

Tasks:
- add tenant domain verification fields if needed
- support `subdomain.yourapp.com`
- support verified custom domains
- validate host mapping against database records
- stop relying on permissive host assumptions
- handle local development safely without weakening production rules

Files to inspect and update:
- `src/middleware/tenant.js`
- `src/config/index.js`
- deployment configuration where needed

Definition of done:
- tenant resolution is deterministic and safe
- unknown hosts do not silently resolve to the wrong tenant in production

## Phase 6: Tenant-Aware CORS and Host Security

Objective:
- Only the correct tenant frontend origin should call the tenant backend.

Tasks:
- move away from one broad global production allowlist
- evaluate origin against resolved tenant domain or subdomain
- keep dev localhost allowances explicit and limited
- reject mismatched origin and tenant combinations
- review `x-forwarded-host` and host handling carefully

Definition of done:
- production CORS is tenant-aware
- host-header abuse paths are reduced

## Phase 7: Audit Logging

Objective:
- Track sensitive platform and tenant changes.

Events to log:
- tenant created
- tenant activated or deactivated
- domain changed
- branding changed
- first admin created
- role escalated to platform admin
- suspicious tenant mismatch attempts

Suggested additions:
- `src/models/AuditLog.js`
- `src/services/auditLogService.js`

Definition of done:
- sensitive SaaS operations are traceable

## Phase 8: Platform Admin UI

Objective:
- Give the SaaS owner a dedicated control surface.

Tasks:
- add platform tenant list page
- add tenant detail page
- add tenant creation form
- add tenant activation and deactivation actions
- add domain/subdomain management UI

Suggested files:
- `client/src/pages/PlatformTenantsPage.jsx`
- `client/src/pages/PlatformTenantDetailPage.jsx`

Definition of done:
- SaaS owner can manage institutes without direct DB access

## Phase 9: Institute Onboarding UI

Objective:
- Complete onboarding from the app instead of scripts.

Tasks:
- build create-institute workflow
- create first institute admin
- show generated login URL
- show onboarding status and validation errors

Definition of done:
- new institute can be onboarded from the UI safely

## Phase 10: Final Security and Release Gate

Objective:
- Do not treat the SaaS conversion as complete until security review passes.

Release checklist:
- tenant seed and backfill completed on real data
- all hostile tenant-isolation tests pass
- platform routes protected correctly
- domain resolution tested on production-like hosts
- CORS tested with valid and invalid origins
- branding and email flows tested for two separate institutes
- no known unscoped queries remain
- no hardcoded secrets in repo or examples

## Phase 11: Email Groups And Bulk Activation

Objective:
- Let institute admins create tenant-scoped email groups and send activation invites safely from the app.

Tasks:
- add an `EmailGroup` model scoped by `tenantId`
- add group member storage for bulk invite recipients
- support manual entry and CSV-based member import
- validate duplicates, invalid emails, and existing active users before send
- add admin UI to create, edit, delete, and review groups
- add a bulk activation action that sends invites to the selected group
- show per-recipient delivery results and partial failures clearly
- add audit logs for group creation, edits, deletions, imports, and bulk sends
- add rate limiting and duplicate-send protections for bulk invite actions
- ensure groups cannot include or expose members across tenants

Suggested files:
- `src/models/EmailGroup.js`
- `src/models/EmailGroupMember.js` or embedded member storage
- `src/controllers/emailGroupController.js`
- `src/routes/emailGroups.js`
- `src/services/email.service.js`
- `src/services/auditLogService.js`
- `client/src/pages/AdminEmailGroupsPage.jsx`

Definition of done:
- institute admin can create a group and send activation links from the UI
- duplicate and invalid recipients are handled clearly
- all group actions are tenant-safe and audited

## Immediate Next Tasks

These should be done next, in order:
- finish the second tenant-isolation audit pass
- add automated cross-tenant denial tests
- implement platform super-admin backend
- implement institute provisioning backend
- harden host resolution and tenant-aware CORS
- design and implement tenant-scoped email groups for bulk activation

## Non-Negotiable Security Rules

- never trust `tenantId` from the client as the source of truth
- never allow broad production CORS that spans unrelated tenants
- never use a token outside its tenant context
- never resolve unknown production hosts to a default tenant silently
- never let one tenant upload or reference another tenant's assets
- never ship a new SaaS feature without verifying tenant isolation
- never allow bulk invite features to bypass rate limits, audit logs, or tenant boundaries
