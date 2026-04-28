const mammoth = require('mammoth');

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
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_RESUME_MODEL || 'openai/gpt-oss-120b';
const RESUME_SYSTEM_PROMPT =
  'Extract resume data into strict JSON. Return only valid JSON with keys: fullName, email, phone, branch, cgpa, educationDetails, skills. Use null for unknown scalar values and [] for unknown skills.';

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

async function extractPdfText(buffer) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return normalizeWhitespace(data.text);
  } catch (error) {
    return '';
  }
}

async function extractResumeText(file) {
  if (file.mimetype === 'application/pdf') {
    return extractPdfText(file.buffer);
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

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : undefined;
}

function extractFullName(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  const candidate = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(line) && !/@|\bresume\b|\bcv\b/i.test(line));
  return candidate ? titleCase(candidate) : undefined;
}

function cleanSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return Array.from(
    new Set(
      skills
        .map((skill) => String(skill || '').trim())
        .filter(Boolean)
        .map((skill) => titleCase(skill))
    )
  );
}

function sanitizeLlmExtraction(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const cgpaValue = payload.cgpa === null || payload.cgpa === undefined || payload.cgpa === ''
    ? undefined
    : Number(payload.cgpa);

  return {
    fullName: payload.fullName ? titleCase(String(payload.fullName).trim()) : undefined,
    email: payload.email ? String(payload.email).trim().toLowerCase() : undefined,
    phone: payload.phone ? String(payload.phone).trim() : undefined,
    branch: payload.branch ? titleCase(String(payload.branch).trim()) : undefined,
    cgpa: Number.isFinite(cgpaValue) && cgpaValue >= 0 && cgpaValue <= 10 ? cgpaValue : undefined,
    educationDetails: payload.educationDetails ? normalizeWhitespace(payload.educationDetails) : undefined,
    skills: cleanSkills(payload.skills),
  };
}

function parseJsonObject(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (nestedError) {
      return null;
    }
  }
}

async function extractWithLlm(text) {
  if (!process.env.NVIDIA_API_KEY || !text) {
    return null;
  }

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: RESUME_SYSTEM_PROMPT }],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Resume text:\n${text}`,
              },
            ],
          },
        ],
        temperature: 0.1,
        top_p: 1,
        max_output_tokens: 1200,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const outputText = Array.isArray(payload.output)
      ? payload.output
          .flatMap((item) => item.content || [])
          .filter((item) => item.type === 'output_text' && item.text)
          .map((item) => item.text)
          .join('\n')
      : payload.output_text || '';

    return sanitizeLlmExtraction(parseJsonObject(outputText));
  } catch (error) {
    return null;
  }
}

async function extractResumeFields(text) {
  const heuristic = {
    fullName: extractFullName(text),
    email: extractEmail(text),
    cgpa: extractCgpa(text),
    phone: extractPhone(text),
    branch: extractBranch(text),
    educationDetails: extractEducationDetails(text),
    skills: extractSkills(text),
  };
  const llm = await extractWithLlm(text);
  const extracted = {
    fullName: llm?.fullName || heuristic.fullName,
    email: llm?.email || heuristic.email,
    cgpa: llm?.cgpa ?? heuristic.cgpa,
    phone: llm?.phone || heuristic.phone,
    branch: llm?.branch || heuristic.branch,
    educationDetails: llm?.educationDetails || heuristic.educationDetails,
    skills: llm?.skills?.length ? llm.skills : heuristic.skills,
  };

  const missingFields = [];
  if (!extracted.fullName) missingFields.push('fullName');
  if (!extracted.email) missingFields.push('email');
  if (extracted.cgpa === undefined) missingFields.push('cgpa');
  if (!extracted.phone) missingFields.push('phone');
  if (!extracted.branch) missingFields.push('branch');
  if (!extracted.educationDetails) missingFields.push('educationDetails');
  if (!extracted.skills.length) missingFields.push('skills');

  return { extracted, missingFields };
}

module.exports = {
  extractResumeText,
  extractResumeFields,
};
