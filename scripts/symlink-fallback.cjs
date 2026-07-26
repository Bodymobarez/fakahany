/**
 * Windows without Developer Mode can't create symlinks (EPERM).
 * Next.js standalone output relies on them — fall back to copy/junction.
 */
const fs = require('fs');
const path = require('path');

function copyFallback(target, dest) {
  const resolved = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
  if (!fs.existsSync(resolved)) {
    throw Object.assign(new Error(`symlink target missing: ${resolved}`), { code: 'ENOENT' });
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const stat = fs.lstatSync(resolved);
  if (stat.isDirectory()) {
    fs.cpSync(resolved, dest, { recursive: true, force: true });
  } else {
    fs.copyFileSync(resolved, dest);
  }
}

function wrapSync(fnName) {
  const original = fs[fnName].bind(fs);
  fs[fnName] = function (target, dest, type) {
    try {
      return original(target, dest, type);
    } catch (err) {
      if (err && (err.code === 'EPERM' || err.code === 'EACCES')) {
        copyFallback(target, dest);
        return undefined;
      }
      throw err;
    }
  };
}

wrapSync('symlinkSync');
wrapSync('symlink');

if (fs.promises?.symlink) {
  const original = fs.promises.symlink.bind(fs.promises);
  fs.promises.symlink = async function (target, dest, type) {
    try {
      return await original(target, dest, type);
    } catch (err) {
      if (err && (err.code === 'EPERM' || err.code === 'EACCES')) {
        copyFallback(target, dest);
        return undefined;
      }
      throw err;
    }
  };
}
