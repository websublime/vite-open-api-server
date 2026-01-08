# PRODUCT REQUIREMENTS SPECIFICATION

## vite-plugin-open-api-server

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

The `vite-plugin-open-api-server` is a Vite plugin that integrates the Scalar Mock Server into the development workflow. It automatically spawns a mock API server based on OpenAPI specifications, enabling frontend developers to work independently of backend services during local development.

#### 1.1.1 Why OpenAPI-First?

The plugin is built on an **OpenAPI-first philosophy**, where the OpenAPI specification serves as the single source of truth for API contracts. This approach provides several key advantages:

**Contract-Driven Development:**
- OpenAPI specification defines the exact contract between frontend and backend
- Automatic validation ensures mocked responses match the documented API structure
- Reduces integration issues by catching contract mismatches early in development

**Living Documentation:**
- OpenAPI spec serves as always up-to-date API documentation
- Changes to the API are immediately reflected in mock responses
- Eliminates drift between documentation, mocks, and actual implementation

**Type Safety & Code Generation:**
- OpenAPI schemas enable automatic TypeScript type generation
- Strongly-typed API clients reduce runtime errors
- IDE autocomplete and validation based on actual API contracts

**Ecosystem Integration:**
- Leverages mature OpenAPI tooling (parsers, validators, code generators)
- Compatible with industry-standard API design practices
- Enables contract testing and API-first development workflows

**Differentiation from Generic Mock Servers:**

Unlike generic mock servers (json-server, MSW) that require manual mock definitions, `vite-plugin-open-api-server`:
- Generates mocks **automatically** from OpenAPI specs (zero manual configuration)
- Validates responses against schemas (catches type mismatches)
- Supports all OpenAPI features (path params, query params, request bodies, multiple response codes)
- Maintains consistency between API documentation and mock behavior

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

**Description:** The plugin MUST handle OpenAPI security schemes to simulate authentication flows during development. The Scalar Mock Server validates the **presence** of credentials but accepts any value as valid, enabling frontend development without backend authentication infrastructure.

**Background:**

OpenAPI specifications often define security schemes that require authentication (Bearer tokens, API Keys, OAuth2, etc.). In development, we need to:
1. Validate that the frontend sends credentials correctly
2. Test 401/403 error handling flows
3. Avoid complex authentication setup (real JWTs, OAuth flows, etc.)

The mock server achieves this by:
- **Validating presence** of credentials (header, query param, cookie)
- **Accepting any value** as valid (no signature verification, no token expiry)
- **Returning 401 Unauthorized** only when credentials are completely missing

**How Security Scheme Normalization Works:**

The `@scalar/openapi-parser`'s `sanitize()` function automatically handles security scheme normalization:

```typescript
import { sanitize } from '@scalar/openapi-parser';

// Before sanitization (potentially incomplete)
const document = {
  openapi: '3.1.0',
  info: { title: 'API', version: '1.0.0' },
  paths: {
    '/protected': {
      get: {
        security: [{ bearerAuth: [] }],  // References bearerAuth
        responses: { '200': { description: 'OK' } }
      }
    }
  }
  // Missing components.securitySchemes definition!
};

// After sanitization - missing securitySchemes auto-generated
const normalized = sanitize(document);

// Result:
// {
//   ...
//   components: {
//     securitySchemes: {
//       bearerAuth: {
//         type: 'http',
//         scheme: 'bearer'
//       }
//     }
//   }
// }
```

**Supported Security Schemes:**

| Scheme Type | Location | OpenAPI Definition | Mock Behavior |
|-------------|----------|-------------------|---------------|
| **HTTP Bearer** | `Authorization: Bearer <token>` | `type: http, scheme: bearer` | Accepts any non-empty token |
| **HTTP Basic** | `Authorization: Basic <base64>` | `type: http, scheme: basic` | Accepts any base64 string |
| **API Key (Header)** | Custom header | `type: apiKey, in: header, name: X-API-Key` | Accepts any non-empty value |
| **API Key (Query)** | Query parameter | `type: apiKey, in: query, name: api_key` | Accepts any non-empty value |
| **API Key (Cookie)** | Cookie | `type: apiKey, in: cookie, name: auth` | Accepts any non-empty value |
| **OAuth2** | `Authorization: Bearer <token>` | `type: oauth2, flows: {...}` | Accepts any non-empty token |
| **OpenID Connect** | `Authorization: Bearer <token>` | `type: openIdConnect, url: ...` | Accepts any non-empty token |

**Example 1: Bearer Token Authentication**

```yaml
# OpenAPI Specification
paths:
  /api/v1/users:
    get:
      summary: Get users
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
        '401':
          description: Unauthorized
          content:
            application/json:
              example:
                error: 'Missing or invalid authentication'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

**Mock Server Behavior:**

```bash
# ✅ Request WITH Authorization header (any token accepted)
curl -H "Authorization: Bearer any-random-string" http://localhost:3456/api/v1/users
# Response: 200 OK with mock user data

# ✅ Request WITH valid JWT (not decoded, just presence validated)
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3456/api/v1/users
# Response: 200 OK with mock user data

# ❌ Request WITHOUT Authorization header
curl http://localhost:3456/api/v1/users
# Response: 401 Unauthorized
# Body: { "error": "Missing or invalid authentication" }
```

**Example 2: API Key Authentication**

```yaml
# OpenAPI Specification
paths:
  /api/v1/data:
    get:
      summary: Get data
      security:
        - apiKeyAuth: []
      responses:
        '200':
          description: Success

components:
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

**Mock Server Behavior:**

```bash
# ✅ Request WITH X-API-Key header
curl -H "X-API-Key: test-key-123" http://localhost:3456/api/v1/data
# Response: 200 OK

# ❌ Request WITHOUT X-API-Key header
curl http://localhost:3456/api/v1/data
# Response: 401 Unauthorized
```

**Example 3: Multiple Security Schemes (OR logic)**

```yaml
# OpenAPI Specification - Either bearerAuth OR apiKey required
paths:
  /api/v1/resource:
    get:
      security:
        - bearerAuth: []
        - apiKey: []
      responses:
        '200':
          description: Success
```

**Mock Server Behavior:**

```bash
# ✅ With Bearer token
curl -H "Authorization: Bearer token123" http://localhost:3456/api/v1/resource
# Response: 200 OK

# ✅ With API Key
curl -H "X-API-Key: key123" http://localhost:3456/api/v1/resource
# Response: 200 OK

# ✅ With BOTH (overkill but valid)
curl -H "Authorization: Bearer token123" -H "X-API-Key: key123" http://localhost:3456/api/v1/resource
# Response: 200 OK

# ❌ With NEITHER
curl http://localhost:3456/api/v1/resource
# Response: 401 Unauthorized
```

**Example 4: OAuth2 Simulation**

```yaml
components:
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://example.com/oauth/authorize
          tokenUrl: https://example.com/oauth/token
          scopes:
            read: Read access
            write: Write access
```

**Mock Server Behavior:**

- **No actual OAuth flow** - mock server doesn't redirect to authorization URL
- **No token validation** - doesn't verify token signature or expiry
- **No scope validation** - doesn't check if token has required scopes
- **Presence check only** - validates that `Authorization: Bearer <token>` header exists

```bash
# ✅ Any Bearer token accepted (scopes not validated)
curl -H "Authorization: Bearer fake-oauth-token" http://localhost:3456/api/v1/resource
# Response: 200 OK
```

**Acceptance Criteria:**

- [ ] Use `@scalar/openapi-parser`'s `sanitize()` to normalize security schemes
- [ ] Auto-generate missing `components.securitySchemes` definitions
- [ ] Mock server validates **presence** of credentials (not validity)
- [ ] Return 401 Unauthorized when required credentials are missing
- [ ] Accept any non-empty credential value as valid
- [ ] Support all OpenAPI security scheme types (http, apiKey, oauth2, openIdConnect)
- [ ] Handle multiple security schemes with OR logic
- [ ] Log normalized security schemes on startup:

```
[Mock] Security Schemes Detected:
  ✓ bearerAuth (HTTP Bearer) - Used by 12 endpoints
  ✓ apiKeyAuth (API Key in header: X-API-Key) - Used by 5 endpoints
  ✓ oauth2 (OAuth2) - Used by 8 endpoints
```

**Edge Cases & Limitations:**

1. **No Token Validation:**
   - JWT tokens are **not decoded** or verified
   - Token expiry is **not checked**
   - Token signatures are **not validated**

2. **No Scope Validation:**
   - OAuth2 scopes defined in spec are **ignored**
   - Any token has access to all endpoints

3. **No Role-Based Access Control (RBAC):**
   - Cannot simulate admin vs user permissions
   - All authenticated requests have full access

4. **Security AND Logic Not Supported:**
   - OpenAPI supports AND logic: `security: [{ scheme1: [], scheme2: [] }]`
   - Mock server may treat this as OR logic (implementation-dependent)

5. **Custom Security Schemes:**
   - Custom `x-` extensions in security schemes may be ignored

**Development Best Practices:**

1. **Test Authentication Presence:**
   ```typescript
   // Frontend code to test auth header is sent
   const response = await fetch('/api/protected', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('token')
     }
   });
   
   if (response.status === 401) {
     // Redirect to login (auth header missing/invalid)
   }
   ```

2. **Simulate 401 Errors:**
   ```typescript
   // Temporarily remove auth header to test error handling
   const response = await fetch('/api/protected');
   // Should get 401 - test error UI is shown
   ```

3. **Mock Different Token Values:**
   ```typescript
   // Mock server accepts any token, so you can use semantic values for debugging
   headers: {
     'Authorization': 'Bearer user-john-doe-session-123'
   }
   ```

**Technical Implementation:**

```typescript
// In mock-server-runner.mjs
import { sanitize } from '@scalar/openapi-parser';

async function loadAndNormalizeOpenApi(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse and validate
  const { valid, errors } = await validate(content);
  if (!valid) throw new Error('Invalid OpenAPI');
  
  // Dereference $ref
  const { schema } = await dereference(content);
  
  // Normalize security schemes (auto-generate missing definitions)
  const normalized = sanitize(schema);
  
  // Log detected security schemes
  logSecuritySchemes(normalized);
  
  return normalized;
}

function logSecuritySchemes(document: OpenAPIDocument) {
  const schemes = document.components?.securitySchemes || {};
  
  if (Object.keys(schemes).length === 0) {
    console.log('[Mock] ℹ No security schemes defined');
    return;
  }
  
  console.log('[Mock] Security Schemes Detected:');
  
  for (const [name, scheme] of Object.entries(schemes)) {
    const usageCount = countSecurityUsage(document, name);
    const description = formatSchemeDescription(scheme);
    console.log(`  ✓ ${name} (${description}) - Used by ${usageCount} endpoints`);
  }
}
```

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

#### FR-013: Preserve Existing x-handler/x-seed in OpenAPI

**Priority:** P0 (Critical)

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

---

#### FR-014: Hot Reload for Seeds/Handlers

**Priority:** P1 (High)

**Description:** Automatically reload seed and handler files when they change, re-inject into OpenAPI document, and restart mock server without requiring full Vite dev server restart.

**Prerequisites:**
- FR-003, FR-004, FR-005 implemented

**Acceptance Criteria:**
- [ ] Watch handler/seed directories for file changes
- [ ] Detect file add/modify/delete events
- [ ] Reload modified handler/seed files
- [ ] Re-enhance OpenAPI document with updated x-handler/x-seed
- [ ] Gracefully restart mock server child process
- [ ] Preserve in-memory store data across restarts (optional but recommended)
- [ ] Display clear reload notification in Vite console
- [ ] Reload completes in < 2 seconds

**Implementation Notes:**
```typescript
import { watch } from 'chokidar';

// In vite-plugin-open-api-server.ts
const watcher = watch([handlersDir, seedsDir], {
  ignoreInitial: true,
  persistent: true
});

watcher.on('change', async (path) => {
  server.config.logger.info(`[Mock] File changed: ${path}`);
  server.config.logger.info(`[Mock] Reloading mock server...`);
  
  // 1. Kill existing child process
  if (mockServerProcess) {
    mockServerProcess.kill('SIGTERM');
    await waitForExit(mockServerProcess, 5000);
  }
  
  // 2. Respawn with same environment
  mockServerProcess = fork('mock-server-runner.mjs', [], { env: {...} });
  
  // 3. Wait for READY message
  await waitForReady(mockServerProcess, 10000);
  
  server.config.logger.info(`[Mock] ✓ Mock server reloaded`);
});
```

**Benefits:**
- Faster iteration cycle (no full Vite restart)
- Immediate feedback on handler/seed changes
- Maintains development flow

---

---

#### FR-015: Vue DevTools Integration for Mock Management

**Priority:** P1 (High)

**Description:** Integration with Vue DevTools browser extension to provide a custom tab for inspecting registered endpoints and simulating edge cases, errors, and network conditions through query parameters. This provides comprehensive testing capabilities within the existing Vue DevTools workflow, enabling developers to test error handling, timeouts, slow responses, and various HTTP status codes without modifying backend code.

**DevTools Detection Strategy:**

The plugin follows the same pattern as Pinia and Vue Router for DevTools integration:

1. **Conditional Registration:** Only register in development mode and browser environment
2. **Buffer Pattern:** Plugins are buffered and activated when DevTools connects
3. **Silent Fallback:** If DevTools is not installed, the plugin simply doesn't activate (no errors)
4. **Version Validation:** Check API compatibility on connection
5. **Global State Exposure:** Expose mock server state to `globalThis` for debugging

**Detection Implementation:**

