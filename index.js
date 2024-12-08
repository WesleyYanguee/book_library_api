const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // No size limit

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// MySQL Connection
const connection = mysql.createConnection({
    host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    user: '3SvqwQWBH7PTwSG.root',
    password: '28BawPbCAKzBBNu7',
    database: 'test',
    port: 4000,
    ssl: {
        rejectUnauthorized: true,
    },
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint: Add a Book
app.post('/books', async (req, res) => {
    const { title, author, genre, rating, description, image } = req.body;

    if (!title || !author || !genre || !rating || !description || !image) {
        return res.status(400).send({ message: 'All fields are required' });
    }

    const imageTypeMatch = image.match(/^data:image\/(\w+);base64,/);
    if (!imageTypeMatch) {
        return res.status(400).send({ message: 'Invalid image format' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const outputFilePath = `uploads/${Date.now()}.png`;

    try {
        await sharp(imageBuffer)
            .resize(720, 400, {
                fit: 'cover',
                position: 'center',
            })
            .png()
            .toFile(path.join(__dirname, outputFilePath));
    } catch (err) {
        console.error('Error processing image:', err);
        return res.status(500).send('Error processing image');
    }

    connection.query(
        'INSERT INTO books (title, author, genre, rating, description, cover_image) VALUES (?, ?, ?, ?, ?, ?)',
        [title, author, genre, rating, description, outputFilePath],
        (err, results) => {
            if (err) {
                console.error('Error adding book:', err);
                return res.status(500).send('Error adding book');
            }
            res.status(201).send({ id: results.insertId, imagePath: outputFilePath });
        }
    );
});

// Endpoint: Fetch All Books
app.get('/books', (req, res) => {
    connection.query('SELECT * FROM books', (err, results) => {
        if (err) {
            console.error('Error fetching books:', err);
            return res.status(500).send('Error fetching books');
        }

        const books = results.map((book) => ({
            ...book,
            coverImageUrl: book.cover_image ? `http://localhost:${port}/${book.cover_image}` : null,
        }));

        res.send(books);
    });
});

// Endpoint: Update a Book
app.put('/books/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, genre, rating, description, image } = req.body;

    let outputFilePath = null;
    if (image) {
        const imageTypeMatch = image.match(/^data:image\/(\w+);base64,/);
        if (!imageTypeMatch) {
            return res.status(400).send({ message: 'Invalid image format' });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        outputFilePath = `uploads/${Date.now()}.png`;

        try {
            await sharp(imageBuffer)
                .resize(720, 400, {
                    fit: 'cover',
                    position: 'center',
                })
                .png()
                .toFile(path.join(__dirname, outputFilePath));
        } catch (err) {
            console.error('Error processing image:', err);
            return res.status(500).send('Error processing image');
        }
    }

    connection.query(
        'UPDATE books SET title = ?, author = ?, genre = ?, rating = ?, description = ?, cover_image = IFNULL(?, cover_image) WHERE id = ?',
        [title, author, genre, rating, description, outputFilePath, id],
        (err, results) => {
            if (err) {
                console.error('Error updating book:', err);
                return res.status(500).send('Error updating book');
            }
            res.send({ message: 'Book updated successfully' });
        }
    );
});

// Endpoint: Delete Books (Bulk Delete)
app.post('/books/bulk-delete', (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
        return res.status(400).send({ message: 'Invalid request format' });
    }

    connection.query(
        'DELETE FROM books WHERE id IN (?)',
        [ids],
        (err, results) => {
            if (err) {
                console.error('Error deleting books:', err);
                return res.status(500).send('Error deleting books');
            }
            res.send({ message: 'Books deleted successfully' });
        }
    );
});

// Start the Server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
