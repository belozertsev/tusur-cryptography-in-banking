const fetch = require('node-fetch')
const CryptoJS = require('crypto-js')
const express = require('express')

const app = express()

// Middleware для парсинга body в JSON
app.use(express.json({ extended: true }))


// Версия Алисы
const PRIVATE_KEY = 199
const PUBLIC_KEY = 197
const PORT = 8001
const FRIEND_PORT = 8002

// Версия Боба
// const PRIVATE_KEY = 157
// const PUBLIC_KEY = 151
// const PORT = 8002
// const FRIEND_PORT = 8001


var sessionKey = undefined


// http://localhost:port/publicKey
app.get('/publicKey', (req, res) => res.send({ publicKey: PUBLIC_KEY }))

// http://localhost:port/partialKey?partialKey=N
app.get('/partialKey', async (req, res) => {
	let friendPartialKey = req.query.partialKey
	sessionKey = BigInt(friendPartialKey) ** BigInt(PRIVATE_KEY) % BigInt(PUBLIC_KEY)

	let data = await fetch('http://localhost:' + FRIEND_PORT + '/publicKey')
	let friendPublicKey = await data.json()


	let partialKey = BigInt(friendPublicKey.publicKey) ** BigInt(PRIVATE_KEY) % BigInt(PUBLIC_KEY)

	res.send(JSON.stringify({ partialKey: Number(partialKey) }))
})

// http://localhost:port/newMessage?message=ENC_MSG
app.get('/newMessage', (req, res) => {
	console.log('~ New ecnrypted message received!')
	console.log('\tcurrent sesson key: ' + sessionKey)
	console.log('\tencrypted message (first ten charachers): ' + req.query.message.slice(0, 9))
	console.log('\tdecrypted message: ' + CryptoJS.AES.decrypt(req.query.message, sessionKey.toString()).toString(CryptoJS.enc.Utf8))

	res.send('ok')
})

// Через браузер [или Postman] [или что угодно] отправляем этот запрос и идем смотреть в консоль
// http://localhost:port/sendMessage?message=MSG
app.get('/sendMessage', async (req, res) => {

	let data = await fetch('http://localhost:' + FRIEND_PORT + '/publicKey')
	let friendPublicKey = await data.json()

	let partialKey = BigInt(PUBLIC_KEY) ** BigInt(PRIVATE_KEY) % BigInt(friendPublicKey.publicKey)

	data = await fetch('http://localhost:' + FRIEND_PORT + '/partialKey?partialKey=' + Number(partialKey))
	let friendPartialKey = await data.json()

	sessionKey = Number(BigInt(friendPartialKey.partialKey) ** BigInt(PRIVATE_KEY) % BigInt(friendPublicKey.publicKey))

	let encMessage = CryptoJS.AES.encrypt(req.query.message, sessionKey.toString()).toString()

	await fetch('http://localhost:' + FRIEND_PORT + '/newMessage?message=' + encMessage)
	res.send('Message sent!')
})

app.listen(PORT, () => {
	console.log('~ Server is listening on port ' + PORT)
})
