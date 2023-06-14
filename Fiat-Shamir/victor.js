// Dependencies
const fetch = require('node-fetch')
const express = require('express')
const victor = express()
victor.use(express.json({ extended: true }))

// Ports
PEGGY_PORT = 8001
VICTOR_PORT = 8002

// Number of rounds in one challenge
ROUNDS_NUMBER = 1

victor.get('/challengeMe', async (req, res) => {
	let { randValueSquared, publicKey, n } = req.query
	console.log('Got randValueSqueared = ' + randValueSquared + ' (mod ' + n + ') ' + 'and publicKey = ' + publicKey)

	
	for (let round = 0; round < ROUNDS_NUMBER; round++) {
		process.stdout.write('Round' + (round + 1) + ' started ... ')

		let bit = Math.random() < 0.5
		let expectedSolution = randValueSquared * publicKey ** bit % n 

		responce = await fetch('http://localhost:' + PEGGY_PORT + '/question?bit=' + +bit)
		answer = await responce.json()

		if (answer.solution ** 2 % n != expectedSolution) {
			console.log('failed')
			console.log('Challenge was failed')
			return res.send({ isChallengeCompleted: false })
		}
		
		console.log('passed')
	}
	
	console.log('Challenge was passed!')
	res.send({ isChallengeCompleted: true })
})

victor.listen(VICTOR_PORT, () => console.log('~ Vityusha is listening on port ' + VICTOR_PORT))
