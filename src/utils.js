const {DB, Role} = require('./database/database')

function randomString() {
	return Math.random().toString(36).substring(2, 12)
}

async function createAdmin() {
	const name = randomString()
  const newUser = {
		id: -1,
		name,
		email: name + '@admin.com',
		password: 'verysecurepassword',
		roles: [{ role: Role.Admin }]
	};

  const result = await DB.addUser(newUser);
	newUser.id = result.id
	newUser.password = 'verysecurepassword'

  return newUser;
}

async function createDiner() {
	const name = randomString()
  const newUser = { 
		id: -1,
		name,
		email: name + '@diner.com',
		password: 'verysecurepassword',
		roles: [{ role: Role.Diner }]
	};

  const result = await DB.addUser(newUser);
	newUser.id = result.id
	newUser.password = 'verysecurepassword'

  return newUser;
}

module.exports = {
	createDiner,
	createAdmin,
	randomString
}