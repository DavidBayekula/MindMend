// generate-env.js
const fs = require('fs');

const envContent = `window.env = {
  SUPABASE_URL: "${process.env.SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY}"
};`;

fs.writeFileSync('env.js', envContent);
console.log('env.js generated with Supabase credentials');