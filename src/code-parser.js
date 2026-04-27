import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import fs from 'fs/promises';
import path from 'path';

/**
 * Parse code files and extract symbols (functions, classes, imports, exports)
 */
export class CodeParser {
  constructor() {
    this.jsParser = new Parser();
    this.jsParser.setLanguage(JavaScript);
    
    this.tsParser = new Parser();
    this.tsParser.setLanguage(TypeScript.typescript);
  }

  /**
   * Parse a code file and extract structure
   */
  async parseFile(filePath) {
    const ext = path.extname(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    
    let parser;
    if (['.js', '.jsx', '.mjs'].includes(ext)) {
      parser = this.jsParser;
    } else if (['.ts', '.tsx'].includes(ext)) {
      parser = this.tsParser;
    } else {
      return null; // Unsupported file type
    }

    const tree = parser.parse(content);
    return this.extractSymbols(tree.rootNode, content, filePath);
  }

  /**
   * Extract symbols from AST
   */
  extractSymbols(node, sourceCode, filePath) {
    const symbols = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      variables: []
    };

    this.traverse(node, sourceCode, symbols);
    
    return {
      file: filePath,
      symbols,
      dependencies: this.extractDependencies(symbols.imports)
    };
  }

  /**
   * Traverse AST and collect symbols
   */
  traverse(node, sourceCode, symbols) {
    // Function declarations
    if (node.type === 'function_declaration') {
      const name = this.getNodeText(node.childForFieldName('name'), sourceCode);
      const params = this.extractParameters(node, sourceCode);
      symbols.functions.push({
        name,
        params,
        line: node.startPosition.row + 1,
        type: 'function'
      });
    }

    // Arrow functions assigned to variables
    if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      const declarator = node.descendantsOfType('variable_declarator')[0];
      if (declarator) {
        const name = this.getNodeText(declarator.childForFieldName('name'), sourceCode);
        const value = declarator.childForFieldName('value');
        if (value && (value.type === 'arrow_function' || value.type === 'function')) {
          const params = this.extractParameters(value, sourceCode);
          symbols.functions.push({
            name,
            params,
            line: node.startPosition.row + 1,
            type: 'arrow_function'
          });
        } else {
          symbols.variables.push({
            name,
            line: node.startPosition.row + 1
          });
        }
      }
    }

    // Class declarations
    if (node.type === 'class_declaration') {
      const name = this.getNodeText(node.childForFieldName('name'), sourceCode);
      const methods = this.extractMethods(node, sourceCode);
      symbols.classes.push({
        name,
        methods,
        line: node.startPosition.row + 1
      });
    }

    // Import statements
    if (node.type === 'import_statement') {
      const source = node.descendantsOfType('string')[0];
      if (source) {
        const importPath = this.getNodeText(source, sourceCode).replace(/['"]/g, '');
        const specifiers = this.extractImportSpecifiers(node, sourceCode);
        symbols.imports.push({
          from: importPath,
          specifiers,
          line: node.startPosition.row + 1
        });
      }
    }

    // Export statements
    if (node.type === 'export_statement') {
      const declaration = node.childForFieldName('declaration');
      if (declaration) {
        const exportName = this.getExportName(declaration, sourceCode);
        if (exportName) {
          symbols.exports.push({
            name: exportName,
            line: node.startPosition.row + 1
          });
        }
      }
    }

    // Recurse through children
    for (let i = 0; i < node.childCount; i++) {
      this.traverse(node.child(i), sourceCode, symbols);
    }
  }

  /**
   * Extract function parameters
   */
  extractParameters(node, sourceCode) {
    const params = node.descendantsOfType('identifier')
      .filter(n => n.parent?.type === 'formal_parameters')
      .map(n => this.getNodeText(n, sourceCode));
    return params;
  }

  /**
   * Extract class methods
   */
  extractMethods(classNode, sourceCode) {
    const methods = [];
    const methodDefs = classNode.descendantsOfType('method_definition');
    
    for (const method of methodDefs) {
      const name = this.getNodeText(method.childForFieldName('name'), sourceCode);
      const params = this.extractParameters(method, sourceCode);
      methods.push({ name, params });
    }
    
    return methods;
  }

  /**
   * Extract import specifiers
   */
  extractImportSpecifiers(importNode, sourceCode) {
    const specifiers = [];
    const importClause = importNode.childForFieldName('import_clause');
    
    if (importClause) {
      const namedImports = importClause.descendantsOfType('import_specifier');
      for (const spec of namedImports) {
        const name = this.getNodeText(spec.childForFieldName('name'), sourceCode);
        specifiers.push(name);
      }
      
      // Default import
      const defaultImport = importClause.descendantsOfType('identifier')[0];
      if (defaultImport && defaultImport.parent === importClause) {
        specifiers.push(this.getNodeText(defaultImport, sourceCode));
      }
    }
    
    return specifiers;
  }

  /**
   * Get export name
   */
  getExportName(declaration, sourceCode) {
    if (declaration.type === 'function_declaration' || declaration.type === 'class_declaration') {
      return this.getNodeText(declaration.childForFieldName('name'), sourceCode);
    }
    return null;
  }

  /**
   * Extract dependencies from imports
   */
  extractDependencies(imports) {
    return imports.map(imp => imp.from);
  }

  /**
   * Get text content of a node
   */
  getNodeText(node, sourceCode) {
    if (!node) return '';
    return sourceCode.slice(node.startIndex, node.endIndex);
  }
}

/**
 * Parse a code file and return symbols
 */
export async function parseCodeFile(filePath) {
  const parser = new CodeParser();
  return await parser.parseFile(filePath);
}
