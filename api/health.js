function kind(v) {
  if (!v) return 'missing';
  const s = v.trim();
  if (s.startsWith('sk-or-')) return 'looks like an OpenRouter key';
  if (s.startsWith('gsk_')) return 'looks like a Groq key';
  if (s.startsWith('xai-')) return 'looks like an xAI key';
  return 'unrecognized format';
}

// Open /api/health in your browser. Shows which variables this deployment sees. Never shows values.
module.exports = function handler(req, res) {
  const names = ['OPENROUTER_API_KEY', 'GROQ_API_KEY', 'GROK_API_KEY', 'XAI_API_KEY'];
  const checks = {};
  names.forEach(n => {
    const v = process.env[n] || '';
    checks[n] = {
      present: v.length > 0,
      length: v.length,
      format: kind(v),
      hasSpacesOrNewlines: /\s/.test(v),
    };
  });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    vercelEnvironment: process.env.VERCEL_ENV || 'local',
    checks,
  });
};
