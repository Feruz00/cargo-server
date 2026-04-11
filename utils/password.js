const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scrpytAsync = promisify(scrypt);

const toHash = async (password) => {
  const salt = randomBytes(8).toString('hex');
  const buf = await scrpytAsync(password, salt, 64);

  return `${buf.toString('hex')}.${salt}`;
};
const compare = async (storedPassword, suppliedPassword) => {
  const [hashed, salt] = storedPassword.split('.');
  const buf = await scrpytAsync(suppliedPassword, salt, 64);

  return buf.toString('hex') === hashed;
};

module.exports = { toHash, compare };
