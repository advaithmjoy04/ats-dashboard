import { useEffect, useState } from 'react';
import api from '../api/client';
import { useTenant } from '../state/TenantContext';

const initialForm = {
  name: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#3d79f2',
  secondaryColor: '#18212f',
  supportEmail: '',
  emailFromName: '',
  loginHeadline: '',
  loginSubtext: '',
};

function InstituteBrandingPage() {
  const { tenant, reloadTenant } = useTenant();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      try {
        const response = await api.get('/tenant/settings');
        if (!ignore) {
          setForm({
            name: response.data.name || '',
            logoUrl: response.data.logoUrl || '',
            faviconUrl: response.data.faviconUrl || '',
            primaryColor: response.data.primaryColor || '#3d79f2',
            secondaryColor: response.data.secondaryColor || '#18212f',
            supportEmail: response.data.supportEmail || '',
            emailFromName: response.data.emailFromName || '',
            loginHeadline: response.data.loginHeadline || '',
            loginSubtext: response.data.loginSubtext || '',
          });
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load institute branding settings.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleAssetUpload(event, assetType) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(assetType, file);
    const setUploading = assetType === 'logo' ? setUploadingLogo : setUploadingFavicon;
    const fieldName = assetType === 'logo' ? 'logoUrl' : 'faviconUrl';

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const response = await api.post(`/tenant/${assetType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((current) => ({ ...current, [fieldName]: response.data.url }));
      await reloadTenant();
      setMessage(`${assetType === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to upload ${assetType}.`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.patch('/tenant/settings', form);
      await reloadTenant();
      setMessage('Institute branding updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save branding settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Institute Branding</h2>
          <p className="page-description">Customize the institute identity visible across login pages and the dashboard shell.</p>
        </div>
        <div className="summary-pill">{tenant.name || 'Institute'}</div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="screen-center">Loading branding settings...</div>
      ) : (
        <div className="management-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Brand Settings</h2>
                <span>Update institute identity without changing code or redeploying.</span>
              </div>
            </div>
            <form className="job-form" onSubmit={handleSubmit}>
              <label>
                Institute name
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label>
                Support email
                <input name="supportEmail" type="email" value={form.supportEmail} onChange={handleChange} />
              </label>
              <label className="full-width">
                Logo URL
                <input name="logoUrl" type="url" value={form.logoUrl} onChange={handleChange} placeholder="https://..." />
              </label>
              <label className="full-width">
                Upload logo
                <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(event) => handleAssetUpload(event, 'logo')} />
                <small>{uploadingLogo ? 'Uploading logo...' : 'Use PNG, JPG, or WEBP up to 2 MB.'}</small>
              </label>
              <label className="full-width">
                Favicon URL
                <input name="faviconUrl" type="url" value={form.faviconUrl} onChange={handleChange} placeholder="https://..." />
              </label>
              <label className="full-width">
                Upload favicon
                <input type="file" accept=".png,.ico,.webp" onChange={(event) => handleAssetUpload(event, 'favicon')} />
                <small>{uploadingFavicon ? 'Uploading favicon...' : 'Use PNG, ICO, or WEBP up to 2 MB.'}</small>
              </label>
              <label>
                Primary color
                <input name="primaryColor" value={form.primaryColor} onChange={handleChange} placeholder="#3d79f2" />
              </label>
              <label>
                Secondary color
                <input name="secondaryColor" value={form.secondaryColor} onChange={handleChange} placeholder="#18212f" />
              </label>
              <label className="full-width">
                Email sender name
                <input name="emailFromName" value={form.emailFromName} onChange={handleChange} placeholder="Placement Cell, Institute Name" />
              </label>
              <label className="full-width">
                Login headline
                <input name="loginHeadline" value={form.loginHeadline} onChange={handleChange} placeholder="Sign in to your institute ATS" />
              </label>
              <label className="full-width">
                Login subtext
                <textarea name="loginSubtext" rows="4" value={form.loginSubtext} onChange={handleChange} />
              </label>
              <button type="submit" className="primary-button full-width" disabled={saving}>
                {saving ? 'Saving...' : 'Save Branding'}
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Preview</h2>
                <span>Quick visual preview of the tenant branding.</span>
              </div>
            </div>
            <div className="branding-preview-card">
              <div className="branding-preview-top" style={{ background: `linear-gradient(135deg, ${form.primaryColor} 0%, ${form.secondaryColor} 100%)` }}>
                {form.logoUrl ? <img src={form.logoUrl} alt={form.name} className="brand-logo" /> : <div className="brand-mark preview-brand">{form.name || 'Institute Name'}</div>}
              </div>
              <div className="branding-preview-body">
                <h3>{form.loginHeadline || 'Sign In'}</h3>
                <p>{form.loginSubtext || 'Access your ATS account to manage jobs, applications, and placement activity.'}</p>
                <div className="branding-swatch-row">
                  <span className="branding-swatch" style={{ background: form.primaryColor }} />
                  <span className="branding-swatch" style={{ background: form.secondaryColor }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default InstituteBrandingPage;
