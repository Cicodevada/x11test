const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function getIconPath(windowId) {
  return new Promise((resolve) => {
    exec(`xprop -id ${windowId} _NET_WM_PID`, (err, stdout) => {
      if (err || !stdout) {
        resolve(null);
        return;
      }

      const pid = stdout.split(' ').pop().trim();
      exec(`ps -p ${pid} -o comm=`, (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }

        const binaryName = stdout.trim();
        const desktopFilePath = `/usr/share/applications/${binaryName}.desktop`;

        if (fs.existsSync(desktopFilePath)) {
          const desktopContent = fs.readFileSync(desktopFilePath, 'utf8');
          const iconMatch = desktopContent.match(/Icon=(.+)/);

          if (iconMatch && iconMatch[1]) {
            const iconPath = iconMatch[1].trim();
            resolve(iconPath.startsWith('/') ? iconPath : `/usr/share/icons/${iconPath}.png`);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  });
}

function listOpenWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -l', async (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/\s+/);
          const windowId = parts[0];
          const desktop = parts[1];
          const pid = parts[2];
          const name = parts.slice(3).join(' ');

          return { windowId, desktop, pid, name };
        });

      for (const win of windows) {
        win.icon = await getIconPath(win.windowId);
      }

      resolve(windows);
    });
  });
}
