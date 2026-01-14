/**
 * TypeScript type definitions for OpenAPI parser.
 *
 * These interfaces define the structure of parsed OpenAPI documents
 * and related types used throughout the plugin.
 *
 * @module core/parser/types
 */

/**
 * OpenAPI document info object containing API metadata.
 */
export interface OpenApiInfo {
  /** The title of the API */
  title: string;
  /** A short summary of the API */
  summary?: string;
  /** A description of the API (may contain Markdown) */
  description?: string;
  /** A URL to the Terms of Service for the API */
  termsOfService?: string;
  /** Contact information for the API */
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  /** License information for the API */
  license?: {
    name: string;
    identifier?: string;
    url?: string;
  };
  /** The version of the API document */
  version: string;
}

/**
 * Server variable for URL templating.
 */
export interface OpenApiServerVariable {
  /** An enumeration of allowed values */
  enum?: string[];
  /** The default value to use for substitution */
  default: string;
  /** A description of the variable */
  description?: string;
}

/**
 * Server object representing a target server.
 */
export interface OpenApiServer {
  /** A URL to the target host */
  url: string;
  /** A description of the host */
  description?: string;
  /** A map between variable names and their values */
  variables?: Record<string, OpenApiServerVariable>;
}

/**
 * External documentation object.
 */
export interface OpenApiExternalDocs {
  /** A description of the external documentation */
  description?: string;
  /** The URL for the external documentation */
  url: string;
}

/**
 * Tag object for grouping operations.
 */
export interface OpenApiTag {
  /** The name of the tag */
  name: string;
  /** A description for the tag */
  description?: string;
  /** External documentation for the tag */
  externalDocs?: OpenApiExternalDocs;
}

/**
 * Reference object for $ref links.
 */
export interface OpenApiReference {
  /** The reference string */
  $ref: string;
  /** A summary of the referenced object */
  summary?: string;
  /** A description of the referenced object */
  description?: string;
}

/**
 * Schema object representing a JSON Schema.
 * This is a simplified version - full JSON Schema is quite complex.
 */
export interface OpenApiSchema {
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  example?: unknown;
  examples?: unknown[];
  enum?: unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  additionalProperties?: boolean | OpenApiSchema;
  items?: OpenApiSchema | OpenApiSchema[];
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  not?: OpenApiSchema;
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };
  xml?: {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
  };
  externalDocs?: OpenApiExternalDocs;
  /** Reference to another schema */
  $ref?: string;
  /** Additional properties for JSON Schema compatibility */
  [key: string]: unknown;
}

/**
 * Media type object describing a single media type.
 */
export interface OpenApiMediaType {
  /** The schema defining the content */
  schema?: OpenApiSchema;
  /** Example of the media type */
  example?: unknown;
  /** Examples of the media type */
  examples?: Record<
    string,
    {
      summary?: string;
      description?: string;
      value?: unknown;
      externalValue?: string;
    }
  >;
  /** Encoding information for specific properties */
  encoding?: Record<
    string,
    {
      contentType?: string;
      headers?: Record<string, OpenApiParameter | OpenApiReference>;
      style?: string;
      explode?: boolean;
      allowReserved?: boolean;
    }
  >;
}

/**
 * Parameter object describing a single operation parameter.
 */
export interface OpenApiParameter {
  /** The name of the parameter */
  name: string;
  /** The location of the parameter (path, query, header, cookie) */
  in: 'path' | 'query' | 'header' | 'cookie';
  /** A description of the parameter */
  description?: string;
  /** Whether the parameter is required */
  required?: boolean;
  /** Whether the parameter is deprecated */
  deprecated?: boolean;
  /** Whether empty values are allowed */
  allowEmptyValue?: boolean;
  /** The style of the parameter */
  style?:
    | 'matrix'
    | 'label'
    | 'form'
    | 'simple'
    | 'spaceDelimited'
    | 'pipeDelimited'
    | 'deepObject';
  /** Whether arrays/objects generate separate parameters */
  explode?: boolean;
  /** Whether reserved characters are allowed */
  allowReserved?: boolean;
  /** The schema defining the parameter */
  schema?: OpenApiSchema;
  /** Example of the parameter */
  example?: unknown;
  /** Examples of the parameter */
  examples?: Record<
    string,
    {
      summary?: string;
      description?: string;
      value?: unknown;
      externalValue?: string;
    }
  >;
  /** Content map for complex parameters */
  content?: Record<string, OpenApiMediaType>;
}

/**
 * Header object for response headers.
 */
