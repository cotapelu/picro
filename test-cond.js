const imp = './hooks/useTheme';
console.log('starts dot?', imp.startsWith('.'));
console.log('contains dot?', imp.includes('.'));
console.log('node?', imp.startsWith('node:'));
console.log('http?', imp.startsWith('http'));
console.log('should replace?', !imp.startsWith('node:') && !imp.startsWith('http') && !imp.includes('.') && imp.startsWith('.'));
