const fs = require('fs');
const path = require('path');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

function findUnusedVars(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const unusedVars = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ищем объявления переменных
    const constMatch = line.match(/const\s+(\w+)\s*[:=]/);
    if (constMatch) {
      const varName = constMatch[1];
      
      // Проверяем, используется ли переменная дальше в файле
      const remainingContent = lines.slice(i + 1).join('\n');
      const usageCount = (remainingContent.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
      
      if (usageCount === 0) {
        unusedVars.push({
          file: filePath,
          line: i + 1,
          variable: varName,
          code: line.trim()
        });
      }
    }
  }
  
  return unusedVars;
}

function scanDirectory(dir) {
  const results = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist')) {
        scan(fullPath);
      } else if (item.endsWith('.ts') && !item.includes('.d.ts')) {
        try {
          const unused = findUnusedVars(fullPath);
          results.push(...unused);
        } catch (err) {
          // Игнорируем ошибки
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

const results = scanDirectory('.');
logger.info({
  totalUnusedVars: results.length,
  results: results.map(item => ({
    file: item.file,
    line: item.line,
    variable: item.variable,
    code: item.code
  }))
}, `Найдено ${results.length} неиспользуемых переменных`);

results.forEach((item, index) => {
  logger.info({
    index: index + 1,
    file: item.file,
    line: item.line,
    variable: item.variable,
    code: item.code
  }, `${index + 1}. ${item.file}:${item.line} - ${item.variable}`);
});
