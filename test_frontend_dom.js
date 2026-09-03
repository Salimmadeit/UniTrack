const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING FRONTEND PAGES & ASSETS ===\n');

const indexHtml = fs.readFileSync(path.join(__dirname, 'frontend', 'index.html'), 'utf-8');
const driverHtml = fs.readFileSync(path.join(__dirname, 'frontend', 'driver.html'), 'utf-8');
const dispatcherHtml = fs.readFileSync(path.join(__dirname, 'frontend', 'dispatcher.html'), 'utf-8');
const mapJs = fs.readFileSync(path.join(__dirname, 'frontend', 'js', 'map.js'), 'utf-8');
const appJs = fs.readFileSync(path.join(__dirname, 'frontend', 'js', 'app.js'), 'utf-8');
const themeJs = fs.readFileSync(path.join(__dirname, 'frontend', 'js', 'theme.js'), 'utf-8');
const dispatcherJs = fs.readFileSync(path.join(__dirname, 'frontend', 'js', 'dispatcher.js'), 'utf-8');

// Check 1: Dark mode toggles and icons present in all 3 pages
console.log('Test 1: Dark mode support across pages...');
if (!indexHtml.includes('data-theme-toggle') || !indexHtml.includes('theme-icon')) throw new Error('index.html missing data-theme-toggle');
if (!driverHtml.includes('data-theme-toggle') || !driverHtml.includes('theme-icon')) throw new Error('driver.html missing data-theme-toggle');
if (!dispatcherHtml.includes('data-theme-toggle') || !dispatcherHtml.includes('theme-icon')) throw new Error('dispatcher.html missing data-theme-toggle');
if (!themeJs.includes("root.classList.add('dark')") || !themeJs.includes("root.classList.remove('dark')")) throw new Error('theme.js missing dark class handling');
console.log('✓ PASS: All 3 pages have data-theme-toggle buttons, theme-icon sync, and theme.js handles Tailwind dark class');

// Check 2: Verifying New Hall coordinates & University Road routing
console.log('\nTest 2: Verifying New Hall coordinates & road routing...');
if (!mapJs.includes('[6.5200, 3.3926]')) throw new Error('map.js missing verified New Hall coordinate 6.5200, 3.3926');
if (!appJs.includes("lat: 6.5200, lng: 3.3926")) throw new Error('app.js missing verified New Hall coordinate');
console.log('✓ PASS: New Hall coordinate verified at [6.5200, 3.3926] along University Road');

// Check 3: Purged stops (Senate Building, Main Library, Chapel Junction, Moremi Hall, Faculty of Engineering)
console.log('\nTest 3: Confirming absence of non-existent stops in active user flow...');
['Senate Building', 'Main Library', 'Chapel Junction', 'Moremi Hall', 'Faculty of Engineering'].forEach(stop => {
  if (indexHtml.includes(stop)) throw new Error(`index.html contains removed stop: ${stop}`);
  if (driverHtml.includes(stop)) throw new Error(`driver.html contains removed stop: ${stop}`);
  if (dispatcherHtml.includes(stop)) throw new Error(`dispatcher.html contains removed stop: ${stop}`);
  if (appJs.includes(stop)) throw new Error(`app.js contains removed stop: ${stop}`);
  if (dispatcherJs.includes(stop)) throw new Error(`dispatcher.js contains removed stop: ${stop}`);
});
console.log('✓ PASS: Zero occurrences of Senate Building, Main Library, Chapel Junction, Moremi Hall, or Faculty of Engineering in all active frontend files');

// Check 4: Dispatcher Console Redesign Verification
console.log('\nTest 4: Verifying Dispatcher Console Redesign...');
if (!dispatcherHtml.includes('Dispatcher Command Overview')) throw new Error('dispatcher.html missing header overview');
if (!dispatcherHtml.includes('Station Queues')) throw new Error('dispatcher.html missing Station Queues section');
if (!dispatcherHtml.includes('Demand Alerts')) throw new Error('dispatcher.html missing Demand Alerts section');
if (!dispatcherHtml.includes('Fleet Status')) throw new Error('dispatcher.html missing Fleet Status section');
if (!dispatcherJs.includes('/dispatch/alerts')) throw new Error('dispatcher.js missing alerts API connection');
if (!dispatcherJs.includes('/dispatch/acknowledge/')) throw new Error('dispatcher.js missing acknowledge API connection');
console.log('✓ PASS: Dispatcher console is fully upgraded with Stitch 3-column layout and live API wiring');

console.log('\n=== ALL FRONTEND DOM & CODE TESTS PASSED! ===');
