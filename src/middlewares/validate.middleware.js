const validate = (schema) => (req, res, next) => {
  try {
    const parsedSchema = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.validatedData = parsedSchema;
    next();
  } catch (err) {
    console.error('Validation Error:', err);
    return res.status(400).send(JSON.stringify(err.errors));
  }
};

export default validate;
