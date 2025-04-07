
const order = (unordered) => Object.keys(unordered).sort().reduce(
  (obj, key) => {
    obj[key] = unordered[key];
    return obj;
  }, {}
);

export const sortObjectDeeply = (object) => {
  for (const [key, value] of Object.entries(object)) {
    if (typeof(value) === 'object') {
      object[key] = sortObjectDeeply(value)
    }
  }
  return order(object)
}

export function filterNullValuesDeep(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  return Object.keys(obj).reduce((acc, key) => {
    const value = filterNullValuesDeep(obj[key]);
    if (value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function getObjectDiffPathsSync(obj1, obj2) {
  const result = [];

  function findDiff(obj1, obj2, path = '') {
    for (const key in obj1) {
      const fullPath = path ? `${path}.${key}` : key;
      if (!(key in obj2) || obj2[key] === '') {
        result.push(fullPath);
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null && !Array.isArray(obj1[key])) {
        findDiff(obj1[key], obj2[key], fullPath);
      }
    }
  }

  findDiff(obj1, obj2);
  return result;
}
