const request = require('supertest');
const app = require('../service');
const {createAdmin, createDiner, randomString} = require('../utils')

jest.setTimeout(60 * 1000 * 5);

let adminUser
let adminToken
let diner
let dinerToken

async function createFranchise() {
	const franchise = {name: randomString(), admins: [{email: adminUser.email}]}
	const addRes = await request(app)
		.post('/api/franchise')
		.set({Authorization: `Bearer ${adminToken}`})
		.send(franchise)
	return addRes.body
}

beforeAll(async () => {
	adminUser = await createAdmin()
	const adminRes = await request(app).put('/api/auth').send(adminUser)
	diner = await createDiner()
	const dinerRes = await request(app).put('/api/auth').send(diner)
	adminToken = adminRes.body.token
	dinerToken = dinerRes.body.token
})

test('add franchise', async () => {
	const franchise = {name: randomString(), admins: [{email: adminUser.email}]}
	const addRes = await request(app)
		.post('/api/franchise')
		.set({Authorization: `Bearer ${adminToken}`})
		.send(franchise)

	expect(addRes.status).toBe(200)
	expect(addRes.body.name).toBe(franchise.name)
	expect(addRes.body.admins).toHaveLength(1)
	expect(addRes.body.admins[0]).toMatchObject({name: adminUser.name, email: adminUser.email, id: adminUser.id})
	expect(addRes.body).toHaveProperty('id')
})

test('get franchise', async () => {
	const franchise = await createFranchise()
	const getRes = await request(app)
		.get('/api/franchise')
		.set({Authorization: `Bearer ${adminToken}`})

	expect(getRes.status).toBe(200)
	expect(getRes.body).toContainEqual({...franchise, stores: []})
})

test('get user franchises', async () => {
	const franchise = await createFranchise()
	const getRes = await request(app)
		.get(`/api/franchise/${adminUser.id}`)
		.set({Authorization: `Bearer ${adminToken}`})

	expect(getRes.status).toBe(200)
	expect(getRes.body).toContainEqual({...franchise, stores: []})
})

test('delete franchise', async () => {
	const franchise = await createFranchise()
	const deleteRes = await request(app)
		.delete(`/api/franchise/${franchise.id}`)
		.set({Authorization: `Bearer ${adminToken}`})
	const getRes = await request(app)
		.get('/api/franchise')
		.set({Authorization: `Bearer ${adminToken}`})

	expect(deleteRes.status).toBe(200)
	expect(getRes.body).not.toContainEqual({...franchise, stores: []})
})

test('create store', async () => {
	const franchise = await createFranchise()
	const store = {name: randomString()}

	const addRes = await request(app)
		.post(`/api/franchise/${franchise.id}/store`)
		.set({Authorization: `Bearer ${adminToken}`})
		.send(store)

	expect(addRes.status).toBe(200)
	expect(addRes.body).toMatchObject({...store, franchiseId: franchise.id})
	expect(addRes.body).toHaveProperty('id')
})

test('delete store', async () => {
	const franchise = await createFranchise()
	const addRes = await request(app)
		.post(`/api/franchise/${franchise.id}/store`)
		.set({Authorization: `Bearer ${adminToken}`})
		.send({name: randomString()})

	const deleteRes = await request(app)
		.delete(`/api/franchise/${franchise.id}/store/${addRes.body.id}`)
		.set({Authorization: `Bearer ${adminToken}`})

	const getRes = await request(app)
		.get(`/api/franchise/${adminUser.id}`)
		.set({Authorization: `Bearer ${adminToken}`})

	expect(deleteRes.status).toBe(200)
	expect(deleteRes.body).toMatchObject({ message: 'store deleted' })
	expect(getRes.body.find(f => f.id === franchise.id).stores).toHaveLength(0)
})

test('add franchise 403', async () => {
	const franchise = {name: randomString(), admins: [{email: adminUser.email}]}
	const addRes = await request(app)
		.post('/api/franchise')
		.set({Authorization: `Bearer ${dinerToken}`})
		.send(franchise)

	expect(addRes.status).toBe(403)
})

test('delete franchise 403', async () => {
	const franchise = await createFranchise()
	const deleteRes = await request(app)
		.delete(`/api/franchise/${franchise.id}`)
		.set({Authorization: `Bearer ${dinerToken}`})
	const getRes = await request(app)
		.get('/api/franchise')
		.set({Authorization: `Bearer ${adminToken}`})

	expect(deleteRes.status).toBe(403)
	expect(getRes.body).toContainEqual({...franchise, stores: []})
})

test('create store 403', async () => {
	const franchise = await createFranchise()
	const store = {name: randomString()}

	const addRes = await request(app)
		.post(`/api/franchise/${franchise.id}/store`)
		.set({Authorization: `Bearer ${dinerToken}`})
		.send(store)

	expect(addRes.status).toBe(403)
})

test('delete store 403', async () => {
	const franchise = await createFranchise()
	const addRes = await request(app)
		.post(`/api/franchise/${franchise.id}/store`)
		.set({Authorization: `Bearer ${adminToken}`})
		.send({name: randomString()})
	const deleteRes = await request(app)
		.delete(`/api/franchise/${franchise.id}/store/${addRes.body.id}`)
		.set({Authorization: `Bearer ${dinerToken}`})

	const getRes = await request(app)
		.get(`/api/franchise/${adminUser.id}`)
		.set({Authorization: `Bearer ${adminToken}`})

	expect(deleteRes.status).toBe(403)
	expect(getRes.body.find(f => f.id === franchise.id).stores).toHaveLength(1)
})