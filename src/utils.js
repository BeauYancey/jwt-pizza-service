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

async function createStore(owner) {
	const franchise = await DB.createFranchise({name: randomString(), admins: [{email: owner.email}]})
	const store = await DB.createStore(franchise.id, {name: randomString()})
	return store
}

module.exports = {
	createDiner,
	createAdmin,
	createStore,
	randomString
}