import { describe, expect, it } from 'vitest';
import { EMAIL_TEMPLATES, fillTemplate, templateVariables } from '../../services/emailService.ts';

describe('fillTemplate', () => {
  it('substitutes the variables it was given', () => {
    expect(fillTemplate('გამარჯობა {{client_name}}', { client_name: 'ნიკა' })).toBe('გამარჯობა ნიკა');
  });

  it('leaves an unknown placeholder visible rather than blanking it', () => {
    // A silently emptied placeholder ships a letter with a hole in it.
    expect(fillTemplate('№{{order_number}} — {{missing}}', { order_number: 'ORD-1' }))
      .toBe('№ORD-1 — {{missing}}');
  });

  it('replaces every occurrence', () => {
    expect(fillTemplate('{{a}} და {{a}}', { a: 'x' })).toBe('x და x');
  });

  it('accepts an empty string as a real value', () => {
    expect(fillTemplate('[{{note}}]', { note: '' })).toBe('[]');
  });
});

describe('templateVariables', () => {
  it('lists each placeholder once', () => {
    expect(templateVariables('{{a}} {{b}} {{a}}')).toEqual(['a', 'b']);
  });

  it('returns nothing for plain text', () => {
    expect(templateVariables('უბრალო ტექსტი')).toEqual([]);
  });
});

describe('EMAIL_TEMPLATES', () => {
  it('has unique keys, so a log entry names exactly one template', () => {
    const keys = EMAIL_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never embeds a credential in the body — only a placeholder', () => {
    const credentials = EMAIL_TEMPLATES.find((t) => t.key === 'credentials');
    expect(credentials?.body).toContain('{{temporary_password}}');
    expect(credentials?.body).toMatch(/პაროლის შეცვლას/);
  });

  it('points every template at an environment variable rather than a literal id', () => {
    EMAIL_TEMPLATES.forEach((t) => expect(t.templateEnv).toMatch(/^VITE_EMAILJS_TEMPLATE_/));
  });
});
