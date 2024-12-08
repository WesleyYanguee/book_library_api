const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Database connection
const connection = mysql.createConnection(process.env.DATABASE_URL);

// Test endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the Book Library API!');
});

// Get all books
app.get('/books', (req, res) => {
    connection.query('SELECT * FROM books', (err, results) => {
        if (err) {
            console.error('Error fetching books:', err);
            res.status(500).send('Error fetching books');
        } else {
            res.send(results);
        }
    });
});

// Get a book by ID
app.get('/books/:id', (req, res) => {
    const id = req.params.id;
    connection.query('SELECT * FROM books WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching book by ID:', err);
            res.status(500).send('Error fetching book');
        } else {
            res.send(results);
        }
    });
});

// Add a new book
app.post('/books', (req, res) => {
    const { title, author, genre, rating, description } = req.body;
    connection.query(
        'INSERT INTO books (title, author, genre, rating, description) VALUES (?, ?, ?, ?, ?)',
        [title, author, genre, rating, description],
        (err, results) => {
            if (err) {
                console.error('Error adding book:', err);
                res.status(500).send('Error adding book');
            } else {
                res.status(201).send({ id: results.insertId });
            }
        }
    );
});

// Update a book
app.put('/books/:id', (req, res) => {
    const id = req.params.id;
    const { title, author, genre, rating, description } = req.body;
    connection.query(
        'UPDATE books SET title = ?, author = ?, genre = ?, rating = ?, description = ? WHERE id = ?',
        [title, author, genre, rating, description, id],
        (err, results) => {
            if (err) {
                console.error('Error updating book:', err);
                res.status(500).send('Error updating book');
            } else {
                res.send({ message: 'Book updated successfully' });
            }
        }
    );
});

// Delete a book
app.delete('/books/:id', (req, res) => {
    const id = req.params.id;
    connection.query('DELETE FROM books WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error deleting book:', err);
            res.status(500).send('Error deleting book');
        } else {
            res.send({ message: 'Book deleted successfully' });
        }
    });
});

// Server setup
app.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port 3000');
});

// Export the app for Vercel
module.exports = app;