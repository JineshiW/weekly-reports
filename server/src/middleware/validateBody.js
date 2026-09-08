// Runs a zod schema over req.body and replaces it with the parsed value.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          problem: issue.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validateBody;
