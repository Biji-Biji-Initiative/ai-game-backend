
/**
 * This transform converts CommonJS modules to ES modules.
 * It handles:
 * - require() to import statements
 * - module.exports to export statements
 * - Adding .js extensions to local imports
 * - Converting dynamic requires to dynamic imports
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Convert require statements to import statements
  root
    .find(j.CallExpression, {
      callee: { name: 'require' }
    })
    .forEach(path => {
      // Skip dynamic requires for now (we'll handle them separately)
      if (path.node.arguments[0].type !== 'Literal') return;

      const modulePath = path.node.arguments[0].value;
      let importPath = modulePath;
      
      // Add .js extension to relative paths if missing
      if (
        (modulePath.startsWith('./') || modulePath.startsWith('../')) && 
        !path.value.arguments[0].value.match(/\.(js|json|mjs)$/)
      ) {
        importPath = `${modulePath}.js`;
      }

      // Simple require
      if (
        path.parent.node.type === 'VariableDeclarator' &&
        path.parent.node.id.type === 'Identifier'
      ) {
        const defaultImport = j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier(path.parent.node.id.name))],
          j.literal(importPath)
        );
        
        // Replace the variable declaration with import
        j(path.parent.parent).replaceWith(defaultImport);
      }
      
      // Destructured require
      else if (
        path.parent.node.type === 'VariableDeclarator' &&
        path.parent.node.id.type === 'ObjectPattern'
      ) {
        const importSpecifiers = path.parent.node.id.properties.map(prop => {
          // Handle aliased imports { originalName: aliasName }
          if (prop.value && prop.key.name !== prop.value.name) {
            return j.importSpecifier(
              j.identifier(prop.key.name),
              j.identifier(prop.value.name)
            );
          }
          // Handle regular imports { name }
          return j.importSpecifier(j.identifier(prop.key.name));
        });
        
        const importDecl = j.importDeclaration(
          importSpecifiers,
          j.literal(importPath)
        );
        
        j(path.parent.parent).replaceWith(importDecl);
      }
    });

  // Convert module.exports = ... to export default ...
  root
    .find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        object: { name: 'module' },
        property: { name: 'exports' }
      }
    })
    .forEach(path => {
      // module.exports = { ... } with object literal - convert to named exports
      if (path.node.right.type === 'ObjectExpression') {
        const exportStatements = path.node.right.properties.map(prop => {
          if (prop.type === 'Property') {
            if (prop.key.name === prop.value.name) {
              // For shorthand { foo } syntax
              return j.exportNamedDeclaration(
                null,
                [j.exportSpecifier(j.identifier(prop.key.name))]
              );
            } else {
              // Regular property { foo: bar }
              return j.exportNamedDeclaration(
                j.variableDeclaration('const', [
                  j.variableDeclarator(
                    j.identifier(prop.key.name),
                    prop.value
                  )
                ])
              );
            }
          }
          return null;
        }).filter(Boolean);
        
        j(path.parent).replaceWith(exportStatements);
      } else {
        // Regular module.exports = someValue
        j(path.parent).replaceWith(
          j.exportDefaultDeclaration(path.node.right)
        );
      }
    });

  // Convert exports.foo = bar to export const foo = bar
  root
    .find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        object: { name: 'exports' },
      }
    })
    .forEach(path => {
      const exportName = path.node.left.property.name;
      
      j(path.parent).replaceWith(
        j.exportNamedDeclaration(
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(exportName),
              path.node.right
            )
          ])
        )
      );
    });

  // Convert dynamic requires to dynamic imports
  root
    .find(j.CallExpression, {
      callee: { name: 'require' }
    })
    .forEach(path => {
      // Only process dynamic requires where the argument is not a string literal
      if (path.node.arguments[0].type === 'Literal') return;
      
      // Create import() call
      const importCall = j.callExpression(
        j.import(),
        path.node.arguments
      );
      
      // Replace require() with import()
      j(path).replaceWith(importCall);
    });

  // Add missing 'export' keywords to function declarations at the top level
  root
    .find(j.FunctionDeclaration)
    .filter(path => path.parent.node.type === 'Program')
    .forEach(path => {
      // Check if this function is already being exported via other means
      const functionName = path.node.id.name;
      const isAlreadyExported = root
        .find(j.ExportSpecifier, { exported: { name: functionName } })
        .size() > 0;
      
      if (!isAlreadyExported) {
        j(path).replaceWith(
          j.exportNamedDeclaration(path.node)
        );
      }
    });

  return root.toSource({
    quote: 'single',
    trailingComma: true
  });
}