```typescript
import { setupDevtoolsPlugin } from '@vue/devtools-api'
import type { App } from 'vue'
import type { MockEndpointRegistry, MockServerState } from './types'

// Build-time constants (replaced by bundler)
declare const __DEV__: boolean

// Runtime environment detection
const IS_CLIENT = typeof window !== 'undefined'
const HAS_PROXY = typeof Proxy !== 'undefined'

/**
 * Registers Mock Server integration with Vue DevTools.
 * 
 * This function follows the same pattern as Pinia and Vue Router:
 * - Only activates in development mode (controlled by __DEV__ flag)
 * - Only runs in browser environment (not SSR)
 * - Silently skips if DevTools is not installed
 * - Buffers registration until DevTools connects
 * - Validates API version compatibility
 * - Exposes global state for console debugging
 * 
 * @param app - Vue application instance
 * @param options - Mock server configuration and state
 */
export function registerMockServerDevTools(
  app: App,
  options: {
    mockServerUrl: string
    registry: MockEndpointRegistry
    state: MockServerState
  }
): void {
  // Guard: Only register in development mode
  // __DEV__ is replaced at build time by Vite/Rollup
  if (!__DEV__) {
    return
  }

  // Guard: Only register in browser environment (not SSR)
  if (!IS_CLIENT) {
    return
  }

  // Guard: Require Proxy support (excludes old browsers like IE11)
  if (!HAS_PROXY) {
    console.warn(
      '[Mock Server] DevTools integration requires Proxy support. ' +
      'Please use a modern browser.'
    )
    return
  }

  const { mockServerUrl, registry, state } = options

  // Register with Vue DevTools using the standard plugin API
  // This is buffered internally - if DevTools isn't installed,
  // the setup function simply won't be called (no error)
  setupDevtoolsPlugin(
    {
      id: 'dev.websublime.mock-server',
      label: 'Mock Server 🔌',
      packageName: '@websublime/vite-plugin-open-api-server',
      homepage: 'https://github.com/websublime/vite-open-api-server',
      logo: 'https://raw.githubusercontent.com/websublime/vite-open-api-server/main/logo.svg',
      componentStateTypes: ['Mock Server'],
      app,
      settings: {
        autoRefresh: {
          label: 'Auto-refresh registry',
          type: 'boolean',
          defaultValue: true,
        },
        refreshInterval: {
          label: 'Refresh interval (ms)',
          type: 'text',
          defaultValue: '5000',
        },
      },
    },
    (api) => {
      // Validate DevTools API version compatibility
      // This check is used by Pinia and Vue Router to detect outdated versions
      if (typeof api.now !== 'function') {
        console.warn(
          '[Mock Server] You seem to be using an outdated version of Vue DevTools. ' +
          'Please update to the latest stable version for full Mock Server support. ' +
          'Installation: https://devtools.vuejs.org/guide/installation.html'
        )
      }

      // Expose mock server state globally for console debugging
      // Following Pinia's pattern: globalThis.$pinia = pinia
      exposeGlobalState(registry, state, mockServerUrl)

      // Register custom inspector for endpoint browsing
      setupMockServerInspector(api, registry, state, mockServerUrl)

      // Register timeline layer for request logging
      setupMockServerTimeline(api)

      // Log successful registration
      if (__DEV__) {
        console.log(
          '[Mock Server] Vue DevTools integration registered. ' +
          'Open DevTools to access the Mock Server tab.'
        )
      }
    }
  )
}

/**
 * Exposes mock server state to globalThis for console debugging.
 * 
 * This allows developers to inspect and manipulate mock server state
 * directly from the browser console, similar to Pinia's $pinia and $store.
 * 
 * Available globals:
 * - globalThis.$mockServer - Main mock server instance
 * - globalThis.$mockRegistry - Current endpoint registry
 * 
 * @example
 * // In browser console:
 * $mockServer.url          // 'http://localhost:3456'
 * $mockServer.connected    // true
 * $mockRegistry.endpoints  // [...array of endpoints]
 * $mockRegistry.stats      // { total: 12, customHandlers: 5, ... }
 */
function exposeGlobalState(
  registry: MockEndpointRegistry,
  state: MockServerState,
  mockServerUrl: string
): void {
  // Define $mockServer global
  Object.defineProperty(globalThis, '$mockServer', {
    configurable: true,
    enumerable: true,
    get() {
      return {
        url: mockServerUrl,
        connected: state.connected,
        port: state.port,
        startedAt: state.startedAt,
        lastError: state.lastError,
        
        // Methods for console interaction
        async refresh() {
          console.log('[Mock Server] Refreshing registry...')
          try {
            const response = await fetch(`${mockServerUrl}/__registry`)
            const data = await response.json()
            console.log('[Mock Server] Registry refreshed:', data)
            return data
          } catch (error) {
            console.error('[Mock Server] Failed to refresh:', error)
            throw error
          }
        },
        
        getEndpoint(operationId: string) {
          return registry.getByOperationId(operationId)
        },
        
        listEndpoints() {
          console.table(registry.getAll().map(e => ({
            method: e.method,
            path: e.path,
            operationId: e.operationId,
            hasCustomHandler: e.hasCustomHandler,
          })))
        },
      }
    },
  })

  // Define $mockRegistry global (shortcut to registry data)
  Object.defineProperty(globalThis, '$mockRegistry', {
    configurable: true,
    enumerable: true,
    get() {
      return {
        endpoints: registry.getAll(),
        stats: {
          total: registry.count(),
          customHandlers: registry.countCustomHandlers(),
          autoGenerated: registry.countAutoGenerated(),
          withCustomSeed: registry.countCustomSeeds(),
        },
        byMethod: registry.groupByMethod(),
        byOperationId: registry.toMap(),
      }
    },
  })

  if (__DEV__) {
    console.log(
      '[Mock Server] Global state exposed. Access via:\n' +
      '  - $mockServer (server instance)\n' +
      '  - $mockRegistry (endpoint registry)\n' +
      'Try: $mockServer.listEndpoints()'
    )
  }
}

// TypeScript declarations for global state
declare global {
  /**
   * Mock Server instance exposed when DevTools are opened.
   * Provides access to server state and utility methods.
   */
  var $mockServer: {
    url: string
    connected: boolean
    port: number
    startedAt: Date | null
    lastError: Error | null
    refresh(): Promise<unknown>
    getEndpoint(operationId: string): unknown
    listEndpoints(): void
  } | undefined

  /**
   * Mock Registry shortcut exposed when DevTools are opened.
   * Provides direct access to endpoint data.
   */
  var $mockRegistry: {
    endpoints: unknown[]
    stats: {
      total: number
      customHandlers: number
      autoGenerated: number
      withCustomSeed: number
    }
    byMethod: Record<string, unknown[]>
    byOperationId: Map<string, unknown>
  } | undefined
}
```

**Build Configuration:**

The `__DEV__` constant must be defined at build time:

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
})

