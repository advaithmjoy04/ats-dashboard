# Next 10 Features Roadmap

This roadmap lists the best next features for the ATS SaaS platform after the current multi-tenant foundation work.

Priority rule:
- security and tenant safety come first
- product growth features come next
- monetization features come after platform safety and core workflows are stable

## 1. Audit Logs

Why:
- every sensitive action should be traceable
- this is essential for SaaS security, support, and incident review

Scope:
- log tenant creation
- log tenant activation and deactivation
- log domain and allowed-origin changes
- log branding changes
- log recruiter assignment changes
- log student status changes
- log admin and super admin actions

Suggested files:
- `src/models/AuditLog.js`
- `src/services/auditLogService.js`
- audit-log hooks in controllers

Priority:
- critical

## 2. Domain Verification Workflow

Why:
- custom domain onboarding must prove ownership
- prevents incorrect or malicious tenant-domain mapping

Scope:
- add domain verification state to tenant
- generate verification token
- verify DNS or TXT-based ownership
- activate domain only after verification

Suggested areas:
- `src/controllers/platformAdminController.js`
- `src/models/Tenant.js`
- platform admin UI

Priority:
- critical

## 3. Automated Cross-Tenant Security Tests

Why:
- multi-tenant isolation must be proven, not assumed

Scope:
- test admin cross-tenant denial
- test recruiter cross-tenant denial
- test student cross-tenant denial
- test token mismatch denial
- test reset and invite tenant mismatch
- test tenant asset and branding isolation

Suggested areas:
- `tests/`

Priority:
- critical

## 4. Super Admin Tenant Edit UI

Why:
- platform backend exists, but SaaS control still needs a fuller admin experience

Scope:
- edit tenant branding defaults
- edit subdomain/custom domain
- edit allowed origins
- activate/deactivate tenant
- view first admin status

Suggested files:
- `client/src/pages/PlatformTenantDetailPage.jsx`
- `client/src/pages/PlatformTenantsPage.jsx`

Priority:
- high

## 5. Bulk Student Import

Why:
- strong operational value for institutes
- saves time during onboarding and placement season

Scope:
- upload CSV/Excel
- validate duplicates and required fields
- preview before import
- tenant-safe student creation
- optional invite email sending

Priority:
- high

## 6. Two-Factor Authentication For Admin Roles

Why:
- admin and super admin accounts are high-risk targets

Scope:
- enable 2FA for `ADMIN`
- enable 2FA for `PLATFORM_SUPER_ADMIN`
- recovery codes
- setup and verification UI

Priority:
- high

## 7. OCR For Scanned Resumes

Why:
- many students upload image-based PDFs
- current extractor detects them but cannot fully parse them

Scope:
- detect low-text files
- run OCR on scanned PDFs
- feed OCR text into the current extraction pipeline
- keep manual fallback messaging

Priority:
- high

## 8. Interview Workflow

Why:
- recruiters need more than just shortlisted/rejected/selected states

Scope:
- interview rounds
- scheduling
- notes and feedback
- candidate progression
- recruiter-level actions

Priority:
- medium-high

## 9. Persistent Notification Center

Why:
- current notification UI is generated live, not stored
- users need read/unread history and persistence

Scope:
- notification model
- tenant-aware notification creation
- read/unread state
- role-specific notification feed

Priority:
- medium

## 10. Billing And Subscription Layer

Why:
- needed for full SaaS monetization

Scope:
- plans
- tenant usage limits
- subscription status
- payment integration
- billing-aware activation and suspension

Priority:
- medium

## 11. Email Groups And Bulk Activation

Why:
- institutes need a faster way to onboard many students or recruiters at once
- admins should be able to send activation links from the app without manual one-by-one invites

Scope:
- create tenant-scoped email groups
- support manual member entry and CSV import
- validate duplicates, invalid emails, and already-active accounts
- send activation invites to a selected group
- show send results and failures clearly
- audit all group edits and bulk send actions
- add rate limits and duplicate-send protection

Suggested areas:
- `src/models/EmailGroup.js`
- `src/controllers/emailGroupController.js`
- `src/routes/emailGroups.js`
- `client/src/pages/AdminEmailGroupsPage.jsx`
- `src/services/email.service.js`

Priority:
- medium-high

## Recommended Build Order

1. audit logs
2. domain verification workflow
3. automated cross-tenant security tests
4. super admin tenant edit UI
5. bulk student import
6. 2FA for admin and super admin
7. OCR for scanned resumes
8. interview workflow
9. persistent notification center
10. billing and subscription layer
11. email groups and bulk activation

## Product Strategy Note

This order is intentional:
- first make the platform safer
- then make the platform easier to operate
- then improve institute productivity
- then improve candidate and recruiter workflows
- then add monetization

## Release Guidance

Do not move into billing or aggressive scale features until:
- audit logging exists
- domain ownership verification exists
- hostile tenant-isolation tests exist
- admin accounts are better protected
- bulk invite flows are tenant-scoped, rate-limited, and audited
