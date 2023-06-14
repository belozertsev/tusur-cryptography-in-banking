// Dependencies
const fetch = require('node-fetch')
const express = require('express')
const peggy = express()
peggy.use(express.json({ extended: true }))

// Ports
PEGGY_PORT = 8001
VICTOR_PORT = 8002

// Values given from Above =)
const P = 5
const Q = 7
let N = P * Q

// Global variables
let privateKey
let publicKey
let randValue

// Some usefull functions
function findGreatestCommonDivisor(a, b) {
	while (a != 0 && b != 0) {
		a > b ? a = a % b : b = b % a
	}

	return a + b
}

function generateCoprime(n) {
	let candidate, gsd

	do {
		candidate = Math.floor(Math.random() * n)
		gsd = findGreatestCommonDivisor(candidate, n)
	} while (gsd != 1)

	return candidate
}

function calculatePublicKey(privateKey, module) {
	return privateKey ** 2 % module
}

function generateRandomLessThan(n) {
	let r

	do {
		r = Math.floor(Math.random() * n)	
	} while (r == 0)

	return r
}

// Main function of the protocol
// It initializes Peggy's key pair and sends challengeMe request to Victor
async function runProtocol() {
	privateKey = generateCoprime(N)
	publicKey = calculatePublicKey(privateKey, N)
	console.log('Private key (s) - ' + privateKey + ';\nPublic key (v) - ' + publicKey)
	
	randValue = generateRandomLessThan(N)
	let randValueSquared = randValue ** 2 % N
	console.log('Random value (r) - ' + randValue)
	
	console.log('Sent quared value (' + randValueSquared + ') and public key to Victor')
	responce = await fetch('http://localhost:' + VICTOR_PORT + '/challengeMe?randValueSquared=' + randValueSquared + '&publicKey=' + publicKey + '&n=' + N)
	let result = await responce.json()

	console.log('Got responce from Victor:\n' + JSON.stringify(result))
}

peggy.get('/question', (req, res) => {
	let bit = req.query.bit
	console.log('Got question from Victor: ' + JSON.stringify(req.query))

	let answer = { solution: randValue * privateKey ** bit }
	res.send(answer)
	console.log('\tand answered with: ' + JSON.stringify(answer))
})

peggy.get('/', (req, res) => {
	res.send({ message: 'Запрос услышан, запрос обработан' })
	runProtocol()
})

peggy.listen(PEGGY_PORT, () => console.log('~ Peggy is listening on port ' + PEGGY_PORT))
