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