exports.handleError = (properties) => {
  const error = new Error();
  for (let i in properties) error[i] = properties[i];
  return error;
};
