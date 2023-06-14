function clearSessionStorage() {
	sessionStorage.clear()
}

// Получение сессионного ключа и отправка сообщений
function loginButtonHandler() {
	// Сохранили введенные email и password в sessionStorage
	let emailField = document.getElementById('emailField')
	let passwordField = document.getElementById('passwordField')

	let email = emailField.value
	let password = passwordField.value

	if (!email || !password)
		return alert('Email and password fields must not be empty!')

	sessionStorage.setItem('email', email)
	sessionStorage.setItem('password', password)
	sessionStorage.setItem('session', '{}')

	// Скрыли authPage
	// Отрисовали email и password в mainPage и показали mainPage
	let authPage = document.getElementById('authPage')
	let mainPage = document.getElementById('mainPage')
	let infoEmail = document.getElementById('infoEmail')
	let infoPassword = document.getElementById('infoPassword')
	let infoSessionKey = document.getElementById('infoSessionKey')

	infoEmail.innerText = sessionStorage.getItem('email')
	infoPassword.innerText = sessionStorage.getItem('password')
	infoSessionKey.innerText = JSON.parse(sessionStorage.getItem('session')).key

	authPage.style.display = 'none'
	mainPage.style.display = 'block'

	// Зациклили отрисовку получаемых сообщений
	// (я пока не знаю ничего про сокеты или длинные запросы)
	setInterval(drawMessages, 5000)
}

async function sendButtonHandler() {
	// Проверили на пустоту fellowEmail и message
	let fellowEmailField = document.getElementById('fellowEmailField')
	let messageField = document.getElementById('messageField')

	let fellowEmail = fellowEmailField.value
	let message = messageField.value

	if (!fellowEmail || !message)
		return alert('Friend\'s email and message fields must not be empty!')

	// Проверяем наличие сессионного ключа и его актуальность
	let session = JSON.parse(sessionStorage.getItem('session'))
	if (!session.key || session.time + session.ttl < Date.now()) {
		await getNewSession(fellowEmail)
		session = JSON.parse(sessionStorage.getItem('session'))
	}

	// Отправили зашифрованное сессионным ключом сообщение
	let encryptedMessage = CryptoJS.AES.encrypt(message, session.key.toString()).toString()
	await postNewMessage('encrypted-message', fellowEmail, encryptedMessage)
	alert('posted encrypted-message')
}

async function getNewSession(fellowEmail) {
	// Отправили на сервер { email, password, fellowEmail }
	// Получили с сервера пару значений: одно для себя, другое для отправки другу
	let encryptedPairRaw = await fetch('/api/getNewSession', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json;charset=utf-8' },
		body: JSON.stringify({
			email: sessionStorage.getItem('email'),
			password: sessionStorage.getItem('password'),
			fellowEmail
		})
	})
	encryptedPair = await encryptedPairRaw.json()
	alert('got new session')

	// Расшифровали свою часть
	// Записали информацию о сессии в sessionStorage
	// Перерисовали infoSessionKey
	let encryptedPartOne = encryptedPair.partOne
	let decryptedPartOne = JSON.parse(CryptoJS.AES.decrypt(encryptedPartOne, sessionStorage.getItem('password')).toString(CryptoJS.enc.Utf8))
	sessionStorage.setItem('session', JSON.stringify({
		time: decryptedPartOne.time,
		ttl: decryptedPartOne.ttl,
		key: decryptedPartOne.key
	}))
	document.getElementById('infoSessionKey').innerText = JSON.parse(sessionStorage.getItem('session')).key

	// Отправили сервисное сообщение собеседнику
	let encryptedPartTwo = encryptedPair.partTwo
	await postNewMessage('service-message', decryptedPartOne.fellowEmail, encryptedPartTwo)
	alert('posted servise-message')
}

async function postNewMessage(type, fellowEmail, message) {
	let responce = await fetch('/api/postNewMessage', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json;charset=utf-8' },
		body: JSON.stringify({
			type,
			email: sessionStorage.getItem('email'),
			password: sessionStorage.getItem('password'),
			fellowEmail,
			text: message
		})
	})
}

// Отрисовка сообщений
async function drawMessages() {
	// Отправили запрос на получение массива всех сообщений в формате { email, password } на api/getAllMessages()
	let responce = await fetch('/api/getAllMessages', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json;charset=utf-8' },
		body: JSON.stringify({
			email: sessionStorage.getItem('email'),
			password: sessionStorage.getItem('password')
		})
	})
	messagesList = await responce.json()

	// Обрабатывать массив по порядку в цикле:
	// если сообщение сервисное, то расшифровать его на своем пароле, установить новый сессионный ключ и ничего не отрисовывать
	// если сообщение обычное, то расшифровать его текущим сессионным ключем и отрисовать в блок <div id="receivedMessages"></div>
	let receivedMessages = document.getElementById('receivedMessages')
	let HTMLstring = ''

	messagesList.forEach(message => {
		if (message.type == 'service-message') {
			const decryptedText = JSON.parse(CryptoJS.AES.decrypt(message.text, sessionStorage.getItem('password')).toString(CryptoJS.enc.Utf8))
			let session = {
				time: decryptedText.time,
				ttl: decryptedText.ttl,
				key: decryptedText.key
			}
			sessionStorage.setItem('session', JSON.stringify(session))

			let infoSessionKey = document.getElementById('infoSessionKey')
			let fellowEmailField = document.getElementById('fellowEmailField')
			infoSessionKey.innerText = JSON.parse(sessionStorage.getItem('session')).key
			fellowEmailField.value = decryptedText.fellowEmail
		} else {
			// расшифровывать на текущем сессионном ключе и отрисовывать, больше ничего
			let currectSessionKey = JSON.parse(sessionStorage.getItem('session')).key.toString()
			let decrText = CryptoJS.AES.decrypt(message.text, currectSessionKey).toString(CryptoJS.enc.Utf8)
			
			HTMLstring += `
				<div>time: ${message.timestamp}</div>
				<div>from: ${message.senderEmail}</div>
				<div>Encrypted: \"${message.text}\"</div>
				<div>Decrypted: \"${decrText}\"</div>
				<br/>`
		}
	})
	receivedMessages.innerHTML = HTMLstring
}
