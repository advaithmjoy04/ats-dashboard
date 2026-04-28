# Tenant Security Audit Matrix

This matrix tracks the required security contract for the current API surface.

## `/api/v1/auth`

| Route | Auth role | Tenant source of truth | Ownership rule | Notes |
| --- | --- | --- | --- | --- |
| `POST /login` | Public | `scope=platform` or resolved tenant | User must belong to resolved scope | Platform login must not require tenant |
| `POST /logout` | Public with refresh cookie | Refresh token payload | Matching refresh token only | Clears cookie even on invalid token |
| `POST /refresh` | Public with refresh cookie | Refresh token payload + request tenant | Platform ignores tenant, tenant users must match request tenant | Must reject cross-tenant refresh |
| `POST /forgot-password` | Public | Resolved tenant or platform scope | Email must exist inside resolved scope only | No cross-tenant fallback |
| `POST /reset-password` | Public | Resolved tenant or explicit shared-host hint | Token must belong to resolved scope only | Must reject wrong-tenant token use |
| `POST /activate` | Public | Resolved tenant or explicit shared-host hint | Token must belong to resolved scope only | Must reject wrong-tenant token use |
| `POST /force-password-change` | Authenticated | Authenticated user scope | Authenticated user only | Platform and tenant users both supported |
| `GET /me` | Authenticated | Access token scope | Authenticated user only | Platform and tenant users both supported |

## `/api/v1/platform`

| Route group | Auth role | Tenant source of truth | Ownership rule | Notes |
| --- | --- | --- | --- | --- |
| `/tenants*` | `PLATFORM_SUPER_ADMIN` | Platform scope | Platform-only | Password confirmation required for destructive actions |

## `/api/v1/admin`

| Route group | Auth role | Tenant source of truth | Ownership rule | Notes |
| --- | --- | --- | --- | --- |
| Student/recruiter invite and management | `ADMIN` | `req.user.tenantId` | Same-tenant only | Destructive actions require password confirmation |
| Job create/list/delete | `ADMIN` | `req.user.tenantId` | Same-tenant only | Published jobs require recruiter assignment |
| Candidate list/feedback | `ADMIN` | `req.user.tenantId` | Same-tenant applications only | Feedback must stay tenant-scoped |

## `/api/v1/recruiters`

| Route group | Auth role | Tenant source of truth | Ownership rule | Notes |
| --- | --- | --- | --- | --- |
| Job list/create/update | `RECRUITER` | `req.user.tenantId` | Recruiter must own or be assigned | Recruiter-created jobs stay same-tenant |
| Applicant list/update | `RECRUITER` | `req.user.tenantId` | Recruiter must own or be assigned to the job | Feedback and stage moves must remain same-tenant |

## `/api/v1/students` and `/api/v1/applications`

| Route group | Auth role | Tenant source of truth | Ownership rule | Notes |
| --- | --- | --- | --- | --- |
| Profile/resume legacy endpoints | `STUDENT` | `req.user.tenantId` | Own profile only | Legacy but still security-critical |
| Job list/form | `STUDENT` | `req.user.tenantId` | Same-tenant open jobs only | Shared-host tenant hint must not cross tenant unexpectedly |
| Apply/withdraw/delete/list own applications | `STUDENT` | `req.user.tenantId` | Own applications only | Resume/artifact access must remain scoped |

## `/api/v1/tenant`

| Route group | Auth role | Tenant source of truth | Ownership rule | Notes |
| --- | --- | --- | --- | --- |
| `GET /public` and `GET /assets/:assetType` | Public | Resolved host, or shared-host tenant hint only | Public tenant branding only | Must not allow cross-tenant leakage on custom domains |
| Settings/logo/favicon | `ADMIN` | `req.user.tenantId` | Same-tenant only | Upload and asset keys remain tenant-bound |
