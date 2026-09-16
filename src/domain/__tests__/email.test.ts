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

describe('the login-carrying templates', () => {
  const COMBINED = ['guestbook_ready_with_login', 'album_ready_with_login', 'both_ready_with_login'];

  it('exist, and each carries the credentials the client needs to sign in', () => {
    for (const key of COMBINED) {
      const template = EMAIL_TEMPLATES.find((t) => t.key === key);
      expect(template, key).toBeDefined();
      const used = templateVariables(`${template!.subject} ${template!.body}`);
      // Without all three the letter arrives with a link the reader cannot open.
      expect(used, key).toContain('login_url');
      expect(used, key).toContain('username');
      expect(used, key).toContain('temporary_password');
    }
  });

  it('points each one at the link it promises', () => {
    const find = (key: string) => EMAIL_TEMPLATES.find((t) => t.key === key)!.body;
    expect(templateVariables(find('guestbook_ready_with_login'))).toContain('guestbook_url');
    expect(templateVariables(find('album_ready_with_login'))).toContain('album_url');
    const both = templateVariables(find('both_ready_with_login'));
    expect(both).toContain('guestbook_url');
    expect(both).toContain('album_url');
  });

  it('uses only variables the composer can actually supply', () => {
    // QuickEmailModal builds this exact set; anything else renders as a literal
    // {{placeholder}} in a letter that has already been sent.
    const SUPPLIED = new Set([
      'client_name', 'order_number', 'total', 'balance', 'courier_info',
      'event_title', 'guestbook_url', 'album_url', 'event_url',
      'login_url', 'username', 'temporary_password',
    ]);
    for (const template of EMAIL_TEMPLATES) {
      for (const variable of templateVariables(`${template.subject} ${template.body}`)) {
        expect(SUPPLIED.has(variable), `${template.key} uses {{${variable}}}`).toBe(true);
      }
    }
  });
});
