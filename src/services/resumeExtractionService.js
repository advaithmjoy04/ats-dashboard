const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const KNOWN_SKILLS = [
  'javascript',
  'typescript',
  'react',
  'node.js',
  'node',
  'express',
  'mongodb',
  'mysql',
  'postgresql',
  'python',
  'java',
  'c',
  'c++',
  'html',
  'css',
  'tailwind',
  'figma',
  'aws',
  'docker',
  'git',
  'github',
  'rest api',
  'postman',
  'next.js',
  'firebase',
  'machine learning',
  'data structures',
  'algorithms',
];

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function extractResumeText(file) {
  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return normalizeWhitespace(data.text);
  }

  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const data = await mammoth.extractRawText({ buffer: file.buffer });
    return normalizeWhitespace(data.value);
  }

  return '';
}

function findFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match;
    }
  }
  return null;
}

function extractCgpa(text) {
  const match = findFirstMatch(text, [
    /\b(?:cgpa|gpa)\s*[:\-]?\s*(\d(?:\.\d{1,2})?)/i,
    /\b(\d(?:\.\d{1,2})?)\s*\/\s*10\b/i,
  ]);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value <= 10 ? value : undefined;
}

function extractPhone(text) {
  const match = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}\b/);
  return match ? match[0].replace(/\s+/g, '') : undefined;
}

function extractBranch(text) {
  const match = findFirstMatch(text, [
    /\b(?:branch|department|specialization)\s*[:\-]?\s*([A-Za-z&/ .-]{4,80})/i,
    /\b(B\.?E|B\.?Tech|M\.?Tech|BCA|MCA|BSc|MSc)[^,\n]*\bin\s+([A-Za-z&/ .-]{4,80})/i,
  ]);
  if (!match) return undefined;
  const value = match[2] || match[1];
  return titleCase(value.replace(/\s{2,}/g, ' ').trim());
}

function extractEducationDetails(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const educationIndex = lines.findIndex((line) => /education|academic/i.test(line));
  if (educationIndex === -1) {
    const fallback = lines.filter((line) => /(college|university|b\.?tech|b\.?e|mca|bca|cgpa|gpa)/i.test(line)).slice(0, 4);
    return fallback.length ? fallback.join(' | ') : undefined;
  }
  const snippet = lines.slice(educationIndex + 1, educationIndex + 5).filter((line) => line.length > 2);
  return snippet.length ? snippet.join(' | ') : undefined;
}

function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = KNOWN_SKILLS.filter((skill) => lower.includes(skill));
  return Array.from(new Set(found.map((skill) => titleCase(skill.replace('.js', '.js')))));
}

function extractResumeFields(text) {
  const extracted = {
    cgpa: extractCgpa(text),
    phone: extractPhone(text),
    branch: extractBranch(text),
    educationDetails: extractEducationDetails(text),
    skills: extractSkills(text),
  };

  const missingFields = [];
  if (extracted.cgpa === undefined) missingFields.push('cgpa');
  if (!extracted.branch) missingFields.push('branch');
  if (!extracted.educationDetails) missingFields.push('educationDetails');
  if (!extracted.skills.length) missingFields.push('skills');

  return { extracted, missingFields };
}

module.exports = {
  extractResumeText,
  extractResumeFields,
};
