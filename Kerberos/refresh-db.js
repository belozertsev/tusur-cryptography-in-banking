const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
	const db = await open({
		filename: './server/database.sqlite3',
		driver: sqlite3.Database
	})

	await db.exec('CREATE TABLE IF NOT EXISTS users (email TEXT, password TEXT)')
	await db.run('INSERT INTO users (email, password) VALUES (?, ?)', 'alice', '123')
	await db.run('INSERT INTO users (email, password) VALUES (?, ?)', 'bob', '321')


	await db.exec('CREATE TABLE IF NOT EXISTS messages (timestamp INT, type TEXT, senderEmail TEXT, recipientEmail TEXT, text TEXT)')
	
})()