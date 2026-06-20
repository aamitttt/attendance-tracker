import { badRequest } from '../utils/ApiError.js';

// Validates a request part against a Zod schema, replacing it with the parsed value.
// Usage: validate(schema, 'body') | validate(schema, 'query')
export function validate(schema, where = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(badRequest('Validation failed', details));
    }
    // Express 5 makes req.query a getter; assign to a private field instead.
    if (where === 'query') req.validatedQuery = result.data;
    else req[where] = result.data;
    next();
  };
}
