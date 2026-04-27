// Test file for code parser
import { parseCodeFile } from './code-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testParser() {
  console.log('🧪 Testing Code Parser...\n');
  
  // Test parsing the parser itself
  const testFile = path.join(__dirname, 'code-parser.js');
  
  try {
    const result = await parseCodeFile(testFile);
    
    console.log('📄 File:', result.file);
    console.log('\n📦 Functions:', result.symbols.functions.length);
    result.symbols.functions.slice(0, 5).forEach(fn => {
      console.log(`  - ${fn.name}(${fn.params.join(', ')}) at line ${fn.line}`);
    });
    
    console.log('\n🏛️  Classes:', result.symbols.classes.length);
    result.symbols.classes.forEach(cls => {
      console.log(`  - ${cls.name} at line ${cls.line}`);
      cls.methods.slice(0, 3).forEach(method => {
        console.log(`    • ${method.name}(${method.params.join(', ')})`);
      });
    });
    
    console.log('\n📥 Imports:', result.symbols.imports.length);
    result.symbols.imports.forEach(imp => {
      console.log(`  - from "${imp.from}": [${imp.specifiers.join(', ')}]`);
    });
    
    console.log('\n📤 Exports:', result.symbols.exports.length);
    result.symbols.exports.forEach(exp => {
      console.log(`  - ${exp.name} at line ${exp.line}`);
    });
    
    console.log('\n🔗 Dependencies:', result.dependencies.length);
    result.dependencies.forEach(dep => {
      console.log(`  - ${dep}`);
    });
    
    console.log('\n✅ Parser test complete!');
  } catch (error) {
    console.error('❌ Parser test failed:', error.message);
    console.error(error.stack);
  }
}

testParser();
