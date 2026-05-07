import fs from 'fs';
import path from 'path';

const nestedDir = '/app/applet/app/applet';
const workspace = '/app/applet';

if (fs.existsSync(nestedDir)) {
  const files = fs.readdirSync(nestedDir);
  files.forEach(f => {
    const src = path.join(nestedDir, f);
    const dest = path.join(workspace, f);
    
    try {
      if (fs.existsSync(dest) && src !== dest) {
         if (fs.lstatSync(dest).isDirectory()) {
            fs.rmSync(dest, { recursive: true, force: true });
         } else {
            fs.unlinkSync(dest);
         }
      }
      fs.renameSync(src, dest);
      console.log(`Moved ${src} to ${dest}`);
    } catch (e) {
      console.error(`Error moving ${f}: ${e.message}`);
    }
  });

  // Try to remove /app/applet/app/applet and /app/applet/app
  try {
     fs.rmdirSync(nestedDir);
     fs.rmdirSync(path.join(workspace, 'app'));
  } catch (e) {
     console.log('Cleanup info:', e.message);
  }
} else {
  console.log('Nested dir not found');
}