// rollup.config.js
export default {
  plugins: [
    replace({
      preventAssignment: true,
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    }),
  ],
}
```

**Acceptance Criteria:**
- [ ] Custom "Mock Server" tab appears in Vue DevTools
- [ ] Plugin only registers in development mode (`__DEV__` guard)
- [ ] Plugin only registers in browser environment (`IS_CLIENT` guard)
- [ ] Plugin silently skips if DevTools is not installed (no errors)
- [ ] API version validation with warning for outdated DevTools
- [ ] Global `$mockServer` exposed to `globalThis` for console debugging
- [ ] Global `$mockRegistry` exposed to `globalThis` for registry access
- [ ] Display complete endpoint registry (operations, methods, paths, operationIds)
- [ ] Show which endpoints have custom handlers vs auto-generated
- [ ] Interactive UI to configure simulation parameters for edge cases and errors
- [ ] Simulate HTTP status codes (2xx, 4xx, 5xx ranges)
- [ ] Simulate network conditions (slow connections, timeouts, connection drops)
- [ ] Simulate server errors (500, 503, rate limiting)
- [ ] Simulate edge cases (malformed responses, partial content, empty responses)
- [ ] Configure response delays (latency simulation from 0ms to 10s+)
- [ ] Copy endpoint URLs with simulation parameters to clipboard
- [ ] Real-time sync with mock server registry
- [ ] Show connection status to mock server
- [ ] Filter endpoints by method, path, or handler type
- [ ] Save and load simulation presets

**UI Features:**

1. **Connection Status:**
   ```
   🟢 Mock Server Connected (http://localhost:3456)
   Endpoints: 12 | Custom Handlers: 5 | Auto-generated: 7
   ```

2. **Endpoint Registry View:**
   ```
   ┌─────────────────────────────────────────────────────────────────────┐
   │ Method │ Path                    │ Operation ID      │ Handler       │
   ├─────────────────────────────────────────────────────────────────────┤
   │ GET    │ /api/v1/vehicles        │ fetch_vehicles    │ ✓ Custom      │
   │ POST   │ /api/v1/vehicles        │ create_vehicle    │ ⚡ Generated   │
   │ GET    │ /api/v1/vehicles/{id}   │ get_vehicle       │ ✓ Custom      │
   │ PUT    │ /api/v1/vehicles/{id}   │ update_vehicle    │ ⚡ Generated   │
   │ DELETE │ /api/v1/vehicles/{id}   │ delete_vehicle    │ ⚡ Generated   │
   │ GET    │ /api/v1/orders          │ fetch_orders      │ ✓ Custom      │
   │ POST   │ /api/v1/orders          │ create_order      │ ✓ Custom      │
   └─────────────────────────────────────────────────────────────────────┘
   ```

3. **Response Simulation Panel (per endpoint):**
   When an endpoint is selected:
   ```
   Selected: GET /api/v1/vehicles [fetch_vehicles]
   
   ┌─ Simulate Response ────────────────────────────────────────────┐
   │                                                                  │
   │ ━━━ HTTP Status ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Status Code:  [ 200 ▼]  (200, 201, 204, 400, 401, 403, 404,   │
   │                          409, 422, 429, 500, 502, 503, 504)    │
   │                                                                  │
   │ ━━━ Network Conditions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Latency:      [ 0 ms    ]  ⚡ Fast  🐌 Slow  ☁️ 3G  📶 4G     │
   │               Presets: 0ms | 500ms | 2000ms | 5000ms           │
   │                                                                  │
   │ Timeout:      [ None ▼  ]  (None, 5s, 10s, 30s, Custom)       │
   │                                                                  │
   │ Connection:   [ Stable ▼]  (Stable, Intermittent, Drop)       │
   │                                                                  │
   │ ━━━ Error Scenarios ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Error Type:   [ None ▼  ]                                      │
   │               • None - Normal response                          │
   │               • Timeout - Request timeout                       │
   │               • Network - Connection failure                    │
   │               • Server - Internal server error                  │
   │               • RateLimit - Too many requests (429)            │
   │               • Maintenance - Service unavailable (503)         │
   │                                                                  │
   │ ━━━ Edge Cases ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Response:     [ Normal ▼]                                      │
   │               • Normal - Valid JSON response                    │
   │               • Empty - Empty response body                     │
   │               • Malformed - Invalid JSON                        │
   │               • Partial - Incomplete data                       │
   │               • Large - Large payload (stress test)            │
   │                                                                  │
   │ ━━━ Advanced ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ Custom Headers: [+] Add Header                                 │
   │   X-Request-ID: abc-123                                        │
   │   X-Custom-Error: test-scenario                                │
   │                                                                  │
   │ Probability:  [ 100% ▼  ]  (100%, 80%, 50%, 20% failure rate) │
   │                                                                  │
   │ ┌────────────────────────────────────────────────────────┐     │
   │ │ Generated URL:                                          │     │
   │ │ http://localhost:5173/api/v1/vehicles?                 │     │
   │ │   simulateStatus=200&simulateDelay=500&                │     │
   │ │   simulateConnection=stable                            │     │
   │ │                                                          │     │
   │ │ [Copy URL]  [Test in Browser]  [Save Preset]  [Reset] │     │
   │ └────────────────────────────────────────────────────────┘     │
   │                                                                  │
   │ Query Parameters Applied:                                       │
   │ • simulateStatus=200                                            │
   │ • simulateDelay=500                                             │
   │ • simulateConnection=stable                                     │
   │                                                                  │
   │ Saved Presets:                                                  │
   │ • Slow 3G Network     [Load]  [Delete]                         │
   │ • 500 Server Error    [Load]  [Delete]                         │
   │ • Rate Limiting       [Load]  [Delete]                         │
   │                                                                  │
   └──────────────────────────────────────────────────────────────────┘
   ```

4. **Available Status Codes (based on OpenAPI spec):**
   - Shows all status codes defined in the operation's responses
   - Example: If operation defines 200, 400, 404 → only those are selectable
   - Common additional codes: 429 (Rate Limit), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
   - Fallback to comprehensive code list if no responses defined

5. **Simulation Presets:**
   Pre-configured scenarios for common testing situations:
   ```
   Fast Connection:      0ms delay, stable connection
   Slow 3G:              2000ms delay, intermittent connection
   4G Network:           500ms delay, stable connection
   Server Overload:      503 status, 5000ms delay
   Rate Limited:         429 status, 1000ms delay
   Authentication Fail:  401 status, 200ms delay
   Not Found:            404 status, 100ms delay
   Timeout Scenario:     Timeout after 30s
   Network Failure:      Connection drop simulation
   Malformed Response:   200 status, malformed JSON
   ```

**Technical Implementation:**

**Dependencies:**
```json
{
  "devDependencies": {
    "@vue/devtools-api": "^7.3.0"
  }
}
```

**Integration Flow:**

1. **Plugin Registration** (in Vite plugin):
   ```typescript
   import { addCustomTab, onDevToolsClientConnected } from '@vue/devtools-api'
   
   // During Vite plugin initialization
   function registerDevToolsTab(mockServerUrl: string, registry: MockEndpointRegistry) {
     onDevToolsClientConnected(() => {
       addCustomTab({
         name: 'mock-server',
         title: 'Mock Server',
         icon: 'api',
         view: {
           type: 'sfc',
           sfc: generateDevToolsSFC(mockServerUrl, registry)
         },
         category: 'advanced'
       })
     })
   }
   ```

2. **Real-time Registry Sync:**
   - Mock server exposes `GET /__registry` endpoint returning JSON
   - DevTools tab polls this endpoint every 5 seconds
   - Updates UI when registry changes (hot reload scenarios)

3. **Query Parameter Generation:**
   ```typescript
   interface SimulationParams {
     simulateStatus?: number
     simulateDelay?: number
     simulateError?: 'timeout' | 'network' | 'server' | 'ratelimit' | 'maintenance'
     simulateConnection?: 'stable' | 'intermittent' | 'drop'
     simulateResponse?: 'normal' | 'empty' | 'malformed' | 'partial' | 'large'
     simulateTimeout?: number
     simulateProbability?: number
     customHeaders?: Record<string, string>
   }
   
   function generateSimulatedUrl(
     baseUrl: string,
     path: string,
     params: SimulationParams
   ): string {
     const url = new URL(path, baseUrl)
     
     if (params.simulateStatus) {
       url.searchParams.set('simulateStatus', String(params.simulateStatus))
     }
     if (params.simulateDelay && params.simulateDelay > 0) {
       url.searchParams.set('simulateDelay', String(params.simulateDelay))
     }
     if (params.simulateError) {
       url.searchParams.set('simulateError', params.simulateError)
     }
     if (params.simulateConnection && params.simulateConnection !== 'stable') {
       url.searchParams.set('simulateConnection', params.simulateConnection)
     }
     if (params.simulateResponse && params.simulateResponse !== 'normal') {
       url.searchParams.set('simulateResponse', params.simulateResponse)
     }
     if (params.simulateTimeout) {
       url.searchParams.set('simulateTimeout', String(params.simulateTimeout))
     }
     if (params.simulateProbability && params.simulateProbability < 100) {
       url.searchParams.set('simulateProbability', String(params.simulateProbability))
     }
     if (params.customHeaders) {
       url.searchParams.set('simulateHeaders', JSON.stringify(params.customHeaders))
     }
     
     return url.toString()
   }
   ```

4. **Mock Server Registry Endpoint:**
   ```typescript
   // In mock-server-runner.mjs
   app.get('/__registry', (req, res) => {
     res.json({
       endpoints: registry.getAll(),
       stats: {
         total: registry.count(),
         customHandlers: registry.countCustomHandlers(),
         autoGenerated: registry.countAutoGenerated()
       },
       timestamp: Date.now()
     })
   })
   ```

**Supported Query Parameters:**

| Parameter | Type | Description | Examples |
|-----------|------|-------------|----------|
| `simulateStatus` | number | Force specific HTTP status code | `200`, `404`, `500`, `503` |
| `simulateDelay` | number | Add latency in milliseconds | `0`, `500`, `2000`, `5000` |
| `simulateError` | string | Simulate error condition | `timeout`, `network`, `server`, `ratelimit`, `maintenance` |
| `simulateConnection` | string | Simulate connection quality | `stable`, `intermittent`, `drop` |
| `simulateResponse` | string | Simulate response edge cases | `normal`, `empty`, `malformed`, `partial`, `large` |
| `simulateTimeout` | number | Timeout duration in seconds | `5`, `10`, `30` |
| `simulateProbability` | number | Success probability percentage | `100`, `80`, `50`, `20` |
| `simulateHeaders` | JSON | Custom response headers | `{"X-Custom":"value"}` |

**Example URLs:**

```bash
# Slow 3G simulation
GET /api/v1/vehicles?simulateDelay=2000&simulateConnection=intermittent

# Rate limiting error
GET /api/v1/vehicles?simulateStatus=429&simulateError=ratelimit

# Server maintenance
GET /api/v1/vehicles?simulateStatus=503&simulateError=maintenance&simulateDelay=5000

# Malformed response
GET /api/v1/vehicles?simulateStatus=200&simulateResponse=malformed

# Network failure with 50% probability
GET /api/v1/vehicles?simulateError=network&simulateProbability=50

# Timeout after 10 seconds
GET /api/v1/vehicles?simulateTimeout=10

# Combined edge case
GET /api/v1/vehicles?simulateStatus=500&simulateDelay=3000&simulateResponse=partial
```

**Benefits:**
- **Comprehensive Testing:** Simulate all edge cases, errors, and network conditions without backend changes
- **Seamless Integration:** Direct access from Vue DevTools alongside components and routes
- **Zero Infrastructure:** No separate UI to maintain or navigate to
- **Developer Workflow:** Leverages Vue DevTools' existing UI framework and styling
- **Easy Discovery:** Automatic availability when Vue DevTools is installed
- **Copy-Paste Ready:** Generated URLs ready to use in application code or tests
- **Visual Feedback:** Shows available response codes and scenarios per endpoint
- **Preset Management:** Save and load common testing scenarios
- **Realistic Simulation:** Test slow networks, timeouts, intermittent connections
- **Error Handling Validation:** Verify application behavior under various failure conditions
- **Performance Testing:** Simulate slow responses and large payloads
- **Rate Limiting Tests:** Validate 429 handling and retry logic
- **Maintenance Mode:** Test service unavailability scenarios

---

### 5.2 Future Enhancements

The following features are planned for future releases but not required for v1.0:

#### FE-001: TypeScript Support for Handlers/Seeds

**Priority:** P2 (Medium - Future)

**Description:** Support `.ts` files for handlers and seeds with automatic compilation.

---

#### FE-002: GraphQL Support

**Priority:** P3 (Low - Future)

**Description:** Extend mock server to support GraphQL schemas in addition to OpenAPI/REST.

---

#### FE-003: Persistent Storage (SQLite)

**Priority:** P3 (Low - Future)

**Description:** Optional SQLite backend for persistent mock data across server restarts.

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
│  │   │  Vue Application  │───▶│  vite-plugin-open-api-server    │   │   │
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

#### 7.2.1 Vite Plugin (`vite-plugin-open-api-server.ts`)

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

### 7.4 External API Integration

This section provides a deep analysis of how the plugin integrates with the three core external dependencies: Vite, @scalar/openapi-parser, and @scalar/mock-server.

#### 7.4.1 Vite Plugin API Integration

**Plugin Registration & Lifecycle:**

```typescript
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

export function mockServerPlugin(options: MockServerPluginOptions): Plugin {
  let config: ResolvedConfig;
  let server: ViteDevServer;
  let mockServerProcess: ChildProcess | null = null;

  return {
    name: 'vite-plugin-open-api-server',
    
    // Apply only in development mode
    apply: 'serve',
    
    // Modify Vite config to add proxy rules
    config(userConfig, { command }) {
      if (command !== 'serve' || options.enabled === false) return;
      
      return {
        server: {
          proxy: {
            [options.proxyPath || '/gpme/bff']: {
              target: `http://localhost:${options.port || 3456}`,
              changeOrigin: true,
              rewrite: (path) => path.replace(options.proxyPath, ''),
            },
          },
        },
      };
    },
    
    // Store resolved config for later use
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    
    // Main hook: spawn mock server process
    configureServer(devServer) {
      server = devServer;
      
      // Spawn child process with mock server
      mockServerProcess = fork('mock-server-runner.mjs', [], {
        env: {
          MOCK_SERVER_PORT: String(options.port || 3456),
          MOCK_SERVER_OPENAPI_PATH: path.resolve(config.root, options.openApiPath),
          MOCK_SERVER_SEEDS_DIR: options.seedsDir ? path.resolve(config.root, options.seedsDir) : '',
          MOCK_SERVER_HANDLERS_DIR: options.handlersDir ? path.resolve(config.root, options.handlersDir) : '',
          MOCK_SERVER_VERBOSE: String(options.verbose || false),
        },
      });
      
      // Handle IPC messages from child process
      mockServerProcess.on('message', (msg: MockServerMessage) => {
        if (msg.type === 'READY') {
          server.config.logger.info(`Mock server ready on port ${msg.port}`);
        } else if (msg.type === 'ERROR') {
          server.config.logger.error(`Mock server error: ${msg.error}`);
        } else if (msg.type === 'LOG') {
          server.config.logger[msg.level](msg.message);
        }
      });
    },
    
    // Cleanup on shutdown
    buildEnd() {
      if (mockServerProcess) {
        mockServerProcess.kill('SIGTERM');
        mockServerProcess = null;
      }
    },
  };
}
```

**Key Vite APIs Used:**

| Hook/API | Purpose | Timing |
|----------|---------|--------|
| `apply: 'serve'` | Only activate in dev mode | Plugin registration |
| `config()` | Add proxy configuration | Before config resolution |
| `configResolved()` | Store final config | After config resolution |
| `configureServer()` | Spawn child process, setup IPC | After server creation |
| `buildEnd()` | Cleanup child process | On server shutdown |
| `server.config.logger` | Structured logging | Throughout lifecycle |
| `server.middlewares` | Not used (proxy handles routing) | N/A |

#### 7.4.2 @vue/devtools-api Integration

**Purpose:** Provides a custom tab in Vue DevTools browser extension for inspecting and managing mock server endpoints with response simulation capabilities.

**Package:** `@vue/devtools-api` (^7.3.0)

**Installation:**
```bash
npm install --save-dev @vue/devtools-api
```

**API Reference:** [https://devtools.vuejs.org/plugins/api](https://devtools.vuejs.org/plugins/api)

**Integration Point:** Vite plugin (`configureServer` hook)

**Detection Pattern:**

The integration follows the established pattern used by Pinia and Vue Router:

```typescript
// How Pinia detects and registers with DevTools (for reference):
// 1. Build-time guard: __USE_DEVTOOLS__ (replaced by bundler)
// 2. Runtime guard: IS_CLIENT (typeof window !== 'undefined')
// 3. Feature guard: typeof Proxy !== 'undefined' (modern browsers)
// 4. Silent buffering: setupDevtoolsPlugin buffers until DevTools connects
// 5. Version check: typeof api.now === 'function' (API compatibility)

// Our implementation mirrors this pattern exactly
```

**Key Concepts:**

1. **Build-time Guards (`__DEV__`):**
   - Defined by bundler (Vite/Rollup/Webpack)
   - Tree-shaken in production builds
   - Zero runtime cost in production

2. **Runtime Guards (`IS_CLIENT`, `HAS_PROXY`):**
   - Prevent SSR/Node.js execution
   - Exclude legacy browsers

3. **Buffer Pattern:**
   - `setupDevtoolsPlugin` internally buffers plugins
   - When DevTools connects, buffered plugins are activated
   - If DevTools never connects, plugins simply don't run
   - **No errors thrown** if DevTools is missing

4. **Global State Exposure:**
   - Following Pinia: `globalThis.$pinia`, `globalThis.$store`
   - We expose: `globalThis.$mockServer`, `globalThis.$mockRegistry`
   - Enables console debugging without DevTools

**Implementation:**

```typescript
// devtools/index.ts
import { setupDevtoolsPlugin } from '@vue/devtools-api'
import type { App } from 'vue'
import type { MockEndpointRegistry, MockServerState } from '../types'

// Build-time constant (replaced by bundler)
declare const __DEV__: boolean

// Runtime environment detection
const IS_CLIENT = typeof window !== 'undefined'
const HAS_PROXY = typeof Proxy !== 'undefined'

/**
 * Mock Server DevTools Plugin
 * 
 * What: Integrates mock server with Vue DevTools browser extension
 * How: Uses @vue/devtools-api with conditional registration pattern
 * Why: Provides visual endpoint inspection and simulation controls
 * 
 * @example
 * // In Vue app main.ts:
 * import { createApp } from 'vue'
 * import { registerMockServerDevTools } from '@websublime/vite-plugin-open-api-server'
 * 
 * const app = createApp(App)
 * 
 * // Only registers in dev mode, silently skips in production
 * registerMockServerDevTools(app, {
 *   mockServerUrl: 'http://localhost:3456',
 *   registry: mockRegistry,
 *   state: mockState,
 * })
 */
export function registerMockServerDevTools(
  app: App,
  options: {
    mockServerUrl: string
    registry: MockEndpointRegistry
    state: MockServerState
  }
): void {
  // === GUARD CLAUSES ===
  // These ensure DevTools only activates in appropriate environments
  
  // 1. Build-time guard: Skip in production
  if (!__DEV__) {
    return
  }

  // 2. Runtime guard: Skip in SSR/Node.js
  if (!IS_CLIENT) {
    return
  }

  // 3. Feature guard: Skip in legacy browsers
  if (!HAS_PROXY) {
    console.warn(
      '[Mock Server] DevTools requires Proxy support (modern browsers only).'
    )
    return
  }

  const { mockServerUrl, registry, state } = options

  // === PLUGIN REGISTRATION ===
  // setupDevtoolsPlugin uses internal buffering:
  // - If DevTools is installed → setup function is called
  // - If DevTools is NOT installed → setup function is never called (no error)
  setupDevtoolsPlugin(
    {
      id: 'dev.websublime.mock-server',
      label: 'Mock Server 🔌',
      packageName: '@websublime/vite-plugin-open-api-server',
      homepage: 'https://github.com/websublime/vite-open-api-server',
      logo: 'https://raw.githubusercontent.com/websublime/vite-open-api-server/main/logo.svg',
      componentStateTypes: ['Mock Server'],
      app,
      settings: {
        autoRefresh: {
          label: 'Auto-refresh registry',
          type: 'boolean',
          defaultValue: true,
        },
        refreshInterval: {
          label: 'Refresh interval (ms)',
          type: 'text',
          defaultValue: '5000',
        },
      },
    },
    (api) => {
      // === VERSION COMPATIBILITY CHECK ===
      // Pinia and Vue Router use this pattern to detect outdated DevTools
      if (typeof api.now !== 'function') {
        console.warn(
          '[Mock Server] Outdated Vue DevTools version detected. ' +
          'Please update: https://devtools.vuejs.org/guide/installation.html'
        )
      }

      // === GLOBAL STATE EXPOSURE ===
      // Expose state to globalThis for console debugging
      exposeGlobalMockServerState(registry, state, mockServerUrl)

      // === INSPECTOR REGISTRATION ===
      const INSPECTOR_ID = 'mock-server'

      api.addInspector({
        id: INSPECTOR_ID,
        label: 'Mock Server 🔌',
        icon: 'http',
        treeFilterPlaceholder: 'Search endpoints...',
        actions: [
          {
            icon: 'refresh',
            tooltip: 'Refresh registry from server',
            action: async () => {
              try {
                const response = await fetch(`${mockServerUrl}/__registry`)
                const data = await response.json()
                registry.updateFromServer(data)
                api.sendInspectorTree(INSPECTOR_ID)
                api.sendInspectorState(INSPECTOR_ID)
              } catch (error) {
                console.error('[Mock Server] Failed to refresh:', error)
              }
            },
          },
          {
            icon: 'content_copy',
            tooltip: 'Copy registry as JSON',
            action: () => {
              const data = JSON.stringify(registry.getAll(), null, 2)
              navigator.clipboard.writeText(data)
              console.log('[Mock Server] Registry copied to clipboard')
            },
          },
        ],
      })

      // Handle inspector tree requests
      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const endpoints = registry.getAll()
          const filtered = payload.filter
            ? endpoints.filter(e => 
                e.path.toLowerCase().includes(payload.filter.toLowerCase()) ||
                e.operationId.toLowerCase().includes(payload.filter.toLowerCase())
              )
            : endpoints

          // Group by HTTP method
          const byMethod = filtered.reduce((acc, e) => {
            (acc[e.method] ??= []).push(e)
            return acc
          }, {} as Record<string, typeof endpoints>)

          payload.rootNodes = Object.entries(byMethod).map(([method, eps]) => ({
            id: `method-${method}`,
            label: method,
            tags: [
              {
                label: String(eps.length),
                textColor: 0xffffff,
                backgroundColor: getMethodColor(method),
              },
            ],
            children: eps.map(e => ({
              id: e.operationId,
              label: e.path,
              tags: [
                {
                  label: e.hasCustomHandler ? 'Custom' : 'Generated',
                  textColor: 0x000000,
                  backgroundColor: e.hasCustomHandler ? 0x42b883 : 0xfca130,
                },
              ],
            })),
          }))
        }
      })

      // Handle inspector state requests
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const endpoint = registry.getByOperationId(payload.nodeId)
          if (endpoint) {
            payload.state = {
              'Endpoint Details': [
                { key: 'method', value: endpoint.method },
                { key: 'path', value: endpoint.path },
                { key: 'operationId', value: endpoint.operationId },
                { key: 'hasCustomHandler', value: endpoint.hasCustomHandler },
                { key: 'hasCustomSeed', value: endpoint.hasCustomSeed },
              ],
              'Available Status Codes': endpoint.availableStatusCodes.map(code => ({
                key: String(code),
                value: getStatusCodeDescription(code),
              })),
              'Simulation URLs': [
                {
                  key: 'Normal',
                  value: `${mockServerUrl}${endpoint.path}`,
                },
                {
                  key: 'Slow (2s delay)',
                  value: `${mockServerUrl}${endpoint.path}?simulateDelay=2000`,
                },
                {
                  key: 'Error (500)',
                  value: `${mockServerUrl}${endpoint.path}?simulateStatus=500`,
                },
                {
                  key: 'Timeout',
                  value: `${mockServerUrl}${endpoint.path}?simulateError=timeout`,
                },
              ],
            }
          }
        }
      })

      // === TIMELINE LAYER ===
      const TIMELINE_LAYER_ID = 'mock-server:requests'

      api.addTimelineLayer({
        id: TIMELINE_LAYER_ID,
        label: 'Mock Server Requests',
        color: 0x42b883,
      })

      // Log successful registration
      console.log(
        '[Mock Server] Vue DevTools integration registered. ' +
        'Open DevTools to access the Mock Server inspector.'
      )
    }
  )
}

