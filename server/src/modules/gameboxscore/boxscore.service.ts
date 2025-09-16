import { getNFLGameBoxscore } from "../../api/nfl.js";
import { GameBoxscore } from "./boxscore.model.js";

export async function getGameboxscoreService(gameId: string) {
  try {
    const boxscore = await GameBoxscore.findOne({ gameId });

    if (!boxscore) {
      await upsertBoxscoreData(gameId);
      return "Boxscore data is being fetched and will be available shortly.";
    }

    return boxscore;
  } catch (error) {
    console.error("Error fetching boxscore:", error);
    throw error;
  }
}

export async function upsertBoxscoreData(gameId: string) {
  try {
    const { body: data } = await getNFLGameBoxscore(gameId);

    let boxscoreData;
    let queryGameId;

    // Check if the API returned an error (game hasn't started)
    if (data.error) {
      if (!gameId) {
        throw new Error("gameId is required when game hasn't started yet");
      }

      // Create a scheduled game entry with default/null values
      boxscoreData = {
        gameId: gameId,
        gameStatus: "scheduled",
        away: {
          teamId: null,
          teamAvbr: null,
          points: 0,
          result: null,
        },
        home: {
          teamId: null,
          teamAvbr: null,
          points: 0,
          result: null,
        },
        gameWeek: 0,
        scoringPlays: [],
      };
      queryGameId = gameId;
    } else {
      // Transform the API data to match your schema (when game has data)
      boxscoreData = {
        gameId: data.gameID,
        gameStatus: data.gameStatus,
        away: {
          teamId: data.teamIDAway,
          teamAvbr: data.away,
          points: parseInt(data.awayPts),
          result: data.awayResult,
        },
        home: {
          teamId: data.teamIDHome,
          teamAvbr: data.home,
          points: parseInt(data.homePts),
          result: data.homeResult,
        },
        gameWeek: parseInt((data.gameWeek as string).replace("Week ", "")),
        scoringPlays: data.scoringPlays.map((play: any) => ({
          teamID: play.teamID,
          scoreType: play.scoreType,
          team: play.team,
          playerIDs: play.playerIDs,
        })),
      };
      queryGameId = data.gameID;
    }

    console.log(boxscoreData);

    // Use findOneAndUpdate with upsert to avoid duplicates
    const boxscore = await GameBoxscore.findOneAndUpdate(
      { gameId: queryGameId }, // Find by gameId
      boxscoreData, // Update with new data
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return updated document
        runValidators: true, // Run schema validations
      }
    );

    console.log(
      `Boxscore ${data.error ? "scheduled game" : "upserted"} successfully:`,
      boxscore._id
    );
    return boxscore;
  } catch (error) {
    console.error("Error upserting boxscore data:", error);
    throw error;
  }
}
