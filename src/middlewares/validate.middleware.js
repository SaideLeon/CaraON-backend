const validate = (schema) => (req, res, next) => {
  try {
    const parsedSchema = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = parsedSchema.body;
    req.query = parsedSchema.query;
    req.params = parsedSchema.params;
    next();
  } catch (err) {
    return res.status(400).send(JSON.stringify(err.errors));
  }
};

export default validate;
