// Package Manager Example
//
// Demonstrates how to install, list, and check health of packages.

import { DefaultPackageManager } from '@picro/agent';

async function main() {
  const pkgManager = new DefaultPackageManager({
    packagesDir: './.pi/packages',
  });

  // Install a sample package (e.g., a hypothetical pi extension)
  // In practice, use a real package name that provides pi extensions.
  // const result = await pkgManager.installPackage({ name: 'pi-extension-example' });
  // if (result) {
  //   console.log('Installed:', result.name, 'at', result.path);
  // }

  // List installed packages
  const installed = pkgManager.listInstalled();
  console.log('Installed packages:', installed.map(p => p.name));

  // Check health of a package
  // const health = await pkgManager.checkPackageHealth('some-package');
  // console.log('Health:', health);
}

main().catch(console.error);
