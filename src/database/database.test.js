const { StatusCodeError } = require('../endpointHelper');
const { DB, Role } = require('./database');
const jwt = require('jsonwebtoken');
const config = require('../config')

jest.setTimeout(5 * 60 * 1000)

function randomString() {
	return Math.random().toString(36).substring(2, 12)
}

async function createAdmin() {
	const name = randomString()
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
	const name = randomString()
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
	const name = randomString()
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
	const newEmail = randomString() + "@diner.com"
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
	const franchise = {name: randomString(), admins: [{email: diner.email}]}

	const newFranchise = await DB.createFranchise(franchise)
	const franchisee = await DB.getUser(diner.email, diner.password)

	expect(newFranchise).toHaveProperty('id')
	expect(franchisee.roles).toContainEqual({objectId: newFranchise.id, role: Role.Franchisee})
})

test('create franchise 404', async () => {
	const diner = await createDiner()
	const franchise = {name: randomString(), admins: [{email: 'nouser@test.com'}]}

	await expect(async () => await DB.createFranchise(franchise)).rejects.toThrow(StatusCodeError)
	await expect(async () => await DB.createFranchise(franchise)).rejects.toThrow('unknown user for franchise admin')
})

test('create franchise owner', async () => {
	const franchiseOwner = await createDiner()
	let franchise = {name: randomString(), admins: [{email: franchiseOwner.email}]}
	franchise = await DB.createFranchise(franchise)

	const name = randomString()
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
	const franchise = {name: randomString(), admins: [{email: diner.email}]}
	const {id, ...rest} = await DB.createFranchise(franchise)

	const newFranchise = await DB.getFranchise({id})

	expect(newFranchise.admins).toContainEqual({id: diner.id, name: diner.name, email: diner.email})
	expect(newFranchise.id).toBe(id)
})

test('get franchises', async () => {
	const diner = await createDiner()
	let franchises = []
	for (let i = 0; i < 3; i++) {
		const franchise = {name: randomString(), admins: [{email: diner.email}]}
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
		const franchise = {name: randomString(), admins: [{email: diner.email}]}
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
	const franchise = {name: randomString(), admins: [{email: diner.email}]}
	const newFranchise = await DB.createFranchise(franchise)

	const userFranchises = await DB.getUserFranchises(diner.id)

	expect(userFranchises).toHaveLength(1)
	expect(userFranchises[0]).toMatchObject(newFranchise)
})

test('create store', async () => {
	const diner = await createDiner()
	const franchise = {name: randomString(), admins: [{email: diner.email}]}
	const newFranchise = await DB.createFranchise(franchise)
	const storeName = randomString()

	const store = await DB.createStore(newFranchise.id, {name: storeName})
	const getFranchise = await DB.getFranchise(newFranchise)

	expect(store).toHaveProperty('id')
	expect(store.franchiseId).toBe(newFranchise.id)
	expect(store.name).toBe(storeName)
	expect(getFranchise.stores).toHaveLength(1)
	expect(getFranchise.stores[0]).toMatchObject({id: store.id, name: storeName})
})

test('delete store', async () => {
	const diner = await createDiner()
	const franchise = await DB.createFranchise({name: randomString(), admins: [{email: diner.email}]})
	const store = await DB.createStore(franchise.id, {name: randomString()})
	let getFranchise = await DB.getFranchise(franchise)
	expect(getFranchise.stores).toHaveLength(1)

	await DB.deleteStore(franchise.id, store.id)

	getFranchise = await DB.getFranchise(franchise)
	expect(getFranchise.stores).toHaveLength(0)
})

test('delete franchise', async () => {
	const diner = await createDiner()
	const franchise = await DB.createFranchise({name: randomString(), admins: [{email: diner.email}]})
	const store = await DB.createStore(franchise.id, {name: randomString()})

	await DB.deleteFranchise(franchise.id)

	const getUserFranchises = await DB.getUserFranchises(diner.id)
	expect(getUserFranchises).toHaveLength(0)
})

test('add order', async () => {
	const diner = await createDiner()
	const franchise = await DB.createFranchise({name: randomString(), admins: [{email: diner.email}]})
	const store = await DB.createStore(franchise.id, {name: randomString()})
	const honeySerrano = await DB.addMenuItem({title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	)
	const order = {
		franchiseId: franchise.id,
		storeId: store.id,
		items: [{menuId: honeySerrano.id, description: honeySerrano.description, price: honeySerrano.price}]
	}

	const addedOrder = await DB.addDinerOrder(diner, order)

	expect(addedOrder).toHaveProperty('id')
	expect(addedOrder).toMatchObject(order)
})

test('get orders', async () => {
	const diner = await createDiner()
	const franchise = await DB.createFranchise({name: randomString(), admins: [{email: diner.email}]})
	const store = await DB.createStore(franchise.id, {name: randomString()})
	const honeySerrano = await DB.addMenuItem({title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	)
	const order = {
		franchiseId: franchise.id,
		storeId: store.id,
		items: [{menuId: honeySerrano.id, description: honeySerrano.description, price: honeySerrano.price}]
	}
	await DB.addDinerOrder(diner, order)
	await DB.addDinerOrder(diner, order)

	const dinerOrders = await DB.getOrders(diner)

	expect(dinerOrders.dinerId).toBe(diner.id)
	expect(dinerOrders.orders).toHaveLength(2)
})

test('get orders multiple pages', async () => {
	const diner = await createDiner()
	const franchise = await DB.createFranchise({name: randomString(), admins: [{email: diner.email}]})
	const store = await DB.createStore(franchise.id, {name: randomString()})
	const honeySerrano = await DB.addMenuItem({title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	)
	const order = {
		franchiseId: franchise.id,
		storeId: store.id,
		items: [{menuId: honeySerrano.id, description: honeySerrano.description, price: honeySerrano.price}]
	}
	await DB.addDinerOrder(diner, order)
	await DB.addDinerOrder(diner, order)

	config.db.listPerPage = 1
	const page1 = await DB.getOrders(diner, 1)
	const page2 = await DB.getOrders(diner, 2)

	expect(page1.orders).toHaveLength(1)
	expect(page2.orders).toHaveLength(1)
})