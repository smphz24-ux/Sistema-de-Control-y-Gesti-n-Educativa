import fs from 'fs';
import path from 'path';

const filesToMove = [
  '.gitignore',
  'check_data.js',
  'check_paths.js',
  'check_perms.js',
  'compare_data.js',
  'data',
  'index.html',
  'metadata.json',
  'move_stopscanner.cjs',
  'netlify',
  'netlify.toml',
  'package-lock.json',
  'package.json',
  'replace.cjs',
  'replace1.cjs',
  'replace2.cjs',
  'replace3.cjs',
  'replace_barcode.cjs',
  'replace_barcode2.cjs',
  'replace_barcode3.cjs',
  'replace_barcode4.cjs',
  'replace_clear_all.cjs',
  'replace_confirm.cjs',
  'replace_confirm2.cjs',
  'replace_consultas.cjs',
  'replace_consultas2.cjs',
  'replace_consultas3.cjs',
  'replace_consultas4.cjs',
  'replace_consultas5.cjs',
  'replace_consultas6.cjs',
  'replace_download_fotocheck.cjs',
  'replace_enrollment.cjs',
  'replace_mark.cjs',
  'replace_mark2.cjs',
  'replace_mark_exit.cjs',
  'replace_mark_logic.cjs',
  'replace_more_trash.cjs',
  'replace_nav.cjs',
  'replace_nav2.cjs',
  'replace_pdf.cjs',
  'replace_scanner.cjs',
  'replace_scanner2.cjs',
  'replace_scanner3.cjs',
  'replace_trash.cjs',
  'server.ts',
  'src',
  'test-edit.js',
  'test_read.js',
  'tsconfig.json',
  'update_mark_attendance.cjs',
  'update_verify.cjs',
  'vite.config.ts'
];

const workspace = '/app/applet';

console.log('Starting consolidation...');
console.log('CWD:', process.cwd());
filesToMove.forEach(f => {
  const src = path.join('/', f);
  const dest = path.join(workspace, f);
  console.log(`Checking ${src}...`);
  if (fs.existsSync(src)) {
    console.log(`Found ${src}`);
    try {
      if (fs.existsSync(dest) && src !== dest) {
        if (fs.lstatSync(dest).isDirectory()) {
           console.log(`Removing existing directory ${dest}`);
           fs.rmSync(dest, { recursive: true, force: true });
        } else {
           fs.unlinkSync(dest);
        }
      }
      if (src !== dest) {
          fs.renameSync(src, dest);
          console.log(`Moved ${src} to ${dest}`);
      }
    } catch (e) {
      console.error(`Failed to move ${src}: ${e.message}`);
    }
  }
});
