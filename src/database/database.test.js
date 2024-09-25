const { StatusCodeError } = require('../endpointHelper');
const { DB, Role } = require('./database');
const jwt = require('jsonwebtoken');
const config = require('../config')


jest.setTimeout(60 * 1000 * 5);

async function createAdmin() {
	const name = Math.random().toString(36).substring(2, 12)
  const orig = { 
		name,
		email: name + '@admin.com',
		password: 'verysecurepassword',
		roles: [{ role: Role.Admin }]
	};

  const result = await DB.addUser(orig);

  return [orig, result];
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
	const addedUser = await DB.addUser({...newUser, password: 'verysecurepassword',})

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