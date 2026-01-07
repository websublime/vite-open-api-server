# PRODUCT REQUIREMENTS SPECIFICATION

## vite-plugin-mock-server

**Version:** 1.0.0-draft  
**Last Updated:** 2025-01-XX  
**Status:** Draft - In Review  
**Author:** Development Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Objectives](#3-goals-and-objectives)
4. [Target Users](#4-target-users)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [API Specification](#8-api-specification)
9. [Configuration Reference](#9-configuration-reference)
10. [Integration Points](#10-integration-points)
11. [Security Considerations](#11-security-considerations)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment & Distribution](#13-deployment--distribution)
14. [Future Enhancements](#14-future-enhancements)
15. [Acceptance Criteria](#15-acceptance-criteria)
16. [Appendix](#16-appendix)

---

## 1. Executive Summary

### 1.1 Product Overview

The `vite-plugin-mock-server` is a Vite plugin that integrates the Scalar Mock Server into the development workflow. It automatically spawns a mock API server based on OpenAPI specifications, enabling frontend developers to work independently of backend services during local development.

### 1.2 Value Proposition

- **Zero Backend Dependency:** Develop and test frontend features without requiring a running backend
- **Consistent Test Data:** Reproducible mock data across development sessions
- **Error Scenario Testing:** Simulate edge cases, errors, and network conditions without backend changes
- **Unified Developer Experience:** All tooling integrated under Vite's development server
- **Offline Development:** Full development capability without network connectivity

### 1.3 Scope

This specification covers:
- Vite plugin implementation
- Mock server runner process
- Seed data system
- Custom handler system
- Proxy configuration
- Logging and debugging capabilities

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Point | Impact | Frequency |
|-----------|--------|-----------|
| Backend unavailability during development | Blocked development work | High |
| Manual browser DevTools overrides | Time-consuming, error-prone | Daily |
| Inconsistent test data | Unreproducible bugs | High |
| Inability to test error scenarios | Missing edge case coverage | Medium |
| Environment configuration complexity | Onboarding friction | Medium |

### 2.2 User Stories

**US-001:** As a frontend developer, I want to start development without waiting for backend services so that I can be productive immediately.

**US-002:** As a frontend developer, I want consistent mock data between sessions so that I can reproduce and debug issues reliably.

**US-003:** As a QA engineer, I want to simulate error responses (401, 500, etc.) so that I can verify error handling flows.

**US-004:** As a developer, I want network delay simulation so that I can test loading states and timeout handling.

**US-005:** As a team lead, I want centralized mock configuration so that all team members have the same development experience.

---

## 3. Goals and Objectives

### 3.1 Primary Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **G-001** | Eliminate backend dependency for local development | 100% of API calls mockable |
| **G-002** | Seamless Vite integration | Zero configuration for basic usage |
| **G-003** | OpenAPI-first approach | Auto-generate mocks from spec |
| **G-004** | Extensibility | Support custom seeds and handlers |

### 3.2 Secondary Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **G-005** | Developer experience | <5 second startup time |
| **G-006** | Debugging support | Full request/response logging |
| **G-007** | Process isolation | Mock server crash doesn't affect Vite |
| **G-008** | Graceful degradation | Fallback to real backend if mock fails |

### 3.3 Non-Goals (Out of Scope)

- Production deployment of mock server
- Persistent data storage across restarts
- Authentication/authorization enforcement
- Performance/load testing capabilities
- Multi-tenant mock scenarios

---

## 4. Target Users

### 4.1 Primary Users

| Persona | Role | Key Needs |
|---------|------|-----------|
| **Frontend Developer** | Builds UI components and features | Quick startup, realistic data, error simulation |
| **Full-Stack Developer** | Works on both frontend and backend | Toggle between mock and real backend |
| **QA Engineer** | Tests application functionality | Simulate edge cases and error scenarios |

### 4.2 Secondary Users

| Persona | Role | Key Needs |
|---------|------|-----------|
| **DevOps Engineer** | Configures CI/CD pipelines | Deterministic test environments |
| **Technical Lead** | Oversees development practices | Standardized team configuration |
| **New Team Member** | Onboarding to the project | Simple setup, clear documentation |

---

## 5. Functional Requirements

### 5.1 Core Features

#### FR-001: OpenAPI-Based Mock Generation

**Priority:** P0 (Critical)

**Description:** The plugin MUST generate mock API responses based on the provided OpenAPI specification file.

**Acceptance Criteria:**
- [ ] Support OpenAPI 3.0 and 3.1 specifications
- [ ] Support YAML and JSON specification formats
- [ ] Generate responses matching schema definitions
- [ ] Respect response content types (application/json, etc.)
- [ ] Handle all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- [ ] Support path parameters, query parameters, and request bodies
- [ ] Generate realistic data based on field types and formats

**Technical Notes:**
- Uses Scalar Mock Server (`@scalar/mock-server`) for response generation
- Faker.js integration for realistic data generation

---

#### FR-002: Vite Dev Server Integration

**Priority:** P0 (Critical)

**Description:** The plugin MUST integrate seamlessly with Vite's development server lifecycle.

**Acceptance Criteria:**
- [ ] Register as a standard Vite plugin
- [ ] Start mock server when Vite dev server starts
- [ ] Stop mock server when Vite dev server stops
- [ ] Configure proxy rules automatically
- [ ] Only activate during `serve` mode (not `build`)
- [ ] Respect `enabled` configuration option

**Technical Notes:**
- Uses Vite's `configureServer` hook
- Proxy configuration via `config` hook

---

#### FR-003: OpenAPI Parser & Validation

**Priority:** P0 (Critical)

**Description:** Use `@scalar/openapi-parser` for robust OpenAPI document parsing, validation, and manipulation as the foundation for all mock server operations.

**Rationale:**
The Scalar ecosystem provides a dedicated OpenAPI parser that handles:
- OpenAPI 3.0 and 3.1 specifications
- YAML and JSON formats
- Reference resolution ($ref)
- Document validation
- Safe document manipulation

This MUST be the first step before any document enhancement or mock server creation.

**Acceptance Criteria:**
- [ ] Use `@scalar/openapi-parser` as the primary parsing library
- [ ] Support both YAML (.yaml, .yml) and JSON (.json) formats
- [ ] Validate document structure before any enhancement
- [ ] Resolve all $ref references for proper schema matching
- [ ] Handle circular references gracefully
- [ ] Report validation errors clearly with line numbers if possible
- [ ] Extract all operations with their operationIds
- [ ] Extract all schemas from components/schemas
- [ ] Provide document statistics (endpoint count, schema count)

**Implementation:**
```javascript
import { openapi } from '@scalar/openapi-parser';
import fs from 'node:fs';

/**
 * Loads, parses, and validates an OpenAPI specification file.
 * 
 * @param {string} filePath - Absolute path to the OpenAPI spec file
 * @returns {Promise<{document: object, errors: array, stats: object}>}
 */
async function loadOpenApiDocument(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse and validate with Scalar parser
  const result = await openapi().load(content).get();
  
  if (result.errors?.length > 0) {
    log('OpenAPI validation warnings:', 'warn');
    result.errors.forEach(e => log(`  - ${e.message}`, 'warn'));
  }
  
  // Extract statistics
  const stats = {
    title: result.schema?.info?.title ?? 'Unknown',
    version: result.schema?.info?.version ?? '0.0.0',
    endpointCount: countOperations(result.schema),
    schemaCount: Object.keys(result.schema?.components?.schemas ?? {}).length,
  };
  
  return {
    document: result.schema,
    errors: result.errors ?? [],
    stats,
  };
}

/**
 * Counts total operations across all paths.
 */
function countOperations(document) {
  let count = 0;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  
  for (const pathItem of Object.values(document?.paths ?? {})) {
    for (const method of methods) {
      if (pathItem[method]) count++;
    }
  }
  
  return count;
}
```

**Startup Output:**
```
═══════════════════════════════════════════════════════════════════════════════
                    MOCK SERVER - LOADING OPENAPI SPECIFICATION
═══════════════════════════════════════════════════════════════════════════════

  ✓ Loaded: gpme-bff-service.openapi.bundle.yaml
  ✓ API: GPme BFF Service v1.0.0
  ✓ Endpoints: 47 operations
  ✓ Schemas: 25 definitions
  ✓ Validation: Passed (0 errors, 2 warnings)
    ⚠ Warning: Missing description for operation 'get_products'
    ⚠ Warning: Example missing for schema 'OrderRequest'
```

**Error Handling:**
```
═══════════════════════════════════════════════════════════════════════════════
                    MOCK SERVER - OPENAPI SPECIFICATION ERROR
═══════════════════════════════════════════════════════════════════════════════

  ✖ Failed to load: gpme-bff-service.openapi.bundle.yaml
  
  Validation Errors:
    ✖ Line 45: Invalid $ref '#/components/schemas/UnknownType'
    ✖ Line 123: Missing required field 'responses' in operation
    ✖ Line 200: Duplicate operationId 'getVehicles'
  
  Mock server cannot start with invalid OpenAPI specification.
```

---

#### FR-004: Handler/Seed File Loading & Validation

**Priority:** P1 (High)

**Description:** Load and validate handler and seed files to catch errors early and provide clear feedback to developers.

**Prerequisites:**
- FR-003 (OpenAPI Parser) - Need document structure for validation

**Rationale:**
Early validation prevents runtime errors and provides immediate feedback when:
- A file has syntax errors
- An operationId doesn't exist in the OpenAPI spec
- A schema name doesn't exist in components/schemas
- Export format is incorrect

**Acceptance Criteria:**
- [ ] Load handler files from configurable directory
- [ ] Load seed files from configurable directory
- [ ] Support `.mjs` and `.js` file extensions
- [ ] Validate file exports have correct structure (default export as object)
- [ ] Validate each key is a string (operationId or schemaName)
- [ ] Validate each value is either:
  - A non-empty string (JavaScript code), OR
  - A function that returns a non-empty string (dynamic code generation)
- [ ] Support async functions for dynamic code generation
- [ ] Provide rich context to functions (operation/schema details, document)
- [ ] Warn if operationId doesn't exist in OpenAPI spec
- [ ] Warn if schemaName doesn't exist in components/schemas
- [ ] Report syntax errors with file name and details
- [ ] Continue loading other files if one fails (resilient)
- [ ] Summary of validation results at end

**Handler File Format (.mjs):**

Handlers support two formats: **string** (static code) or **function** (dynamic code generation).

```javascript
// health.handler.mjs
// Exports a mapping of operationId -> x-handler code (string or function)

export default {
  // FORMAT 1: Direct string export (simple, static)
  health: `
    return {
      environment: 'MOCK',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  `,
  
  // FORMAT 2: Function export (dynamic, context-aware)
  fetch_vehicles: ({ operation, document }) => {
    // Access operation details to generate appropriate handler code
    const hasFilterParam = operation.parameters?.some(p => p.name === 'filter');
    const hasPaginationParams = operation.parameters?.some(p => p.name === 'page');
    
    let code = `const vehicles = store.list('Vehicle');\n`;
    
    // Generate different code based on operation parameters
    if (req.query.simulateError) {
      code += `
        const errorCode = parseInt(req.query.simulateError);
        if (errorCode === 500) throw new Error('Simulated server error');
      `;
    }
    
    if (hasFilterParam) {
      code += `
        if (req.query.filter) {
          vehicles = vehicles.filter(v => v.status === req.query.filter);
        }
      `;
    }
    
    if (hasPaginationParams) {
      code += `
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const start = (page - 1) * limit;
        return vehicles.slice(start, start + limit);
      `;
    } else {
      code += `return vehicles;`;
    }
    
    return code;
  },
};
```

**Handler Function Context:**
```typescript
interface HandlerCodeContext {
  operationId: string;              // e.g., "fetch_vehicles"
  operation: OperationObject;       // Full OpenAPI operation object
  method: string;                   // HTTP method: "get", "post", etc.
  path: string;                     // OpenAPI path: "/api/v1/vehicles"
  document: OpenAPIDocument;        // Complete OpenAPI document
  schemas: Record<string, Schema>;  // Available schemas
}

type HandlerValue = string | ((context: HandlerCodeContext) => string | Promise<string>);
```

**Seed File Format (.mjs):**

Seeds support two formats: **string** (static code) or **function** (dynamic code generation).

```javascript
// vehicles.seed.mjs
// Exports a mapping of schemaName -> x-seed code (string or function)

export default {
  // FORMAT 1: Direct string export (simple, static)
  Vehicle: `
    seed.count(15, () => ({
      id: faker.string.uuid(),
      fin: faker.string.alphanumeric(17).toUpperCase(),
      model: faker.vehicle.model(),
      brand: 'Mercedes-Benz',
      mileage: faker.number.int({ min: 0, max: 150000 }),
      connected: faker.datatype.boolean()
    }))
  `,
  
  // FORMAT 2: Function export (dynamic, context-aware)
  Order: ({ schema, schemas, document }) => {
    // Check if related schemas exist to generate appropriate relationships
    const hasCustomer = 'Customer' in schemas;
    const hasVehicle = 'Vehicle' in schemas;
    
    let code = `seed.count(20, (index) => {\n`;
    
    if (hasCustomer) {
      code += `  const customer = store.list('Customer')[index % 5];\n`;
    }
    
    if (hasVehicle) {
      code += `  const vehicle = store.list('Vehicle')[index % 10];\n`;
    }
    
    code += `  return {
      id: faker.string.uuid(),
      orderNumber: faker.string.alphanumeric(10).toUpperCase(),
      ${hasCustomer ? 'customerId: customer?.id,' : ''}
      ${hasVehicle ? 'vehicleFin: vehicle?.fin,' : ''}
      status: faker.helpers.arrayElement(['pending', 'confirmed', 'completed']),
      createdAt: faker.date.recent().toISOString(),
      total: faker.number.float({ min: 100, max: 5000, precision: 0.01 })
    };
  })`;
    
    return code;
  },
};
```

**Seed Function Context:**
```typescript
interface SeedCodeContext {
  schemaName: string;               // e.g., "Vehicle"
  schema: SchemaObject;             // Full OpenAPI schema object
  document: OpenAPIDocument;        // Complete OpenAPI document
  schemas: Record<string, Schema>;  // Available schemas for relationships
}

type SeedValue = string | ((context: SeedCodeContext) => string | Promise<string>);
```

**Validation Rules:**
```javascript
/**
 * Validates handler file exports against OpenAPI document.
 * Supports both string and function values.
 * 
 * @param {string} filePath - Path to the handler file
 * @param {object} exports - The file's default export
 * @param {object} document - Parsed OpenAPI document
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateHandlerExports(filePath, exports, document) {
  const errors = [];
  const warnings = [];
  
  // Check export type
  if (typeof exports !== 'object' || exports === null) {
    errors.push(`${filePath}: Default export must be an object`);
    return { valid: false, errors, warnings };
  }
  
  // Check each handler
  for (const [operationId, value] of Object.entries(exports)) {
    // Value must be string or function
    if (typeof value !== 'string' && typeof value !== 'function') {
      errors.push(
        `${filePath}: Handler '${operationId}' must be a string or function, got ${typeof value}`
      );
      continue;
    }
    
    // If string, validate it's not empty
    if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`${filePath}: Handler '${operationId}' cannot be empty string`);
      continue;
    }
    
    // Check if operationId exists in OpenAPI
    const operation = findOperationById(document, operationId);
    if (!operation) {
      warnings.push(`${filePath}: Handler '${operationId}' has no matching operation in OpenAPI`);
    }
    
    // If function, call it to validate the returned code
    if (typeof value === 'function') {
      try {
        const context = buildHandlerContext(operationId, operation, document);
        const code = value(context);
        
        // Handle async functions
        if (code instanceof Promise) {
          code.then(result => {
            if (typeof result !== 'string' || result.trim().length === 0) {
              errors.push(
                `${filePath}: Handler '${operationId}' function must return non-empty string`
              );
            }
          });
        } else {
          if (typeof code !== 'string' || code.trim().length === 0) {
            errors.push(
              `${filePath}: Handler '${operationId}' function must return non-empty string`
            );
          }
        }
      } catch (error) {
        errors.push(
          `${filePath}: Handler '${operationId}' function threw error: ${error.message}`
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates seed file exports against OpenAPI document.
 * Supports both string and function values.
 */
function validateSeedExports(filePath, exports, document) {
  const errors = [];
  const warnings = [];
  
  if (typeof exports !== 'object' || exports === null) {
    errors.push(`${filePath}: Default export must be an object`);
    return { valid: false, errors, warnings };
  }
  
  for (const [schemaName, value] of Object.entries(exports)) {
    // Value must be string or function
    if (typeof value !== 'string' && typeof value !== 'function') {
      errors.push(
        `${filePath}: Seed '${schemaName}' must be a string or function, got ${typeof value}`
      );
      continue;
    }
    
    // If string, validate it's not empty
    if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`${filePath}: Seed '${schemaName}' cannot be empty string`);
      continue;
    }
    
    // Check if schema exists in OpenAPI
    const schema = document?.components?.schemas?.[schemaName];
    if (!schema) {
      warnings.push(`${filePath}: Seed '${schemaName}' has no matching schema in OpenAPI`);
    }
    
    // If function, call it to validate the returned code
    if (typeof value === 'function') {
      try {
        const context = buildSeedContext(schemaName, schema, document);
        const code = value(context);
        
        // Handle async functions
        if (code instanceof Promise) {
          code.then(result => {
            if (typeof result !== 'string' || result.trim().length === 0) {
              errors.push(
                `${filePath}: Seed '${schemaName}' function must return non-empty string`
              );
            }
          });
        } else {
          if (typeof code !== 'string' || code.trim().length === 0) {
            errors.push(
              `${filePath}: Seed '${schemaName}' function must return non-empty string`
            );
          }
        }
      } catch (error) {
        errors.push(
          `${filePath}: Seed '${schemaName}' function threw error: ${error.message}`
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

**Validation Output:**
```
═══════════════════════════════════════════════════════════════════════════════
                    MOCK SERVER - LOADING HANDLERS & SEEDS
═══════════════════════════════════════════════════════════════════════════════

  HANDLERS:
  ──────────────────────────────────────────────────────────────────────────────
  ✓ health.handler.mjs: 2 handlers loaded
      → health, fetch_vehicles
  ✓ orders.handler.mjs: 3 handlers loaded
      → create_order, get_order, cancel_order
  ⚠ legacy.handler.mjs: 1 warning
      → 'old_endpoint' has no matching operation in OpenAPI
  ✖ broken.handler.mjs: Failed to load
      → SyntaxError: Unexpected token at line 15

  SEEDS:
  ──────────────────────────────────────────────────────────────────────────────
  ✓ vehicles.seed.mjs: 1 schema seeded
      → Vehicle (seed.count: 15)
  ✓ orders.seed.mjs: 2 schemas seeded
      → Order (seed.count: 10), OrderItem (seed.count: 50)
  ⚠ products.seed.mjs: 1 warning
      → 'LegacyProduct' has no matching schema in OpenAPI

  SUMMARY: 5 handlers | 3 seeds | 2 warnings | 1 error
```

**Use Cases & Best Practices:**

| Scenario | Use String | Use Function | Rationale |
|----------|-----------|--------------|-----------|
| Simple CRUD operations | ✅ | ❌ | Direct string is clearer and easier to maintain |
| Static mock responses | ✅ | ❌ | No need for dynamic generation overhead |
| Parameter-dependent logic | ❌ | ✅ | Generate different code based on operation parameters |
| Cross-schema relationships | ❌ | ✅ | Check if related schemas exist before referencing them |
| Conditional features | ❌ | ✅ | Enable/disable mock features based on OpenAPI spec |
| Template-based generation | ❌ | ✅ | Load and customize external code templates |
| Environment-specific mocks | ❌ | ✅ | Generate different behavior for different test scenarios |

**Example Use Cases:**

*Use Case 1: Pagination Support*
```javascript
// Only generate pagination code if operation has page/limit parameters
export default {
  list_items: ({ operation }) => {
    const hasPagination = operation.parameters?.some(p => 
      ['page', 'limit', 'offset'].includes(p.name)
    );
    
    if (hasPagination) {
      return `
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const items = store.list('Item');
        const start = (page - 1) * limit;
        return {
          items: items.slice(start, start + limit),
          total: items.length,
          page,
          limit
        };
      `;
    }
    
    return `return store.list('Item');`;
  }
};
```

*Use Case 2: Smart Schema Relationships*
```javascript
// Generate seeds with relationships only if related schemas exist
export default {
  Order: ({ schemas }) => {
    const relations = [];
    if ('Customer' in schemas) relations.push('customerId: store.list("Customer")[index % 5]?.id');
    if ('Vehicle' in schemas) relations.push('vehicleFin: store.list("Vehicle")[index % 10]?.fin');
    
    return `
      seed.count(25, (index) => ({
        id: faker.string.uuid(),
        orderNumber: faker.string.alphanumeric(10).toUpperCase(),
        ${relations.join(',\n        ')},
        status: faker.helpers.arrayElement(['pending', 'confirmed', 'completed']),
        total: faker.number.float({ min: 100, max: 5000, precision: 0.01 })
      }))
    `;
  }
};
```

*Use Case 3: Response Format Based on OpenAPI Schema*
```javascript
// Adapt mock response to match the exact OpenAPI response schema
export default {
  get_warranty_package: ({ operation }) => {
    const responseSchema = operation.responses?.['200']?.content?.['application/json']?.schema;
    const isWrapped = responseSchema?.properties?.data !== undefined;
    
    if (isWrapped) {
      return `
        const pkg = store.get('WarrantyPackage', req.params.id);
        return pkg ? { data: pkg } : null;
      `;
    }
    
    return `return store.get('WarrantyPackage', req.params.id);`;
  }
};
```

*Use Case 4: Conditional Error Simulation*
```javascript
// Add error simulation only if operation has error responses defined
export default {
  create_order: ({ operation }) => {
    const has400 = operation.responses?.['400'] !== undefined;
    const has409 = operation.responses?.['409'] !== undefined;
    
    let code = ``;
    
    if (has400 || has409) {
      code += `
        // Support error simulation via special header
        const simulateError = req.header['x-simulate-error'];
      `;
      
      if (has400) {
        code += `
          if (simulateError === '400') {
            res.status = 400;
            return { error: 'Bad Request', message: 'Invalid order data' };
          }
        `;
      }
      
      if (has409) {
        code += `
          if (simulateError === '409') {
            res.status = 409;
            return { error: 'Conflict', message: 'Order already exists' };
          }
        `;
      }
    }
    
    code += `
      const order = store.create('Order', {
        ...req.body,
        id: faker.string.uuid(),
        createdAt: new Date().toISOString()
      });
      res.status = 201;
      return order;
    `;
    
    return code;
  }
};
```

**Best Practices:**

1. **Start Simple**: Use strings for most cases, convert to functions only when needed
2. **Context Awareness**: Always check if properties exist before accessing them
3. **Consistent Formatting**: Keep generated code consistently formatted and readable
4. **Error Handling**: Validate context data to avoid runtime errors
5. **Documentation**: Add comments explaining why function approach was chosen
6. **Testing**: Test both string and function handlers during validation phase
7. **Performance**: Functions are called once at startup, so complexity is acceptable

---

#### FR-005: OpenAPI Document Enhancement (x-handler / x-seed Injection)

**Priority:** P0 (Critical)

**Description:** The plugin MUST programmatically inject `x-handler` and `x-seed` extensions into the OpenAPI document in memory before passing it to the Scalar Mock Server.

**Prerequisites:**
- FR-003 (OpenAPI Parser) must complete successfully
- FR-004 (File Loading) must complete successfully
- Document must be valid and parsed

**Background:**
The Scalar Mock Server natively supports two extensions:
- **`x-handler`**: JavaScript code in operations (paths) for custom request handling
- **`x-seed`**: JavaScript code in schemas (components/schemas) for initial data seeding

These extensions must be present in the OpenAPI document when `createMockServer()` is called. Our approach is to load handler/seed logic from external `.mjs` files and inject them as strings into the appropriate locations in the OpenAPI document.

**Acceptance Criteria:**
- [ ] Clone OpenAPI document in memory (preserve original)
- [ ] Match handlers to operations by `operationId`
- [ ] Match seeds to schemas by schema name
- [ ] Inject `x-handler` into the corresponding operation in `paths`
- [ ] Inject `x-seed` into the corresponding schema in `components/schemas`
- [ ] Log each injection for visibility
- [ ] Warn when handler/seed doesn't match any operation/schema

**Injection Process:**
```javascript
// Pseudo-code for document enhancement
function enhanceOpenApiDocument(document, handlers, seeds) {
  const enhanced = structuredClone(document);
  
  // Inject x-handler into operations
  for (const [operationId, handlerCode] of Object.entries(handlers)) {
    const operation = findOperationById(enhanced, operationId);
    if (operation) {
      operation['x-handler'] = handlerCode;
      log(`  ✓ Injected x-handler: ${operationId}`);
    } else {
      log(`  ⚠ Handler not matched: ${operationId}`, 'warn');
    }
  }
  
  // Inject x-seed into schemas
  for (const [schemaName, seedCode] of Object.entries(seeds)) {
    const schema = enhanced.components?.schemas?.[schemaName];
    if (schema) {
      schema['x-seed'] = seedCode;
      log(`  ✓ Injected x-seed: ${schemaName}`);
    } else {
      log(`  ⚠ Seed not matched: ${schemaName}`, 'warn');
    }
  }
  
  return enhanced;
}
```

**Available Context in x-handler (provided by Scalar):**
| Variable | Description |
|----------|-------------|
| `store` | In-memory data store (list, get, create, update, delete, clear) |
| `faker` | Faker.js instance for data generation |
| `req.body` | Parsed request body |
| `req.params` | Path parameters |
| `req.query` | Query string parameters |
| `req.headers` | Request headers |
| `res` | Example responses by status code |

**Available Context in x-seed (provided by Scalar):**
| Variable | Description |
|----------|-------------|
| `seed` | Seed helper: `seed(array)`, `seed(factory)`, `seed.count(n, factory)` |
| `store` | Direct store access for advanced use cases |
| `faker` | Faker.js instance |
| `schema` | Schema key name |

**Automatic Status Codes (by Scalar):**
| Store Operation | Success | Failure |
|-----------------|---------|---------|
| `store.list()` | 200 | - |
| `store.get()` | 200 | 404 (if null) |
| `store.create()` | 201 | - |
| `store.update()` | 200 | 404 (if null) |
| `store.delete()` | 204 | 404 |

---

#### FR-006: Mock Endpoint Registry

**Priority:** P0 (Critical)

**Description:** The plugin MUST maintain a centralized registry of all mocked endpoints, showing which have custom handlers and which schemas have seeds, displaying this information on startup.

**Prerequisites:**
- FR-003 (OpenAPI Parser) - Document parsed
- FR-004 (File Loading) - Handlers/seeds loaded
- FR-005 (Document Enhancement) - x-handler/x-seed injected

**Problem Statement:**
Without a registry, there's no visibility into:
- Which endpoints are available in the OpenAPI spec
- Which endpoints have custom handlers overriding the default response
- Which schemas have custom seed data
- Whether a request will use auto-generated or custom response

**Acceptance Criteria:**
- [ ] Extract all operations (method + path + operationId) from OpenAPI spec
- [ ] Map custom handlers to their corresponding operationIds
- [ ] Map custom seeds to their corresponding schema names
- [ ] Display endpoint registry table on server startup
- [ ] Indicate which endpoints have handlers: `✓` or `-`
- [ ] Provide `/_mock/registry` endpoint for runtime inspection
- [ ] Include endpoint count summary in startup logs

**Registry Data Structure:**
```typescript
interface MockEndpointRegistry {
  /** All endpoints extracted from OpenAPI spec */
  endpoints: MockEndpointEntry[];
  
  /** All schemas with seed data */
  seededSchemas: MockSchemaEntry[];
  
  /** Summary statistics */
  stats: {
    totalEndpoints: number;
    withCustomHandler: number;
    totalSchemas: number;
    withCustomSeed: number;
    autoGenerated: number;
  };
}

interface MockEndpointEntry {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  
  /** URL path pattern (e.g., /api/v1/vehicles/{id}) */
  path: string;
  
  /** OpenAPI operationId */
  operationId: string;
  
  /** Whether x-handler was injected */
  hasHandler: boolean;
  
  /** Source file for handler (if any) */
  handlerSource?: string;
  
  /** Response schema name from OpenAPI */
  responseSchema?: string;
  
  /** Whether endpoint requires authentication */
  requiresAuth: boolean;
  
  /** OpenAPI tags */
  tags: string[];
}

interface MockSchemaEntry {
  /** Schema name */
  name: string;
  
  /** Whether x-seed was injected */
  hasSeed: boolean;
  
  /** Source file for seed (if any) */
  seedSource?: string;
  
  /** Number of items to seed (if using seed.count) */
  seedCount?: number;
}
```

**Startup Output Example:**
```
═══════════════════════════════════════════════════════════════════════════════
                    MOCK SERVER - DOCUMENT ENHANCEMENT
═══════════════════════════════════════════════════════════════════════════════

  HANDLERS INJECTED (x-handler):
  ──────────────────────────────────────────────────────────────────────────────
  ✓ health                    → GET  /api/v1/health
  ✓ fetch_vehicles            → GET  /api/v1/vehicles
  ✓ get_order                 → GET  /proxy/order/api/v1/orders/{id}
  ⚠ unknown_operation         → NOT FOUND (no matching operationId)

  SEEDS INJECTED (x-seed):
  ──────────────────────────────────────────────────────────────────────────────
  ✓ Vehicle                   → seed.count(15, ...)
  ✓ Order                     → seed.count(10, ...)
  ✓ Product                   → seed.count(20, ...)
  ⚠ UnknownSchema             → NOT FOUND (no matching schema)

═══════════════════════════════════════════════════════════════════════════════
                    MOCK SERVER ENDPOINT REGISTRY
═══════════════════════════════════════════════════════════════════════════════

  METHOD  PATH                                    OPERATION ID              HANDLER
  ──────  ──────────────────────────────────────  ────────────────────────  ────────
  GET     /api/v1/health                          health                    ✓
  GET     /api/v1/vehicles                        fetch_vehicles            ✓
  POST    /api/v1/vehicles/{fin}/eligibility      check_eligibility         -
  GET     /api/v1/products                        get_products              -
  POST    /proxy/order/api/v1/orders              create_order              -
  GET     /proxy/order/api/v1/orders/{id}         get_order                 ✓
  ...

───────────────────────────────────────────────────────────────────────────────
  ENDPOINTS: 47 total | 3 with x-handler | 44 auto-generated
  SCHEMAS:   25 total | 3 with x-seed
───────────────────────────────────────────────────────────────────────────────
```

**Runtime Inspection Endpoint:**
```bash
# Get full registry as JSON
curl http://localhost:3456/_mock/registry

# Response:
{
  "endpoints": [...],
  "stats": {
    "totalEndpoints": 47,
    "withCustomHandler": 3,
    "totalSchemas": 25,
    "withCustomSeed": 3,
    "autoGenerated": 44
  }
}
```

---

#### FR-007: Request Proxying

**Priority:** P0 (Critical)

**Description:** The plugin MUST proxy specified API requests from Vite dev server to the mock server.

**Acceptance Criteria:**
- [ ] Configurable proxy path (e.g., `/gpme/bff`)
- [ ] Path rewriting from proxy path to root
- [ ] Preserve request headers
- [ ] Preserve request body
- [ ] Support all HTTP methods
- [ ] Handle CORS appropriately

**Configuration:**
```typescript
{
  proxyPath: '/gpme/bff',  // Requests to /gpme/bff/* forwarded to mock server
}
```

---

#### FR-008: Request/Response Logging

**Priority:** P1 (High)

**Description:** The plugin MUST log all mock server activity through Vite's logging system.

**Acceptance Criteria:**
- [ ] Log each incoming request with method, path, and operationId
- [ ] Log response status codes
- [ ] Use emoji indicators for success/error (✔/✖)
- [ ] Support verbose mode for detailed logging
- [ ] Timestamps on all log entries
- [ ] Route logs through Vite's logger for consistent formatting

**Example Output:**
```
[Mock] → GET     /api/v1/vehicles [fetch_vehicles]
[Mock] ✔ 200 GET /api/v1/vehicles
[Mock] ✖ 401 POST /api/v1/orders
```

---

#### FR-009: Error Simulation

**Priority:** P1 (High)

**Description:** The plugin SHOULD support error scenario simulation via query parameters or handler logic.

**Acceptance Criteria:**
- [ ] Simulate HTTP error codes (400, 401, 403, 404, 500, 503)
- [ ] Simulate empty responses
- [ ] Simulate network delays
- [ ] Configurable via query parameters: `?simulateError=401&delay=2000`
- [ ] Return appropriate error response bodies

**Implementation via x-handler:**
```javascript
// In handler file
fetch_vehicles: `
  // Simulate errors via query param
  if (req.query.simulateError) {
    const code = parseInt(req.query.simulateError)
    if (code === 500) throw new Error('Simulated server error')
    if (code === 401) return null  // Triggers 404/401
  }
  
  // Simulate delay
  if (req.query.delay) {
    await new Promise(r => setTimeout(r, parseInt(req.query.delay)))
  }
  
  return store.list('Vehicle')
`,
```

---

#### FR-010: Security Scheme Normalization

**Priority:** P1 (High)

**Description:** The plugin MUST handle OpenAPI security schemes for authentication simulation.

**Acceptance Criteria:**
- [ ] Detect security schemes referenced in operations
- [ ] Auto-generate missing security scheme definitions
- [ ] Accept any Bearer token as valid (mock mode)
- [ ] Return 401 for missing Authorization header on protected endpoints
- [ ] Log normalized security schemes on startup

---

#### FR-011: Process Isolation

**Priority:** P1 (High)

**Description:** The mock server MUST run as an isolated child process.

**Acceptance Criteria:**
- [ ] Spawn mock server using Node.js `fork()`
- [ ] IPC communication between plugin and mock server
- [ ] Mock server crash doesn't crash Vite
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Force kill after timeout if graceful shutdown fails
- [ ] Proper cleanup on Vite server close

---

#### FR-012: Startup Coordination

**Priority:** P1 (High)

**Description:** The plugin MUST wait for mock server readiness before Vite serves requests.

**Acceptance Criteria:**
- [ ] Mock server sends `ready` message via IPC
- [ ] Configurable startup timeout (default: 15000ms)
- [ ] Clear error message if startup times out
- [ ] Display mock server URL on successful startup

---

### 5.2 Optional Features

#### FR-013: Preserve Existing x-handler/x-seed in OpenAPI

**Priority:** P2 (Medium)

**Description:** If the OpenAPI spec already contains `x-handler` or `x-seed` extensions, preserve them unless explicitly overridden by external files.

**Behavior:**
- External handler file overrides inline `x-handler` (with warning)
- External seed file overrides inline `x-seed` (with warning)
- Log when override occurs for visibility

```javascript
if (operation['x-handler'] && handlers[operationId]) {
  log(`  ⚠ Overriding existing x-handler: ${operationId}`, 'warn');
}
```

---

#### FR-014: Hot Reload for Seeds/Handlers

**Priority:** P3 (Low)

**Description:** Automatically reload seed and handler files when they change, re-inject into OpenAPI document, and restart mock server.

**Prerequisites:**
- All core FRs (FR-003 through FR-012) implemented

**Implementation Notes:**
- Watch handler/seed directories with chokidar or similar
- On file change: reload file, re-enhance document, restart mock server
- Preserve store data across restarts (optional)

---

#### FR-015: Web UI for Mock Management

**Priority:** P3 (Low)

**Description:** Browser-based interface for viewing/editing mock data at runtime.

**Features:**
- View endpoint registry
- View seeded data in store
- Manually add/edit/delete store items
- View request/response logs
- Trigger seed reset

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **NFR-001** | Mock server startup time | < 5 seconds (including registry build) |
| **NFR-002** | Request latency overhead | < 50ms |
| **NFR-003** | Memory usage | < 150MB (including registry) |
| **NFR-004** | Concurrent request handling | 100+ requests/second |
| **NFR-005** | Registry build time | < 500ms for 100+ endpoints |

### 6.2 Reliability

| Requirement | Target | Notes |
|-------------|--------|-------|
| **NFR-005** | Crash recovery | Auto-restart on failure (future) |
| **NFR-006** | Graceful shutdown | < 5 seconds |
| **NFR-007** | Error handling | No unhandled rejections |

### 6.3 Maintainability

| Requirement | Target | Notes |
|-------------|--------|-------|
| **NFR-008** | Code documentation | All public APIs documented |
| **NFR-009** | TypeScript types | Full type coverage |
| **NFR-010** | Test coverage | > 80% (future) |

### 6.4 Compatibility

| Requirement | Target | Notes |
|-------------|--------|-------|
| **NFR-011** | Node.js version | >= 18.0.0 |
| **NFR-012** | Vite version | >= 5.0.0 |
| **NFR-013** | OS support | macOS, Linux, Windows |

---

## 7. Technical Architecture

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Developer Machine                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Vite Dev Server                             │   │
│  │                         (Parent Process)                            │   │
│  │                                                                     │   │
│  │   ┌───────────────────┐    ┌──────────────────────────────────┐   │   │
│  │   │                   │    │                                  │   │   │
│  │   │  Vue Application  │───▶│  vite-plugin-mock-server        │   │   │
│  │   │                   │    │                                  │   │   │
│  │   │  - Components     │    │  - Plugin lifecycle hooks        │   │   │
│  │   │  - BffApi calls   │    │  - Proxy configuration           │   │   │
│  │   │  - EnvStore       │    │  - Process management            │   │   │
│  │   │                   │    │  - Log forwarding                │   │   │
│  │   └───────────────────┘    └────────────┬─────────────────────┘   │   │
│  │                                         │                          │   │
│  │                                         │ fork() + IPC             │   │
│  │                                         ▼                          │   │
│  │   ┌─────────────────────────────────────────────────────────────┐ │   │
│  │   │                  Mock Server Runner                         │ │   │
│  │   │                  (Child Process)                            │ │   │
│  │   │                                                             │ │   │
│  │   │   ┌─────────────────┐    ┌─────────────────────────────┐  │ │   │
│  │   │   │                 │    │                             │  │ │   │
│  │   │   │  OpenAPI Spec   │───▶│  Scalar Mock Server         │  │ │   │
│  │   │   │  (YAML/JSON)    │    │  (@scalar/mock-server)      │  │ │   │
│  │   │   │                 │    │                             │  │ │   │
│  │   │   └─────────────────┘    │  - Response generation      │  │ │   │
│  │   │                          │  - Security validation      │  │ │   │
│  │   │   ┌─────────────────┐    │  - Request routing          │  │ │   │
│  │   │   │  Custom Seeds   │───▶│                             │  │ │   │
│  │   │   │  (.mjs files)   │    │                             │  │ │   │
│  │   │   └─────────────────┘    │                             │  │ │   │
│  │   │                          │                             │  │ │   │
│  │   │   ┌─────────────────┐    │                             │  │ │   │
│  │   │   │  Custom Handler │───▶│                             │  │ │   │
│  │   │   │  (.mjs files)   │    │                             │  │ │   │
│  │   │   └─────────────────┘    └─────────────────────────────┘  │ │   │
│  │   │                                                             │ │   │
│  │   └─────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Port 5173: Vite Dev Server (Vue App)                                      │
│  Port 3456: Mock Server (API)                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Component Details

#### 7.2.1 Vite Plugin (`vite-plugin-mock-server.ts`)

**Responsibilities:**
- Register as Vite plugin
- Configure proxy rules
- Spawn and manage child process
- Forward logs to Vite logger
- Handle graceful shutdown

**Key Interfaces:**
```typescript
interface MockServerPluginOptions {
  openApiPath: string;      // Path to OpenAPI spec
  port?: number;            // Mock server port (default: 3456)
  proxyPath?: string;       // Proxy path (default: '/gpme/bff')
  seedsDir?: string;        // Seeds directory path
  handlersDir?: string;     // Handlers directory path
  enabled?: boolean;        // Enable/disable plugin
  startupTimeout?: number;  // Startup timeout ms
  verbose?: boolean;        // Verbose logging
}
```

#### 7.2.2 Mock Server Runner (`mock-server-runner.mjs`)

**Responsibilities:**
- Load and parse OpenAPI specification
- Normalize security schemes
- Load handler files (operationId → x-handler code mappings)
- Load seed files (schemaName → x-seed code mappings)
- **Inject x-handler into operations in OpenAPI document**
- **Inject x-seed into schemas in OpenAPI document**
- **Build endpoint registry from enhanced document**
- Create Scalar Mock Server with enhanced document
- **Expose `/_mock/registry` endpoint**
- Send IPC messages to parent process
- Log request/response activity

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `MOCK_SERVER_PORT` | Port number |
| `MOCK_SERVER_OPENAPI_PATH` | Absolute path to OpenAPI spec |
| `MOCK_SERVER_SEEDS_DIR` | Absolute path to seeds directory |
| `MOCK_SERVER_HANDLERS_DIR` | Absolute path to handlers directory |
| `MOCK_SERVER_VERBOSE` | Enable verbose logging |

#### 7.2.3 Document Enhancer (`openapi-enhancer.mjs`)

**Responsibilities:**
- Load and parse handler `.mjs` files
- Load and parse seed `.mjs` files
- Inject `x-handler` strings into OpenAPI operations
- Inject `x-seed` strings into OpenAPI schemas
- Build endpoint registry from enhanced document
- Generate startup summary table
- Log all injections and warnings

**Key Functions:**
```javascript
/**
 * Loads all handler exports from .mjs files in directory.
 * Returns merged object: { operationId: "x-handler code", ... }
 */
async function loadHandlers(dir): Promise<Record<string, string>>;

/**
 * Loads all seed exports from .mjs files in directory.
 * Returns merged object: { schemaName: "x-seed code", ... }
 */
async function loadSeeds(dir): Promise<Record<string, string>>;

/**
 * Injects x-handler and x-seed into OpenAPI document.
 * Returns enhanced document (clone, original not modified).
 */
function enhanceDocument(document, handlers, seeds): OpenAPIDocument;

/**
 * Finds an operation in the OpenAPI document by operationId.
 */
function findOperationById(document, operationId): { method, path, operation } | null;

/**
 * Builds the endpoint registry from enhanced document.
 */
function buildRegistry(document, handlers, seeds): MockEndpointRegistry;

/**
 * Formats the registry as a console table for startup display.
 */
function formatRegistryTable(registry): string;
```

#### 7.2.3 Type Definitions (`mock-server.types.ts`)

Provides TypeScript types for:
- Plugin options
- IPC messages
- Seed function signatures
- Handler function signatures
- Store interface

### 7.3 Data Flow

#### 7.3.1 Startup Sequence

```
1. Vite starts dev server
2. Plugin 'config' hook adds proxy configuration
3. Plugin 'configureServer' hook executes:
   a. Validate OpenAPI spec exists
   b. Fork mock-server-runner.mjs as child process
   c. Pass configuration via environment variables
   d. Wait for 'ready' IPC message
   e. Log mock server URL and registry summary
4. Child process startup:
   a. Load and parse OpenAPI spec (YAML/JSON)
   b. Normalize missing security schemes (auto-inject)
   c. LOAD EXTERNAL FILES:
      i.   Load handler .mjs files from handlersDir
      ii.  Merge all exports into { operationId: code } map
      iii. Load seed .mjs files from seedsDir
      iv.  Merge all exports into { schemaName: code } map
   d. ENHANCE OPENAPI DOCUMENT:
      i.   Clone document in memory
      ii.  For each handler: inject x-handler into matching operation
      iii. For each seed: inject x-seed into matching schema
      iv.  Log injections and warnings for unmatched items
   e. BUILD ENDPOINT REGISTRY:
      i.   Extract all paths/operations from enhanced document
      ii.  Mark which operations have x-handler
      iii. Extract all schemas and mark which have x-seed
      iv.  Calculate statistics
   f. Display registry table in console
   g. Create Scalar Mock Server with ENHANCED document
   h. Register /_mock/registry endpoint
   i. Start HTTP server on specified port
   j. Send 'ready' IPC message with registry stats
```

#### 7.3.2 Request Flow

```
1. Browser makes API request to /gpme/bff/api/v1/vehicles
2. Vite proxy intercepts request matching /gpme/bff/*
3. Proxy rewrites path: /gpme/bff/api/v1/vehicles → /api/v1/vehicles
4. Proxy forwards request to http://localhost:3456
5. Mock server receives request
6. Scalar Mock Server handles request:
   a. Match route to OpenAPI operation
   b. If operation has x-handler:
      i.   Execute x-handler JavaScript code
      ii.  Code has access to: store, faker, req, res
      iii. Return handler result as response
   c. If operation uses schema with x-seed:
      i.   Seed data was populated on startup
      ii.  store.list() / store.get() returns seeded data
   d. Otherwise: generate response from OpenAPI schema
7. Scalar determines status code automatically based on store operations
8. Return response to proxy
9. Proxy forwards response to browser
```

**Request Logging:**
```
[Mock] → GET     /api/v1/health [health]
[Mock] ✔ 200 GET /api/v1/health

[Mock] → GET     /api/v1/vehicles [fetch_vehicles]  
[Mock] ✔ 200 GET /api/v1/vehicles

[Mock] → POST    /api/v1/orders [create_order]
[Mock] ✔ 201 POST /api/v1/orders

[Mock] → GET     /api/v1/orders/invalid-id [get_order]
[Mock] ✖ 404 GET /api/v1/orders/invalid-id
```

**Note:** The Scalar Mock Server handles x-handler execution internally. We don't need to manually register Hono routes - we just inject the code strings into the document.

#### 7.3.3 Shutdown Sequence

```
1. Vite server receives SIGINT/SIGTERM or closes
2. Plugin 'buildEnd' hook executes
3. Send SIGTERM to child process
4. Wait up to 5 seconds for graceful exit
5. If not exited, send SIGKILL
6. Clean up process reference
7. Vite completes shutdown
```

---

## 8. API Specification

### 8.1 Plugin API

```typescript
import { mockServerPlugin } from './vite-plugins';

export default defineConfig({
  plugins: [
    mockServerPlugin({
      // Required: Path to OpenAPI specification
      openApiPath: 'src/apis/bff/gpme-bff-service.openapi.bundle.yaml',
      
      // Optional: Mock server port (default: 3456)
      port: 3456,
      
      // Optional: Proxy path prefix (default: '/gpme/bff')
      proxyPath: '/gpme/bff',
      
      // Optional: Seeds directory
      seedsDir: 'src/apis/bff/mock/seeds',
      
      // Optional: Handlers directory
      handlersDir: 'src/apis/bff/mock/handlers',
      
      // Optional: Enable/disable (default: true)
      enabled: process.env.USE_MOCK_SERVER === 'true',
      
      // Optional: Startup timeout in ms (default: 15000)
      startupTimeout: 15000,
      
      // Optional: Verbose logging (default: false)
      verbose: process.env.MOCK_SERVER_VERBOSE === 'true',
    }),
  ],
});
```

### 8.2 Handler Code Generator API

Handler files can export either **static strings** or **dynamic functions** that generate handler code.

```typescript
/**
 * Context provided to handler code generator functions.
 * Contains information about the operation and OpenAPI document.
 */
interface HandlerCodeContext {
  /** Operation identifier from OpenAPI spec */
  operationId: string;
  
  /** Full operation object from OpenAPI */
  operation: {
    operationId: string;
    summary?: string;
    description?: string;
    parameters?: Array<{
      name: string;
      in: 'query' | 'path' | 'header' | 'cookie';
      required?: boolean;
      schema?: unknown;
    }>;
    requestBody?: unknown;
    responses?: Record<string, unknown>;
    [key: string]: unknown;
  };
  
  /** HTTP method (get, post, put, delete, patch, options) */
  method: string;
  
  /** OpenAPI path pattern (e.g., /api/v1/vehicles/{id}) */
  path: string;
  
  /** Complete OpenAPI document */
  document: Record<string, unknown>;
  
  /** Available schemas from components/schemas */
  schemas: Record<string, unknown>;
}

/**
 * Handler code generator type.
 * Can be a direct string or a function that generates the string.
 */
type HandlerCodeGenerator = 
  | string 
  | ((context: HandlerCodeContext) => string | Promise<string>);

/**
 * Handler file exports structure.
 */
interface HandlerFileExports {
  default: Record<string, HandlerCodeGenerator>;
}
```

**Usage Examples:**

```typescript
// Static string handler
export default {
  health: `
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  `,
};

// Dynamic function handler
export default {
  fetch_vehicles: ({ operation }) => {
    const hasFilter = operation.parameters?.some(p => p.name === 'filter');
    return hasFilter 
      ? `return store.list('Vehicle').filter(v => v.status === req.query.filter);`
      : `return store.list('Vehicle');`;
  },
};

// Async function handler
export default {
  get_data: async ({ operation, document }) => {
    const template = await loadTemplate('data-handler');
    return template.replace('{{OPERATION}}', operation.operationId);
  },
};
```

### 8.3 Seed Code Generator API

Seed files can export either **static strings** or **dynamic functions** that generate seed code.

```typescript
/**
 * Context provided to seed code generator functions.
 * Contains information about the schema and OpenAPI document.
 */
interface SeedCodeContext {
  /** Schema name from components/schemas */
  schemaName: string;
  
  /** Full schema object from OpenAPI */
  schema: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
  
  /** Complete OpenAPI document */
  document: Record<string, unknown>;
  
  /** Available schemas from components/schemas */
  schemas: Record<string, unknown>;
}

/**
 * Seed code generator type.
 * Can be a direct string or a function that generates the string.
 */
type SeedCodeGenerator = 
  | string 
  | ((context: SeedCodeContext) => string | Promise<string>);

/**
 * Seed file exports structure.
 */
interface SeedFileExports {
  default: Record<string, SeedCodeGenerator>;
}
```

**Usage Examples:**

```typescript
// Static string seed
export default {
  Vehicle: `
    seed.count(15, () => ({
      id: faker.string.uuid(),
      fin: faker.string.alphanumeric(17).toUpperCase(),
      model: faker.vehicle.model()
    }))
  `,
};

// Dynamic function seed
export default {
  Order: ({ schemas }) => {
    const hasCustomer = 'Customer' in schemas;
    return `
      seed.count(20, (index) => ({
        id: faker.string.uuid(),
        ${hasCustomer ? 'customerId: store.list("Customer")[index % 5]?.id,' : ''}
        total: faker.number.float({ min: 100, max: 5000 })
      }))
    `;
  },
};
```

### 8.4 Seed Function API (Runtime)

This API is available **within the generated seed code** at runtime (not in the generator function).

```typescript
interface SeedHelpers {
  // Create N items using factory function
  count: <T>(n: number, factory: (index: number) => T) => T[];
  
  // Faker.js instance
  faker: Faker;
  
  // Data store (for advanced usage)
  store: MockServerStore;
}

// Seed function signature
type SeedFunction = (helpers: SeedHelpers) => unknown;
```

### 8.5 Handler Function API (Runtime)

This API is available **within the generated handler code** at runtime (not in the generator function).

```typescript
// Runtime variables available in handler code strings
// These are injected by Scalar Mock Server via new Function()
interface HandlerRuntimeContext {
  // Request object
  req: {
    params: Record<string, string>;    // Path parameters
    query: Record<string, string>;     // Query parameters
    header: Record<string, string>;    // Request headers
    body: unknown;                      // Parsed request body
  };
  
  // Response object
  res: {
    status: number;                     // Set response status code
    headers: Record<string, string>;    // Set response headers
  };
  
  // Data store for CRUD operations
  store: MockServerStore;
  
  // Faker.js instance for data generation
  faker: Faker;
}

// Handler code must return a value or throw an error
type HandlerReturnValue = unknown | Promise<unknown>;
```

**Example:**
```javascript
// This code string is what you generate in the handler file
const handlerCode = `
  // These variables are automatically available:
  // - req: request object
  // - res: response object
  // - store: data store
  // - faker: faker instance
  
  const vehicles = store.list('Vehicle');
  
  if (req.query.simulateError) {
    res.status = 500;
    throw new Error('Simulated error');
  }
  
  return vehicles;
`;
```

### 8.6 Store API

```typescript
interface MockServerStore {
  // List all items in collection
  list<T>(collection: string): T[];
  
  // Get single item by ID
  get<T>(collection: string, id: string): T | null;
  
  // Create new item
  create<T>(collection: string, item: T): T;
  
  // Update existing item
  update<T>(collection: string, id: string, updates: Partial<T>): T | null;
  
  // Delete item
  delete(collection: string, id: string): boolean;
  
  // Clear collection or all data
  clear(collection?: string): void;
}
```

### 8.7 IPC Message API

```typescript
// Parent → Child: Environment variables only (no IPC messages)

// Child → Parent:
type MockServerMessage = 
  | { type: 'ready'; port: number; registry: RegistryStats }
  | { type: 'error'; error: string }
  | { type: 'log'; message: string; level: 'info' | 'warn' | 'error' };

interface RegistryStats {
  total: number;
  withCustomHandler: number;
  withCustomSeed: number;
  autoGenerated: number;
}
```

### 8.8 Registry API

```typescript
interface MockEndpointRegistry {
  endpoints: MockEndpointEntry[];
  stats: RegistryStats;
  generatedAt: string;
}

interface MockEndpointEntry {
  method: string;
  path: string;
  operationId: string;
  source: 'auto' | 'handler' | 'seed';
  handlerFile?: string;
  seedFile?: string;
  responseSchema?: string;
  requiresAuth: boolean;
  tags: string[];
}

// Runtime inspection endpoint
// GET /_mock/registry -> MockEndpointRegistry (JSON)
// GET /_mock/registry?format=table -> Plain text table
```

---

## 9. Configuration Reference

### 9.1 Plugin Options

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `openApiPath` | `string` | - | Yes | Relative path to OpenAPI spec file |
| `port` | `number` | `3456` | No | Port for mock server |
| `proxyPath` | `string` | `'/gpme/bff'` | No | URL path prefix to proxy |
| `seedsDir` | `string` | - | No | Relative path to seeds directory |
| `handlersDir` | `string` | - | No | Relative path to handlers directory |
| `enabled` | `boolean` | `true` | No | Enable/disable the plugin |
| `startupTimeout` | `number` | `15000` | No | Startup timeout in milliseconds |
| `verbose` | `boolean` | `false` | No | Enable verbose logging |

### 9.2 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `USE_MOCK_SERVER` | Enable mock server when `'true'` | `USE_MOCK_SERVER=true` |
| `MOCK_SERVER_VERBOSE` | Enable verbose logging when `'true'` | `MOCK_SERVER_VERBOSE=true` |

### 9.3 npm Scripts

```json
{
  "scripts": {
    "start": "vite",
    "start:mock": "USE_MOCK_SERVER=true vite",
    "start:mock:verbose": "USE_MOCK_SERVER=true MOCK_SERVER_VERBOSE=true vite"
  }
}
```

### 9.4 Environment Files

**env.mock.json:**
```json
{
  "bff": {
    "url": "/gpme/bff"
  }
}
```

---

## 10. Integration Points

### 10.1 Vue Application Integration

The Vue application requires no changes to work with the mock server. The `EnvStore` reads the BFF URL from environment configuration, and the proxy transparently forwards requests.

```typescript
// env.store.ts
// When USE_MOCK_SERVER=true, bff.url resolves to '/gpme/bff'
// Vite proxy forwards to http://localhost:3456

const bffApi = new BffApi({ 
  baseUrl: envStore.envVariables.bff.url 
});
```

### 10.2 OpenAPI Specification

The mock server reads the existing OpenAPI specification used for API client generation:

```
src/apis/bff/gpme-bff-service.openapi.bundle.yaml
```

No modifications to the spec are required, though optional extensions can enhance mock behavior.

### 10.3 Build Process

The plugin only activates during `vite serve` (development mode). Production builds are unaffected.

### 10.4 CI/CD

For CI/CD testing with mock server:
```bash
USE_MOCK_SERVER=true npm run test:e2e
```

---

## 11. Security Considerations

### 11.1 Development Only

- **CRITICAL:** The mock server is for local development only
- Mock server accepts any Bearer token as valid
- No actual authentication or authorization is enforced
- Never expose mock server port to network

### 11.2 Credential Handling

- Mock server should not require real API credentials
- Any tokens in seed/handler files are mock data only
- `.mjs` files may contain mock secrets - ensure `.gitignore` if needed

### 11.3 Process Isolation

- Mock server runs in isolated child process
- Crashes don't affect Vite dev server
- Memory isolation prevents cross-contamination

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Component | Test Coverage |
|-----------|--------------|
| Plugin configuration merging | 100% |
| Proxy configuration generation | 100% |
| IPC message handling | 100% |
| Shutdown logic | 100% |

### 12.2 Integration Tests

| Scenario | Status |
|----------|--------|
| Plugin starts mock server | To implement |
| Proxy forwards requests correctly | To implement |
| Seeds load and apply | To implement |
| Handlers override responses | To implement |
| Graceful shutdown | To implement |

### 12.3 End-to-End Tests

| Scenario | Status |
|----------|--------|
| Full development workflow | To implement |
| Error simulation | To implement |
| Network delay simulation | To implement |

### 12.4 Manual Testing Checklist

- [ ] `npm run start:mock` starts successfully
- [ ] API requests are proxied and return mock data
- [ ] Custom seeds generate expected data
- [ ] Custom handlers return correct responses
- [ ] Error simulation works via query parameters
- [ ] Graceful shutdown on Ctrl+C
- [ ] Logs appear in Vite console

---

## 13. Deployment & Distribution

### 13.1 Current State

The plugin is currently implemented as internal project files:
```
packages/foc-gpme/vite-plugins/
├── index.ts
├── mock-server.types.ts
├── mock-server-runner.mjs
├── mock-server-runner.ts
└── vite-plugin-mock-server.ts
```

### 13.2 Future: NPM Package

**Package Name:** `@mbio/vite-plugin-mock-server` (proposed)

**Package Structure:**
```
@mbio/vite-plugin-mock-server/
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── runner.mjs
├── package.json
└── README.md
```

### 13.3 Dependencies

**Required:**
```json
{
  "dependencies": {
    "@hono/node-server": "^1.x",
    "@scalar/mock-server": "^0.x",
    "yaml": "^2.x"
  },
  "peerDependencies": {
    "vite": "^5.0.0"
  }
}
```

**Optional (for seeds):**
```json
{
  "peerDependencies": {
    "@faker-js/faker": "^8.x"
  }
}
```

---

## 14. Future Enhancements

### 14.1 Short-Term (v1.1)

| Feature | Priority | Effort |
|---------|----------|--------|
| Hot reload for seeds/handlers | P2 | Medium |
| Auto-restart on crash | P2 | Low |
| Request/response recording | P2 | Medium |
| TypeScript seed/handler support | P2 | High |

### 14.2 Medium-Term (v1.2)

| Feature | Priority | Effort |
|---------|----------|--------|
| Web UI for mock management | P3 | High |
| OpenAPI x-handler support | P2 | Medium |
| OpenAPI x-seed support | P2 | Medium |
| GraphQL support | P3 | High |

### 14.3 Long-Term (v2.0)

| Feature | Priority | Effort |
|---------|----------|--------|
| Persistent mock data (SQLite) | P3 | High |
| Multi-spec support | P3 | Medium |
| Contract testing integration | P3 | High |
| Shared mock library (mono-repo) | P3 | Medium |

---

## 15. Acceptance Criteria

### 15.1 MVP Criteria (v1.0)

- [x] Plugin integrates with Vite dev server
- [x] Mock server starts automatically
- [x] Proxy configuration works transparently
- [x] OpenAPI spec generates mock responses
- [x] Security schemes are normalized
- [x] Custom seeds load from .mjs files
- [x] Custom handlers load from .mjs files
- [x] Request logging appears in Vite console
- [x] Graceful shutdown on server close
- [x] Documentation available (README)

**v1.0.1 Critical Fixes (Required):**
- [ ] **FR-003:** Use @scalar/openapi-parser for document loading and validation
- [ ] **FR-003:** Report validation errors with clear messages
- [ ] **FR-004:** Load and validate handler/seed files with clear feedback
- [ ] **FR-005:** Inject x-handler code into OpenAPI operations
- [ ] **FR-005:** Inject x-seed code into OpenAPI schemas
- [ ] **FR-006:** Build endpoint registry from enhanced document
- [ ] **FR-006:** Display registry table on startup
- [ ] **FR-006:** Expose `/_mock/registry` endpoint

### 15.2 Quality Criteria

- [ ] All P0/P1 requirements implemented
- [ ] No critical bugs
- [ ] Startup time < 5 seconds
- [ ] Memory usage < 100MB
- [ ] Works on macOS, Linux, Windows

---

## 16. Appendix

### 16.1 Glossary

| Term | Definition |
|------|------------|
| **BFF** | Backend For Frontend - API layer specific to frontend needs |
| **OpenAPI** | Specification for describing REST APIs |
| **Scalar** | Company providing OpenAPI tooling including mock server |
| **Hono** | Lightweight, fast web framework for Node.js |
| **Faker.js** | Library for generating realistic fake data |
| **IPC** | Inter-Process Communication |
| **Seed** | Initial data loaded when mock server starts |
| **Handler** | Custom function that generates API responses |

### 16.2 References

- [Scalar Mock Server Documentation](https://github.com/scalar/scalar/tree/main/packages/mock-server)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Hono Framework](https://hono.dev/)
- [Faker.js Documentation](https://fakerjs.dev/)

### 16.3 File Structure

```
packages/foc-gpme/
├── vite-plugins/
│   ├── index.ts                      # Plugin exports
│   ├── vite-plugin-mock-server.ts    # Main Vite plugin
│   ├── mock-server-runner.mjs        # ESM runner (child process)
│   ├── mock-server-runner.ts         # TS version (reference)
│   ├── mock-server.types.ts          # TypeScript type definitions
│   └── openapi-enhancer.mjs          # Document enhancer & registry (NEW)
│
├── src/apis/bff/
│   ├── gpme-bff-service.openapi.bundle.yaml  # OpenAPI spec
│   └── mock/
│       ├── README.md                 # Mock system documentation
│       ├── index.ts                  # Mock exports
│       ├── handlers/
│       │   ├── health.handler.mjs    # Health check handler
│       │   ├── health.handler.ts     # TS reference
│       │   └── vehicles.handler.ts   # TS reference
│       └── seeds/
│           ├── vehicles.seed.mjs     # Vehicle seed data
│           ├── vehicles.seed.ts      # TS reference
│           ├── orders.seed.ts        # TS reference
│           └── products.seed.ts      # TS reference
│
├── env.mock.json                     # Mock environment config
├── vite.config.mts                   # Vite configuration
└── package.json                      # Package scripts & dependencies
```

### 16.4 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-01-XX | Initial specification draft |
| 1.0.1-draft | 2025-01-XX | Reorganized FRs for logical implementation order |
| 1.0.2-draft | 2025-01-XX | Complete FR renumbering: FR-003 (Parser), FR-004 (File Loading), FR-005 (Enhancement), FR-006 (Registry), FR-007-012 (Core), FR-013-015 (Optional) |
| 1.0.3-draft | 2025-01-15 | **FR-004 Enhancement**: Added support for function exports in handlers/seeds. Values can now be either strings (static) or functions (dynamic code generation). Added HandlerCodeContext and SeedCodeContext APIs. Added Use Cases & Best Practices section. Updated validation rules and API specifications (sections 8.2-8.5). |

---

**Document Status:** Draft - Awaiting Review

**Next Steps:**
1. Review and approve specification
2. Validate against existing implementation
3. Identify gaps between spec and implementation
4. Prioritize missing features for v1.1
5. Finalize acceptance testing criteria
