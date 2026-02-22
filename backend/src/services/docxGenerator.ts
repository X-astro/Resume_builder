/// <reference path="../types/html-to-docx.d.ts" />
import fs from 'fs/promises';
import path from 'path';
import HTMLtoDOCX from 'html-to-docx';
import { Profile } from '../types/profile';
import { TailoredContent } from '../types/template';
import { prepareResumeRenderData } from './pdfGenerator';
import { GENERATED_RESUMES_DIR } from '../config/storage';

const GENERATED_DIR = GENERATED_RESUMES_DIR;

function sanitizeFilename(str: string): string {
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
function buildHayatoStyleHTML(data: ReturnType<typeof prepareResumeRenderData>): string {
  const esc = (s: string) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const contactParts: string[] = [esc(data.contact?.email ?? '')];
  if (data.contact?.phone) contactParts.push(esc(data.contact.phone));
  if (data.contact?.location) contactParts.push(esc(data.contact.location));
  if (data.contact?.linkedin) contactParts.push(`<a href="${esc(data.contact.linkedin)}">${esc(data.contact.linkedin)}</a>`);
  const contactLine = contactParts.filter(Boolean).join(' | ');

  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Calibri, Arial, sans-serif; font-size: 9pt; color: #333333;">
  <div style="text-align: center;">
    <p style="font-size: 22pt; font-weight: bold; color: #333333; margin: 0 0 4pt 0; text-align: center;">${esc(data.name)}</p>
    <p style="font-size: 10pt; color: #333333; margin: 0 0 4pt 0; text-align: center;">${esc(data.title)}</p>
    <p style="font-size: 9pt; color: #555555; margin: 0 0 14pt 0; text-align: center;">${contactLine}</p>
  </div>

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Professional Summary</strong></p>
  <p style="font-size: 10pt; color: #333333; margin: 0 0 12pt 0; line-height: 1.35;">${esc(data.summary || '')}</p>

  ${(data.strengths?.length ?? 0) > 0 ? `
  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Key Strengths</strong></p>
  ${(data.strengths ?? [])
    .map(
      (s: { title?: string; description?: string }) =>
        `<p style="margin: 4pt 0 2pt 0; font-weight: bold; font-size: 9pt; color: #333333;">${esc(s.title ?? '')}</p>
  <p style="margin: 0 0 8pt 0; font-size: 9pt; color: #333333; line-height: 1.35;">${esc(s.description ?? '')}</p>`
    )
    .join('\n  ')}
  ` : ''}

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Skills</strong></p>
  <p style="font-size: 9pt; color: #333333; margin: 0 0 14pt 0; line-height: 1.35;">${esc(
    [...(data.hardSkills ?? data.skills ?? []), ...(data.softSkills ?? [])].filter(Boolean).join(', ')
  )}</p>

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Experience</strong></p>
  ${(data.experience ?? [])
    .map(
      (exp: {
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        location?: string;
        description?: string;
        achievements?: string[];
      }) => {
        const dates = [exp.startDate, exp.endDate].filter(Boolean).join(' – ');
        const loc = exp.location ? ` • ${exp.location}` : '';
        const bullets = (exp.achievements ?? [])
          .map((a: string) => `<p style="margin: 0 0 4pt 0; font-size: 9pt; color: #333333; line-height: 1.35;">- ${esc(a)}</p>`)
          .join('\n  ');
        return `
  <p style="margin: 8pt 0 0; font-weight: bold; font-size: 10pt; color: #333333;">${esc(exp.title ?? '')}</p>
  <p style="margin: 0; font-size: 9pt; color: #444444;">${esc(exp.company ?? '')}</p>
  <p style="margin: 0 0 4pt 0; font-size: 8pt; color: #666666; font-style: italic;">${esc(dates)}${esc(loc)}</p>
  <p style="margin: 0 0 4pt 0; font-size: 9pt; color: #333333; line-height: 1.35;">${esc(exp.description ?? '')}</p>
  ${bullets}`;
      }
    )
    .join('\n')}

  <p style="margin: 14pt 0 6pt 0;"><strong style="font-size: 11pt; text-decoration: underline; color: #333333;">Education</strong></p>
  ${(data.education ?? [])
    .map(
      (edu: {
        degree?: string;
        institution?: string;
        startDate?: string;
        endDate?: string;
        location?: string;
      }) => {
        const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
        const loc = edu.location ? ` • ${edu.location}` : '';
        return `
  <p style="margin: 6pt 0 0; font-weight: bold; font-size: 10pt; color: #333333;">${esc(edu.degree ?? '')}</p>
  <p style="margin: 0; font-size: 9pt; color: #444444;">${esc(edu.institution ?? '')}${esc(loc)}</p>
  <p style="margin: 0 0 8pt 0; font-size: 8pt; color: #666666; font-style: italic;">${esc(dates)}</p>`;
      }
    )
    .join('\n')}
</body>
</html>`;

  return html;
}

export async function generateResumeDOCX(
  profile: Profile,
  tailoredContent: TailoredContent | undefined,
  companyName: string,
  role: string
): Promise<string> {
  const renderData = prepareResumeRenderData(profile, tailoredContent, companyName, role);
  const html = buildHayatoStyleHTML(renderData);

  const docxBuffer = await HTMLtoDOCX(html, null, {
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
  const filepath = path.join(GENERATED_DIR, profileSlug, dateStr, companySlug, roleSlug, docxFilename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, Buffer.from(docxBuffer as ArrayBuffer));

  return relativePath;
}