/**
 * Exposes mock server state to globalThis for console debugging.
 * 
 * Following Pinia's pattern of exposing $pinia and $store globals,
 * we expose $mockServer and $mockRegistry for developer convenience.
 * 
 * @param registry - Mock endpoint registry
 * @param state - Mock server state
 * @param mockServerUrl - Base URL of the mock server
 */
function exposeGlobalMockServerState(
  registry: MockEndpointRegistry,
  state: MockServerState,
  mockServerUrl: string
): void {
  // Expose $mockServer global
  Object.defineProperty(globalThis, '$mockServer', {
    configurable: true,
    enumerable: true,
    get() {
      return {
        url: mockServerUrl,
        connected: state.connected,
        port: state.port,
        startedAt: state.startedAt,
        lastError: state.lastError,
        
        async refresh() {
          const response = await fetch(`${mockServerUrl}/__registry`)
          return response.json()
        },
        
        getEndpoint(operationId: string) {
          return registry.getByOperationId(operationId)
        },
        
        listEndpoints() {
          console.table(registry.getAll().map(e => ({
            method: e.method,
            path: e.path,
            operationId: e.operationId,
            handler: e.hasCustomHandler ? 'Custom' : 'Generated',
          })))
        },
      }
    },
  })

  // Expose $mockRegistry global
  Object.defineProperty(globalThis, '$mockRegistry', {
    configurable: true,
    enumerable: true,
    get() {
      return {
        endpoints: registry.getAll(),
        stats: registry.getStats(),
        byMethod: registry.groupByMethod(),
      }
    },
  })
}

/**
 * Returns color code for HTTP method badge
 */
function getMethodColor(method: string): number {
  const colors: Record<string, number> = {
    GET: 0x61affe,
    POST: 0x49cc90,
    PUT: 0xfca130,
    DELETE: 0xf93e3e,
    PATCH: 0x50e3c2,
    OPTIONS: 0x9012fe,
    HEAD: 0x9012fe,
  }
  return colors[method.toUpperCase()] ?? 0x999999
}

/**
 * Returns human-readable description for HTTP status code
 */
function getStatusCodeDescription(code: number): string {
  const descriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }
  return descriptions[code] ?? `HTTP ${code}`
}

// TypeScript declarations for global state
declare global {
  var $mockServer: {
    url: string
    connected: boolean
    port: number
    startedAt: Date | null
    lastError: Error | null
    refresh(): Promise<unknown>
    getEndpoint(operationId: string): unknown
    listEndpoints(): void
  } | undefined

  var $mockRegistry: {
    endpoints: unknown[]
    stats: { total: number; customHandlers: number; autoGenerated: number }
    byMethod: Record<string, unknown[]>
  } | undefined
}
```

**Custom Tab SFC Generator:**

```typescript
/**
 * Generates the Single File Component (SFC) for the Mock Server DevTools tab
 * 
 * The SFC is a self-contained Vue component that:
 * - Fetches endpoint registry from mock server
 * - Displays endpoints in a searchable/filterable table
 * - Provides UI for configuring simulation parameters
 * - Generates URLs with query parameters for testing
 * 
 * @param mockServerUrl - Base URL of the mock server
 * @returns Vue SFC as a string
 */
function generateMockServerSFC(mockServerUrl: string): string {
  return /* vue */ `
    <script setup lang="ts">
    import { ref, computed, onMounted } from 'vue'
    
    interface EndpointEntry {
      method: string
      path: string
      operationId: string
      hasCustomHandler: boolean
      availableStatusCodes: number[]
    }
    
    interface RegistryResponse {
      endpoints: EndpointEntry[]
      stats: {
        total: number
        customHandlers: number
        autoGenerated: number
      }
      timestamp: number
    }
    
    interface SimulationParams {
      simulateStatus: number | null
      simulateDelay: number
      simulateError: string | null
    }
    
    const mockServerUrl = '${mockServerUrl}'
    const endpoints = ref<EndpointEntry[]>([])
    const stats = ref({ total: 0, customHandlers: 0, autoGenerated: 0 })
    const loading = ref(true)
    const error = ref<string | null>(null)
    const connected = ref(false)
    
    // Filters
    const searchQuery = ref('')
    const methodFilter = ref('all')
    const handlerFilter = ref('all')
    
    // Selected endpoint for simulation
    const selectedEndpoint = ref<EndpointEntry | null>(null)
    const simulationParams = ref<SimulationParams>({
      simulateStatus: null,
      simulateDelay: 0,
      simulateError: null
    })
    
    // Fetch registry from mock server
    async function fetchRegistry() {
      try {
        loading.value = true
        error.value = null
        
        const response = await fetch(\`\${mockServerUrl}/__registry\`)
        if (!response.ok) {
          throw new Error(\`Failed to fetch registry: \${response.statusText}\`)
        }
        
        const data: RegistryResponse = await response.json()
        endpoints.value = data.endpoints
        stats.value = data.stats
        connected.value = true
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
        connected.value = false
      } finally {
        loading.value = false
      }
    }
    
    // Filtered endpoints based on search and filters
    const filteredEndpoints = computed(() => {
      return endpoints.value.filter(endpoint => {
        // Search filter
        if (searchQuery.value) {
          const query = searchQuery.value.toLowerCase()
          const matchesSearch = 
            endpoint.path.toLowerCase().includes(query) ||
            endpoint.operationId.toLowerCase().includes(query) ||
            endpoint.method.toLowerCase().includes(query)
          if (!matchesSearch) return false
        }
        
        // Method filter
        if (methodFilter.value !== 'all' && endpoint.method !== methodFilter.value) {
          return false
        }
        
        // Handler filter
        if (handlerFilter.value !== 'all') {
          const isCustom = endpoint.hasCustomHandler
          if (handlerFilter.value === 'custom' && !isCustom) return false
          if (handlerFilter.value === 'generated' && isCustom) return false
        }
        
        return true
      })
    })
    
    // Available HTTP methods
    const availableMethods = computed(() => {
      const methods = new Set(endpoints.value.map(e => e.method))
      return ['all', ...Array.from(methods).sort()]
    })
    
    // Generate simulated URL
    const simulatedUrl = computed(() => {
      if (!selectedEndpoint.value) return ''
      
      const baseUrl = mockServerUrl.replace(/\/$/, '')
      const url = new URL(\`\${baseUrl}\${selectedEndpoint.value.path}\`)
      
      if (simulationParams.value.simulateStatus) {
        url.searchParams.set('simulateStatus', String(simulationParams.value.simulateStatus))
      }
      if (simulationParams.value.simulateDelay > 0) {
        url.searchParams.set('simulateDelay', String(simulationParams.value.simulateDelay))
      }
      if (simulationParams.value.simulateError) {
        url.searchParams.set('simulateError', simulationParams.value.simulateError)
      }
      
      return url.toString()
    })
    
    function selectEndpoint(endpoint: EndpointEntry) {
      selectedEndpoint.value = endpoint
      // Reset to first available status code or 200
      simulationParams.value.simulateStatus = 
        endpoint.availableStatusCodes[0] || 200
      simulationParams.value.simulateDelay = 0
      simulationParams.value.simulateError = null
    }
    
    function copyUrl() {
      navigator.clipboard.writeText(simulatedUrl.value)
        .then(() => alert('URL copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err))
    }
    
    function openInBrowser() {
      window.open(simulatedUrl.value, '_blank')
    }
    
    function resetSimulation() {
      if (selectedEndpoint.value) {
        simulationParams.value.simulateStatus = 
          selectedEndpoint.value.availableStatusCodes[0] || 200
        simulationParams.value.simulateDelay = 0
        simulationParams.value.simulateError = null
      }
    }
    
    // Auto-refresh registry every 5 seconds
    let refreshInterval: number
    onMounted(() => {
      fetchRegistry()
      refreshInterval = setInterval(fetchRegistry, 5000)
    })
    
    onUnmounted(() => {
      if (refreshInterval) clearInterval(refreshInterval)
    })
    </script>
    
    <template>
      <div class="mock-server-devtools">
        <!-- Header -->
        <div class="header">
          <div class="connection-status" :class="{ connected, disconnected: !connected }">
            <span class="status-dot"></span>
            <span v-if="connected">Mock Server Connected</span>
            <span v-else>Mock Server Disconnected</span>
            <span class="url">{{ mockServerUrl }}</span>
          </div>
          <div class="stats" v-if="connected">
            <div class="stat">
              <span class="label">Total:</span>
              <span class="value">{{ stats.total }}</span>
            </div>
            <div class="stat">
              <span class="label">Custom:</span>
              <span class="value">{{ stats.customHandlers }}</span>
            </div>
            <div class="stat">
              <span class="label">Generated:</span>
              <span class="value">{{ stats.autoGenerated }}</span>
            </div>
          </div>
        </div>
        
        <!-- Error message -->
        <div v-if="error" class="error-message">
          {{ error }}
          <button @click="fetchRegistry">Retry</button>
        </div>
        
        <!-- Loading state -->
        <div v-if="loading && !endpoints.length" class="loading">
          Loading endpoints...
        </div>
        
        <!-- Main content -->
        <div v-else class="content">
          <!-- Filters -->
          <div class="filters">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search endpoints..." 
              class="search-input"
            />
            <select v-model="methodFilter" class="filter-select">
              <option v-for="method in availableMethods" :key="method" :value="method">
                {{ method.toUpperCase() }}
              </option>
            </select>
            <select v-model="handlerFilter" class="filter-select">
              <option value="all">All Handlers</option>
              <option value="custom">Custom Only</option>
              <option value="generated">Generated Only</option>
            </select>
          </div>
          
          <!-- Endpoints table -->
          <div class="endpoints-table">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Operation ID</th>
                  <th>Handler</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="endpoint in filteredEndpoints" 
                  :key="\`\${endpoint.method}-\${endpoint.path}\`"
                  :class="{ selected: selectedEndpoint === endpoint }"
                >
                  <td>
                    <span class="method-badge" :class="endpoint.method.toLowerCase()">
                      {{ endpoint.method }}
                    </span>
                  </td>
                  <td class="path">{{ endpoint.path }}</td>
                  <td class="operation-id">{{ endpoint.operationId }}</td>
                  <td>
                    <span v-if="endpoint.hasCustomHandler" class="handler-badge custom">
                      ✓ Custom
                    </span>
                    <span v-else class="handler-badge generated">
                      ⚡ Generated
                    </span>
                  </td>
                  <td>
                    <button @click="selectEndpoint(endpoint)" class="btn-simulate">
                      Simulate
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Simulation panel -->
          <div v-if="selectedEndpoint" class="simulation-panel">
            <h3>Simulate Response</h3>
            <div class="endpoint-info">
              <span class="method-badge" :class="selectedEndpoint.method.toLowerCase()">
                {{ selectedEndpoint.method }}
              </span>
              <span class="path">{{ selectedEndpoint.path }}</span>
              <span class="operation-id">[{{ selectedEndpoint.operationId }}]</span>
            </div>
            
            <div class="form-group">
              <label>Status Code:</label>
              <select v-model.number="simulationParams.simulateStatus">
                <option 
                  v-for="code in selectedEndpoint.availableStatusCodes" 
                  :key="code" 
                  :value="code"
                >
                  {{ code }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Delay (ms):</label>
              <input 
                v-model.number="simulationParams.simulateDelay" 
                type="number" 
                min="0" 
                step="100"
              />
            </div>
            
            <div class="form-group">
              <label>Error Type:</label>
              <select v-model="simulationParams.simulateError">
                <option :value="null">None</option>
                <option value="timeout">Timeout</option>
                <option value="network">Network Error</option>
                <option value="server">Server Error</option>
              </select>
            </div>
            
            <div class="generated-url">
              <label>Generated URL:</label>
              <input :value="simulatedUrl" readonly class="url-input" />
              <div class="url-actions">
                <button @click="copyUrl" class="btn-primary">Copy URL</button>
                <button @click="openInBrowser" class="btn-secondary">Test in Browser</button>
                <button @click="resetSimulation" class="btn-secondary">Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <style scoped>
    .mock-server-devtools {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: #1e1e1e;
      color: #cccccc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #333;
    }
    
    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #666;
    }
    
    .connection-status.connected .status-dot {
      background: #4caf50;
      box-shadow: 0 0 8px #4caf50;
    }
    
    .connection-status.disconnected .status-dot {
      background: #f44336;
    }
    
    .url {
      color: #888;
      font-size: 12px;
      margin-left: 4px;
    }
    
    .stats {
      display: flex;
      gap: 16px;
    }
    
    .stat {
      font-size: 13px;
    }
    
    .stat .label {
      color: #888;
      margin-right: 4px;
    }
    
    .stat .value {
      font-weight: 600;
      color: #42b883;
    }
    
    .error-message {
      background: #f443361a;
      border: 1px solid #f44336;
      color: #f44336;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #888;
    }
    
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .filters {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .search-input {
      flex: 1;
      padding: 8px 12px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #ccc;
      font-size: 14px;
    }
    
    .filter-select {
      padding: 8px 12px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #ccc;
      font-size: 14px;
    }
    
    .endpoints-table {
      flex: 1;
      overflow: auto;
      border: 1px solid #333;
      border-radius: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead {
      background: #252525;
      position: sticky;
      top: 0;
    }
    
    th {
      text-align: left;
      padding: 12px;
      font-weight: 600;
      border-bottom: 1px solid #333;
    }
    
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #2a2a2a;
    }
    
    tr:hover {
      background: #252525;
    }
    
    tr.selected {
      background: #2a4a2a;
    }
    
    .method-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .method-badge.get { background: #61affe; color: #000; }
    .method-badge.post { background: #49cc90; color: #000; }
    .method-badge.put { background: #fca130; color: #000; }
    .method-badge.delete { background: #f93e3e; color: #fff; }
    .method-badge.patch { background: #50e3c2; color: #000; }
    
    .path {
      font-family: 'Courier New', monospace;
      color: #9cdcfe;
    }
    
    .operation-id {
      color: #888;
      font-size: 12px;
    }
    
    .handler-badge {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
    }
    
    .handler-badge.custom {
      background: #42b88333;
      color: #42b883;
    }
    
    .handler-badge.generated {
      background: #fca13033;
      color: #fca130;
    }
    
    .btn-simulate {
      padding: 4px 12px;
      background: #42b883;
      color: #fff;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .btn-simulate:hover {
      background: #35a372;
    }
    
    .simulation-panel {
      margin-top: 16px;
      padding: 16px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 4px;
    }
    
    .simulation-panel h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
    }
    
    .endpoint-info {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #333;
    }
    
    .form-group {
      margin-bottom: 12px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      color: #888;
    }
    
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 8px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #ccc;
      font-size: 14px;
    }
    
    .generated-url {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #333;
    }
    
    .generated-url label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: #888;
    }
    
    .url-input {
      width: 100%;
      padding: 8px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #9cdcfe;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .url-actions {
      display: flex;
      gap: 8px;
    }
    
    .btn-primary,
    .btn-secondary {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    
    .btn-primary {
      background: #42b883;
      color: #fff;
    }
    
    .btn-primary:hover {
      background: #35a372;
    }
    
    .btn-secondary {
      background: #444;
      color: #ccc;
    }
    
    .btn-secondary:hover {
      background: #555;
    }
    </style>
  `
}