export interface OpenApiHeader {
  /** A description of the header */
  description?: string;
  /** Whether the header is required */
  required?: boolean;
  /** Whether the header is deprecated */
  deprecated?: boolean;
  /** Whether empty values are allowed */
  allowEmptyValue?: boolean;
  /** The style of the header */
  style?: 'simple';
  /** Whether arrays/objects generate separate parameters */
  explode?: boolean;
  /** Whether reserved characters are allowed */
  allowReserved?: boolean;
  /** The schema defining the header */
  schema?: OpenApiSchema;
  /** Example of the header */
  example?: unknown;
  /** Examples of the header */
  examples?: Record<
    string,
    {
      summary?: string;
      description?: string;
      value?: unknown;
      externalValue?: string;
    }
  >;
  /** Content map for complex headers */
  content?: Record<string, OpenApiMediaType>;
}

/**
 * Link object for describing relationships between operations.
 */
export interface OpenApiLink {
  /** A relative or absolute URI reference to an operation */
  operationRef?: string;
  /** The name of an existing operation */
  operationId?: string;
  /** Parameters to pass to the linked operation */
  parameters?: Record<string, unknown>;
  /** The request body to use */
  requestBody?: unknown;
  /** A description of the link */
  description?: string;
  /** Server to use for the linked operation */
  server?: OpenApiServer;
}

/**
 * Response object describing a single response.
 */
export interface OpenApiResponse {
  /** A description of the response */
  description: string;
  /** Maps header name to header object */
  headers?: Record<string, OpenApiHeader | OpenApiReference>;
  /** Map of media type to media type object */
  content?: Record<string, OpenApiMediaType>;
  /** Map of operation links */
  links?: Record<string, OpenApiLink | OpenApiReference>;
}

/**
 * Request body object.
 */
export interface OpenApiRequestBody {
  /** A description of the request body */
  description?: string;
  /** The content of the request body */
  content: Record<string, OpenApiMediaType>;
  /** Whether the request body is required */
  required?: boolean;
}

/**
 * Callback object for webhook definitions.
 */
export type OpenApiCallback = Record<string, OpenApiPathItem>;

/**
 * Security requirement object.
 */
export type OpenApiSecurityRequirement = Record<string, string[]>;

/**
 * Operation object describing a single API operation.
 */
export interface OpenApiOperation {
  /** A list of tags for API documentation */
  tags?: string[];
  /** A short summary of the operation */
  summary?: string;
  /** A verbose description of the operation */
  description?: string;
  /** Additional external documentation */
  externalDocs?: OpenApiExternalDocs;
  /** Unique string identifying the operation */
  operationId?: string;
  /** Parameters for the operation */
  parameters?: (OpenApiParameter | OpenApiReference)[];
  /** The request body for the operation */
  requestBody?: OpenApiRequestBody | OpenApiReference;
  /** Possible responses for the operation */
  responses?: Record<string, OpenApiResponse | OpenApiReference>;
  /** Callbacks for the operation */
  callbacks?: Record<string, OpenApiCallback | OpenApiReference>;
  /** Whether the operation is deprecated */
  deprecated?: boolean;
  /** Security requirements for the operation */
  security?: OpenApiSecurityRequirement[];
  /** Servers for the operation */
  servers?: OpenApiServer[];
}

/**
 * Path item object describing operations on a single path.
 */
export interface OpenApiPathItem {
  /** Reference to a path item object */
  $ref?: string;
  /** A summary for the path */
  summary?: string;
  /** A description for the path */
  description?: string;
  /** GET operation */
  get?: OpenApiOperation;
  /** PUT operation */
  put?: OpenApiOperation;
  /** POST operation */
  post?: OpenApiOperation;
  /** DELETE operation */
  delete?: OpenApiOperation;
  /** OPTIONS operation */
  options?: OpenApiOperation;
  /** HEAD operation */
  head?: OpenApiOperation;
  /** PATCH operation */
  patch?: OpenApiOperation;
  /** TRACE operation */
  trace?: OpenApiOperation;
  /** Servers for the path */
  servers?: OpenApiServer[];
  /** Parameters for all operations on the path */
  parameters?: (OpenApiParameter | OpenApiReference)[];
}

/**
 * OAuth2 flow object.
 */
export interface OpenApiOAuthFlow {
  /** The authorization URL */
  authorizationUrl?: string;
  /** The token URL */
  tokenUrl?: string;
  /** The URL for obtaining refresh tokens */
  refreshUrl?: string;
  /** Available scopes for the OAuth2 security scheme */
  scopes: Record<string, string>;
}

