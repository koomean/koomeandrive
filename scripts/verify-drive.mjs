import fs from 'node:fs';
import assert from 'node:assert/strict';
if(process.env.GITHUB_REPOSITORY)assert.equal(process.env.GITHUB_REPOSITORY,'koomean/koomeandrive');
assert.equal(fs.readFileSync('CNAME','utf8').trim(),'drive.koomean.com');
assert.equal(fs.readFileSync('dist/CNAME','utf8').trim(),'drive.koomean.com');
const html=fs.readFileSync('dist/index.html','utf8');
assert.match(html,/<title>Koo Drive<\/title>/);
assert.doesNotMatch(html,/id="(?:feed|links-container|applications)"/);
const script=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
const js=fs.readFileSync('dist'+script,'utf8');
assert.ok(js.includes('maintenanceStatus')&&js.includes('maintenance-countdown'));
console.log('PASS Drive repository, custom domain, app identity and maintenance assets');

assert.doesNotMatch(fs.readFileSync('src/maintenance.tsx','utf8'), /ThemeSelect|<select/);
assert.match(fs.readFileSync('src/theme.tsx','utf8'), /koomean_drive_theme_v1/);
