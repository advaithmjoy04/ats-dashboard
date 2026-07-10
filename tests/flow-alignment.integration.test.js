jest.mock('../src/utils/s3', () => ({
  buildResumeKey: (userId, originalName = 'file.pdf') => `mock/${userId}/${originalName}`,
  uploadBuffer: jest.fn().mockResolvedValue(undefined),
  getReadUrl: jest.fn(async (key) => `https://files.example.com/${encodeURIComponent(key)}`),
  deleteObject: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const { createTestContext } = require('./helpers/testContext');

describe('flow alignment integration', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    if (ctx?.shutdown) {
      await ctx.shutdown();
    }
  });

  test('student can apply without any student profile record', async () => {
    const tenant = await ctx.createTenant({ name: 'MITE', slug: 'mite', subdomain: 'mite' });
    const admin = await ctx.createUser({
      email: 'admin@mite.edu',
      tenantId: tenant._id,
      role: 'ADMIN',
    });
    const student = await ctx.createUser({
      email: 'student@mite.edu',
      tenantId: tenant._id,
      role: 'STUDENT',
    });

    await ctx.models.Job.create({
      tenantId: tenant._id,
      jobId: 'MITE-001',
      title: 'Frontend Engineer',
      role: 'Frontend Engineer',
      description: 'React role',
      companyName: 'MITE',
      status: 'OPEN',
      publishState: 'OPEN',
      postedBy: admin._id,
      applicationFormFields: [
        { key: 'firstName', label: 'First Name', type: 'TEXT', mode: 'MANDATORY', category: 'PERSONAL' },
        { key: 'lastName', label: 'Last Name', type: 'TEXT', mode: 'MANDATORY', category: 'PERSONAL' },
        { key: 'email', label: 'Email', type: 'EMAIL', mode: 'MANDATORY', category: 'PERSONAL' },
        { key: 'contactNumber', label: 'Contact Number', type: 'PHONE', mode: 'OPTIONAL', category: 'PERSONAL' },
        { key: 'resume', label: 'Resume', type: 'FILE_UPLOAD', mode: 'OFF', category: 'PROFESSIONAL' },
        { key: 'cgpa', label: 'CGPA', type: 'NUMBER', mode: 'MANDATORY', category: 'ACADEMIC' },
        { key: 'skills', label: 'Skills', type: 'TEXTAREA', mode: 'MANDATORY', category: 'PROFESSIONAL' },
      ],
      screeningQuestions: [],
      assignedRecruiters: [],
    });

    const response = await request(ctx.app)
      .post('/api/v1/students/applications')
      .set('Host', 'mite.example.com')
      .set('Authorization', `Bearer ${ctx.buildAccessToken(student)}`)
      .field('jobId', 'MITE-001')
      .field(
        'submittedFields',
        JSON.stringify([
          { fieldKey: 'firstName', label: 'First Name', type: 'TEXT', value: 'Ada' },
          { fieldKey: 'lastName', label: 'Last Name', type: 'TEXT', value: 'Lovelace' },
          { fieldKey: 'email', label: 'Email', type: 'EMAIL', value: 'student@mite.edu' },
          { fieldKey: 'contactNumber', label: 'Contact Number', type: 'PHONE', value: '9999999999' },
          { fieldKey: 'cgpa', label: 'CGPA', type: 'NUMBER', value: '9.1' },
          { fieldKey: 'skills', label: 'Skills', type: 'TEXTAREA', value: 'react, node, testing' },
        ])
      )
      .field('screeningAnswers', JSON.stringify([]));

    expect(response.status).toBe(201);
    expect(response.body.data.studentId.toString()).toBe(student._id.toString());
    expect(response.body.data.submittedFields.find((field) => field.fieldKey === 'cgpa')?.value).toBe('9.1');
  });

  test('admin candidate view uses application values instead of student profile fallback', async () => {
    const tenant = await ctx.createTenant({ name: 'MITE', slug: 'mite', subdomain: 'mite' });
    const admin = await ctx.createUser({
      email: 'admin@mite.edu',
      tenantId: tenant._id,
      role: 'ADMIN',
    });
    const student = await ctx.createUser({
      email: 'student@mite.edu',
      tenantId: tenant._id,
      role: 'STUDENT',
      fullName: 'Student One',
    });

    await ctx.createStudentProfile({
      tenantId: tenant._id,
      userId: student._id,
      fullName: 'Legacy Student',
      cgpa: 6.2,
      skills: ['legacy-skill'],
      educationDetails: 'Legacy profile education',
      resumeKey: 'legacy/profile-resume.pdf',
      resumeOriginalName: 'legacy.pdf',
    });

    const job = await ctx.models.Job.create({
      tenantId: tenant._id,
      jobId: 'MITE-002',
      title: 'Platform Developer',
      role: 'Platform Developer',
      description: 'Role',
      companyName: 'MITE',
      status: 'OPEN',
      publishState: 'OPEN',
      postedBy: admin._id,
      requiredSkills: ['react', 'aws'],
      prioritySkills: ['react'],
      applicationFormFields: [],
      screeningQuestions: [],
      assignedRecruiters: [],
    });

    await ctx.models.Application.create({
      tenantId: tenant._id,
      jobId: job._id,
      studentId: student._id,
      status: 'APPLIED',
      resumeKey: 'applications/current-resume.pdf',
      resumeOriginalName: 'current-resume.pdf',
      submittedFields: [
        { fieldKey: 'cgpa', label: 'CGPA', type: 'NUMBER', value: '9.4' },
        { fieldKey: 'skills', label: 'Skills', type: 'TEXTAREA', value: 'react, aws, node' },
        { fieldKey: 'educationDetails', label: 'Education Details', type: 'TEXTAREA', value: 'Current application education' },
      ],
      screeningAnswers: [],
      uploadedArtifacts: [],
      currentStageKey: 'applied',
      currentStageLabel: 'Applied',
    });

    const response = await request(ctx.app)
      .get('/api/v1/admin/candidates')
      .set('Host', 'mite.example.com')
      .set('Authorization', `Bearer ${ctx.buildAccessToken(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    const [candidate] = response.body.data.items;
    expect(candidate.student.cgpa).toBe('9.4');
    expect(candidate.student.skills).toEqual(['react', 'aws', 'node']);
    expect(candidate.student.educationDetails).toBe('Current application education');
    expect(candidate.student.resumeKey).toBe('applications/current-resume.pdf');
    expect(candidate.skillMatch.matchLevel).toBe('HIGH');
  });

  test('student application supports file upload screening questions', async () => {
    const tenant = await ctx.createTenant({ name: 'MITE', slug: 'mite', subdomain: 'mite' });
    const admin = await ctx.createUser({
      email: 'admin@mite.edu',
      tenantId: tenant._id,
      role: 'ADMIN',
    });
    const student = await ctx.createUser({
      email: 'student@mite.edu',
      tenantId: tenant._id,
      role: 'STUDENT',
    });

    await ctx.models.Job.create({
      tenantId: tenant._id,
      jobId: 'MITE-003',
      title: 'Research Intern',
      role: 'Research Intern',
      description: 'Role',
      companyName: 'MITE',
      status: 'OPEN',
      publishState: 'OPEN',
      postedBy: admin._id,
      applicationFormFields: [
        { key: 'firstName', label: 'First Name', type: 'TEXT', mode: 'MANDATORY', category: 'PERSONAL' },
        { key: 'resume', label: 'Resume', type: 'FILE_UPLOAD', mode: 'OFF', category: 'PROFESSIONAL' },
      ],
      screeningQuestions: [
        {
          questionId: 'portfolio-proof',
          question: 'Upload your supporting proof',
          type: 'FILE_UPLOAD',
          required: true,
          options: [],
        },
      ],
      assignedRecruiters: [],
    });

    const response = await request(ctx.app)
      .post('/api/v1/students/applications')
      .set('Host', 'mite.example.com')
      .set('Authorization', `Bearer ${ctx.buildAccessToken(student)}`)
      .field('jobId', 'MITE-003')
      .field(
        'submittedFields',
        JSON.stringify([{ fieldKey: 'firstName', label: 'First Name', type: 'TEXT', value: 'Ada' }])
      )
      .field(
        'screeningAnswers',
        JSON.stringify([
          {
            questionId: 'portfolio-proof',
            question: 'Upload your supporting proof',
            type: 'FILE_UPLOAD',
            answer: 'proof.pdf',
          },
        ])
      )
      .attach('screening_portfolio-proof', Buffer.from('fake-pdf'), {
        filename: 'proof.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.uploadedArtifacts).toHaveLength(1);
    expect(response.body.data.uploadedArtifacts[0].fieldKey).toBe('portfolio-proof');
    expect(response.body.data.screeningAnswers[0].answer).toBe('proof.pdf');
  });
});