/**
 * OAuth2 flows object.
 */
export interface OpenApiOAuthFlows {
  /** Configuration for the implicit OAuth flow */
  implicit?: OpenApiOAuthFlow;
  /** Configuration for the password OAuth flow */
  password?: OpenApiOAuthFlow;
  /** Configuration for the client credentials OAuth flow */
  clientCredentials?: OpenApiOAuthFlow;
  /** Configuration for the authorization code OAuth flow */
  authorizationCode?: OpenApiOAuthFlow;
}

/**
 * Security scheme object.
 */
export interface OpenApiSecurityScheme {
  /** The type of the security scheme */
  type: 'apiKey' | 'http' | 'mutualTLS' | 'oauth2' | 'openIdConnect';
  /** A description for the security scheme */
  description?: string;
  /** The name of the header, query or cookie parameter (apiKey) */
  name?: string;
  /** The location of the API key (apiKey) */
  in?: 'query' | 'header' | 'cookie';
  /** The HTTP authorization scheme (http) */
  scheme?: string;
  /** Hint for the format of bearer token (http bearer) */
  bearerFormat?: string;
  /** OAuth flows configuration (oauth2) */
  flows?: OpenApiOAuthFlows;
  /** OpenID Connect URL (openIdConnect) */
  openIdConnectUrl?: string;
}

/**
 * Components object containing reusable objects.
 */
export interface OpenApiComponents {
  /** Reusable schema objects */
  schemas?: Record<string, OpenApiSchema>;
  /** Reusable response objects */
  responses?: Record<string, OpenApiResponse | OpenApiReference>;
  /** Reusable parameter objects */
  parameters?: Record<string, OpenApiParameter | OpenApiReference>;
  /** Reusable example objects */
  examples?: Record<
    string,
    | {
        summary?: string;
        description?: string;
        value?: unknown;
        externalValue?: string;
      }
    | OpenApiReference
  >;
  /** Reusable request body objects */
  requestBodies?: Record<string, OpenApiRequestBody | OpenApiReference>;
  /** Reusable header objects */
  headers?: Record<string, OpenApiHeader | OpenApiReference>;
  /** Reusable security scheme objects */
  securitySchemes?: Record<string, OpenApiSecurityScheme | OpenApiReference>;
  /** Reusable link objects */
  links?: Record<string, OpenApiLink | OpenApiReference>;
  /** Reusable callback objects */
  callbacks?: Record<string, OpenApiCallback | OpenApiReference>;
  /** Reusable path item objects (OpenAPI 3.1) */
  pathItems?: Record<string, OpenApiPathItem | OpenApiReference>;
}

/**
 * The root OpenAPI document object.
 *
 * This interface represents a fully parsed and dereferenced OpenAPI specification.
 * All $ref references have been resolved to their actual objects.
 */
export interface OpenApiDocument {
  /** The OpenAPI specification version (e.g., "3.0.3", "3.1.0") */
  openapi: string;
  /** Metadata about the API */
  info: OpenApiInfo;
  /** JSON Schema dialect identifier (OpenAPI 3.1) */
  jsonSchemaDialect?: string;
  /** An array of server objects */
  servers?: OpenApiServer[];
  /** The available paths and operations for the API */
  paths?: Record<string, OpenApiPathItem>;
  /** Webhooks (OpenAPI 3.1) */
  webhooks?: Record<string, OpenApiPathItem | OpenApiReference>;
  /** Reusable components */
  components?: OpenApiComponents;
  /** Security requirements for the API */
  security?: OpenApiSecurityRequirement[];
  /** A list of tags used by the document */
  tags?: OpenApiTag[];
  /** Additional external documentation */
  externalDocs?: OpenApiExternalDocs;
}

/**
 * Result of parsing an OpenAPI specification.
 */
export interface ParseResult {
  /** Whether the specification is valid */
  valid: boolean;
  /** The parsed and dereferenced specification */
  specification: OpenApiDocument;
  /** Validation errors if any */
  errors: ParseError[];
  /** Version of the OpenAPI specification */
  version?: string;
}

/**
 * Error encountered during parsing or validation.
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** JSON path to the error location */
  path?: string;
  /** Line number in the source file (if available) */
  line?: number;
  /** Column number in the source file (if available) */
  column?: number;
}

/**
 * Cache entry for storing parsed specifications.
 */
export interface CacheEntry {
  /** The parsed OpenAPI document */
  spec: OpenApiDocument;
  /** File modification time in milliseconds */
  mtime: number;
}
