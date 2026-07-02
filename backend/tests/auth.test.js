import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../index.js'

test('register and login flow works', async () => {
  const app = createApp()
  const email = `backendtester+${Date.now()}@example.com`

  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: `backendtester${Date.now()}`,
      name: 'Backend Tester',
      email,
      password: 'securepass123',
      role: 'employee',
      department: 'Engineering',
      contact: '1234567890',
    })

  assert.equal(registerResponse.status, 201)
  assert.equal(registerResponse.body.user.email, email)

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      identifier: email,
      password: 'securepass123',
    })

  assert.equal(loginResponse.status, 200)
  assert.ok(loginResponse.body.token)
  assert.equal(loginResponse.body.user.email, email)
})
