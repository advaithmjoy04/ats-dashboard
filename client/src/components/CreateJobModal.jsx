import { useEffect, useState } from 'react';

const initialState = {
  companyName: '',
  role: '',
  description: '',
  minCgpa: '',
  assignedRecruiters: [],
  active: true,
};

function CreateJobModal({ open, recruiters, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleChange(event) {
    const { name, value, type, checked, options, multiple } = event.target;

    if (type === 'checkbox') {
      setForm((current) => ({ ...current, [name]: checked }));
      return;
    }

    if (multiple) {
      setForm((current) => ({
        ...current,
        [name]: Array.from(options)
          .filter((option) => option.selected)
          .map((option) => option.value),
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      minCgpa: form.minCgpa === '' ? undefined : Number(form.minCgpa),
    });
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card">
        <div className="panel-heading">
          <h2>Create Job</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="job-form" onSubmit={handleSubmit}>
          <label>
            Company name
            <input name="companyName" value={form.companyName} onChange={handleChange} required />
          </label>
          <label>
            Role
            <input name="role" value={form.role} onChange={handleChange} required />
          </label>
          <label className="full-width">
            Description
            <textarea name="description" rows="4" value={form.description} onChange={handleChange} />
          </label>
          <label>
            Minimum CGPA
            <input
              name="minCgpa"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={form.minCgpa}
              onChange={handleChange}
            />
          </label>
          <label>
            Assigned recruiters
            <select name="assignedRecruiters" multiple value={form.assignedRecruiters} onChange={handleChange}>
              {recruiters.map((recruiter) => (
                <option key={recruiter._id} value={recruiter._id}>
                  {recruiter.fullName || recruiter.email}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row full-width">
            <input name="active" type="checkbox" checked={form.active} onChange={handleChange} />
            <span>Keep this job active after creation</span>
          </label>
          <button type="submit" className="primary-button full-width" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateJobModal;
