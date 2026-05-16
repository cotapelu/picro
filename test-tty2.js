const tty = require('tty');
console.log('isatty(0):', tty.isatty(0));
console.log('isatty(1):', tty.isatty(1));
console.log('isatty(2):', tty.isatty(2));