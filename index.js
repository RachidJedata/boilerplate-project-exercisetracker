const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Serve the homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Define the schema
const schema = new mongoose.Schema({
  username: String,
  log: [{
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: String,
  }],
});

// Create the model
const exercise = mongoose.model('exercise', schema);

// Add a new user
const addUser = async (username) => {
  const newUser = new exercise({ username });
  return await newUser.save();
};

// Find users
const findUsers = async (query) => {
  return await exercise.find(query);
};

// Update user with exercise log
const updateUser = async (userId, data) => {
  try {
    const users = await findUsers({ _id: userId });
    const user = users[0];

    if (!user) return null;

    user.log.push(data);
    await user.save();

    return user;
  } catch (err) {
    console.error('Error updating user:', err);
    throw err;
  }
};

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  const userName = req.body.username;

  try {
    const docs = await findUsers({ username: userName });

    if (docs.length === 0) {
      const oneDoc = await addUser(userName);
      return res.json({
        username: oneDoc.username,
        _id: oneDoc._id,
      });
    } else {
      return res.json({
        username: docs[0].username,
        _id: docs[0]._id,
      });
    }
  } catch (err) {
    return res.json({ error: err.message });
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  const users = await findUsers({});
  const formattedUsers = users.map(({ _id, username }) => ({ _id, username }));

  res.json(formattedUsers);
});

// POST /api/users/:id/exercises - Add an exercise to a user
app.post('/api/users/:id/exercises', async (req, res) => {
  const userId = req.params.id;
  const data = {
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString(),
  };

  try {
    const updatedUser = await updateUser(userId, data);

    res.json({
      _id: userId,
      username: updatedUser.username,
      date: data.date,
      duration: data.duration,
      description: data.description,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id/logs - Get exercise logs for a user
app.get('/api/users/:id/logs', async (req, res) => {
  const userId = req.params.id;
  const { from, to, limit } = req.query;

  try {
    const users = await findUsers({ _id: userId });
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let logs = user.log.slice();

    // Filter logs by date range
    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(log => new Date(log.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(log => new Date(log.date) <= toDate);
    }

    // Apply limit
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    // Format logs
    const formattedLogs = logs.map(({ description, duration, date }) => ({
      description,
      duration,
      date,
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: formattedLogs.length,
      log: formattedLogs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});