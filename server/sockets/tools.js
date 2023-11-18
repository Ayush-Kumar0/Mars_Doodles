module.exports.removeObjectKey = (originalObject, keyToRemove) => {
    // Destructure the originalObject, omitting the specified key
    const { [keyToRemove]: omittedKey, ...newObject } = originalObject;
    return newObject;
}