// Export for use in Vite plugin
export { registerMockServerDevTools }
```

**Usage in Vite Plugin:**

```typescript
// In Vue app main.ts (client-side registration)
import { createApp } from 'vue'
import { registerMockServerDevTools } from '@websublime/vite-plugin-open-api-server/devtools'
import App from './App.vue'

const app = createApp(App)

// Register Mock Server DevTools integration
// This only activates in development mode and when DevTools is installed
// In production or without DevTools, this is a no-op (safe to call unconditionally)
registerMockServerDevTools(app, {
  mockServerUrl: import.meta.env.VITE_MOCK_SERVER_URL || 'http://localhost:3456',
  registry: window.__MOCK_REGISTRY__, // Injected by Vite plugin
  state: window.__MOCK_STATE__,       // Injected by Vite plugin
})

app.mount('#app')
```

```typescript
// In Vite plugin (server-side injection)
// vite-plugin-open-api-server.ts
configureServer(server) {
  // ... existing mock server startup code ...
  
  // Inject mock server state into client for DevTools integration
  server.middlewares.use((req, res, next) => {
    if (req.url === '/__mock-inject.js') {
      res.setHeader('Content-Type', 'application/javascript')
      res.end(`
        window.__MOCK_REGISTRY__ = ${JSON.stringify(mockEndpointRegistry.getAll())};
        window.__MOCK_STATE__ = {
          connected: true,
          port: ${options.port},
          startedAt: new Date('${new Date().toISOString()}'),
          lastError: null,
        };
      `)
      return
    }
    next()
  })
}

// In transformIndexHtml hook (inject script into HTML)
transformIndexHtml(html) {
  if (options.enabled) {
    return html.replace(
      '</head>',
      '<script src="/__mock-inject.js"></script></head>'
    )
  }
  return html
}
```

**Alternative: Auto-registration via Vite Plugin (Recommended):**

```typescript
// The plugin can auto-register DevTools by injecting a module
// vite-plugin-open-api-server.ts
export function mockServerPlugin(options: MockServerPluginOptions): Plugin {
  return {
    name: 'vite-plugin-open-api-server',
    
    // Inject virtual module for DevTools registration
    resolveId(id) {
      if (id === 'virtual:mock-server-devtools') {
        return '\0virtual:mock-server-devtools'
      }
    },
    
    load(id) {
      if (id === '\0virtual:mock-server-devtools') {
        return `
          import { registerMockServerDevTools } from '@websublime/vite-plugin-open-api-server/devtools'
          
          // Auto-register when Vue app is available
          if (typeof window !== 'undefined') {
            const originalMount = window.__VUE_APP__?.mount
            if (originalMount) {
              window.__VUE_APP__.mount = function(...args) {
                registerMockServerDevTools(window.__VUE_APP__, {
                  mockServerUrl: '${`http://localhost:${options.port}`}',
                  registry: window.__MOCK_REGISTRY__,
                  state: window.__MOCK_STATE__,
                })
                return originalMount.apply(this, args)
              }
            }
          }
          
          export {}
        `
      }
    },
  }
}
```

**Mock Server Registry Endpoint:**

The mock server must expose a `/__registry` endpoint that returns:

```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/v1/vehicles",
      "operationId": "fetch_vehicles",
      "hasCustomHandler": true,
      "availableStatusCodes": [200, 400, 404, 429, 500, 503]
    },
    {
      "method": "POST",
      "path": "/api/v1/vehicles",
      "operationId": "create_vehicle",
      "hasCustomHandler": false,
      "availableStatusCodes": [201, 400, 409, 422, 500]
    }
  ],
  "stats": {
    "total": 12,
    "customHandlers": 5,
    "autoGenerated": 7
  },
  "timestamp": 1704117600000
}
```

**Simulation Capabilities:**

The DevTools tab provides comprehensive controls for testing edge cases, errors, and network conditions:

1. **HTTP Status Codes:** All status codes from OpenAPI spec (2xx, 4xx, 5xx)
2. **Network Conditions:** Latency presets (Fast, Slow, 3G, 4G), custom delays
3. **Error Scenarios:** Timeout, network failure, server error, rate limiting, maintenance
4. **Edge Cases:** Empty responses, malformed JSON, partial content, large payloads
5. **Connection Quality:** Stable, intermittent, connection drop
6. **Advanced:** Custom headers, failure probability, timeout duration
7. **Presets:** Save and load common testing scenarios

**Query Parameters Supported:**

| Parameter | Values | Example |
|-----------|--------|---------|
| `simulateStatus` | Any HTTP code | `?simulateStatus=429` |
| `simulateDelay` | Milliseconds | `?simulateDelay=2000` |
| `simulateError` | `timeout`, `network`, `server`, `ratelimit`, `maintenance` | `?simulateError=timeout` |
| `simulateConnection` | `stable`, `intermittent`, `drop` | `?simulateConnection=intermittent` |
| `simulateResponse` | `normal`, `empty`, `malformed`, `partial`, `large` | `?simulateResponse=malformed` |
| `simulateTimeout` | Seconds | `?simulateTimeout=10` |
| `simulateProbability` | 0-100 (success %) | `?simulateProbability=50` |
| `simulateHeaders` | JSON object | `?simulateHeaders={"X-Test":"value"}` |

**Benefits:**
- **Comprehensive Testing:** Simulate all edge cases without backend changes
- **Zero Infrastructure:** No additional UI to maintain
- **Seamless Workflow:** Direct access from Vue DevTools
- **Visual Controls:** Intuitive UI for complex simulation scenarios
- **Real-time Updates:** Auto-refresh on hot reload changes
- **Copy-Paste Ready:** Generated URLs for immediate use
- **Preset Management:** Save and reuse common test scenarios
- **Error Validation:** Test application resilience under various failures

#### 7.4.3 @scalar/openapi-parser Integration

**Purpose:** Parse, validate, and manipulate OpenAPI documents before passing to mock server.

**Core API Usage:**

```typescript
import { validate, dereference, sanitize } from '@scalar/openapi-parser';
import fs from 'node:fs';

/**
 * Load and validate OpenAPI document with comprehensive error handling
 */
async function loadOpenApiDocument(filePath: string) {
  // Read file content
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Step 1: Validate document structure
  const validationResult = await validate(content);
  
  if (!validationResult.valid) {
    console.error('OpenAPI validation failed:');
    validationResult.errors.forEach(error => {
      console.error(`  - ${error.message} at ${error.path}`);
    });
    throw new Error('Invalid OpenAPI specification');
  }
  
  // Step 2: Dereference $ref to resolve all references
  const { schema, errors: derefErrors } = await dereference(content);
  
  if (derefErrors.length > 0) {
    console.warn('Reference resolution warnings:');
    derefErrors.forEach(error => console.warn(`  - ${error}`));
  }
  
  // Step 3: Sanitize document (normalize security schemes, collect tags, etc.)
  const sanitized = sanitize(schema);
  
  return {
    document: sanitized,
    stats: {
      title: sanitized.info?.title || 'Unknown',
      version: sanitized.info?.version || '0.0.0',
      endpointCount: countOperations(sanitized),
      schemaCount: Object.keys(sanitized.components?.schemas || {}).length,
    },
  };
}
```

**API Methods Used:**

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `validate(spec)` | String (YAML/JSON) | `{valid: boolean, errors: array}` | Validate OpenAPI structure |
| `dereference(spec)` | String or Object | `{schema: object, errors: array}` | Resolve all $ref references |
| `sanitize(spec)` | Object | Object | Normalize document (fix missing required fields) |
| `upgrade(spec)` | Swagger 2.0 Object | OpenAPI 3.1 Object | Upgrade old specs (future feature) |

**Error Handling Strategy:**

```typescript
// Validation errors → CRITICAL (block startup)
if (!validationResult.valid) {
  throw new Error('OpenAPI validation failed - cannot start mock server');
}

// Dereference errors → WARNING (may work with partial resolution)
if (derefErrors.length > 0) {
  console.warn('Some references could not be resolved - mock generation may be incomplete');
}

// Sanitization never fails → automatic fixes applied
const sanitized = sanitize(schema); // Always succeeds
```

**Support Matrix:**

| Format | Extension | Supported | Parser Behavior |
|--------|-----------|-----------|----------------|
| YAML | `.yaml`, `.yml` | ✅ Yes | Auto-detected |
| JSON | `.json` | ✅ Yes | Auto-detected |
| OpenAPI 3.2 | N/A | ✅ Yes | Full support |
| OpenAPI 3.1 | N/A | ✅ Yes | Full support |
| OpenAPI 3.0 | N/A | ✅ Yes | Full support |
| Swagger 2.0 | N/A | ✅ Yes | Use `upgrade()` first |

#### 7.4.3 @scalar/mock-server Integration

**Purpose:** Generate mock HTTP server with automatic responses from OpenAPI document.

**Core API Usage:**

