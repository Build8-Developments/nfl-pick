// Simple test script to check if the leaderboard API is working
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testLeaderboardAPI() {
  console.log('Testing Leaderboard API...\n');

  try {
    // Test season leaderboard
    console.log('1. Testing season leaderboard...');
    const seasonResponse = await fetch(`${BASE_URL}/leaderboard`);
    const seasonData = await seasonResponse.json();
    
    console.log(`Status: ${seasonResponse.status}`);
    console.log(`Success: ${seasonData.success}`);
    console.log(`Data length: ${Array.isArray(seasonData.data) ? seasonData.data.length : 'N/A'}`);
    
    if (seasonData.message) {
      console.log(`Message: ${seasonData.message}`);
    }
    
    if (!seasonResponse.ok) {
      console.log(`Error: ${seasonData.message || 'Unknown error'}`);
    }
    
    console.log('');

    // Test weekly leaderboard
    console.log('2. Testing weekly leaderboard...');
    const weeklyResponse = await fetch(`${BASE_URL}/live-scoring/leaderboard?week=1&season=2025`);
    const weeklyData = await weeklyResponse.json();
    
    console.log(`Status: ${weeklyResponse.status}`);
    console.log(`Success: ${weeklyData.success}`);
    console.log(`Data length: ${Array.isArray(weeklyData.data) ? weeklyData.data.length : 'N/A'}`);
    
    if (weeklyData.message) {
      console.log(`Message: ${weeklyData.message}`);
    }
    
    if (!weeklyResponse.ok) {
      console.log(`Error: ${weeklyData.message || 'Unknown error'}`);
    }
    
    console.log('');

    // Test users endpoint
    console.log('3. Testing users endpoint...');
    const usersResponse = await fetch(`${BASE_URL}/users`);
    const usersData = await usersResponse.json();
    
    console.log(`Status: ${usersResponse.status}`);
    console.log(`Success: ${usersData.success}`);
    console.log(`Data length: ${Array.isArray(usersData.data) ? usersData.data.length : 'N/A'}`);
    
    if (usersData.message) {
      console.log(`Message: ${usersData.message}`);
    }
    
    if (!usersResponse.ok) {
      console.log(`Error: ${usersData.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error testing API:', error.message);
    console.log('\nPossible issues:');
    console.log('- Server is not running on port 3000');
    console.log('- Database connection issues');
    console.log('- CORS issues');
    console.log('- Missing dependencies');
  }
}

testLeaderboardAPI();
