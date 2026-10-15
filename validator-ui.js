async function validateFiles(files) {
  // files = [{ name: 'GameManager.lua', source: '...lua code...' }]
  try {
    const r = await fetch('/api/validate-lua', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    const data = await r.json();
    return data.results || [];
  } catch (e) {
    console.error('validation failed', e);
    return [];
  }
}

function validationBadge(result) {
  if (!result) return '';
  if (result.syntaxOk && result.warnings.length === 0) return '✅ Syntax OK';
  if (result.syntaxOk) {
    return '⚠️ Syntax OK, ' + result.warnings.length + ' warning(s): ' + result.warnings.join('; ');
  }
  return '❌ ' + result.error;
}

window.validateFiles = validateFiles;
window.validationBadge = validationBadge;
