'use client';

import { Template } from '@/lib/api';

interface TemplateSelectorProps {
  templates: Template[];
  selectedId: string | null;
  onChange: (id: string) => void;
  isLoading?: boolean;
}

export default function TemplateSelector({
  templates,
  selectedId,
  onChange,
  isLoading,
}: TemplateSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-2">
        Select Template
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Choose a template...</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.id === 'default' ? ' (Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
