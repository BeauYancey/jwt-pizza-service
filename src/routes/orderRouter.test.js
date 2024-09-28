const request = require('supertest');
const app = require('../service');
const {createAdmin, createDiner, createStore} = require('../utils')

jest.setTimeout(60 * 1000 * 5);

let adminUser
let adminToken
let diner
let dinerToken
let store

beforeAll(async () => {
	adminUser = await createAdmin()
	diner = await createDiner()
	store = await createStore(adminUser)
	const adminRes = await request(app).put('/api/auth').send(adminUser)
	const dinerRes = await request(app).put('/api/auth').send(diner)
	adminToken = adminRes.body.token
	dinerToken = dinerRes.body.token
})

test('add menu item', async () => {
	const honeySerrano = {title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	const before = await request(app).get('/api/order/menu')
	const addRes = await request(app)
		.put('/api/order/menu')
		.set({Authorization: `Bearer ${adminToken}`})
		.send(honeySerrano)
	const after = await request(app).get('/api/order/menu')

	expect(addRes.status).toBe(200)
	expect(after.body.length).toBe(before.body.length + 1)
})

test('get menu', async () => {
	const getRes = await request(app).get('/api/order/menu')

	expect(getRes.status).toBe(200)
	expect(getRes.body).toBeInstanceOf(Array)
})

test('add menu item 403', async () => {
	const honeySerrano = {title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	const before = await request(app).get('/api/order/menu')
	const addRes = await request(app)
		.put('/api/order/menu')
		.set({Authorization: `Bearer ${dinerToken}`})
		.send(honeySerrano)
	const after = await request(app).get('/api/order/menu')

	expect(addRes.status).toBe(403)
	expect(after.body.length).toBe(before.body.length)
})

test('create order', async () => {

	global.fetch = async () => ({
		status: 200,
		ok: true,
		json: async () => ({
			jwt: 'part1.part2.part3',
			reportUrl: 'pizza.yanceydev.com'
		})
	})

	const honeySerrano = {title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	const menu = await request(app)
		.put('/api/order/menu')
		.set({Authorization: `Bearer ${adminToken}`})
		.send(honeySerrano)
	const order = {franchiseId: store.franchiseId, storeId: store.id, items: [{menuId: menu.body[0].id, description: menu.body[0].description, price: menu.body[0].price}]}
	const addRes = await request(app)
		.post('/api/order')
		.set({Authorization: `Bearer ${dinerToken}`})
		.send(order)

	expect(addRes.status).toBe(200)
	expect(addRes.body.jwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/)
})

test('create order factory failure', async () => {
	global.fetch = async () => ({
		status: 500,
		ok: false,
		json: async () => ({
			reportUrl: 'pizza.yanceydev.com'
		})
	})

	const honeySerrano = {title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	const menu = await request(app)
		.put('/api/order/menu')
		.set({Authorization: `Bearer ${adminToken}`})
		.send(honeySerrano)
	const order = {franchiseId: store.franchiseId, storeId: store.id, items: [{menuId: menu.body[0].id, description: menu.body[0].description, price: menu.body[0].price}]}
	const addRes = await request(app)
		.post('/api/order')
		.set({Authorization: `Bearer ${dinerToken}`})
		.send(order)

	expect(addRes.status).toBe(500)
	expect(addRes.body).toMatchObject({ message: 'Failed to fulfill order at factory', reportUrl: 'pizza.yanceydev.com' })
})

test('get orders', async () => {
	global.fetch = async () => ({
		status: 200,
		ok: true,
		json: async () => ({
			jwt: 'part1.part2.part3',
			reportUrl: 'pizza.yanceydev.com'
		})
	})

	const honeySerrano = {title: 'honey serrano', description: 'sweet and spicy', image: 'honey.png', price: 0.002}
	const menu = await request(app)
		.put('/api/order/menu')
		.set({Authorization: `Bearer ${adminToken}`})
		.send(honeySerrano)
	const order = {franchiseId: store.franchiseId, storeId: store.id, items: [{menuId: menu.body[0].id, description: menu.body[0].description, price: menu.body[0].price}]}
	const addRes = await request(app)
		.post('/api/order')
		.set({Authorization: `Bearer ${dinerToken}`})
		.send(order)
	const getRes = await request(app)
		.get('/api/order')
		.set({Authorization: `Bearer ${dinerToken}`})

	expect(getRes.status).toBe(200)
	expect(getRes.body.dinerId).toBe(diner.id)
	expect(getRes.body.orders.length).toBeGreaterThan(0)
})