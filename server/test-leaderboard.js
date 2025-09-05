// Test script to create sample data for leaderboard testing
const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model.js').default;
const Pick = require('./src/modules/picks/pick.model.js').default;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nfl-pick';

async function createTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test users
    const testUsers = [
      {
        username: "NFLFan2025",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "nflfan@example.com",
        points: 150,
        totalBets: 12,
        correctBets: 8
      },
      {
        username: "PickMaster",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "pickmaster@example.com",
        points: 200,
        totalBets: 15,
        correctBets: 12
      },
      {
        username: "TouchdownTom",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "tom@example.com",
        points: 175,
        totalBets: 10,
        correctBets: 7
      },
      {
        username: "SpreadKing",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "spreadking@example.com",
        points: 125,
        totalBets: 8,
        correctBets: 5
      },
      {
        username: "LockLegend",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "legend@example.com",
        points: 300,
        totalBets: 20,
        correctBets: 18
      }
    ];

    // Create users
    const createdUsers = [];
    for (const userData of testUsers) {
      try {
        const existingUser = await User.findOne({ username: userData.username });
        if (existingUser) {
          console.log(`User ${userData.username} already exists, skipping...`);
          createdUsers.push(existingUser);
        } else {
          const user = await User.create(userData);
          createdUsers.push(user);
          console.log(`Created user: ${user.username}`);
        }
      } catch (error) {
        console.log(`Error creating user ${userData.username}:`, error.message);
      }
    }

    // Create sample picks for week 1
    const samplePicks = [
      {
        user: createdUsers[0]._id,
        week: 1,
        selections: {
          "game1": "KC",
          "game2": "BUF", 
          "game3": "DAL",
          "game4": "SF"
        },
        lockOfWeek: "KC",
        touchdownScorer: "player123",
        propBet: "Over 2.5 touchdowns in KC game",
        isFinalized: true,
        outcomes: {
          "game1": true,
          "game2": false,
          "game3": true,
          "game4": true
        }
      },
      {
        user: createdUsers[1]._id,
        week: 1,
        selections: {
          "game1": "KC",
          "game2": "BUF",
          "game3": "DAL", 
          "game4": "SF"
        },
        lockOfWeek: "BUF",
        touchdownScorer: "player456",
        propBet: "Under 50 total points",
        isFinalized: true,
        outcomes: {
          "game1": true,
          "game2": true,
          "game3": true,
          "game4": false
        }
      },
      {
        user: createdUsers[2]._id,
        week: 1,
        selections: {
          "game1": "KC",
          "game2": "BUF",
          "game3": "DAL",
          "game4": "SF"
        },
        lockOfWeek: "DAL",
        touchdownScorer: "player789",
        propBet: "KC wins by 7+ points",
        isFinalized: true,
        outcomes: {
          "game1": true,
          "game2": false,
          "game3": true,
          "game4": true
        }
      }
    ];

    // Create picks
    for (const pickData of samplePicks) {
      try {
        const existingPick = await Pick.findOne({ 
          user: pickData.user, 
          week: pickData.week 
        });
        if (existingPick) {
          console.log(`Pick for user ${pickData.user} week ${pickData.week} already exists, skipping...`);
        } else {
          const pick = await Pick.create(pickData);
          console.log(`Created pick for user ${pickData.user} week ${pickData.week}`);
        }
      } catch (error) {
        console.log(`Error creating pick:`, error.message);
      }
    }

    console.log('Test data creation completed!');
    console.log(`Created ${createdUsers.length} users`);
    console.log('You can now test the leaderboard with real user data.');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestData();