```typescript
import { serve } from '@hono/node-server';
import { createMockServer } from '@scalar/mock-server';

/**
 * Create and start mock server with enhanced OpenAPI document
 */
async function startMockServer(enhancedDocument: OpenAPIDocument, port: number) {
  // Create Hono app with mock routes
  const app = await createMockServer({
    // Enhanced document with x-handler and x-seed injected
    document: enhancedDocument,
    
    // Optional: Custom request logging
    onRequest({ context, operation }) {
      const { req } = context;
      const operationId = operation?.operationId || 'unknown';
      console.log(`[Mock] → ${req.method.padEnd(6)} ${req.path} [${operationId}]`);
    },
  });
  
  // Start HTTP server
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`Mock server listening on http://localhost:${info.port}`);
      
      // Send IPC message to parent process
      if (process.send) {
        process.send({ type: 'READY', port: info.port });
      }
    }
  );
}
```

**createMockServer Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `document` | `OpenAPIDocument` | ✅ Yes | OpenAPI spec (with x-handler/x-seed extensions) |
| `onRequest` | `Function` | ❌ No | Callback for each request (logging, metrics) |

**x-handler Extension (Custom Request Handling):**

```typescript
// In OpenAPI document (injected by our plugin):
{
  "paths": {
    "/vehicles": {
      "get": {
        "operationId": "fetch_vehicles",
        "x-handler": `
          // JavaScript code executed by Scalar Mock Server
          const items = store.list('Vehicle');
          
          // Apply filters from query params
          const filtered = req.query.status 
            ? items.filter(v => v.status === req.query.status)
            : items;
          
          return {
            data: filtered,
            total: filtered.length
          };
        `
      }
    }
  }
}
```

**x-handler Runtime Context (Provided by Scalar):**

| Variable | Type | Description |
|----------|------|-------------|
| `store` | `MockStore` | In-memory data store with CRUD operations |
| `faker` | `Faker` | Faker.js instance for data generation |
| `req.body` | `any` | Parsed request body (JSON) |
| `req.params` | `Record<string, string>` | Path parameters |
| `req.query` | `Record<string, string>` | Query string parameters |
| `req.headers` | `Record<string, string>` | Request headers |
| `res` | `object` | Response helper (set status: `res.status = 404`) |

**Store API (Available in x-handler):**

```typescript
interface MockStore {
  // List all items of a schema
  list<T>(schema: string): T[];
  
  // Get single item by ID
  get<T>(schema: string, id: string): T | null;
  
  // Create new item (auto-generates ID if not provided)
  create<T>(schema: string, data: Partial<T>): T;
  
  // Update existing item
  update<T>(schema: string, id: string, data: Partial<T>): T | null;
  
  // Delete item
  delete(schema: string, id: string): boolean;
  
