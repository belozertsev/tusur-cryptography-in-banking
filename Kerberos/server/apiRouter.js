const CryptoJS = require('crypto-js')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const express = require('express')
const router = express.Router()
const parseBody = express.json

// Настраиваем роутер
router.use(parseBody())

router.post('/getNewSession', async (req, res) => {
	// console.log('~ New request on /api/getNewSession:\n', req.body)

	const db = await open({
		filename: './server/database.sqlite3',
		driver: sqlite3.Database
	})

	// Проверяем пароль отправителя
	let user = await db.get('SELECT * FROM users WHERE email = ?', req.body.email)
	if (req.body.password != user?.password)
		return res.status(403).json('Wrong email/password')

	// Проверяем существование собеседника
	let fellow = await db.get('SELECT * FROM users WHERE email = ?', req.body.fellowEmail)
	if (!fellow)
		return res.status(400).json('Fellow not found')

	await db.close()

	// Генерируем пару
	let time = Date.now()
	let key = Math.floor(Math.random() * 10)
	let partOne = {
		time,
		ttl: 60000,
		key,
		fellowEmail: req.body.fellowEmail
	}
	let partTwo = {
		time,
		ttl: 60000,
		key,
		fellowEmail: req.body.email
	}
	// console.log('\tOur response: ', partOne, partTwo, '\n')

	// Шифруем пару и отправляем
	let encryptedPair = {
		partOne: CryptoJS.AES.encrypt(JSON.stringify(partOne), req.body.password).toString(),
		partTwo: CryptoJS.AES.encrypt(JSON.stringify(partTwo), fellow.password).toString()
	}
	res.json(encryptedPair)
})

router.post('/postNewMessage', async (req, res) => {
	// console.log('~ New request on /api/postNewMessage:\n', req.body)

	const db = await open({
		filename: './server/database.sqlite3',
		driver: sqlite3.Database
	})

	// Проверяем пароль отправителя
	let user = await db.get('SELECT * FROM users WHERE email = ?', req.body.email)
	if (req.body.password != user?.password)
		return res.status(403).json('Wrong email/password')

	// Проверяем существование собеседника
	let fellow = await db.get('SELECT * FROM users WHERE email = ?', req.body.fellowEmail)
	if (!fellow)
		return res.status(400).json('Fellow not found')

	// Сохраняем сообщение в БД
	let insertedMessageId = await db.run('INSERT INTO messages (timestamp, type, senderEmail, recipientEmail, text) VALUES (?, ?, ?, ?, ?)',
		Date.now(), req.body.type, req.body.email, req.body.fellowEmail, req.body.text
	)

	await db.close()

	res.send('Posted ' + req.body.type + ' with ID = ' + insertedMessageId)
})

router.post('/getAllMessages', async (req, res) => {
	// console.log('~ New request on /api/getAllMessages:\n', req.body)

	const db = await open({
		filename: './server/database.sqlite3',
		driver: sqlite3.Database
	})

	// Проверяем пароль отправителя
	let user = await db.get('SELECT * FROM users WHERE email = ?', req.body.email)
	if (req.body.password != user?.password)
		return res.status(403).json('Wrong email/password')

	// Выбираем из базы данных все сообщения ему
	let messages = await db.all('SELECT * FROM messages WHERE recipientEmail = ?', req.body.email)
	// console.log('\tMessages we selected: ', messages, '\n')

	// Отправляем все сообщения массивом
	messages.length == 0 ? res.json([]) : res.json(messages)
})

module.exports = router
