import {
  WorkspaceStore,
  ComponentRegistry,
} from 'nylas-exports';
import {exec} from 'child_process';
import fs from 'fs';
import path from 'path';

import CalendarWrapper from './calendar-wrapper';

function resolveHelperPath(callback) {
  const resourcesPath = NylasEnv.getLoadSettings().resourcePath;
  let pathToCalendarApp = path.join(resourcesPath, '..', 'Nylas Calendar.app');

  fs.exists(pathToCalendarApp, (exists) => {
    if (exists) {
      callback(pathToCalendarApp);
      return;
    }

    pathToCalendarApp = path.join(resourcesPath, 'build', 'resources', 'mac', 'Nylas Calendar.app');
    fs.exists(pathToCalendarApp, (fallbackExists) => {
      if (fallbackExists) {
        callback(pathToCalendarApp);
        return;
      }
      callback(null);
    });
  });
}

export function activate() {
  WorkspaceStore.defineSheet('Main', {root: true}, {list: ['Center']});

  if (process.platform === 'darwin') {
    resolveHelperPath((helperPath) => {
      if (!helperPath) {
        return;
      }

      exec(`chmod +x "${helperPath}/Contents/MacOS/Nylas Calendar"`, () => {
        exec(`open "${helperPath}"`);
      });

      if (!NylasEnv.config.get('addedToDockCalendar')) {
        exec(`defaults write com.apple.dock persistent-apps -array-add "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>${helperPath}/</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>"`, () => {
          NylasEnv.config.set('addedToDockCalendar', true);
          exec(`killall Dock`);
        });
      }
    });

    NylasEnv.onBeforeUnload(() => {
      exec('killall "Nylas Calendar"');
      return true;
    });
  }

  ComponentRegistry.register(CalendarWrapper, {
    location: WorkspaceStore.Location.Center,
  });
}

export function deactivate() {
  ComponentRegistry.unregister(CalendarWrapper);
}
