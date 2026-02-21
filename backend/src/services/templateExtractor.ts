import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import { extractTemplateFromPDF } from './claude';
import { Template } from '../types/template';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATES_DIR = path.join(__dirname, '../../data/templates');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

async function ensureDirectories() {
  try {
    await fs.access(TEMPLATES_DIR);
  } catch {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  }
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export async function extractAndSaveTemplate(
  pdfBuffer: Buffer,
  templateName: string,
  originalFilename: string
): Promise<Template> {
  await ensureDirectories();

  // Parse PDF to extract text
  const pdfData = await pdf(pdfBuffer);
  const pdfText = pdfData.text;

  if (!pdfText || pdfText.trim().length < 50) {
    throw new Error('Could not extract sufficient text from PDF');
  }

  // Save the original PDF
  const pdfId = uuidv4();
  const pdfPath = path.join(UPLOADS_DIR, `${pdfId}.pdf`);
  await fs.writeFile(pdfPath, pdfBuffer);

  // Use Claude to extract template
  const { html, css, sections } = await extractTemplateFromPDF(pdfText, templateName);

  // Create template object
  const template: Template = {
    id: uuidv4(),
    name: templateName,
    description: `Template extracted from ${originalFilename}`,
    htmlContent: html,
    cssContent: css || '',
    sections,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save template
  const templatePath = path.join(TEMPLATES_DIR, `${template.id}.json`);
  await fs.writeFile(templatePath, JSON.stringify(template, null, 2));

  return template;
}

export async function getAllTemplates(): Promise<Template[]> {
  await ensureDirectories();
  
  const files = await fs.readdir(TEMPLATES_DIR);
  const templates: Template[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
      templates.push(JSON.parse(content));
    }
  }

  return templates.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function updateTemplate(id: string, updates: Partial<Pick<Template, 'disabled'>>): Promise<Template | null> {
  const template = await getTemplateById(id);
  if (!template) return null;

  const updated: Template = {
    ...template,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
  await fs.writeFile(templatePath, JSON.stringify(updated, null, 2));
  return updated;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
  try {
    await fs.unlink(templatePath);
    return true;
  } catch {
    return false;
  }
}

export async function createDefaultTemplate(): Promise<Template> {
  await ensureDirectories();

  const defaultTemplate: Template = {
    id: 'default',
    name: 'Two-Column Professional',
    description: '2-column ATS-friendly resume template with strengths, skills, and education on the right',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 0.3in;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.25;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
    }
    .name {
      font-size: 24pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 2px;
    }
    .title {
      font-size: 10pt;
      color: #1e40af;
      margin-bottom: 4px;
    }
    .contact {
      font-size: 8pt;
      color: #333;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .contact-icon {
      color: #2563eb;
    }
    .contact a {
      color: #000;
      text-decoration: none;
    }
    .main-container {
      display: flex;
      gap: 15px;
    }
    .left-column {
      flex: 0 0 62%;
    }
    .right-column {
      flex: 0 0 35%;
    }
    .section {
      margin-bottom: 8px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: bold;
      color: #1e40af;
      text-transform: uppercase;
      border-bottom: 1px solid #1e40af;
      padding-bottom: 2px;
      margin-bottom: 5px;
    }
    .summary {
      font-size: 9pt;
      line-height: 1.3;
      text-align: justify;
    }
    .experience-item {
      margin-bottom: 8px;
    }
    .job-title {
      font-weight: bold;
      font-size: 10pt;
      color: #1e40af;
    }
    .company-line {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #555;
      margin-bottom: 2px;
    }
    .description {
      font-size: 9pt;
      margin-bottom: 3px;
      line-height: 1.3;
    }
    .achievements {
      margin: 0;
      padding-left: 14px;
      font-size: 8.5pt;
    }
    .achievements li {
      margin-bottom: 1px;
      line-height: 1.25;
    }
    .strength-item {
      margin-bottom: 8px;
    }
    .strength-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 2px;
    }
    .strength-icon {
      color: #f59e0b;
      font-size: 10pt;
    }
    .strength-title {
      font-weight: bold;
      font-size: 9pt;
      color: #1e40af;
    }
    .strength-description {
      font-size: 8pt;
      color: #555;
      line-height: 1.3;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 8px;
    }
    .skill-box {
      font-size: 8pt;
      padding: 2px 0;
      border-bottom: 1px solid #ddd;
      text-align: center;
    }
    .education-item {
      margin-bottom: 6px;
    }
    .degree {
      font-weight: bold;
      font-size: 9pt;
      color: #1e40af;
    }
    .institution {
      font-size: 8pt;
      color: #555;
    }
    .edu-date {
      font-size: 8pt;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">{{name}}</div>
    <div class="title">{{title}}</div>
    <div class="contact">
      <span class="contact-item"><span class="contact-icon">📞</span> {{contact.phone}}</span>
      <span class="contact-item"><span class="contact-icon">✉</span> {{contact.email}}</span>
      {{#if contact.linkedin}}<span class="contact-item"><span class="contact-icon">🔗</span> <a href="{{contact.linkedin}}">{{contact.linkedin}}</a></span>{{/if}}
      <span class="contact-item"><span class="contact-icon">📍</span> {{contact.location}}</span>
    </div>
  </div>

  <div class="main-container">
    <div class="left-column">
      <div class="section">
        <div class="section-title">Summary</div>
        <div class="summary">{{summary}}</div>
      </div>

      <div class="section">
        <div class="section-title">Experience</div>
        {{#each experience}}
        <div class="experience-item">
          <div class="job-title">{{title}}</div>
          <div class="company-line">
            <span>{{company}}</span>
            <span>{{startDate}} - {{endDate}}{{#if location}} | {{location}}{{/if}}</span>
          </div>
          <div class="description">{{description}}</div>
          <ul class="achievements">
            {{#each achievements}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
        </div>
        {{/each}}
      </div>
    </div>

    <div class="right-column">
      {{#if strengths.length}}
      <div class="section">
        <div class="section-title">Strengths</div>
        {{#each strengths}}
        <div class="strength-item">
          <div class="strength-header">
            <span class="strength-icon">★</span>
            <span class="strength-title">{{title}}</span>
          </div>
          <div class="strength-description">{{description}}</div>
        </div>
        {{/each}}
      </div>
      {{/if}}

      <div class="section">
        <div class="section-title">Hard Skills</div>
        <div class="skills-grid">
          {{#if hardSkills.length}}
          {{#each hardSkills}}
          <div class="skill-box">{{this}}</div>
          {{/each}}
          {{else}}
          {{#each skills}}
          <div class="skill-box">{{this}}</div>
          {{/each}}
          {{/if}}
        </div>
      </div>

      {{#if softSkills.length}}
      <div class="section">
        <div class="section-title">Soft Skills</div>
        <div class="skills-grid">
          {{#each softSkills}}
          <div class="skill-box">{{this}}</div>
          {{/each}}
        </div>
      </div>
      {{/if}}

      <div class="section">
      <div class="section-title">Education</div>
        {{#each education}}
        <div class="education-item">
          <div class="degree">{{degree}}</div>
          <div class="institution">{{institution}}</div>
          <div class="edu-date">{{startDate}} - {{endDate}}{{#if location}} | {{location}}{{/if}}</div>
        </div>
        {{/each}}
      </div>
    </div>
  </div>
</body>
</html>`,
    cssContent: '',
    sections: ['summary', 'experience', 'strengths', 'hardSkills', 'softSkills', 'education'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const defaultTemplatePath = path.join(TEMPLATES_DIR, `${defaultTemplate.id}.json`);
  const existingDefault = await getTemplateById(defaultTemplate.id);
  const defaultToWrite: Template = {
    ...defaultTemplate,
    disabled: existingDefault?.disabled ?? false,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(defaultTemplatePath, JSON.stringify(defaultToWrite, null, 2));

  const oneColumnTemplate: Template = {
    id: 'one-column',
    name: 'One-Column Clean',
    description: '1-column ATS-friendly resume template with clean section stacking and readable spacing',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 0.35in;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      color: #111827;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .name {
      font-size: 23pt;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .title {
      font-size: 10pt;
      color: #334155;
      margin-bottom: 5px;
    }
    .contact {
      font-size: 8.5pt;
      color: #1f2937;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .contact-icon {
      color: #0f766e;
    }
    .contact a {
      color: #000;
      text-decoration: none;
    }
    .section {
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: bold;
      letter-spacing: 0.4px;
      color: #0f172a;
      text-transform: uppercase;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 2px;
      margin-bottom: 5px;
    }
    .summary {
      text-align: justify;
      color: #374151;
    }
    .experience-item {
      margin-bottom: 8px;
    }
    .job-title {
      font-size: 10pt;
      font-weight: bold;
      color: #0f172a;
    }
    .company-line {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #475569;
      margin-bottom: 2px;
      gap: 8px;
    }
    .description {
      font-size: 9pt;
      color: #374151;
      margin-bottom: 2px;
    }
    .achievements {
      padding-left: 15px;
      font-size: 8.8pt;
      color: #1f2937;
    }
    .achievements li {
      margin-bottom: 1px;
    }
    .strength-item {
      margin-bottom: 6px;
    }
    .strength-title {
      font-weight: bold;
      font-size: 9pt;
      color: #0f172a;
      margin-bottom: 1px;
    }
    .strength-description {
      font-size: 8.7pt;
      color: #475569;
    }
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .skill-chip {
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 8.5pt;
      color: #1e293b;
      background: #f8fafc;
    }
    .education-item {
      margin-bottom: 6px;
    }
    .degree {
      font-weight: bold;
      font-size: 9pt;
      color: #0f172a;
    }
    .institution {
      font-size: 8.7pt;
      color: #334155;
    }
    .edu-date {
      font-size: 8.3pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">{{name}}</div>
    <div class="title">{{title}}</div>
    <div class="contact">
      <span class="contact-item"><span class="contact-icon">📞</span> {{contact.phone}}</span>
      <span class="contact-item"><span class="contact-icon">✉</span> {{contact.email}}</span>
      {{#if contact.linkedin}}<span class="contact-item"><span class="contact-icon">🔗</span> <a href="{{contact.linkedin}}">{{contact.linkedin}}</a></span>{{/if}}
      <span class="contact-item"><span class="contact-icon">📍</span> {{contact.location}}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary">{{summary}}</div>
  </div>

  {{#if strengths.length}}
  <div class="section">
    <div class="section-title">Strengths</div>
    {{#each strengths}}
    <div class="strength-item">
      <div class="strength-title">{{title}}</div>
      <div class="strength-description">{{description}}</div>
    </div>
    {{/each}}
  </div>
  {{/if}}

  <div class="section">
    <div class="section-title">Hard Skills</div>
    <div class="skills-list">
      {{#if hardSkills.length}}
      {{#each hardSkills}}
      <span class="skill-chip">{{this}}</span>
      {{/each}}
      {{else}}
      {{#each skills}}
      <span class="skill-chip">{{this}}</span>
      {{/each}}
      {{/if}}
    </div>
  </div>

  {{#if softSkills.length}}
  <div class="section">
    <div class="section-title">Soft Skills</div>
    <div class="skills-list">
      {{#each softSkills}}
      <span class="skill-chip">{{this}}</span>
      {{/each}}
    </div>
  </div>
  {{/if}}

  <div class="section">
    <div class="section-title">Experience</div>
    {{#each experience}}
    <div class="experience-item">
      <div class="job-title">{{title}}</div>
      <div class="company-line">
        <span>{{company}}</span>
        <span>{{startDate}} - {{endDate}}{{#if location}} | {{location}}{{/if}}</span>
      </div>
      <div class="description">{{description}}</div>
      <ul class="achievements">
        {{#each achievements}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    {{/each}}
  </div>

  <div class="section">
  <div class="section-title">Education</div>
    {{#each education}}
    <div class="education-item">
      <div class="degree">{{degree}}</div>
      <div class="institution">{{institution}}</div>
      <div class="edu-date">{{startDate}} - {{endDate}}{{#if location}} | {{location}}{{/if}}</div>
    </div>
    {{/each}}
  </div>
</body>
</html>`,
    cssContent: '',
    sections: ['summary', 'strengths', 'hardSkills', 'softSkills', 'experience', 'education'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const oneColumnTemplatePath = path.join(TEMPLATES_DIR, `${oneColumnTemplate.id}.json`);
  const existingOneColumn = await getTemplateById(oneColumnTemplate.id);
  const oneColumnToWrite: Template = {
    ...oneColumnTemplate,
    disabled: existingOneColumn?.disabled ?? false,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(oneColumnTemplatePath, JSON.stringify(oneColumnToWrite, null, 2));

  const oneColumnModernTemplate: Template = {
    id: 'one-column-modern',
    name: 'One-Column Modern',
    description: '1-column ATS-friendly resume template with compact timeline headers and modern section accents',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 0.35in;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 9.2pt;
      line-height: 1.3;
      color: #0b1324;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .header {
      margin-bottom: 10px;
      border: 1px solid #cbd5e1;
      border-left: 5px solid #2563eb;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .name {
      font-size: 22pt;
      font-weight: bold;
      color: #0f172a;
    }
    .title {
      font-size: 10pt;
      color: #334155;
      margin-top: 2px;
      margin-bottom: 5px;
    }
    .contact {
      font-size: 8.4pt;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: #1e293b;
    }
    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .contact a {
      color: #000;
      text-decoration: none;
    }
    .section {
      margin-bottom: 9px;
    }
    .section-title {
      font-size: 9.6pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      margin-bottom: 4px;
    }
    .summary {
      color: #334155;
      text-align: justify;
    }
    .experience-item {
      margin-bottom: 7px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #d1d5db;
    }
    .experience-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 8.6pt;
      color: #475569;
      margin-bottom: 1px;
    }
    .job-title {
      font-size: 9.8pt;
      font-weight: bold;
      color: #0f172a;
    }
    .description {
      font-size: 8.9pt;
      margin-bottom: 2px;
      color: #334155;
    }
    .achievements {
      padding-left: 14px;
      font-size: 8.6pt;
      color: #0f172a;
    }
    .achievements li {
      margin-bottom: 1px;
    }
    .skills-list {
      display: block;
      color: #1f2937;
    }
    .skills-list span {
      display: inline;
    }
    .strength-item {
      margin-bottom: 5px;
    }
    .strength-title {
      font-size: 8.9pt;
      font-weight: bold;
      color: #0f172a;
    }
    .strength-description {
      font-size: 8.5pt;
      color: #475569;
    }
    .education-item {
      margin-bottom: 5px;
    }
    .degree {
      font-size: 8.9pt;
      font-weight: bold;
    }
    .institution {
      font-size: 8.6pt;
      color: #334155;
    }
    .edu-date {
      font-size: 8.3pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">{{name}}</div>
    <div class="title">{{title}}</div>
    <div class="contact">
      <span class="contact-item">📞 {{contact.phone}}</span>
      <span class="contact-item">✉ {{contact.email}}</span>
      {{#if contact.linkedin}}<span class="contact-item">🔗 <a href="{{contact.linkedin}}">{{contact.linkedin}}</a></span>{{/if}}
      <span class="contact-item">📍 {{contact.location}}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary">{{summary}}</div>
  </div>

  <div class="section">
    <div class="section-title">Hard Skills</div>
    <div class="skills-list">
      {{#if hardSkills.length}}
      {{#each hardSkills}}<span>{{this}}{{#unless @last}} • {{/unless}}</span>{{/each}}
      {{else}}
      {{#each skills}}<span>{{this}}{{#unless @last}} • {{/unless}}</span>{{/each}}
      {{/if}}
    </div>
  </div>

  {{#if softSkills.length}}
  <div class="section">
    <div class="section-title">Soft Skills</div>
    <div class="skills-list">
      {{#each softSkills}}<span>{{this}}{{#unless @last}} • {{/unless}}</span>{{/each}}
    </div>
  </div>
  {{/if}}

  {{#if strengths.length}}
  <div class="section">
    <div class="section-title">Strengths</div>
    {{#each strengths}}
    <div class="strength-item">
      <div class="strength-title">{{title}}</div>
      <div class="strength-description">{{description}}</div>
    </div>
    {{/each}}
  </div>
  {{/if}}

  <div class="section">
    <div class="section-title">Experience</div>
    {{#each experience}}
    <div class="experience-item">
      <div class="job-title">{{title}}</div>
      <div class="exp-header">
        <span>{{company}}</span>
        <span>{{startDate}} - {{endDate}}{{#if location}} | {{location}}{{/if}}</span>
      </div>
      <div class="description">{{description}}</div>
      <ul class="achievements">
        {{#each achievements}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    {{/each}}
  </div>

  <div class="section">
  <div class="section-title">Education</div>
    {{#each education}}
    <div class="education-item">
      <div class="degree">{{degree}}</div>
      <div class="institution">{{institution}}</div>
      <div class="edu-date">{{startDate}} - {{endDate}}{{#if location}} | {{location}}{{/if}}</div>
    </div>
    {{/each}}
  </div>
</body>
</html>`,
    cssContent: '',
    sections: ['summary', 'hardSkills', 'softSkills', 'strengths', 'experience', 'education'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const oneColumnModernTemplatePath = path.join(TEMPLATES_DIR, `${oneColumnModernTemplate.id}.json`);
  const existingOneColumnModern = await getTemplateById(oneColumnModernTemplate.id);
  const oneColumnModernToWrite: Template = {
    ...oneColumnModernTemplate,
    disabled: existingOneColumnModern?.disabled ?? false,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(oneColumnModernTemplatePath, JSON.stringify(oneColumnModernToWrite, null, 2));

  return defaultToWrite;
}
