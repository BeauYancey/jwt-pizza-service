const request = require('supertest');
const app = require('../service');

jest.setTimeout(60 * 1000 * 5);

const testUser = { name: 'pizza diner', password: 'verysecurepassword' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
	testUser.id = registerRes.body.user.id
  testUserAuthToken = registerRes.body.token;
});

test('register', async () => {
	const registerRes = await request(app).post('/api/auth').send(testUser)

	expect(registerRes.status).toBe(200)
	expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/)
	expect(registerRes.body.user).toMatchObject({email: testUser.email, name: testUser.name, roles: [{ role: 'diner'}]})
})

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);

  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  expect(loginRes.body.user).toMatchObject({id: testUser.id, email: testUser.email, name: testUser.name, roles: [{ role: 'diner'}]});
});

test('update user', async () => {
	const updateRes = await request(app)
		.put(`/api/auth/${testUser.id}`).send({})
		.set({Authorization: `Bearer ${testUserAuthToken}`})
		.send({email: testUser.email, password: 'v3rysecurep@ssword'})

	expect(updateRes.status).toBe(200)
	expect(updateRes.body).toMatchObject({id: testUser.id, email: testUser.email, name: testUser.name, roles: [{ role: 'diner'}]})
	testUser.password = 'v3rysecurep@ssword'
})

test('logout', async () => {
	const logoutRes = await request(app).delete('/api/auth').set({Authorization: `Bearer ${testUserAuthToken}`})

	expect(logoutRes.status).toBe(200)
	expect(logoutRes.body).toMatchObject({message: 'logout successful'})
})

test('ivalid register', async () => {
	const badUser = {email: 'noname@diner.com', password: 'idonthaveaname'}
	const registerRes = await request(app).post('/api/auth').send(badUser)

	expect(registerRes.status).toBe(400)
	expect(registerRes.body).toMatchObject({message: 'name, email, and password are required'})
})

test('invalid login', async () => {
	const badUser = testUser
	badUser.password += '12345'
	const loginRes = await request(app).put('/api/auth').send(badUser);

	expect(loginRes.status).toBe(404)
	expect(loginRes.body).toMatchObject({message: 'unknown user'})
})

test('invalid logout', async () => {
	const logoutRes = await request(app).delete('/api/auth')

	expect(logoutRes.status).toBe(401)
	expect(logoutRes.body).toMatchObject({message: 'unauthorized'})
})