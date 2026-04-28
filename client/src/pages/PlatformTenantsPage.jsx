import { useEffect, useState } from 'react';
import api from '../api/client';
import { getTenantAwarePath } from '../utils/tenantRouting';
import PopupShell from '../components/PopupShell';

const initialForm = {
  id: '',
  name: '',
  slug: '',
  subdomain: '',
  customDomain: '',
  allowedOrigins: '',
  supportEmail: '',
  emailFromName: '',
  loginHeadline: '',
  loginSubtext: '',
  adminEmail: '',
  adminUsername: '',
  adminPassword: '',
  adminFullName: '',
};

const initialAdminForm = {
  fullName: '',
  email: '',
  username: '',
  password: '',
};

function normalizeSlugLike(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDomainLike(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

function normalizeAllowedOriginsInput(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase())
    .join(', ');
}

function getErrorMessage(err, fallback) {
  if (typeof err?.response?.data?.message === 'string' && err.response.data.message.trim()) {
    return err.response.data.message;
  }
  if (typeof err?.response?.data === 'string' && err.response.data.trim()) {
    return err.response.data;
  }
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function buildTenantLoginLink(tenant) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${getTenantAwarePath(tenant?.slug, '/login')}`;
  }

  return '/login';
}

function PlatformTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [tenantAdmins, setTenantAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [adminFieldErrors, setAdminFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  async function loadTenants() {
    const response = await api.get('/platform/tenants');
    setTenants(response.data || []);
  }

  async function loadTenantAdmins(tenantId) {
    if (!tenantId) {
      setTenantAdmins([]);
      return;
    }

    const response = await api.get(`/platform/tenants/${tenantId}/admins`);
    setTenantAdmins(response.data || []);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await api.get('/platform/tenants');
        if (!ignore) {
          setTenants(response.data || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(getErrorMessage(err, 'Unable to load tenants.'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'slug' || name === 'subdomain' || name === 'adminUsername') {
      nextValue = normalizeSlugLike(value);
    } else if (name === 'customDomain') {
      nextValue = normalizeDomainLike(value);
    } else if (name === 'allowedOrigins') {
      nextValue = normalizeAllowedOriginsInput(value);
    }

    setForm((current) => ({ ...current, [name]: nextValue }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function handleAdminChange(event) {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'username') {
      nextValue = normalizeSlugLike(value);
    }
    setAdminForm((current) => ({ ...current, [name]: nextValue }));
    setAdminFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function startEditTenant(tenant) {
    setForm({
      id: tenant._id,
      name: tenant.name || '',
      slug: tenant.slug || '',
      subdomain: tenant.subdomain || '',
      customDomain: tenant.customDomain || '',
      allowedOrigins: Array.isArray(tenant.allowedOrigins) ? tenant.allowedOrigins.join(', ') : '',
      supportEmail: tenant.supportEmail || '',
      emailFromName: tenant.emailFromName || '',
      loginHeadline: tenant.loginHeadline || '',
      loginSubtext: tenant.loginSubtext || '',
      adminEmail: '',
      adminUsername: '',
      adminPassword: '',
      adminFullName: '',
    });
    setAdminForm(initialAdminForm);
    setTenantAdmins([]);
    setMessage('');
    setError('');
    setFieldErrors({});
    setAdminFieldErrors({});
    setFormOpen(true);

    try {
      await loadTenantAdmins(tenant._id);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load institute admins.'));
    }
  }

  function resetForm() {
    setForm(initialForm);
    setAdminForm(initialAdminForm);
    setTenantAdmins([]);
    setFieldErrors({});
    setAdminFieldErrors({});
    setFormOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      const payload = {
        ...form,
        allowedOrigins: form.allowedOrigins
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };

      if (form.id) {
        delete payload.adminEmail;
        delete payload.adminFullName;
        delete payload.adminUsername;
        delete payload.adminPassword;
        await api.patch(`/platform/tenants/${form.id}`, payload);
        setMessage('Institute updated successfully.');
        await loadTenantAdmins(form.id);
      } else {
        await api.post('/platform/tenants', payload);
        setMessage('Institute created and first admin invitation sent.');
        resetForm();
      }

      await loadTenants();
    } catch (err) {
      const validationErrors = Array.isArray(err.response?.data?.errors) ? err.response.data.errors : [];
      if (validationErrors.length) {
        const mapped = {};
        validationErrors.forEach((item) => {
          if (item.path) {
            mapped[item.path] = item.msg || 'Invalid value';
          }
        });
        setFieldErrors(mapped);
        setError('Please correct the highlighted fields.');
      } else {
        const backendMessage = getErrorMessage(err, `Unable to ${form.id ? 'update' : 'create'} institute.`);
        if (!form.id && /first admin email is already used|admin email already exists|email already exists/i.test(backendMessage)) {
          setFieldErrors({ adminEmail: backendMessage });
        } else if (!form.id && /admin username already exists/i.test(backendMessage)) {
          setFieldErrors({ adminUsername: backendMessage });
        }
        setError(backendMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminSubmit(event) {
    event.preventDefault();
    if (!form.id) {
      return;
    }

    setAdminSaving(true);
    setError('');
    setMessage('');
    setAdminFieldErrors({});

    const nextFieldErrors = {};
    if (adminForm.password && adminForm.password.length < 8) {
      nextFieldErrors.password = 'Temporary password must be at least 8 characters.';
    }
    if (adminForm.username && adminForm.username.length < 3) {
      nextFieldErrors.username = 'Username must be at least 3 characters.';
    }

    if (Object.keys(nextFieldErrors).length) {
      setAdminFieldErrors(nextFieldErrors);
      setError('Please correct the highlighted admin fields.');
      setAdminSaving(false);
      return;
    }

    try {
      await api.post(`/platform/tenants/${form.id}/admins`, {
        fullName: adminForm.fullName,
        email: adminForm.email,
        username: adminForm.username,
        password: adminForm.password,
      });
      setAdminForm(initialAdminForm);
      await loadTenantAdmins(form.id);
      setMessage('Institute admin added successfully.');
    } catch (err) {
      const backendMessage = getErrorMessage(err, 'Unable to add institute admin.');
      if (/email already exists/i.test(backendMessage)) {
        setAdminFieldErrors({ email: backendMessage });
      } else if (/username already exists/i.test(backendMessage)) {
        setAdminFieldErrors({ username: backendMessage });
      } else if (/8 characters/i.test(backendMessage)) {
        setAdminFieldErrors({ password: backendMessage });
      }
      setError(backendMessage);
    } finally {
      setAdminSaving(false);
    }
  }

  async function handleRemoveAdmin(admin) {
    if (!form.id) {
      return;
    }

    const passwordConfirmation = window.prompt(`Enter your platform password to remove admin ${admin.email}.`);
    if (!passwordConfirmation) {
      return;
    }

    setRemovingAdminId(admin._id);
    setError('');
    setMessage('');
    try {
      if (tenantAdmins.length <= 1) {
        setError('You must keep at least one active admin in this institute.');
        return;
      }
      await api.delete(`/platform/tenants/${form.id}/admins/${admin._id}`, {
        data: { passwordConfirmation },
      });
      await loadTenantAdmins(form.id);
      setMessage(`Removed admin ${admin.email}.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to remove institute admin.'));
    } finally {
      setRemovingAdminId('');
    }
  }

  async function toggleTenant(tenant) {
    const passwordConfirmation = window.prompt(`Enter your platform password to ${tenant.isActive ? 'deactivate' : 'activate'} ${tenant.name}.`);
    if (!passwordConfirmation && tenant.isActive) {
      return;
    }
    setError('');
    setMessage('');
    try {
      if (tenant.isActive) {
        await api.patch(`/platform/tenants/${tenant._id}/deactivate`, { passwordConfirmation });
      } else {
        await api.patch(`/platform/tenants/${tenant._id}/activate`);
      }
      await loadTenants();
      if (form.id === tenant._id) {
        await loadTenantAdmins(form.id);
      }
      setMessage(`${tenant.name} ${tenant.isActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update tenant status.'));
    }
  }

  async function deleteTenant(tenant) {
    const passwordConfirmation = window.prompt(`Enter your platform password to permanently delete ${tenant.name}. This cannot be undone.`);
    if (!passwordConfirmation) {
      return;
    }

    setError('');
    setMessage('');
    try {
      await api.delete(`/platform/tenants/${tenant._id}`, { data: { passwordConfirmation } });
      if (form.id === tenant._id) {
        resetForm();
      }
      await loadTenants();
      setMessage(`${tenant.name} deleted successfully.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete tenant.'));
    }
  }

  const selectedTenant = tenants.find((tenant) => tenant._id === form.id);

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Institutes</h2>
          <p className="page-description">Provision new institutes, define domains, manage tenant admins, and control active workspace access.</p>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setMessage('');
              setError('');
              setFieldErrors({});
              setAdminFieldErrors({});
              setForm(initialForm);
              setAdminForm(initialAdminForm);
              setTenantAdmins([]);
              setFormOpen(true);
            }}
          >
            Create Institute
          </button>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Tenant Directory</h2>
            <span>{loading ? 'Loading institutes...' : `${tenants.length} institute workspace${tenants.length === 1 ? '' : 's'}`}</span>
          </div>
        </div>
        <div className="user-list">
          {tenants.map((tenant) => (
            <article key={tenant._id} className="user-list-item">
              <div>
                <strong>{tenant.name}</strong>
                <div className="compact">{tenant.customDomain || tenant.subdomain || tenant.slug}</div>
                <div className="compact">{tenant.supportEmail || 'No support email configured'}</div>
                <a className="text-button" href={buildTenantLoginLink(tenant)} target="_blank" rel="noreferrer">
                  Open Login
                </a>
              </div>
              <div className="user-list-meta">
                <span className={`status-pill ${tenant.isActive ? 'status-selected' : 'status-rejected'}`}>
                  {tenant.isActive ? 'Active' : 'Inactive'}
                </span>
                <button type="button" className="text-button" onClick={() => startEditTenant(tenant)}>
                  Edit
                </button>
                <button type="button" className="text-button" onClick={() => toggleTenant(tenant)}>
                  {tenant.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" className="danger-button" onClick={() => deleteTenant(tenant)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!loading && !tenants.length ? <div className="empty-state compact">No institutes found.</div> : null}
        </div>
      </section>

      <PopupShell
        open={formOpen}
        onClose={resetForm}
        title={form.id ? 'Edit Institute' : 'Create Institute'}
        subtitle={
          form.id
            ? 'Edit institute settings, domains, branding defaults, and tenant admins.'
            : 'Provision tenant, login branding defaults, domain mapping, and first admin invite.'
        }
      >
        <div className="job-about-form popup-form-body">
          <section className="job-form-section">
            <form className="job-form" onSubmit={handleSubmit}>
              <label>
                Institute name
                <input name="name" value={form.name} onChange={handleChange} required />
                {fieldErrors.name ? <small className="field-error">{fieldErrors.name}</small> : null}
              </label>
              <label>
                Slug
                <input name="slug" value={form.slug} onChange={handleChange} placeholder="optional-auto-generated" />
                {fieldErrors.slug ? <small className="field-error">{fieldErrors.slug}</small> : null}
              </label>
              <label>
                Subdomain
                <input name="subdomain" value={form.subdomain} onChange={handleChange} placeholder="college-a" />
                {fieldErrors.subdomain ? <small className="field-error">{fieldErrors.subdomain}</small> : null}
              </label>
              <label>
                Custom domain
                <input name="customDomain" value={form.customDomain} onChange={handleChange} placeholder="ats.college.edu" />
                {fieldErrors.customDomain ? <small className="field-error">{fieldErrors.customDomain}</small> : null}
              </label>
              <label>
                Support email
                <input name="supportEmail" type="email" value={form.supportEmail} onChange={handleChange} />
                {fieldErrors.supportEmail ? <small className="field-error">{fieldErrors.supportEmail}</small> : null}
              </label>
              <label>
                Sender name
                <input name="emailFromName" value={form.emailFromName} onChange={handleChange} />
                {fieldErrors.emailFromName ? <small className="field-error">{fieldErrors.emailFromName}</small> : null}
              </label>
              <label className="full-width">
                Allowed origins
                <input
                  name="allowedOrigins"
                  value={form.allowedOrigins}
                  onChange={handleChange}
                  placeholder="https://college-a.yourapp.com, https://ats.college.edu"
                />
                {fieldErrors.allowedOrigins ? <small className="field-error">{fieldErrors.allowedOrigins}</small> : null}
              </label>
              <label className="full-width">
                Login headline
                <input name="loginHeadline" value={form.loginHeadline} onChange={handleChange} />
                {fieldErrors.loginHeadline ? <small className="field-error">{fieldErrors.loginHeadline}</small> : null}
              </label>
              <label className="full-width">
                Login subtext
                <textarea name="loginSubtext" rows="3" value={form.loginSubtext} onChange={handleChange} />
                {fieldErrors.loginSubtext ? <small className="field-error">{fieldErrors.loginSubtext}</small> : null}
              </label>
              {!form.id ? (
                <>
                  <label>
                    First admin name
                    <input name="adminFullName" value={form.adminFullName} onChange={handleChange} required />
                    {fieldErrors.adminFullName ? <small className="field-error">{fieldErrors.adminFullName}</small> : null}
                  </label>
                  <label>
                    First admin email
                    <input name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required />
                    {fieldErrors.adminEmail ? <small className="field-error">{fieldErrors.adminEmail}</small> : null}
                  </label>
                  <label>
                    First admin username
                    <input name="adminUsername" value={form.adminUsername} onChange={handleChange} placeholder="mite.admin" />
                    {fieldErrors.adminUsername ? <small className="field-error">{fieldErrors.adminUsername}</small> : null}
                  </label>
                  <label>
                    Temporary password
                    <input name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} placeholder="Minimum 8 characters" />
                    {fieldErrors.adminPassword ? <small className="field-error">{fieldErrors.adminPassword}</small> : null}
                  </label>
                </>
              ) : null}
              <button type="submit" className="primary-button full-width" disabled={saving}>
                {saving ? (form.id ? 'Saving...' : 'Creating...') : (form.id ? 'Save Institute' : 'Create Institute')}
              </button>
              {form.id ? (
                <button type="button" className="text-button full-width" onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : null}
            </form>
          </section>

          {form.id ? (
            <section className="job-form-section">
              <div className="panel-heading">
                <div>
                  <h3>Institute Admins</h3>
                  <span>Add or remove admins inside this tenant workspace.</span>
                </div>
              </div>

              <form className="job-form" onSubmit={handleAdminSubmit}>
                <label>
                  Admin name
                  <input name="fullName" value={adminForm.fullName} onChange={handleAdminChange} required />
                </label>
                <label>
                  Admin email
                  <input name="email" type="email" value={adminForm.email} onChange={handleAdminChange} required />
                  {adminFieldErrors.email ? <small className="field-error">{adminFieldErrors.email}</small> : null}
                </label>
                <label>
                  Username
                  <input name="username" value={adminForm.username} onChange={handleAdminChange} placeholder="mite.admin2" />
                  {adminFieldErrors.username ? <small className="field-error">{adminFieldErrors.username}</small> : null}
                </label>
                <label>
                  Temporary password
                  <input name="password" type="password" value={adminForm.password} onChange={handleAdminChange} placeholder="Optional" />
                  {adminFieldErrors.password ? <small className="field-error">{adminFieldErrors.password}</small> : null}
                </label>
                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={adminSaving || !selectedTenant?.isActive}
                >
                  {adminSaving ? 'Adding Admin...' : 'Add Admin'}
                </button>
              </form>

              {!selectedTenant?.isActive ? (
                <div className="compact">Activate the institute before adding more admins.</div>
              ) : null}

              <div className="user-list">
                {tenantAdmins.map((admin) => (
                  <article key={admin._id} className="user-list-item">
                    <div>
                      <strong>{admin.fullName || admin.email}</strong>
                      <div className="compact">{admin.email}</div>
                      {admin.username ? <div className="compact">@{admin.username}</div> : null}
                    </div>
                    <div className="user-list-meta">
                      <span className={`status-pill ${admin.status === 'ACTIVE' ? 'status-selected' : 'status-applied'}`}>
                        {admin.status}
                      </span>
                      {admin.forcePasswordChange ? <span className="compact">Must change password</span> : null}
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleRemoveAdmin(admin)}
                        disabled={removingAdminId === admin._id || tenantAdmins.length <= 1}
                      >
                        {removingAdminId === admin._id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </article>
                ))}
                {!tenantAdmins.length ? <div className="empty-state compact">No admins found for this institute.</div> : null}
              </div>
              {tenantAdmins.length <= 1 ? (
                <div className="compact">At least one active admin must remain in every institute.</div>
              ) : null}
            </section>
          ) : null}
        </div>
      </PopupShell>
    </div>
  );
}

export default PlatformTenantsPage;
