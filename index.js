const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const cors = require('cors')
require('dotenv').config()


app.use(bodyParser.urlencoded({ extended: false }));
mongoose.connect(process.env.MONGO_URI);
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const schema = new mongoose.Schema({
  username: String,
  count: { type: Number, default: 0 },
  log: [{
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: String
  }]
});

const exercise = mongoose.model('exercise', schema);

const addUser = async (username) => {
  const newUser = new exercise({ username });
  return await newUser.save(); // Save the user and return the document
};

const findUsers = async (query) => {
  return await exercise.find(query); // Find users and return the documents
};

const updateUser = async (userId, data) => {
  try {
    // Find the user by ID
    const users = await findUsers({ _id: userId });
    const user = users[0]; // Get the first user in the array

    // If user doesn't exist, return null
    if (!user) return null;

    // Add the new log entry to the user's log array
    const exerciseCount = user.log.push(data);

    user.count = exerciseCount;

    // Save the updated user
    await user.save();

    // Return the updated user
    return user;
  } catch (err) {
    console.error('Error updating user:', err);
    throw err; // Re-throw the error for further handling
  }
};

app.route('/api/users')
  .post(async (req, res) => {
    const userName = req.body.username;

    try {
      // Check if the user already exists
      const docs = await findUsers({ username: userName });

      // If user doesn't exist, add them
      if (docs.length === 0) {
        const oneDoc = await addUser(userName);
        return res.json({
          username: oneDoc.username,
          _id: oneDoc._id
        });
      } else {
        // Return the existing user
        return res.json({
          username: docs[0].username,
          _id: docs[0]._id
        });
      }
    } catch (err) {
      return res.json({ error: err.message }); // Return error to the client
    }
  })
  .get(async (req, res) => {
    //get all users
    const users = await findUsers({});
    const formattedUsers = users.map(({ _id, username }) => ({ _id, username })); // Fix syntax here

    res.json(formattedUsers);
  })

app.post('/api/users/:id/exercises', async (req, res) => {

  const userId = req.params.id;
  const data = {
    description: req.body.description,
    duration: req.body.duration,
    date: (new Date(req.body.date)).toDateString()
  }
  const updatedUser = await updateUser(userId, data);

  res.json({
    _id:userId,
    username:updateUser.username,
    description: data.description,
    duration: data.duration,
    date: data.date,

  });

});

app.get('/api/users/:id/logs', async (req,res)=>{
  const users = findUsers({_id:req.params.id});
  const user = users[0];
  res.json(user);
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
