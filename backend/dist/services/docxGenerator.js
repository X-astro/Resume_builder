"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResumeDOCX = generateResumeDOCX;
/// <reference path="../types/html-to-docx.d.ts" />
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const html_to_docx_1 = __importDefault(require("html-to-docx"));
const pdfGenerator_1 = require("./pdfGenerator");
const storage_1 = require("../config/storage");
const GENERATED_DIR = storage_1.GENERATED_RESUMES_DIR;
function sanitizeFilename(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}
/**
 * Builds HTML in hayato-style: one column, Calibri, centered header,
 * underlined section titles. Matches reference docx structure.
 */
function buildHayatoStyleHTML(data) {
    const esc = (s) => String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const contactParts = [esc(data.contact?.email ?? '')];
    if (data.contact?.phone)
        contactParts.push(esc(data.contact.phone));
    if (data.contact?.location)
        contactParts.push(esc(data.contact.location));
    if (data.contact?.linkedin)
        contactParts.push(`<a href="${esc(data.contact.linkedin)}">${esc(data.contact.linkedin)}</a>`);
    const contactLine = contactParts.filter(Boolean).join(' | ');
    let html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Calibri, Arial, sans-serif; font-size: 9pt; color: #333333;">
  <div style="text-align: center;">
    <p style="font-size: 22pt; font-weight: bold; color: #333333; margin: 0 0 4pt 0;">${esc(data.name)}</p>
    <p style="font-size: 10pt; color: #333333; margin: 0 0 4pt 0;">${esc(data.title)}</p>
    <p style="font-size: 9pt; color: #555555; margin: 0 0 14pt 0;">${contactLine}</p>
  </div>

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Professional Summary</strong></p>
  <p style="font-size: 10pt; color: #333333; margin: 0 0 12pt 0; line-height: 1.35;">${esc(data.summary || '')}</p>

  ${(data.strengths?.length ?? 0) > 0 ? `
  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Key Strengths</strong></p>
  ${(data.strengths ?? [])
        .map((s) => `<p style="margin: 4pt 0 2pt 0; font-weight: bold; font-size: 9pt; color: #333333;">${esc(s.title ?? '')}</p>
  <p style="margin: 0 0 8pt 0; font-size: 9pt; color: #333333; line-height: 1.35;">${esc(s.description ?? '')}</p>`)
        .join('\n  ')}
  ` : ''}

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Skills</strong></p>
  <p style="font-size: 9pt; color: #333333; margin: 0 0 14pt 0; line-height: 1.35;">${esc([...(data.hardSkills ?? data.skills ?? []), ...(data.softSkills ?? [])].filter(Boolean).join(', '))}</p>

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Experience</strong></p>
  ${(data.experience ?? [])
        .map((exp) => {
        const dates = [exp.startDate, exp.endDate].filter(Boolean).join(' – ');
        const loc = exp.location ? ` • ${exp.location}` : '';
        const bullets = (exp.achievements ?? [])
            .map((a) => `<p style="margin: 0 0 4pt 0; font-size: 9pt; color: #333333; line-height: 1.35;">- ${esc(a)}</p>`)
            .join('\n  ');
        return `
  <p style="margin: 8pt 0 0; font-weight: bold; font-size: 10pt; color: #333333;">${esc(exp.title ?? '')}</p>
  <p style="margin: 0; font-size: 9pt; color: #444444;">${esc(exp.company ?? '')}</p>
  <p style="margin: 0 0 4pt 0; font-size: 8pt; color: #666666; font-style: italic;">${esc(dates)}${esc(loc)}</p>
  <p style="margin: 0 0 4pt 0; font-size: 9pt; color: #333333; line-height: 1.35;">${esc(exp.description ?? '')}</p>
  ${bullets}`;
    })
        .join('\n')}

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Education</strong></p>
  ${(data.education ?? [])
        .map((edu) => {
        const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
        const loc = edu.location ? ` • ${edu.location}` : '';
        return `
  <p style="margin: 6pt 0 0; font-weight: bold; font-size: 10pt; color: #333333;">${esc(edu.degree ?? '')}</p>
  <p style="margin: 0; font-size: 9pt; color: #444444;">${esc(edu.institution ?? '')}${esc(loc)}</p>
  <p style="margin: 0 0 8pt 0; font-size: 8pt; color: #666666; font-style: italic;">${esc(dates)}</p>`;
    })
        .join('\n')}
</body>
</html>`;
    return html;
}
async function generateResumeDOCX(profile, tailoredContent, companyName, role) {
    const renderData = (0, pdfGenerator_1.prepareResumeRenderData)(profile, tailoredContent, companyName, role);
    const html = buildHayatoStyleHTML(renderData);
    const docxBuffer = await (0, html_to_docx_1.default)(html, null, {
        font: 'Calibri',
        fontSize: 18, // 9pt = 18 half-points
        margins: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5in in twips
        orientation: 'portrait',
    });
    const profileSlug = sanitizeFilename(profile.name) || 'unknown';
    const dateStr = new Date().toISOString().split('T')[0];
    const companySlug = sanitizeFilename(companyName || 'unknown');
    const roleSlug = sanitizeFilename(role || 'resume');
    const docxFilename = `${profileSlug}.docx`;
    const relativePath = `${profileSlug}/${dateStr}/${companySlug}/${roleSlug}/${docxFilename}`;
    const filepath = path_1.default.join(GENERATED_DIR, profileSlug, dateStr, companySlug, roleSlug, docxFilename);
    await promises_1.default.mkdir(path_1.default.dirname(filepath), { recursive: true });
    await promises_1.default.writeFile(filepath, Buffer.from(docxBuffer));
    return relativePath;
}
//# sourceMappingURL=docxGenerator.js.map