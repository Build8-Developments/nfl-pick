import cron from "node-cron";
import { emailService } from "./email.service.js";
import User from "../modules/users/user.model.js";
import Game from "../modules/games/games.model.js";
import Pick from "../modules/picks/pick.model.js";

interface GameWithDateTime {
  game: any;
  gameDateTime: Date;
  week: number;
}

class NotificationService {
  private isRunning = false;

  constructor() {
    this.startScheduler();
  }

  private startScheduler() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("[NOTIFICATIONS] Starting notification scheduler...");

    // Run every 5 minutes to check for upcoming games
    cron.schedule("*/5 * * * *", async () => {
      try {
        await this.checkAndSendReminders();
      } catch (error) {
        console.error("[NOTIFICATIONS] Error in reminder check:", error);
      }
    });

    console.log("[NOTIFICATIONS] Notification scheduler started - checking every 5 minutes");
  }

  private async checkAndSendReminders() {
    try {
      const now = new Date();
      const upcomingGames = await this.getUpcomingGames();
      
      if (upcomingGames.length === 0) {
        return; // No upcoming games
      }

      // Find the earliest game for this week
      const earliestGame = upcomingGames[0];
      if (!earliestGame) {
        return; // No upcoming games
      }
      
      const week = earliestGame.week;
      
      // Calculate reminder times
      const oneHourBefore = new Date(earliestGame.gameDateTime.getTime() - 60 * 60 * 1000);
      const tenMinutesBefore = new Date(earliestGame.gameDateTime.getTime() - 10 * 60 * 1000);

      // Check if we should send 1-hour reminders
      if (this.shouldSendReminder(now, oneHourBefore, "1hour")) {
        await this.sendRemindersForWeek(week, "1hour", oneHourBefore);
      }

      // Check if we should send 10-minute reminders
      if (this.shouldSendReminder(now, tenMinutesBefore, "10min")) {
        await this.sendRemindersForWeek(week, "10min", tenMinutesBefore);
      }

    } catch (error) {
      console.error("[NOTIFICATIONS] Error checking reminders:", error);
    }
  }

  private async getUpcomingGames(): Promise<GameWithDateTime[]> {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all games in the next week
    const games = await Game.find({
      gameDate: {
        $gte: now.toISOString().slice(0, 8).replace(/-/g, ""),
        $lte: oneWeekFromNow.toISOString().slice(0, 8).replace(/-/g, ""),
      },
    }).lean();

    const gamesWithDateTime: GameWithDateTime[] = [];

    for (const game of games) {
      const gameDateTime = this.parseGameDateTime(
        (game as any).gameDate,
        (game as any).gameTime
      );

      // Only include games that haven't started yet
      if (gameDateTime > now) {
        const weekNum = Number((game as any).gameWeek.match(/\d+/)?.[0] ?? NaN);
        if (!Number.isNaN(weekNum)) {
          gamesWithDateTime.push({
            game,
            gameDateTime,
            week: weekNum,
          });
        }
      }
    }

    // Sort by game time
    return gamesWithDateTime.sort((a, b) => a.gameDateTime.getTime() - b.gameDateTime.getTime());
  }

  private parseGameDateTime(gameDate: string, gameTime: string): Date {
    const yyyy = Number(gameDate.slice(0, 4));
    const mm = Number(gameDate.slice(4, 6));
    const dd = Number(gameDate.slice(6, 8));
    const timeMatch = gameTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
    
    let hours = 12;
    let minutes = 0;
    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = timeMatch[2] ? Number(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === "p" && hours !== 12) hours += 12;
      if (meridiem === "a" && hours === 12) hours = 0;
    }
    
    return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
  }

  private shouldSendReminder(
    now: Date,
    reminderTime: Date,
    reminderType: "1hour" | "10min"
  ): boolean {
    const timeDiff = reminderTime.getTime() - now.getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Send reminder if we're within 5 minutes of the reminder time
    return timeDiff >= 0 && timeDiff <= fiveMinutes;
  }

  private async sendRemindersForWeek(
    week: number,
    reminderType: "1hour" | "10min",
    lockTime: Date
  ) {
    try {
      console.log(`[NOTIFICATIONS] Sending ${reminderType} reminders for week ${week}`);

      // Get all users who haven't submitted picks for this week
      const usersWithoutPicks = await User.find({
        _id: {
          $nin: await Pick.distinct("user", { week, isFinalized: true }),
        },
      }).select("email username").lean();

      console.log(`[NOTIFICATIONS] Found ${usersWithoutPicks.length} users without picks for week ${week}`);

      // Send reminders to each user
      const reminderPromises = usersWithoutPicks.map(async (user) => {
        if (user.email) {
          const success = await emailService.sendPickReminder(
            user.email,
            user.username,
            week,
            lockTime,
            reminderType
          );
          
          if (success) {
            console.log(`[NOTIFICATIONS] Sent ${reminderType} reminder to ${user.username} (${user.email})`);
          } else {
            console.error(`[NOTIFICATIONS] Failed to send ${reminderType} reminder to ${user.username} (${user.email})`);
          }
        }
      });

      await Promise.all(reminderPromises);
      console.log(`[NOTIFICATIONS] Completed sending ${reminderType} reminders for week ${week}`);

    } catch (error) {
      console.error(`[NOTIFICATIONS] Error sending ${reminderType} reminders for week ${week}:`, error);
    }
  }

  // Manual method to send reminders for testing
  async sendTestReminders(week: number, reminderType: "1hour" | "10min" = "1hour") {
    const lockTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await this.sendRemindersForWeek(week, reminderType, lockTime);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
