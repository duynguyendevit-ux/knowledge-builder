import { parseCodeFile } from './code-parser.js';

/**
 * Check if file is a code file that should be parsed
 */
export function isCodeFile(filePath) {
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
  return codeExtensions.some(ext => filePath.endsWith(ext));
}

/**
 * Process code file with Tree-sitter
 */
export async function processCodeFile(filePath) {
  try {
    const parsed = await parseCodeFile(filePath);
    if (!parsed) return null;
    
    // Generate code summary
    const summary = {
      file: parsed.file,
      type: 'code',
      stats: {
        functions: parsed.symbols.functions.length,
        classes: parsed.symbols.classes.length,
        imports: parsed.symbols.imports.length,
        exports: parsed.symbols.exports.length
      },
      symbols: parsed.symbols,
      dependencies: parsed.dependencies
    };
    
    return summary;
  } catch (error) {
    console.error(`⚠️  Failed to parse code file: ${error.message}`);
    return null;
  }
}

/**
 * Generate markdown documentation from parsed code
 */
export function generateCodeDoc(parsed, fileName) {
  const { symbols, dependencies } = parsed;
  
  let doc = `---
title: ${fileName}
type: code
created: ${new Date().toISOString()}
tags: [code]
---

# ${fileName}

## Overview

- **Functions:** ${symbols.functions.length}
- **Classes:** ${symbols.classes.length}
- **Imports:** ${symbols.imports.length}
- **Exports:** ${symbols.exports.length}

`;

  // Dependencies
  if (dependencies.length > 0) {
    doc += `## Dependencies\n\n`;
    dependencies.forEach(dep => {
      doc += `- \`${dep}\`\n`;
    });
    doc += '\n';
  }

  // Exports
  if (symbols.exports.length > 0) {
    doc += `## Exports\n\n`;
    symbols.exports.forEach(exp => {
      doc += `- **${exp.name}** (line ${exp.line})\n`;
    });
    doc += '\n';
  }

  // Functions
  if (symbols.functions.length > 0) {
    doc += `## Functions\n\n`;
    symbols.functions.forEach(fn => {
      doc += `### \`${fn.name}(${fn.params.join(', ')})\`\n\n`;
      doc += `- **Line:** ${fn.line}\n`;
      doc += `- **Type:** ${fn.type}\n\n`;
    });
  }

  // Classes
  if (symbols.classes.length > 0) {
    doc += `## Classes\n\n`;
    symbols.classes.forEach(cls => {
      doc += `### \`${cls.name}\`\n\n`;
      doc += `- **Line:** ${cls.line}\n`;
      if (cls.methods.length > 0) {
        doc += `- **Methods:**\n`;
        cls.methods.forEach(method => {
          doc += `  - \`${method.name}(${method.params.join(', ')})\`\n`;
        });
      }
      doc += '\n';
    });
  }

  // Imports
  if (symbols.imports.length > 0) {
    doc += `## Imports\n\n`;
    symbols.imports.forEach(imp => {
      doc += `- From \`${imp.from}\``;
      if (imp.specifiers.length > 0) {
        doc += `: ${imp.specifiers.map(s => `\`${s}\``).join(', ')}`;
      }
      doc += `\n`;
    });
  }

  return doc;
}
