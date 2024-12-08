const express = require('express');
const cors = require('cors'); // Enable CORS
const bodyParser = require('body-parser');
const mysql = require('mysql2'); // Using mysql2
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '10mb' })); // Increase size limit for base64 images

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
        process.exit(1); // Exit the application on connection failure
    }
    console.log('Connected to MySQL database');
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint: Add a Book
app.post('/books', (req, res) => {
    const { title, author, genre, rating, description, image } = req.body;

    if (!title || !author || !genre || !rating || !description || !image) {
        return res.status(400).send({ message: 'All fields are required' });
    }

    // Save the image
    const imageBuffer = Buffer.from(image, 'base64');
    const imagePath = `uploads/${Date.now()}.png`;
    fs.writeFileSync(path.join(__dirname, imagePath), imageBuffer);

    // Save book details to the database
    connection.query(
        'INSERT INTO books (title, author, genre, rating, description, cover_image) VALUES (?, ?, ?, ?, ?, ?)',
        [title, author, genre, rating, description, imagePath],
        (err, results) => {
            if (err) {
                console.error('Error adding book:', err);
                return res.status(500).send('Error adding book');
            }
            res.status(201).send({ id: results.insertId, imagePath });
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
app.put('/books/:id', (req, res) => {
    const { id } = req.params;
    const { title, author, genre, rating, description, image } = req.body;

    let imagePath = null;
    if (image) {
        const imageBuffer = Buffer.from(image, 'base64');
        imagePath = `uploads/${Date.now()}.png`;
        fs.writeFileSync(path.join(__dirname, imagePath), imageBuffer);
    }

    const query = `
        UPDATE books
        SET
          title = ?,
          author = ?,
          genre = ?,
          rating = ?,
          description = ?,
          cover_image = IFNULL(?, cover_image)
        WHERE id = ?
    `;
    connection.query(query, [title, author, genre, rating, description, imagePath, id], (err, results) => {
        if (err) {
            console.error('Error updating book:', err);
            return res.status(500).send('Error updating book');
        }
        res.send({ message: 'Book updated successfully' });
    });
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
