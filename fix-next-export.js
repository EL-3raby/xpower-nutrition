const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const outDir = path.join(__dirname, 'out');
if (fs.existsSync(outDir)) {
  const allFiles = walk(outDir);
  let movedCount = 0;
  
  allFiles.forEach(file => {
    // Find if this file is inside any directory that starts with "__next."
    // We get the relative path from 'out' to make it easier to search
    const relPath = path.relative(outDir, file);
    const parts = relPath.split(path.sep);
    
    // Find the FIRST part that starts with "__next."
    const nextDirIndex = parts.findIndex(p => p.startsWith('__next.'));
    
    if (nextDirIndex !== -1 && nextDirIndex < parts.length - 1) {
      // The directory starting with "__next."
      const nextDirName = parts[nextDirIndex];
      // The rest of the path after "__next."
      const restOfPath = parts.slice(nextDirIndex + 1);
      
      // The client expects dots instead of slashes for the rest of the path!
      const newFileName = nextDirName + '.' + restOfPath.join('.');
      
      // The parent directory where the new file should be placed (the folder containing the __next. folder)
      const targetDirParts = parts.slice(0, nextDirIndex);
      const targetDir = path.join(outDir, ...targetDirParts);
      
      const newFilePath = path.join(targetDir, newFileName);
      
      // Move the file
      fs.renameSync(file, newFilePath);
      console.log(`Fixed RSC Path: ${newFilePath}`);
      movedCount++;
    }
  });
  
  console.log(`Flattened ${movedCount} Next.js static export RSC payload paths.`);
} else {
  console.log('No out directory found.');
}
