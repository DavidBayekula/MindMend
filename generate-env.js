// generate-env.js – works locally AND on Netlify
require('dotenv').config();  // ← loads .env when running locally

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const content = `window.env = {
  SUPABASE_URL: "${process.env.SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY}"
};
console.log('env.js generated');`;

require('fs').writeFileSync('env.js', content);