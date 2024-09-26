const { StatusCodeError } = require('../endpointHelper');
const { DB, Role } = require('./database');
const jwt = require('jsonwebtoken');
const config = require('../config')

jest.setTimeout(5 * 60 * 1000)

async function createAdmin() {
	const name = Math.random().toString(36).substring(2, 12)
  const newUser = { 
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
	const name = Math.random().toString(36).substring(2, 12)
  const newUser = { 
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

test('add menu item', async () => {
	const honeySerrano = {title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	const newPizza = await DB.addMenuItem(honeySerrano)

	expect(newPizza).toMatchObject(honeySerrano)
	expect(newPizza).toHaveProperty('id')
})

test('get menu', async () => {
	const cornMoz = {title: 'corn & smoked mozzarella', description: 'a big lump with knobs', image: 'corn.jpg', price: 0.003}
	const newPizza = await DB.addMenuItem(cornMoz)
	const menu = await DB.getMenu()

	expect(menu).toContainEqual(newPizza)
})

test('add user', async () => {
	const name = Math.random().toString(36).substring(2, 12)
  const newUser = { 
		name,
		email: name + '@diner.com',
		roles: [{ role: Role.Diner }]
	};
	const addedUser = await DB.addUser({...newUser, password: 'verysecurepassword'})

	expect(addedUser).toMatchObject(newUser)
	expect(addedUser.password).toBeUndefined()
	expect(addedUser).toHaveProperty('id')
})

test('get user', async () => {
	const diner = await createDiner()
	const getRes = await DB.getUser(diner.email, diner.password)

	const {password, ...noPass} = diner

	expect(getRes).toMatchObject(noPass)
})

test('get user 404', async () => {
	const diner = await createDiner()

	await expect(async () => DB.getUser(diner.email, 'wrongpassword')).rejects.toThrow(StatusCodeError)
	await expect(async () => DB.getUser(diner.email, 'wrongpassword')).rejects.toThrow('unknown user')
})

test('update user', async () => {
	const {email, password, ...diner} = await createDiner()
	const newEmail = Math.random().toString(36).substring(2, 12) + "@diner.com"
	const newPassword = 'superdupersecure'

	const updateRes = await DB.updateUser(diner.id, newEmail, newPassword)

	expect(updateRes.email).toBe(newEmail)
	expect(updateRes).toMatchObject(diner)
})

test('login user', async () => {
	const diner = await createDiner()
	const token = jwt.sign(diner, config.jwtSecret)

	await DB.loginUser(diner.id, token)
	const isLoggedIn = await DB.isLoggedIn(token)

	expect(isLoggedIn).toBeTruthy()
})

test('logout user', async () => {
	const diner = await createDiner()
	const token = jwt.sign(diner, config.jwtSecret)
	await DB.loginUser(diner.id, token)

	await DB.logoutUser(token)
	const isLoggedIn = await DB.isLoggedIn(token)

	expect(isLoggedIn).toBeFalsy()
})

test('create franchise', async () => {
	const diner = await createDiner()
	const franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: diner.email}]}

	const newFranchise = await DB.createFranchise(franchise)
	const franchisee = await DB.getUser(diner.email, diner.password)

	expect(newFranchise).toHaveProperty('id')
	expect(franchisee.roles).toContainEqual({objectId: newFranchise.id, role: Role.Franchisee})
})

test('create franchise 404', async () => {
	const diner = await createDiner()
	const franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: 'nouser@test.com'}]}

	await expect(async () => await DB.createFranchise(franchise)).rejects.toThrow(StatusCodeError)
	await expect(async () => await DB.createFranchise(franchise)).rejects.toThrow('unknown user for franchise admin')
})

test('create franchise owner', async () => {
	const franchiseOwner = await createDiner()
	let franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: franchiseOwner.email}]}
	franchise = await DB.createFranchise(franchise)

	const name = Math.random().toString(36).substring(2, 12)
  const newFranchiseAdmin = { 
		name,
		email: name + '@diner.com',
		roles: [{ role: Role.Franchisee, object: franchise.name}]
	};
	const addedUser = await DB.addUser({...newFranchiseAdmin, password: 'verysecurepassword'})

	expect(addedUser).toMatchObject(newFranchiseAdmin)
	expect(addedUser.roles).toContainEqual({role: Role.Franchisee, object: franchise.name})
})

test('get franchise', async () => {
	const diner = await createDiner()
	const franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: diner.email}]}
	const {id, ...rest} = await DB.createFranchise(franchise)

	const newFranchise = await DB.getFranchise({id})

	expect(newFranchise.admins).toContainEqual({id: diner.id, name: diner.name, email: diner.email})
	expect(newFranchise.id).toBe(id)
})

test('get franchises', async () => {
	const diner = await createDiner()
	let franchises = []
	for (let i = 0; i < 3; i++) {
		const franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: diner.email}]}
		const newFranchise = await DB.createFranchise(franchise)
		franchises.push(newFranchise)
	}
	diner.isRole = (role) => false

	const allFranchises = await DB.getFranchises(diner)

	franchises.forEach(f => {
		expect(allFranchises).toContainEqual({stores: [], name: f.name, id: f.id})
		expect(allFranchises.find(fr => fr.id = f.id)).not.toHaveProperty('admins')
	})
})

test('get franchises as admin', async () => {
	const diner = await createDiner()
	let franchises = []
	for (let i = 0; i < 3; i++) {
		const franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: diner.email}]}
		const newFranchise = await DB.createFranchise(franchise)
		franchises.push(newFranchise)
	}
	const admin = await createAdmin()
	admin.isRole = (role) => true

	const allFranchises = await DB.getFranchises(admin)

	franchises.forEach(f => {
		expect(allFranchises).toContainEqual({stores: [], ...f})
	})
})

test('get user franchises', async () => {
	const diner = await createDiner()
	const franchise = {name: Math.random().toString(36).substring(2, 12), admins: [{email: diner.email}]}
	const newFranchise = await DB.createFranchise(franchise)

	const userFranchises = await DB.getUserFranchises(diner.id)

	expect(userFranchises).toHaveLength(1)
	expect(userFranchises[0]).toMatchObject(newFranchise)
})