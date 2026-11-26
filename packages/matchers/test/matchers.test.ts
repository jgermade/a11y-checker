import { check } from '@a11y-checker/sdk';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/vitest.js';

// Page-level rules (language, title) apply when checking the whole document.
beforeEach(() => {
  document.documentElement.lang = 'en';
  document.title = 'Test';
});

afterEach(() => {
  document.body.innerHTML = '';
});

function render(html: string): HTMLElement {
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body.firstElementChild as HTMLElement;
}

describe('toBeAccessible', () => {
  it('passes for an accessible element', async () => {
    const main = render('<button>Save</button><img src="a.png" alt="Logo">');
    await expect(main).toBeAccessible();
  });

  it('fails with a readable list of violations', async () => {
    const main = render('<img src="a.png" id="logo"><button>Ok</button>');
    await expect(expect(main).toBeAccessible()).rejects.toThrow(
      /Expected no accessibility violations, but found 1:\n\n✖ \[critical\] axe\/image-alt: Images must have alternative text \(WCAG 1\.1\.1\)[\s\S]*• #logo/,
    );
  });

  it('supports .not', async () => {
    const main = render('<img src="a.png">');
    await expect(main).not.toBeAccessible();
    await expect(expect(render('<p>ok</p>')).not.toBeAccessible()).rejects.toThrow(
      'Expected accessibility violations, but none were found.',
    );
  });

  it('only checks the given element', async () => {
    document.body.innerHTML = '<section id="ok"><button>Ok</button></section><img src="a.png">';
    await expect(document.getElementById('ok')).toBeAccessible();
  });

  it('applies the failOn threshold and check options', async () => {
    // `region` is a moderate best practice: content outside landmarks.
    document.body.innerHTML = '<div><p>Outside landmarks</p></div>';
    await expect(document).toBeAccessible({ bestPractices: true, failOn: 'serious' });
    await expect(document).not.toBeAccessible({
      bestPractices: true,
      rules: { include: ['region'] },
    });
  });

  it('rejects values that are not elements or documents', async () => {
    await expect(expect('nope').toBeAccessible()).rejects.toThrow(
      'toBeAccessible() expects an Element or a Document.',
    );
  });
});

describe('toHaveNoViolations', () => {
  it('asserts on check() results', async () => {
    render('<img src="a.png">');
    const result = await check();
    expect(() => {
      expect(result).toHaveNoViolations();
    }).toThrow(/found 1/);
    expect(result).not.toHaveNoViolations();
    expect(() => {
      expect({}).toHaveNoViolations();
    }).toThrow('expects the result of check()');
  });
});
