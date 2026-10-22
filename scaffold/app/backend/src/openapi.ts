// OpenAPI 3.1 document built from the registered Express routes and the server's own Zod schemas.
// `npm run openapi -w backend` writes docs/openapi.json; a test fails when it is out of date.
import type express from 'express';
import type { z, ZodTypeAny } from 'zod';

type Json = Record<string, unknown>;

// Converts the Zod v3 types the API uses. Refinements (cross-field rules) cannot be expressed
// here; any other unsupported type fails loudly instead of being silently dropped.
export function jsonSchema(schema: ZodTypeAny): Json {
  const def = schema._def as Json & { typeName: string };
  switch (def.typeName) {
    case 'ZodObject': {
      const shape = (schema as z.AnyZodObject).shape as Record<string, ZodTypeAny>;
      const required = Object.keys(shape).filter((key) => !shape[key].isOptional());
      return {
        type: 'object',
        properties: Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, jsonSchema(v)])),
        ...(required.length ? { required } : {}),
        ...(def.unknownKeys === 'strict' ? { additionalProperties: false } : {}),
      };
    }
    case 'ZodString': {
      const out: Json = { type: 'string' };
      for (const check of def.checks as { kind: string; value?: number; regex?: RegExp }[]) {
        if (check.kind === 'min') out.minLength = check.value;
        else if (check.kind === 'max') out.maxLength = check.value;
        else if (check.kind === 'length') out.minLength = out.maxLength = check.value;
        else if (check.kind === 'regex') out.pattern = check.regex!.source;
        else if (check.kind === 'uuid') out.format = 'uuid';
        else if (check.kind !== 'trim') throw new Error(`Unsupported string check: ${check.kind}`);
      }
      return out;
    }
    case 'ZodNumber': {
      const out: Json = { type: 'number' };
      for (const check of def.checks as { kind: string; value?: number; inclusive?: boolean }[]) {
        if (check.kind === 'int') out.type = 'integer';
        else if (check.kind === 'min')
          out[check.inclusive ? 'minimum' : 'exclusiveMinimum'] = check.value;
        else if (check.kind === 'max')
          out[check.inclusive ? 'maximum' : 'exclusiveMaximum'] = check.value;
        else if (check.kind === 'multipleOf') out.multipleOf = check.value;
        else if (check.kind !== 'finite')
          throw new Error(`Unsupported number check: ${check.kind}`);
      }
      return out;
    }
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray': {
      const length = (key: string) => (def[key] as { value: number } | null)?.value;
      const exact = length('exactLength');
      const min = exact ?? length('minLength');
      const max = exact ?? length('maxLength');
      return {
        type: 'array',
        items: jsonSchema(def.type as ZodTypeAny),
        ...(min !== undefined ? { minItems: min } : {}),
        ...(max !== undefined ? { maxItems: max } : {}),
      };
    }
    case 'ZodEnum':
      return { type: 'string', enum: def.values };
    case 'ZodNullable': {
      const inner = jsonSchema(def.innerType as ZodTypeAny);
      return typeof inner.type === 'string'
        ? { ...inner, type: [inner.type, 'null'] }
        : { anyOf: [inner, { type: 'null' }] };
    }
    case 'ZodOptional':
      return jsonSchema(def.innerType as ZodTypeAny);
    case 'ZodDefault':
      return {
        ...jsonSchema(def.innerType as ZodTypeAny),
        default: (def.defaultValue as () => unknown)(),
      };
    case 'ZodEffects':
      return jsonSchema(def.schema as ZodTypeAny);
    case 'ZodUnknown':
      return {};
    default:
      throw new Error(`Unsupported Zod type for OpenAPI: ${def.typeName}`);
  }
}

type Operation = {
  summary: string;
  body?: [name: string, schema: ZodTypeAny];
  query?: ZodTypeAny;
  // Success status first; the rest are documented error statuses.
  status: number[];
};
// Every registered route must appear here exactly once (checked when building).
export const operations: Record<string, Operation> = {
  'GET /api/health': { summary: '서버와 DB 연결 상태 확인', status: [200, 500] },
};

type Layer = { route?: { path: string; methods: Record<string, boolean> } };
export function registeredRoutes(app: express.Express) {
  return (app as unknown as { router: { stack: Layer[] } }).router.stack.flatMap((layer) =>
    layer.route
      ? Object.keys(layer.route.methods).map((m) => `${m.toUpperCase()} ${layer.route!.path}`)
      : [],
  );
}

const statusText: Record<number, string> = {
  200: '성공',
  201: '생성됨',
  400: '입력 검증 실패',
  404: '대상 없음',
  409: '중복 또는 충돌',
  413: '요청 크기 한도 초과',
  500: '서버 오류',
};

export function buildOpenApi(app: express.Express) {
  const routes = registeredRoutes(app);
  const missing = routes.filter((route) => !operations[route]);
  const extra = Object.keys(operations).filter((route) => !routes.includes(route));
  if (missing.length || extra.length)
    throw new Error(`OpenAPI operations differ from routes: +${missing} -${extra}`);
  const schemas: Json = {
    Error: {
      type: 'object',
      properties: { error: { type: 'string', description: '한국어 오류 메시지' } },
      required: ['error'],
    },
  };
  const paths: Record<string, Json> = {};
  for (const route of [...routes].sort()) {
    const [method, path] = route.split(' ');
    const op = operations[route];
    const parameters: Json[] = [...path.matchAll(/:(\w+)/g)].map(([, name]) => ({
      name,
      in: 'path',
      required: true,
      schema: name === 'id' ? { type: 'integer', minimum: 1 } : { type: 'string' },
    }));
    if (op.query) {
      const query = jsonSchema(op.query) as { properties: Json; required?: string[] };
      for (const [name, schema] of Object.entries(query.properties))
        parameters.push({ name, in: 'query', required: !!query.required?.includes(name), schema });
    }
    if (op.body) schemas[op.body[0]] = jsonSchema(op.body[1]);
    const [success, ...failures] = op.status;
    const responses: Json = { [success]: { description: statusText[success] } };
    for (const status of failures)
      responses[status] = {
        description: statusText[status],
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      };
    const key = path.replace(/:(\w+)/g, '{$1}');
    paths[key] ??= {};
    paths[key][method.toLowerCase()] = {
      summary: op.summary,
      ...(parameters.length ? { parameters } : {}),
      ...(op.body
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': { schema: { $ref: `#/components/schemas/${op.body[0]}` } },
              },
            },
          }
        : {}),
      responses,
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: '{{project.title}} API',
      version: '1.0.0',
      description:
        '날짜는 YYYY-MM-DD(Asia/Seoul). 오류 응답은 모두 { error: 한국어 메시지 }입니다.',
    },
    servers: [{ url: '/' }],
    paths,
    components: { schemas },
  };
}
