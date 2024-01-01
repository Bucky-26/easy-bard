import express from 'express';
import Bard from 'bard-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fsPromises } from 'fs';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 8888;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const token = 'eghJFK_OvFiUfoJgrRGdfm5mJunbG4mF57bQ5UVsqSR0yeRzUbURj10n169h7UdcaEnecQ.';
app.use(express.json());

const jsonFilePath = join(__dirname, '/_conversation.json');
const imgFolderPath = join(__dirname, '/image');

fsPromises.mkdir(imgFolderPath, { recursive: true })
	.catch(err => {
		console.error('Error creating "img" folder:', err);
	});

async function updateUserData(userId, newData) {
	try {
		const fileContent = await fsPromises.readFile(jsonFilePath, 'utf-8');
		const jsonData = JSON.parse(fileContent);

		if (jsonData.hasOwnProperty(userId)) {
			jsonData[userId] = { ...jsonData[userId], ...newData };
			console.log('Data updated successfully:', jsonData[userId]);
		} else {
			jsonData[userId] = newData;
			console.log('New data added successfully:', jsonData[userId]);
		}

		await fsPromises.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
	} catch (error) {
		console.error('Error retrieving or updating data in the JSON file:', error);
	}
}

async function getUserDataById(userId) {
	try {
		const fileContent = await fsPromises.readFile(jsonFilePath, 'utf-8');
		const jsonData = JSON.parse(fileContent);

		return jsonData.hasOwnProperty(userId) ? jsonData[userId] : null;
	} catch (error) {
		throw new Error('Error retrieving data from JSON file: ' + error.message);
	}
}

app.get('/api/bard', async (req, res) => {
	const _message = req.query.message;
	const _id = req.query.id;
	let _image_url = req.query.url;
	const _api = req.query.api;

	if (_api !== 'easy2023') {
		return res.status(401).json({ error: "Unauthorized request invalid 'api'" });
	} else if (!_message || !_id) {
		return res.status(400).json({ error: "Required query parameters missing" });
	}

	try {
		const bard = new Bard(token);
		const _ids = await getUserDataById(_id);

		if (_image_url) {
			const imageResponse = await fetch(_image_url);
			const imageBuffer = await imageResponse.buffer();
			const imageName = `${_id}_image.jpg`;
			const imagePath = join(imgFolderPath, imageName);

			await fsPromises.writeFile(imagePath, imageBuffer);
			_image_url = imagePath;
		}

		let myChat = bard.createChat(_ids);
		const ress = await myChat.ask(_message, { image: _image_url, format: Bard.JSON });
		let data = ress;
		let content = data.content + "\n\nThis API is Develop And Maintain By EASY API\nIn EASY API we make it EASY";
		let images = data.images.map(image => image.url);
		res.json({
			content,
			images
		});
		const chat = await myChat.export();
		await updateUserData(_id, chat);
	} catch (error) {
		console.error('Error calling Bard API:', error);
		res.status(500).json({ error: 'Error calling Bard API' });
	}
});
app.get('/', (req, res) => {
	res.sendStatus(200);
});
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
