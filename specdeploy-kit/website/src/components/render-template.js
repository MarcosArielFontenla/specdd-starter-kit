// Minimal template renderer: {{var}} (dotted paths) and {{#if var}}...{{/if}}.
// No else, no loops. GitHub Actions expressions `${{ ... }}` are left untouched.

function lookup(ctx, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

export function renderTemplate(template, ctx) {
  const afterIfs = template.replace(
    /\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, body) => (lookup(ctx, key) ? body : ''),
  );
  const out = afterIfs.replace(/(?<!\$)\{\{([\w.]+)\}\}/g, (_, key) => {
    const v = lookup(ctx, key);
    if (v === undefined || v === null) throw new Error(`renderTemplate: unresolved placeholder {{${key}}}`);
    return String(v);
  });
  const withoutGha = out.replace(/\$\{\{[^}]*\}\}/g, '');
  if (withoutGha.includes('{{')) throw new Error('renderTemplate: unresolved placeholder remains after render');
  return out;
}