  // Clear all items of a schema (or all schemas)
  clear(schema?: string): void;
}
```

**Automatic Status Codes (by Scalar Mock Server):**

| Store Operation | Success Status | Failure Status |
|-----------------|----------------|----------------|
| `store.list()` | 200 OK | N/A (always succeeds) |
| `store.get(id)` | 200 OK | 404 Not Found (if null) |
| `store.create()` | 201 Created | N/A (always succeeds) |
| `store.update(id)` | 200 OK | 404 Not Found (if null) |
| `store.delete(id)` | 204 No Content | 404 Not Found (if not found) |

**x-seed Extension (Initial Data Seeding):**

```typescript
// In OpenAPI document (injected by our plugin):
{
  "components": {
    "schemas": {
      "Vehicle": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "make": { "type": "string" },
          "model": { "type": "string" }
        },
        "x-seed": `
          // Seed 10 vehicles on startup
          seed.count(10, () => ({
            id: faker.string.uuid(),
            make: faker.vehicle.manufacturer(),
            model: faker.vehicle.model(),
            year: faker.number.int({ min: 2015, max: 2024 }),
            status: faker.helpers.arrayElement(['active', 'inactive'])
          }))
        `
      }
    }
  }
}
```

**x-seed Runtime Context (Provided by Scalar):**

| Variable | Type | Description |
|----------|------|-------------|
| `seed` | `SeedHelper` | Helper for seeding data |
| `seed.count(n, fn)` | `Function` | Generate N items using factory function |
| `seed(array)` | `Function` | Seed from static array |
| `seed(fn)` | `Function` | Seed from factory function (single item) |
| `faker` | `Faker` | Faker.js instance |
| `store` | `MockStore` | Direct store access (advanced) |
| `schema` | `string` | Schema name being seeded |

**Security Scheme Handling:**

The mock server validates security schemes defined in OpenAPI:

```typescript
// OpenAPI document with security
{
  "paths": {
    "/protected": {
      "get": {
        "security": [{ "bearerAuth": [] }],
        // ...
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}

// Mock server behavior:
// - Without Authorization header → 401 Unauthorized
// - With any Authorization: Bearer <token> → 200 OK (mock accepts any token)
```

**Supported Security Schemes:**

| Type | Location | Mock Behavior |
|------|----------|---------------|
| `http` (bearer) | `Authorization` header | Validates presence, accepts any token |
| `apiKey` | Header/Query/Cookie | Validates presence, accepts any value |
| `oauth2` | `Authorization` header | Validates presence, accepts any token |
| `openIdConnect` | `Authorization` header | Validates presence, accepts any token |

**Limitations & Considerations:**

1. **No Real Authentication:** Mock server validates presence of credentials but doesn't verify validity
2. **No Token Expiry:** JWT tokens are not decoded or validated
3. **No Role-Based Access:** All valid credentials have full access
4. **Development Only:** Security validation is intentionally loose for dev convenience

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

The plugin uses Node.js IPC (Inter-Process Communication) for bidirectional communication between the Vite plugin (parent process) and the mock server runner (child process).

**Communication Pattern:**
- **Parent → Child:** Environment variables at spawn time (no runtime IPC messages)
- **Child → Parent:** IPC messages via `process.send()` for lifecycle events, logs, and errors

#### Message Types (Child → Parent)

```typescript
/**
 * Union type of all IPC messages sent from mock server child process to Vite plugin parent process
 */
type MockServerMessage = 
  // Lifecycle Messages
  | InitializingMessage
  | ReadyMessage
  | ShutdownMessage
  
  // Error Messages
  | ErrorMessage
  | WarningMessage
  
  // Logging Messages
  | LogMessage
  | RequestLogMessage
  
  // Health Messages
  | HeartbeatMessage;

/**
 * Sent when mock server starts initialization phase
 * Allows parent to show "Starting mock server..." status
 */
interface InitializingMessage {
  type: 'INITIALIZING';
  phase: 'parsing' | 'loading_handlers' | 'loading_seeds' | 'enhancing' | 'creating_server';
  timestamp: string; // ISO 8601
}

/**
 * Sent when mock server is fully ready and listening
 * Signals to parent that proxy can start forwarding requests
 */
interface ReadyMessage {
  type: 'READY';
  port: number;
  registry: RegistryStats;
  uptime: number; // milliseconds from spawn to ready
  timestamp: string; // ISO 8601
}

/**
 * Sent when mock server is shutting down
 */
interface ShutdownMessage {
  type: 'SHUTDOWN';
  reason: 'graceful' | 'error' | 'forced' | 'parent_exit';
  timestamp: string; // ISO 8601
}

/**
 * Sent when a fatal error occurs in child process
 * Parent should display error and potentially restart child
 */
interface ErrorMessage {
  type: 'ERROR';
  error: ErrorPayload;
  timestamp: string; // ISO 8601
}

/**
 * Sent for non-fatal issues that don't block startup
 * e.g., handler file not found, seed file syntax error
 */
interface WarningMessage {
  type: 'WARNING';
  warning: string;
  context?: {
    file?: string;
    operation?: string;
    suggestion?: string;
  };
  timestamp: string; // ISO 8601
}

/**
 * General logging message for visibility
 * Forwarded to Vite's logger with appropriate level
 */
interface LogMessage {
  type: 'LOG';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string; // ISO 8601
}

/**
 * Sent for each HTTP request handled by mock server
 * Used for request/response logging in Vite console
 */
interface RequestLogMessage {
  type: 'REQUEST';
  id: string; // Unique request ID
  method: string; // GET, POST, etc.
  path: string; // /api/v1/vehicles
  operationId?: string; // fetch_vehicles
  status?: number; // 200, 404, etc. (only in REQUEST_END)
  duration?: number; // milliseconds (only in REQUEST_END)
  phase: 'START' | 'END';
  timestamp: string; // ISO 8601
}

/**
 * Periodic health check message (optional, future feature)
 * Allows parent to detect hung child process
 */
interface HeartbeatMessage {
  type: 'HEARTBEAT';
  memoryUsage: {
    heapUsed: number; // bytes
    heapTotal: number; // bytes
    external: number; // bytes
  };
  requestCount: number; // Total requests handled since start
  timestamp: string; // ISO 8601
}

/**
 * Detailed error information
 */
interface ErrorPayload {
  code: string; // ERROR_OPENAPI_PARSE, ERROR_HANDLER_LOAD, etc.
  message: string; // Human-readable error message
  stack?: string; // Stack trace (if available)
  context?: {
    file?: string; // File path where error occurred
    line?: number; // Line number (for parse errors)
    operation?: string; // Operation being performed
  };
}

/**
 * Registry statistics about mocked endpoints
 */
interface RegistryStats {
  totalEndpoints: number; // Total operations in OpenAPI spec
  withCustomHandler: number; // Operations with x-handler
  withCustomSeed: number; // Schemas with x-seed
  autoGenerated: number; // Operations using auto-generated responses
  securitySchemes: number; // Number of security schemes
}
```

#### Message Flow Examples

**Successful Startup Flow:**

```typescript
// Child → Parent timeline

// 1. Starting to parse OpenAPI
{ 
  type: 'INITIALIZING', 
  phase: 'parsing',
  timestamp: '2026-01-07T19:30:00.000Z'
}

// 2. Loading handler files
{ 
  type: 'INITIALIZING', 
  phase: 'loading_handlers',
  timestamp: '2026-01-07T19:30:00.125Z'
}

// 3. Loading seed files
{ 
  type: 'INITIALIZING', 
  phase: 'loading_seeds',
  timestamp: '2026-01-07T19:30:00.250Z'
}

// 4. Enhancing document with x-handler/x-seed
{ 
  type: 'INITIALIZING', 
  phase: 'enhancing',
  timestamp: '2026-01-07T19:30:00.375Z'
}

// 5. Creating mock server
{ 
  type: 'INITIALIZING', 
  phase: 'creating_server',
  timestamp: '2026-01-07T19:30:00.500Z'
}

// 6. Server ready
{ 
  type: 'READY', 
  port: 3456,
  registry: {
    totalEndpoints: 45,
    withCustomHandler: 8,
    withCustomSeed: 5,
    autoGenerated: 37,
    securitySchemes: 2
  },
  uptime: 625,
  timestamp: '2026-01-07T19:30:00.625Z'
}
```

**Error During Startup:**

```typescript
// Child → Parent

// 1. Start parsing
{ type: 'INITIALIZING', phase: 'parsing', timestamp: '...' }

// 2. Parse error
{
  type: 'ERROR',
  error: {
    code: 'ERROR_OPENAPI_PARSE',
    message: 'Invalid YAML syntax: unexpected end of file',
    stack: 'YAMLException: unexpected end of file\n  at parseYaml...',
    context: {
      file: '/path/to/openapi.yaml',
      line: 42,
      operation: 'parsing OpenAPI document'
    }
  },
  timestamp: '2026-01-07T19:30:00.100Z'
}

// 3. Shutdown due to error
{
  type: 'SHUTDOWN',
  reason: 'error',
  timestamp: '2026-01-07T19:30:00.101Z'
}

// Process exits with code 1
```

**Request Logging Flow:**

```typescript
// Child → Parent for each request

// Request starts
{
  type: 'REQUEST',
  id: 'req_abc123',
  method: 'GET',
  path: '/api/v1/vehicles',
  operationId: 'fetch_vehicles',
  phase: 'START',
  timestamp: '2026-01-07T19:30:10.000Z'
}

// Request completes
{
  type: 'REQUEST',
  id: 'req_abc123',
  method: 'GET',
  path: '/api/v1/vehicles',
  operationId: 'fetch_vehicles',
  status: 200,
  duration: 45, // 45ms
  phase: 'END',
  timestamp: '2026-01-07T19:30:10.045Z'
}
```

#### Parent Process Handler

```typescript
// In vite-plugin-open-api-server.ts
import type { ChildProcess } from 'node:child_process';

function setupIpcHandler(childProcess: ChildProcess, server: ViteDevServer) {
  childProcess.on('message', (msg: MockServerMessage) => {
    switch (msg.type) {
      case 'INITIALIZING':
        server.config.logger.info(
          `[Mock] Initializing: ${msg.phase.replace('_', ' ')}...`
        );
        break;
        
      case 'READY':
        server.config.logger.info(
          `[Mock] ✓ Server ready on port ${msg.port} (${msg.uptime}ms)`
        );
        server.config.logger.info(
          `[Mock]   ${msg.registry.totalEndpoints} endpoints ` +
          `(${msg.registry.withCustomHandler} custom handlers, ` +
          `${msg.registry.autoGenerated} auto-generated)`
        );
        break;
        
      case 'ERROR':
        server.config.logger.error(
          `[Mock] ✖ Error: ${msg.error.message}`
        );
        if (msg.error.context?.file) {
          server.config.logger.error(
            `[Mock]   File: ${msg.error.context.file}` +
            (msg.error.context.line ? `:${msg.error.context.line}` : '')
          );
        }
        if (msg.error.stack) {
          server.config.logger.error(`[Mock]   ${msg.error.stack}`);
        }
        break;
        
      case 'WARNING':
        server.config.logger.warn(`[Mock] ⚠ ${msg.warning}`);
        if (msg.context?.suggestion) {
          server.config.logger.warn(`[Mock]   Suggestion: ${msg.context.suggestion}`);
        }
        break;
        
      case 'LOG':
        server.config.logger[msg.level](`[Mock] ${msg.message}`);
        break;
        
      case 'REQUEST':
        if (msg.phase === 'END') {
          const statusIcon = msg.status! < 400 ? '✔' : '✖';
          server.config.logger.info(
            `[Mock] ${statusIcon} ${msg.status} ${msg.method.padEnd(6)} ${msg.path} ` +
            `${msg.operationId ? `[${msg.operationId}] ` : ''}(${msg.duration}ms)`
          );
        }
        break;
        
      case 'SHUTDOWN':
        server.config.logger.info(`[Mock] Shutting down (${msg.reason})...`);
        break;
        
      case 'HEARTBEAT':
        // Optional: log memory usage periodically
        if (msg.memoryUsage.heapUsed > 100 * 1024 * 1024) { // > 100MB
          server.config.logger.warn(
            `[Mock] High memory usage: ${(msg.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`
          );
        }
        break;
        
      default:
        server.config.logger.warn(`[Mock] Unknown message type: ${(msg as any).type}`);
    }
  });
  
  // Handle child process exit
  childProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      server.config.logger.error(`[Mock] Process exited with code ${code}`);
    } else if (signal) {
      server.config.logger.info(`[Mock] Process killed with signal ${signal}`);
    }
  });
}
```

#### Error Codes Reference

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `ERROR_OPENAPI_PARSE` | OpenAPI file parsing failed | Fix YAML/JSON syntax |
| `ERROR_OPENAPI_VALIDATION` | OpenAPI validation failed | Fix spec structure |
| `ERROR_HANDLER_LOAD` | Handler file loading failed | Check file path and syntax |
| `ERROR_SEED_LOAD` | Seed file loading failed | Check file path and syntax |
| `ERROR_ENHANCEMENT` | Document enhancement failed | Check handler/seed code |
| `ERROR_SERVER_CREATE` | Mock server creation failed | Check @scalar/mock-server compatibility |
| `ERROR_PORT_IN_USE` | Port already in use | Change port or kill existing process |
| `ERROR_UNKNOWN` | Unexpected error | Check stack trace |

#### Environment Variables (Parent → Child)

While not IPC messages, these are passed at spawn time:

```typescript
{
  MOCK_SERVER_PORT: '3456',
  MOCK_SERVER_OPENAPI_PATH: '/absolute/path/to/openapi.yaml',
  MOCK_SERVER_SEEDS_DIR: '/absolute/path/to/seeds',
  MOCK_SERVER_HANDLERS_DIR: '/absolute/path/to/handlers',
  MOCK_SERVER_VERBOSE: 'true',
  NODE_ENV: 'development'
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

### 11.4 Error Handling Strategy

This section defines a comprehensive approach to error handling across the plugin lifecycle, ensuring developers receive clear, actionable feedback when issues occur.

#### 11.4.1 Error Taxonomy

Errors are classified into four categories based on severity and impact:

| Category | Severity | Impact | Recovery |
|----------|----------|--------|----------|
| **Fatal** | 🔴 Critical | Blocks startup | Manual fix required |
| **Recoverable** | 🟠 High | Degrades functionality | Auto-retry or fallback |
| **Warning** | 🟡 Medium | Partial functionality | Continue with warnings |
| **Info** | 🔵 Low | No impact | Informational only |

#### 11.4.2 Error Codes & Recovery Strategies

**Fatal Errors (Block Startup):**

| Error Code | Cause | User-Facing Message | Recovery Action |
|------------|-------|---------------------|-----------------|
| `ERROR_OPENAPI_NOT_FOUND` | OpenAPI file doesn't exist | "OpenAPI file not found: {path}" | Check `openApiPath` in vite.config |
| `ERROR_OPENAPI_PARSE` | Invalid YAML/JSON syntax | "Failed to parse OpenAPI file: {error} at line {line}" | Fix YAML/JSON syntax |
| `ERROR_OPENAPI_VALIDATION` | Invalid OpenAPI structure | "OpenAPI validation failed: {errors}" | Fix spec according to OpenAPI 3.x |
| `ERROR_PORT_IN_USE` | Port already occupied | "Port {port} is already in use. Try a different port." | Change port or kill existing process |
| `ERROR_SERVER_CREATE` | Scalar mock server creation failed | "Failed to create mock server: {error}" | Check @scalar/mock-server compatibility |

**Example - Fatal Error Display:**
```
✖ [Mock] ERROR_OPENAPI_PARSE: Failed to parse OpenAPI file
  File: src/apis/bff/openapi.yaml:42
  Error: unexpected end of file
  
  → Fix: Check YAML syntax at line 42
  → Vite dev server will continue, but mock endpoints will not be available
```

**Recoverable Errors (Degraded Functionality):**

| Error Code | Cause | User-Facing Message | Recovery Action |
|------------|-------|---------------------|-----------------|
| `ERROR_HANDLER_FILE_NOT_FOUND` | Handler file missing | "Handler file not found: {file}" | Continue with auto-generated response |
| `ERROR_HANDLER_LOAD` | Handler file syntax error | "Failed to load handler {file}: {error}" | Skip handler, use auto-generated |
| `ERROR_SEED_FILE_NOT_FOUND` | Seed file missing | "Seed file not found: {file}" | Continue with auto-generated data |
| `ERROR_SEED_LOAD` | Seed file syntax error | "Failed to load seed {file}: {error}" | Skip seed, use Faker.js |
| `ERROR_HANDLER_EXPORT_INVALID` | Handler export structure invalid | "Handler {operationId} has invalid export format" | Skip handler, use auto-generated |

**Example - Recoverable Error Display:**
```
⚠ [Mock] ERROR_HANDLER_LOAD: Failed to load handler file
  File: src/apis/bff/mock/handlers/vehicles.handler.mjs
  Error: SyntaxError: Unexpected token '}'
  
  → Impact: fetch_vehicles endpoint will use auto-generated response
  → Fix: Check handler file syntax
  → Server will continue with 44/45 endpoints working
```

**Warnings (Partial Functionality):**

| Warning Code | Cause | User-Facing Message | Impact |
|--------------|-------|---------------------|--------|
| `WARN_HANDLER_NOT_MATCHED` | Handler operationId not found in spec | "Handler '{operationId}' not matched to any endpoint" | Unused handler code |
| `WARN_SEED_NOT_MATCHED` | Seed schema not found in spec | "Seed '{schemaName}' not matched to any schema" | Unused seed code |
| `WARN_DEREFERENCE_PARTIAL` | Some $ref couldn't be resolved | "Some references could not be resolved" | May affect specific endpoints |
| `WARN_SECURITY_SCHEME_MISSING` | Security scheme referenced but not defined | "Security scheme '{name}' not defined" | Auto-generated by sanitize() |

**Example - Warning Display:**
```
⚠ [Mock] WARN_HANDLER_NOT_MATCHED: Handler 'old_endpoint' not matched to any endpoint
  File: src/apis/bff/mock/handlers/old.handler.mjs
  
  → Suggestion: Remove unused handler or check operationId spelling
  → This will not affect server functionality
```

#### 11.4.3 Error Message Format

All error messages follow a consistent structure for clarity:

```typescript
interface ErrorDisplay {
  // Error header with severity icon
  severity: '✖' | '⚠' | 'ℹ';
  prefix: '[Mock]';
  errorCode: string;
  message: string;
  
  // Context information
  file?: string;
  line?: number;
  operation?: string;
  
  // Recovery guidance
  impact?: string;
  suggestion?: string;
  docsLink?: string;
}
```

**Template:**
```
{severity} [Mock] {errorCode}: {message}
  File: {file}:{line}
  Error: {detailedError}
  
  → Impact: {impact}
  → Fix: {suggestion}
  → Docs: {docsLink}
```

#### 11.4.4 Logging Patterns

**Startup Logging:**
```
[Mock] Starting mock server...
[Mock] ✓ OpenAPI parsed (42 endpoints, 15 schemas)
[Mock] ✓ Loaded 8 custom handlers
[Mock] ✓ Loaded 5 custom seeds
[Mock] ✓ Document enhanced with x-handler/x-seed
[Mock] ✓ Mock server ready on port 3456 (1.2s)
[Mock]   45 endpoints (8 custom handlers, 37 auto-generated)
```

**Request Logging (Verbose Mode):**
```
[Mock] → GET     /api/v1/vehicles [fetch_vehicles]
[Mock] ✔ 200 GET /api/v1/vehicles [fetch_vehicles] (45ms)

[Mock] → POST    /api/v1/orders [create_order]
[Mock] ✔ 201 POST /api/v1/orders [create_order] (12ms)

[Mock] → GET     /api/v1/orders/invalid-id [get_order]
[Mock] ✖ 404 GET /api/v1/orders/invalid-id [get_order] (5ms)
```

**Error Logging:**
```
[Mock] ✖ ERROR_OPENAPI_VALIDATION: OpenAPI validation failed
  - paths./api/v1/users.get: responses is required
  - paths./api/v1/orders.post: requestBody.content is required
  
  → Fix: Add missing required fields to OpenAPI specification
  → Docs: https://spec.openapis.org/oas/v3.1.0
```

#### 11.4.5 User-Facing Error Messages

**Principle:** Error messages should be:
1. **Clear**: Describe what went wrong in plain language
2. **Actionable**: Provide specific steps to fix the issue
3. **Contextual**: Include file paths, line numbers, and operation names
4. **Progressive**: Show impact and suggest next steps

**Bad Example:**
```
Error: undefined is not a function
```

**Good Example:**
```
✖ [Mock] ERROR_HANDLER_LOAD: Failed to load handler file
  File: src/apis/bff/mock/handlers/vehicles.handler.mjs:15
  Error: ReferenceError: faker is not defined
  
  → Impact: fetch_vehicles endpoint will use auto-generated response
  → Fix: Import faker at top of file: import { faker } from '@faker-js/faker';
  → Docs: https://fakerjs.dev/api/
```

#### 11.4.6 Error Recovery Strategies

**Strategy 1: Graceful Degradation**
- When handler fails → Fall back to auto-generated response
- When seed fails → Fall back to Faker.js defaults
- When single endpoint fails → Continue with other endpoints

**Strategy 2: Auto-Retry (Future)**
- Port in use → Retry with port+1
- Transient network errors → Retry with exponential backoff (3 attempts max)

**Strategy 3: Circuit Breaker (Future)**
- If child process crashes 3+ times in 30s → Stop auto-restart
- Display error and require manual intervention

**Strategy 4: Fail-Fast**
- Fatal errors (OpenAPI parse, validation) → Immediate failure
- No point continuing if core document is invalid

#### 11.4.7 Error Handling in Code

**Child Process (mock-server-runner.mjs):**
```typescript
try {
  // Parse OpenAPI
  const { valid, errors } = await validate(content);
  
  if (!valid) {
    process.send({
      type: 'ERROR',
      error: {
        code: 'ERROR_OPENAPI_VALIDATION',
        message: 'OpenAPI validation failed',
        context: { errors: errors.map(e => e.message) }
      },
      timestamp: new Date().toISOString()
    });
    process.exit(1); // Fatal error
  }
  
  // Continue with startup...
  
} catch (error) {
  process.send({
    type: 'ERROR',
    error: {
      code: 'ERROR_UNKNOWN',
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString()
  });
  process.exit(1);
}
```

**Parent Process (vite-plugin-open-api-server.ts):**
```typescript
childProcess.on('message', (msg: MockServerMessage) => {
  if (msg.type === 'ERROR') {
    const { error } = msg;
    
    // Display formatted error
    server.config.logger.error(
      `\n✖ [Mock] ${error.code}: ${error.message}`
    );
    
    if (error.context?.file) {
      server.config.logger.error(
        `  File: ${error.context.file}` +
        (error.context.line ? `:${error.context.line}` : '')
      );
    }
    
    if (error.context?.errors) {
      error.context.errors.forEach(e => {
        server.config.logger.error(`  - ${e}`);
      });
    }
    
    // Show recovery guidance
    const recovery = getRecoveryGuidance(error.code);
    if (recovery) {
      server.config.logger.error(`\n  → Fix: ${recovery.fix}`);
      if (recovery.docs) {
        server.config.logger.error(`  → Docs: ${recovery.docs}`);
      }
    }
  }
});

function getRecoveryGuidance(errorCode: string) {
  const guidance = {
    ERROR_OPENAPI_PARSE: {
      fix: 'Check YAML/JSON syntax in your OpenAPI file',
      docs: 'https://spec.openapis.org/oas/v3.1.0'
    },
    ERROR_PORT_IN_USE: {
      fix: 'Change port in vite.config or kill existing process',
      docs: 'https://github.com/webssublime/vite-plugin-open-api-server#configuration'
    },
    // ... more mappings
  };
  
  return guidance[errorCode];
}
```

#### 11.4.8 Testing Error Scenarios

**Manual Testing Checklist:**
- [ ] Invalid OpenAPI YAML syntax → Shows parse error with line number
- [ ] Missing OpenAPI file → Shows file not found with path
- [ ] Port already in use → Shows port conflict error
- [ ] Handler file with syntax error → Shows warning, continues with auto-generated
- [ ] Seed file with syntax error → Shows warning, continues with Faker.js
- [ ] Handler with non-existent operationId → Shows warning about unused handler
- [ ] Invalid OpenAPI structure → Shows validation errors with field paths

**Automated Error Testing (Future):**
```typescript
describe('Error Handling', () => {
  it('should handle missing OpenAPI file', async () => {
    const plugin = mockServerPlugin({ openApiPath: 'nonexistent.yaml' });
    await expect(startPlugin(plugin)).rejects.toThrow('ERROR_OPENAPI_NOT_FOUND');
  });
  
  it('should continue with invalid handler file', async () => {
    // Mock handler file with syntax error
    const result = await startPlugin(pluginWithBadHandler);
    expect(result.warnings).toContain('ERROR_HANDLER_LOAD');
    expect(result.running).toBe(true); // Server still running
  });
});
```

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
└── vite-plugin-open-api-server.ts
```

### 13.2 Future: NPM Package

**Package Name:** `@webssublime/vite-plugin-open-api-server`

**Package Structure:**
```
@webssublime/vite-plugin-open-api-server/
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── runner.mjs
├── package.json
└── README.md
```

### 13.3 Dependencies

This plugin relies on three core external dependencies that provide the foundation for its functionality:

#### Core Dependencies

**1. Vite (`vite`)**
- **Purpose:** Development server framework and build tool
- **Version:** `^5.0.0` (peer dependency)
- **Usage:** Plugin system integration, dev server lifecycle hooks, proxy configuration
- **Key APIs Used:**
  - `configureServer` hook - Configure dev server and add middlewares
  - `config` hook - Modify Vite configuration (proxy rules)
  - `configResolved` hook - Access final resolved configuration
  - Plugin ordering with `enforce` property
  - `server.middlewares` - Connect middleware integration

**2. @scalar/openapi-parser (`@scalar/openapi-parser`)**
- **Purpose:** OpenAPI document parsing, validation, and manipulation
- **Version:** `^0.x` (direct dependency)
- **Usage:** Parse and validate OpenAPI 3.x and Swagger 2.0 specifications
- **Key APIs Used:**
  - `validate(spec)` - Validate OpenAPI document structure
  - `dereference(spec)` - Resolve $ref references
  - `upgrade(spec)` - Upgrade Swagger 2.0 to OpenAPI 3.1
  - `sanitize(spec)` - Normalize and fix common issues
- **Supported Formats:** YAML (.yaml, .yml), JSON (.json)
- **Supported Versions:** OpenAPI 3.2, 3.1, 3.0, Swagger 2.0

**3. @scalar/mock-server (`@scalar/mock-server`)**
- **Purpose:** Generate mock API responses from OpenAPI specifications
- **Version:** `^0.x` (direct dependency)
- **Usage:** Create HTTP mock server with automatic response generation
- **Key APIs Used:**
  - `createMockServer(options)` - Create mock server instance
  - `onRequest` callback - Hook for logging and monitoring
  - `x-handler` extension - Custom request handling with JavaScript
  - `x-seed` extension - Initial data seeding for schemas
- **Built on:** Hono web framework
- **Features:**
  - Automatic response generation from schemas
  - Security scheme validation (Bearer, API Key, OAuth2)
  - In-memory data store with CRUD operations
  - Faker.js integration for realistic data

#### Supporting Dependencies

**4. @hono/node-server (`@hono/node-server`)**
- **Purpose:** Node.js server adapter for Hono framework
- **Version:** `^1.x` (direct dependency)
- **Usage:** Run the mock server in Node.js environment
- **Key APIs Used:**
  - `serve(options)` - Start HTTP server with Hono app

**5. @vue/devtools-api (`@vue/devtools-api`)**
- **Purpose:** Vue DevTools plugin integration for custom tabs
- **Version:** `^7.3.0` (dev dependency)
- **Usage:** Register custom "Mock Server" tab in Vue DevTools for endpoint inspection and response simulation
- **Documentation:** https://devtools.vuejs.org/plugins/api
- **Key APIs Used:**
  - `addCustomTab(options)` - Register custom tab with SFC view
  - `onDevToolsClientConnected(callback)` - Hook for DevTools connection event
- **Benefits:**
  - Zero additional UI infrastructure
  - Seamless integration into developer workflow
  - Real-time endpoint registry inspection
  - Query parameter simulation for status codes, delays, and errors

**6. yaml (`yaml`)**
- **Purpose:** YAML parsing and serialization
- **Version:** `^2.x` (direct dependency)
- **Usage:** Parse OpenAPI YAML specifications (fallback if @scalar/openapi-parser doesn't handle it)

**Required:**
```json
{
  "dependencies": {
    dependencies:
      "@hono/node-server": "^1.12.0"
      "@scalar/mock-server": "^0.1.15"
      "@scalar/openapi-parser": "^0.7.2"
      "yaml": "^2.3.4"
    devDependencies:
      "@vue/devtools-api": "^7.3.0"
    peerDependencies:
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
| Auto-restart on crash | P2 | Low |
| Request/response recording | P2 | Medium |
| TypeScript seed/handler support | P2 | High |
| Performance profiling tools | P2 | Medium |

### 14.2 Medium-Term (v1.2)

| Feature | Priority | Effort |
|---------|----------|--------|
| GraphQL support | P3 | High |
| Contract testing integration | P3 | High |
| Multi-environment configs | P2 | Medium |
| Mock response delays/throttling | P2 | Low |

### 14.3 Long-Term (v2.0)

| Feature | Priority | Effort |
|---------|----------|--------|
| Persistent mock data (SQLite) | P3 | High |
| Multi-spec support | P3 | Medium |
| Shared mock library (mono-repo) | P3 | Medium |
| Cloud-based mock collaboration | P3 | High |

---

## 15. Acceptance Criteria

### 15.1 MVP Criteria (v1.0)

**Core Functionality:**
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

**v1.0 Critical Requirements:**
- [ ] **FR-003:** Use @scalar/openapi-parser for document loading and validation
- [ ] **FR-003:** Report validation errors with clear messages
- [ ] **FR-004:** Load and validate handler/seed files with clear feedback
- [ ] **FR-005:** Inject x-handler code into OpenAPI operations
- [ ] **FR-005:** Inject x-seed code into OpenAPI schemas
- [ ] **FR-006:** Build endpoint registry from enhanced document
- [ ] **FR-006:** Display registry table on startup
- [ ] **FR-006:** Expose `/_mock/registry` endpoint
- [ ] **FR-010:** Security scheme normalization with @scalar/openapi-parser sanitize()
- [ ] **FR-013:** Preserve existing x-handler/x-seed in OpenAPI (with override warnings)
- [ ] **FR-014:** Hot reload for seeds/handlers with file watching
- [ ] **FR-015:** Vue DevTools integration with custom "Mock Server" tab for endpoint inspection and response simulation

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

**Core Dependencies:**
- [@scalar/openapi-parser Documentation](https://github.com/scalar/scalar/tree/main/packages/openapi-parser)
- [@scalar/mock-server Documentation](https://github.com/scalar/scalar/tree/main/packages/mock-server)
- [Scalar Mock Server Guide](https://guides.scalar.com/scalar/scalar-mock-server/getting-started)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)

**Specifications & Standards:**
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Swagger 2.0 Specification](https://swagger.io/specification/v2/)

**Supporting Libraries:**
- [Hono Framework](https://hono.dev/)
- [Faker.js Documentation](https://fakerjs.dev/)
- [@hono/node-server](https://github.com/honojs/node-server)

### 16.3 File Structure

```
packages/foc-gpme/
├── vite-plugins/
│   ├── index.ts                           # Plugin exports
│   ├── vite-plugin-open-api-server.ts     # Main Vite plugin
│   ├── mock-server-runner.mjs             # ESM runner (child process)
│   ├── mock-server-runner.ts              # TS version (reference)
│   ├── mock-server.types.ts               # TypeScript type definitions
│   └── openapi-enhancer.mjs               # Document enhancer & registry (NEW)
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
| 1.0.2-draft | 2025-01-XX | Complete FR renumbering: FR-003 (Parser), FR-004 (File Loading), FR-005 (Enhancement), FR-006 (Registry), FR-007-012 (Core), FR-013-015 (initially marked as Optional, later moved to Core in 1.0.7) |
| 1.0.3-draft | 2025-01-15 | **FR-004 Enhancement**: Added support for function exports in handlers/seeds. Values can now be either strings (static) or functions (dynamic code generation). Added HandlerCodeContext and SeedCodeContext APIs. Added Use Cases & Best Practices section. Updated validation rules and API specifications (sections 8.2-8.5). |
| 1.0.4-draft | 2026-01-07 | **Product Name Correction**: Changed product name from `vite-plugin-mock-server` to `vite-plugin-open-api-server` throughout document. Updated NPM package name to `@webssublime/vite-plugin-open-api-server`. Added section 1.1.1 "Why OpenAPI-First?" explaining the OpenAPI-first philosophy, contract-driven development approach, and differentiation from generic mock servers. Updated all file names and references in architecture diagrams and file structure sections. |
| 1.0.5-draft | 2026-01-07 | **External API Integration**: Added `@scalar/openapi-parser` as core dependency. Expanded section 13.3 with detailed documentation of all three core dependencies (Vite, @scalar/openapi-parser, @scalar/mock-server) including purpose, version requirements, and key APIs used. Added comprehensive section 7.4 "External API Integration" with deep analysis of: (1) Vite Plugin API integration with code examples and lifecycle hooks, (2) @scalar/openapi-parser usage for validation, dereferencing, and sanitization with error handling strategies, (3) @scalar/mock-server integration including x-handler/x-seed runtime context, Store API specification, automatic status codes, and security scheme handling. Updated References section (16.2) with all official documentation links. |
| 1.0.6-draft | 2026-01-07 | **Critical Gaps Resolved**: (1) **FR-010 Security Scheme Normalization** - Completely expanded with technical documentation, supported security schemes table, before/after examples for Bearer/API Key/OAuth2, mock server behavior specifications, edge cases, limitations, and implementation code. Added 4 detailed examples showing authentication flows. (2) **Section 8.7 IPC Message API** - Expanded from 3 message types to complete protocol specification with 8 message types (INITIALIZING, READY, SHUTDOWN, ERROR, WARNING, LOG, REQUEST, HEARTBEAT), detailed interfaces, message flow examples for successful startup and error scenarios, parent process handler implementation, error codes reference table, and environment variables documentation (~400 lines). (3) **Section 11.4 Error Handling Strategy** - New comprehensive section covering error taxonomy (4 severity levels), error codes with recovery strategies, error message format specification, logging patterns, user-facing message guidelines, error recovery strategies (graceful degradation, auto-retry, circuit breaker, fail-fast), code examples for child/parent error handling, and testing checklist (~300 lines). |
| 1.0.7-draft | 2026-01-07 | **FR-013/014/015 Reclassified as Core Features**: Moved FR-013 (Preserve Existing x-handler/x-seed), FR-014 (Hot Reload), and FR-015 (Web UI for Mock Management) from section 5.2 "Optional Features" to section 5.1 "Core Features" as they are mandatory requirements, not optional. Updated priorities: FR-013 from P2→P0 (Critical), FR-014 from P3→P1 (High), FR-015 from P3→P1 (High). Expanded FR-014 with complete implementation notes including chokidar file watching, graceful restart logic, and reload timing requirements (<2s). Expanded FR-015 with comprehensive UI specification including dashboard, endpoints view, store data view, request logs, actions (reset/clear/export/import), technical implementation details, and benefits. Added new section 5.2 "Future Enhancements" for actual optional features (FE-001: TypeScript support, FE-002: GraphQL, FE-003: SQLite persistence). |
| 1.0.8-draft | 2026-01-07 | **FR-015 Replaced with Vue DevTools Integration for Comprehensive Edge Case Testing**: Replaced FR-015 standalone Web UI (`/__mock-ui`) with Vue DevTools Plugin API integration (`@vue/devtools-api` ^7.3.0). Added custom "Mock Server" tab in Vue DevTools browser extension aligned with Value Proposition (section 1.2): "Simulate edge cases, errors, and network conditions". **Comprehensive Simulation Capabilities:** (1) HTTP status codes (2xx, 4xx, 5xx ranges), (2) Network conditions (latency presets: Fast/Slow/3G/4G, custom delays 0-10000ms), (3) Error scenarios (timeout, network failure, server error, rate limiting, maintenance), (4) Edge cases (empty responses, malformed JSON, partial content, large payloads), (5) Connection quality (stable, intermittent, drop), (6) Advanced options (custom headers, failure probability 0-100%, timeout duration, simulation presets). **Query Parameters:** `simulateStatus`, `simulateDelay`, `simulateError`, `simulateConnection`, `simulateResponse`, `simulateTimeout`, `simulateProbability`, `simulateHeaders`. **Features:** Endpoint registry with filters, simulation panel with visual controls, preset management (save/load scenarios like "Slow 3G", "Rate Limited", "Server Overload"), real-time sync via `GET /__registry` (5s polling), copy-to-clipboard and test-in-browser actions. Updated section 7.4.2 with @vue/devtools-api integration including simulation capabilities reference and query parameters table. Updated section 13.3 Supporting Dependencies with @vue/devtools-api details. Benefits: comprehensive error handling validation, realistic network simulation, zero UI infrastructure, seamless workflow integration. |
| 1.0.9-draft | 2026-01-08 | **FR-015 DevTools Detection Strategy**: Added comprehensive DevTools detection pattern following Pinia and Vue Router implementation. **Detection Strategy:** (1) Build-time guard (`__DEV__` constant, tree-shaken in production), (2) Runtime guard (`IS_CLIENT` for browser environment, excludes SSR), (3) Feature guard (`HAS_PROXY` for modern browsers), (4) Silent buffer pattern (plugins buffered until DevTools connects, no errors if DevTools missing), (5) API version validation (`typeof api.now === 'function'` check). **Global State Exposure:** Following Pinia's pattern, exposed `globalThis.$mockServer` and `globalThis.$mockRegistry` for console debugging. `$mockServer` provides: url, connected, port, startedAt, lastError, refresh(), getEndpoint(), listEndpoints(). `$mockRegistry` provides: endpoints, stats, byMethod, byOperationId. **Updated Sections:** FR-015 acceptance criteria (added 7 new criteria for detection/exposure), section 7.4.2 with complete implementation code including `registerMockServerDevTools()`, `exposeGlobalMockServerState()`, helper functions, TypeScript declarations, and Vite plugin integration examples. Added build configuration for `__DEV__` constant. Research based on Pinia (`@vue/devtools-api` integration in `packages/pinia/src/devtools/plugin.ts`) and Vue DevTools Kit (`@vue/devtools-kit` source code). |

---

**Document Status:** Draft - Awaiting Review

**Next Steps:**
1. Review and approve specification
2. Validate against existing implementation
3. Identify gaps between spec and implementation
4. Prioritize missing features for v1.1
5. Finalize acceptance testing criteria
