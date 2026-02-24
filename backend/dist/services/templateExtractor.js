"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAndSaveTemplate = extractAndSaveTemplate;
exports.getAllTemplates = getAllTemplates;
exports.getTemplateById = getTemplateById;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.createDefaultTemplate = createDefaultTemplate;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const claude_1 = require("./claude");
const uuid_1 = require("uuid");
const TEMPLATES_DIR = path_1.default.join(__dirname, '../../data/templates');
const UPLOADS_DIR = path_1.default.join(__dirname, '../../uploads');
async function ensureDirectories() {
    try {
        await promises_1.default.access(TEMPLATES_DIR);
    }
    catch {
        await promises_1.default.mkdir(TEMPLATES_DIR, { recursive: true });
    }
    try {
        await promises_1.default.access(UPLOADS_DIR);
    }
    catch {
        await promises_1.default.mkdir(UPLOADS_DIR, { recursive: true });
    }
}
async function extractAndSaveTemplate(pdfBuffer, templateName, originalFilename) {
    await ensureDirectories();
    // Parse PDF to extract text
    const pdfData = await (0, pdf_parse_1.default)(pdfBuffer);
    const pdfText = pdfData.text;
    if (!pdfText || pdfText.trim().length < 50) {
        throw new Error('Could not extract sufficient text from PDF');
    }
    // Save the original PDF
    const pdfId = (0, uuid_1.v4)();
    const pdfPath = path_1.default.join(UPLOADS_DIR, `${pdfId}.pdf`);
    await promises_1.default.writeFile(pdfPath, pdfBuffer);
    // Use Claude to extract template
    const { html, css, sections } = await (0, claude_1.extractTemplateFromPDF)(pdfText, templateName);
    // Create template object
    const template = {
        id: (0, uuid_1.v4)(),
        name: templateName,
        description: `Template extracted from ${originalFilename}`,
        htmlContent: html,
        cssContent: css || '',
        sections,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    // Save template
    const templatePath = path_1.default.join(TEMPLATES_DIR, `${template.id}.json`);
    await promises_1.default.writeFile(templatePath, JSON.stringify(template, null, 2));
    return template;
}
async function findTemplateFiles(dir, baseDir) {
    const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
        const relativePath = path_1.default.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
            files.push(...(await findTemplateFiles(fullPath, baseDir)));
        }
        else if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push(relativePath.replace(/\\/g, '/'));
        }
    }
    return files;
}
async function getAllTemplates() {
    await ensureDirectories();
    const relativePaths = await findTemplateFiles(TEMPLATES_DIR, TEMPLATES_DIR);
    const templates = [];
    for (const relPath of relativePaths) {
        const templatePath = path_1.default.join(TEMPLATES_DIR, relPath);
        try {
            const content = await promises_1.default.readFile(templatePath, 'utf-8');
            const parsed = JSON.parse(content);
            const id = relPath.replace(/\.json$/, '');
            templates.push({ ...parsed, id });
        }
        catch {
            console.warn(`Skipped invalid template: ${relPath}`);
        }
    }
    return templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
async function getTemplateById(id) {
    const normalizedId = id.replace(/\.json$/, '');
    const templatePath = path_1.default.join(TEMPLATES_DIR, `${normalizedId}.json`);
    try {
        const content = await promises_1.default.readFile(templatePath, 'utf-8');
        const parsed = JSON.parse(content);
        return { ...parsed, id: normalizedId };
    }
    catch {
        return null;
    }
}
async function updateTemplate(id, updates) {
    const template = await getTemplateById(id);
    if (!template)
        return null;
    const updated = {
        ...template,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    const normalizedId = id.replace(/\.json$/, '');
    const templatePath = path_1.default.join(TEMPLATES_DIR, `${normalizedId}.json`);
    await promises_1.default.writeFile(templatePath, JSON.stringify(updated, null, 2));
    return updated;
}
async function deleteTemplate(id) {
    const normalizedId = id.replace(/\.json$/, '');
    const templatePath = path_1.default.join(TEMPLATES_DIR, `${normalizedId}.json`);
    try {
        await promises_1.default.unlink(templatePath);
        return true;
    }
    catch {
        return false;
    }
}
async function createDefaultTemplate() {
    await ensureDirectories();
    const defaultTemplate = {
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
    const defaultTemplatePath = path_1.default.join(TEMPLATES_DIR, `${defaultTemplate.id}.json`);
    const existingDefault = await getTemplateById(defaultTemplate.id);
    const defaultToWrite = {
        ...defaultTemplate,
        disabled: existingDefault?.disabled ?? false,
        updatedAt: new Date().toISOString(),
    };
    await promises_1.default.writeFile(defaultTemplatePath, JSON.stringify(defaultToWrite, null, 2));
    return defaultToWrite;
}
//# sourceMappingURL=templateExtractor.js.map