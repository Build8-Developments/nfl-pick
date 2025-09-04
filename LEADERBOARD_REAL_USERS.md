# Real Users Leaderboard

The leaderboard now uses real user data instead of mock data. Here's how to set it up and use it:

## Features

### ✅ Real User Data
- Displays actual usernames, avatars, and email addresses
- Shows real win/loss records and statistics
- Proper user information from the database

### ✅ Live Updates
- Real-time polling every 30 seconds
- Manual refresh button
- Visual feedback when data is updated

### ✅ Multiple Views
- **Season Standings**: Overall performance across all weeks
- **Weekly Results**: Live scoring for specific weeks
- **Scoring Breakdown**: Detailed breakdown by pick type

### ✅ Test Users
- Create sample users with realistic data
- Different performance levels and avatars
- Easy testing and demonstration

## Setup

### 1. Create Test Users

You can create test users in two ways:

#### Option A: Use the UI Button
1. Go to the Leaderboard page
2. Click the "Create Test Users" button
3. This will create 8 sample users with realistic data

#### Option B: Use the Test Script
```bash
cd server
node test-leaderboard.js
```

### 2. Test the Leaderboard

1. Navigate to the Leaderboard page
2. You should see real users with:
   - Profile pictures
   - Usernames
   - Email addresses
   - Win/loss records
   - Points and statistics

## API Endpoints

### Season Leaderboard
```
GET /api/v1/leaderboard
```
Returns overall season standings with user information.

### Weekly Leaderboard
```
GET /api/v1/live-scoring/leaderboard?week=1&season=2025
```
Returns weekly standings with live scoring data.

### Create Test Users
```
POST /api/v1/users/test-users
```
Creates sample users for testing (admin only).

## User Data Structure

Each user includes:
- `username`: Display name
- `avatar`: Profile picture URL
- `email`: Contact email
- `wins`: Number of correct picks
- `losses`: Number of incorrect picks
- `winPct`: Win percentage
- `totalPoints`: Total points earned
- `fantasyPoints`: Fantasy points (if available)

## Scoring System

- **Spread Picks**: 1 point each
- **Lock Pick**: 2 points
- **Touchdown Scorer**: 3 points
- **Prop Bet**: 5 points

## Real-time Updates

The leaderboard automatically updates every 30 seconds to show:
- Live game results
- Updated scores
- New picks submissions
- Real-time standings changes

## Troubleshooting

### No Users Showing
1. Click "Create Test Users" button
2. Check browser console for errors
3. Verify database connection

### Missing User Information
1. Check if users have complete profiles
2. Verify avatar URLs are accessible
3. Check database for user data integrity

### Stale Data
1. Click the refresh button
2. Wait for automatic polling (30 seconds)
3. Check network connectivity

## Development

To add more test users or modify existing ones, edit:
- `server/src/modules/users/user.controller.ts` - `createTestUsers` function
- `server/test-leaderboard.js` - Test script

To modify the leaderboard display, edit:
- `client/src/pages/Leaderboard.tsx` - Frontend component
- `server/src/modules/leaderboard/leaderboard.controller.ts` - Backend API
