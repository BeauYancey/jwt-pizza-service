const request = require('supertest');
const app = require('./service');

test('docs', async () => {
	const docsRes = await request(app).get('/api/docs')

	expect(docsRes.status).toBe(200)
	expect(docsRes.body).toHaveProperty('version')
	expect(docsRes.body).toHaveProperty('config')
	expect(docsRes.body).toHaveProperty('endpoints')
	expect(docsRes.body.endpoints.length).toBeGreaterThan(0)
})

test('app home', async () => {
	const homeRes = await request(app).get('/')

	expect(homeRes.status).toBe(200)
	expect(homeRes.body).toMatchObject({message: 'welcome to JWT Pizza'})
})

test('unknown endpoint', async () => {
	const unknownRes = await request(app).get('/badendpoint')

	expect(unknownRes.status).toBe(404)
	expect(unknownRes.body).toMatchObject({message: 'unknown endpoint'})
})