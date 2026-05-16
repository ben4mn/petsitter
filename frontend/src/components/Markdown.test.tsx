import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  describe('headings', () => {
    it('renders # as <h1>', () => {
      render(<Markdown># Trip notes</Markdown>);
      const h1 = screen.getByRole('heading', { level: 1, name: 'Trip notes' });
      expect(h1).toBeInTheDocument();
    });

    it('renders ## as <h2> and ### as <h3>', () => {
      const { container } = render(<Markdown>{`## Pets\n\n### Cats`}</Markdown>);
      expect(container.querySelector('h2')?.textContent).toBe('Pets');
      expect(container.querySelector('h3')?.textContent).toBe('Cats');
    });
  });

  describe('blockquotes', () => {
    it('renders > line as a <blockquote>', () => {
      const { container } = render(<Markdown>{'> she hides at first'}</Markdown>);
      const bq = container.querySelector('blockquote');
      expect(bq?.textContent?.trim()).toBe('she hides at first');
    });
  });

  describe('line breaks', () => {
    it('treats a single newline within a paragraph as a soft break', () => {
      const { container } = render(<Markdown>{'first line\nsecond line'}</Markdown>);
      const p = container.querySelector('p');
      expect(p?.querySelector('br')).not.toBeNull();
      expect(p?.textContent).toContain('first line');
      expect(p?.textContent).toContain('second line');
    });

    it('keeps a blank line as a paragraph break', () => {
      const { container } = render(<Markdown>{'first paragraph\n\nsecond paragraph'}</Markdown>);
      expect(container.querySelectorAll('p')).toHaveLength(2);
    });
  });

  describe('xss hardening', () => {
    it('does not render a script tag from raw input', () => {
      const { container } = render(<Markdown>{'<script>alert(1)</script>'}</Markdown>);
      expect(container.querySelector('script')).toBeNull();
      expect(container.textContent).toContain('<script>');
    });

    it('refuses javascript: URLs in links', () => {
      const { container } = render(<Markdown>{'[click](javascript:alert(1))'}</Markdown>);
      const anchor = container.querySelector('a');
      // either no anchor was emitted, or its href is not the javascript: scheme
      if (anchor) {
        expect(anchor.getAttribute('href')).not.toMatch(/^javascript:/i);
      }
    });
  });
});
