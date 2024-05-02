const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

mongoose.connect(process.env.URL_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
});

const exerciseSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  unix: {
    type: Number,
    required: true,
  },
});

const User = mongoose.model('users', userSchema);
const Exercise = mongoose.model('exercises', exerciseSchema);

app.get('/api/users', async (req, res) => {
  try {
    let users = await User.find().exec();
    res.send(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    let username = req.body.username;
    let newUser = new User({
      username: username,
    });

    await newUser.save();

    res.json({
      username: newUser.username,
      _id: newUser._id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    let id = req.params._id;
    let description = req.body.description;
    let duration = req.body.duration;
    let date = req.body.date;
    let unix, newExercise;

    if (!date) {
      date = new Date().toDateString();
      unix = new Date().getTime();
    } else {
      unix = new Date(date).getTime();
      date = new Date(date).toDateString();
    }

    let user = await User.findById(id);

    if (!user) {
      return res.json({
        error: 'Invalid User',
      });
    }

    let newExerciseObj = new Exercise({
      user: id,
      date: date,
      unix: unix,
      duration: duration,
      description: description,
    });

    newExercise = await newExerciseObj.save();

    return res.send({
      _id: user._id,
      username: user.username,
      date: newExercise.date,
      duration: newExercise.duration,
      description: newExercise.description,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    let id = req.params._id;
    let from = req.query.from;
    let to = req.query.to;
    let limit = Number(req.query.limit);
    let from_milliseconds, to_milliseconds, count, exercises;

    let user = await User.findById(id).exec();

    if (!user) {
      return res.json({
        error: 'User is not registered',
      });
    }

    let query = { user: id };

    if (from) {
      from_milliseconds = new Date(from).getTime();
      query.unix = { $gte: from_milliseconds };
    }

    if (to) {
      to_milliseconds = new Date(to).getTime();
      query.unix = { ...query.unix, $lte: to_milliseconds };
    }

    count = await Exercise.find(query).countDocuments();

    if (!limit) {
      limit = count;
    }

    exercises = await Exercise.find(query)
      .select({ _id: 0, description: 1, duration: 1, date: 1 })
      .limit(limit)
      .exec();

    return res.send({
      username: user.username,
      count: count,
      _id: user._id,
      log: exercises,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

const formData = new FormData();
formData.append('username', 'newusername');

fetch('/api/users', {
  method: 'POST',
  body: formData,
})
.then(response => response.json())
.then(data => {
  console.log(data);
})
.catch(error => {
  console.error('Error:', error);
});