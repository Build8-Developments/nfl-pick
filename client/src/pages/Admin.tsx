import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Save,
  AlertTriangle,
  Clock,
  Trophy,
  Target,
  Users,
} from "lucide-react";
// Removed mock data import - using real API data
import { apiClient, apiOrigin } from "../lib/api";

type ApiSuccess<T> = { success: true; data: T; message?: string };

type ApiUser = {
  _id: string;
  username: string;
  email?: string;
  role: "user" | "admin";
  avatar?: string;
};

const Admin = () => {
  const { currentUser } = useAuth();

  // Prop Bet Management
  const [propBets, setPropBets] = useState<
    Array<{
      _id: string;
      user: { _id: string; username: string; avatar?: string };
      week: number;
      propBet: string;
      propBetOdds?: string;
      status: "pending" | "approved" | "rejected";
      submittedAt: string;
    }>
  >([]);
  const [propBetActions, setPropBetActions] = useState<Record<string, string>>(
    {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [isLoadingPropBets, setIsLoadingPropBets] = useState(false);

  // Games data state
  const [games, setGames] = useState<
    Array<{
      gameID: string;
      gameWeek: string;
      gameDate: string;
      gameTime: string;
      teamIDHome: string;
      teamIDAway: string;
      gameStatus?: string;
      gameStatusCode?: string;
    }>
  >([]);
  // Removed unused loading states

  // Users list state
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Submitted picks count
  const [submittedPicksCount, setSubmittedPicksCount] = useState(0);

  // Create User form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(
    null
  );
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit User state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setUsersError(null);
      const res = await apiClient.get<ApiSuccess<ApiUser[]>>("users");
      setUsers(res.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      setUsersError(msg);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchPropBets = async () => {
    try {
      setIsLoadingPropBets(true);
      console.log("[ADMIN] Fetching prop bets...");
      const res = await apiClient.get<
        ApiSuccess<
          Array<{
            _id: string;
            user: { _id: string; username: string; avatar?: string };
            week: number;
            propBet: string;
            propBetOdds?: string;
            status: "pending" | "approved" | "rejected";
            submittedAt: string;
          }>
        >
      >("picks/prop-bets");
      console.log("[ADMIN] Prop bets response:", res);
      console.log("[ADMIN] Prop bets data:", res.data);
      setPropBets(res.data ?? []);
    } catch (err) {
      console.error("Error fetching prop bets:", err);
      setPropBets([]);
    } finally {
      setIsLoadingPropBets(false);
    }
  };

  // Prop bet filtering state
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedPropWeek, setSelectedPropWeek] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("pending"); // Default to showing pending

  // Get unique weeks from prop bets
  const availableWeeks = useMemo(() => {
    const weeks = propBets
      .map((pb) => pb.week)
      .filter((week, index, arr) => arr.indexOf(week) === index);
    return weeks.sort((a, b) => a - b);
  }, [propBets]);

  // Filter prop bets based on selected user, week, and status
  const filteredPropBets = useMemo(() => {
    return propBets.filter((propBet) => {
      const userMatch =
        selectedUser === "all" || propBet.user._id === selectedUser;
      const weekMatch =
        selectedPropWeek === "all" ||
        propBet.week.toString() === selectedPropWeek;
      const statusMatch =
        selectedStatus === "all" || propBet.status === selectedStatus;
      return userMatch && weekMatch && statusMatch;
    });
  }, [propBets, selectedUser, selectedPropWeek, selectedStatus]);

  const fetchGames = async () => {
    try {
      const res = await apiClient.get<
        ApiSuccess<
          Array<{
            gameID: string;
            gameWeek: string;
            gameDate: string;
            gameTime: string;
            teamIDHome: string;
            teamIDAway: string;
            gameStatus?: string;
            gameStatusCode?: string;
          }>
        >
      >("games");
      setGames(res.data ?? []);
    } catch (err) {
      console.error("Failed to load games:", err);
      setGames([]);
    }
  };

  // Get available weeks from games
  const availableGameWeeks = useMemo(() => {
    const weeks = games
      .map((g) => {
        const weekMatch = g.gameWeek.match(/\d+/);
        return weekMatch ? parseInt(weekMatch[0]) : null;
      })
      .filter((week): week is number => week !== null);
    return [...new Set(weeks)].sort((a, b) => a - b);
  }, [games]);

  const fetchSubmittedPicksCount = useCallback(async () => {
    try {
      const res = await apiClient.get<
        ApiSuccess<
          Array<{
            _id: string;
            user: string;
            week: number;
            isFinalized: boolean;
          }>
        >
      >(`picks/all/${selectedWeek}`);
      const finalizedPicks = res.data?.filter((pick) => pick.isFinalized) || [];
      setSubmittedPicksCount(finalizedPicks.length);
    } catch (err) {
      console.error("Error fetching submitted picks count:", err);
      setSubmittedPicksCount(0);
    }
  }, [selectedWeek]);

  const fetchUserById = async (id: string) => {
    const res = await apiClient.get<ApiSuccess<ApiUser>>(`users/${id}`);
    return res.data as ApiUser;
  };

  useEffect(() => {
    fetchUsers();
    fetchPropBets();
    fetchGames();
    fetchSubmittedPicksCount();
  }, [selectedWeek, fetchSubmittedPicksCount]);

  const handleCreateUser = async () => {
    setCreateUserError(null);
    setCreateUserSuccess(null);
    if (!newUsername || !newPassword) {
      setCreateUserError("Username and password are required");
      return;
    }
    try {
      setIsCreatingUser(true);
      const form = new FormData();
      form.append("username", newUsername);
      form.append("passwordHash", newPassword);
      if (newEmail.trim()) form.append("email", newEmail.trim());
      form.append("role", newRole);
      if (newAvatarFile) form.append("avatar", newAvatarFile);

      const res = await apiClient.post<{ data: unknown }>("users", form, {
        headers: {
          // Let the api client drop content-type for FormData
        },
      });
      if (res) {
        setCreateUserSuccess("User created successfully");
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        setNewEmail("");
        setNewAvatarFile(null);
        fetchUsers();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      setCreateUserError(errorMessage);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const beginEditUser = async (id: string) => {
    try {
      setEditingUserId(id);
      const u = await fetchUserById(id);
      setEditUsername(u.username ?? "");
      setEditEmail(u.email ?? "");
      setEditRole(u.role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load user";
      setCreateUserError(msg);
      setEditingUserId(null);
    }
  };

  const saveEditUser = async () => {
    if (!editingUserId) return;
    try {
      setIsSavingEdit(true);
      const body = {
        username: editUsername,
        email: editEmail || undefined,
        role: editRole,
      };
      await apiClient.patch<ApiSuccess<ApiUser>>(
        `users/${editingUserId}`,
        body
      );
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save user";
      setCreateUserError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await apiClient.delete<ApiSuccess<ApiUser>>(`users/${id}`);
      if (editingUserId === id) setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      setCreateUserError(msg);
    }
  };

  // Check if user is admin
  if (!currentUser?.isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access the admin panel.
        </p>
      </div>
    );
  }

  const handlePropBetAction = (propBetId: string, action: string) => {
    setPropBetActions((prev) => ({
      ...prev,
      [propBetId]: action,
    }));
  };

  const savePropBetActions = async () => {
    setIsUpdating(true);
    try {
      const actions = Object.entries(propBetActions);
      for (const [propBetId, action] of actions) {
        await apiClient.patch<ApiSuccess<unknown>>(
          `picks/prop-bets/${propBetId}`,
          {
            status: action,
          }
        );
      }
      setPropBetActions({});
      fetchPropBets(); // Refresh the list
    } catch (err) {
      console.error("Error updating prop bets:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getGameStatus = (game: { gameTime: string; gameStatus?: string; gameStatusCode?: string }) => {
    // If we have real game status from the API, use it
    if (game.gameStatus) {
      const status = game.gameStatus.toLowerCase();
      if (status.includes('final') || status.includes('completed') || status.includes('finished')) {
        return "completed";
      }
      if (status.includes('in_progress') || status.includes('live') || status.includes('active')) {
        return "in_progress";
      }
      if (status.includes('scheduled') || status.includes('upcoming') || status.includes('pre')) {
        return "scheduled";
      }
    }

    // Fallback to time-based logic if no game status available
    const now = new Date();
    const gameDate = new Date(game.gameTime);

    // If game is in the future, it's scheduled
    if (gameDate > now) return "scheduled";
    
    // If game started within the last 4 hours, it might be in progress
    // NFL games typically last 3-4 hours including overtime
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    if (gameDate > fourHoursAgo) {
      return "in_progress";
    }
    
    // If game started more than 4 hours ago, it's completed
    return "completed";
  };

  const currentWeekStats = {
    totalGames:
      selectedWeek === "all"
        ? games.length
        : games.filter((g) => g.gameWeek === selectedWeek).length,
    completedGames:
      selectedWeek === "all"
        ? games.filter((g) => getGameStatus(g) === "completed").length
        : games.filter(
            (g) =>
              g.gameWeek === selectedWeek &&
              getGameStatus(g) === "completed"
          ).length,
    submittedPicks: submittedPicksCount,
    pendingProps: propBets.filter((p) => p.status === "pending").length,
    approvedProps: propBets.filter((p) => p.status === "approved").length,
    rejectedProps: propBets.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage games, approve prop bets, and override results
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Label
            htmlFor="week-selector"
            className="text-sm text-muted-foreground"
          >
            View Week:
          </Label>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {availableGameWeeks.map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedWeek === "all"
                ? "All Games"
                : `Week ${selectedWeek} Games`}
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekStats.completedGames}/{currentWeekStats.totalGames}
            </div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Submitted Picks
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekStats.submittedPicks}/{users.length}
            </div>
            <p className="text-xs text-muted-foreground">players</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prop Bet Queue
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {currentWeekStats.pendingProps}
            </div>
            <p className="text-xs text-muted-foreground">
              pending • {currentWeekStats.approvedProps} approved •{" "}
              {currentWeekStats.rejectedProps} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">total players</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="props" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="props">Prop Bets</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Prop Bet Management */}
        <TabsContent value="props" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Prop Bet Approvals
              </CardTitle>
              <CardDescription>
                Review and approve or reject player prop bets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Controls */}
              <div className="mb-6 flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="user-filter">Filter by User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="week-filter">Filter by Week</Label>
                  <Select
                    value={selectedPropWeek}
                    onValueChange={setSelectedPropWeek}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Weeks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Weeks</SelectItem>
                      {availableWeeks.map((week) => (
                        <SelectItem key={week} value={week.toString()}>
                          Week {week}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPropBets.length} of {propBets.length} prop
                  bets
                </div>
              </div>

              {/* Debug Information */}
              <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
                <strong>Debug Info:</strong>
                <br />
                Total prop bets: {propBets.length}
                <br />
                Filtered prop bets: {filteredPropBets.length}
                <br />
                Selected user: {selectedUser}
                <br />
                Selected week: {selectedPropWeek}
                <br />
                Available weeks: {availableWeeks.join(", ")}
                <br />
                Users count: {users.length}
                <br />
                <strong>Game Status Debug:</strong>
                <br />
                Total games: {games.length}
                <br />
                Completed games: {currentWeekStats.completedGames}
                <br />
                Sample game statuses: {games.slice(0, 3).map(g => `${g.gameID}: ${g.gameStatus || 'no status'}`).join(', ')}
              </div>

              {isLoadingPropBets ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading prop bets...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPropBets.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">
                        {propBets.length === 0
                          ? "No prop bets found"
                          : "No prop bets match the selected filters"}
                      </p>
                    </div>
                  ) : (
                    filteredPropBets.map((propBet) => {
                      const action = propBetActions[propBet._id];

                      return (
                        <div
                          key={propBet._id}
                          className={`p-4 border rounded-lg ${
                            propBet.status === "pending"
                              ? "border-yellow-200 bg-yellow-50"
                              : propBet.status === "approved"
                              ? "border-green-200 bg-green-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-medium text-lg">
                                {propBet.propBet}
                              </div>
                              {propBet.propBetOdds && (
                                <div className="text-sm text-blue-600 font-medium mt-1">
                                  Odds: {propBet.propBetOdds}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground mt-2">
                                <div>
                                  Submitted by{" "}
                                  <strong>{propBet.user.username}</strong> •
                                  Week {propBet.week}
                                </div>
                                <div>
                                  Submitted:{" "}
                                  {new Date(
                                    propBet.submittedAt
                                  ).toLocaleDateString()}{" "}
                                  at{" "}
                                  {new Date(
                                    propBet.submittedAt
                                  ).toLocaleTimeString()}
                                </div>
                                {propBet.status === "approved" && (
                                  <div className="text-xs">
                                    {propBet.status === "approved"
                                      ? "Approved"
                                      : "Rejected"}
                                    :{" "}
                                    {new Date(
                                      propBet.submittedAt
                                    ).toLocaleDateString()}{" "}
                                    at{" "}
                                    {new Date(
                                      propBet.submittedAt
                                    ).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                propBet.status === "pending"
                                  ? "secondary"
                                  : propBet.status === "approved"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-sm font-semibold"
                            >
                              {propBet.status === "pending"
                                ? "⏳ Pending"
                                : propBet.status === "approved"
                                ? "✅ Approved"
                                : "❌ Rejected"}
                            </Badge>
                          </div>

                          {propBet.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                variant={
                                  action === "approved" ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  handlePropBetAction(propBet._id, "approved")
                                }
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                variant={
                                  action === "rejected"
                                    ? "destructive"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  handlePropBetAction(propBet._id, "rejected")
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}

                          {action && (
                            <div className="mt-2">
                              <Badge
                                variant={
                                  action === "approved"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {action === "approved"
                                  ? "Will be approved"
                                  : "Will be rejected"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {Object.keys(propBetActions).length > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={savePropBetActions}
                    disabled={isUpdating}
                    className="min-w-32"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Actions
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Create User
              </CardTitle>
              <CardDescription>Create a user and assign a role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username</Label>
                  <Input
                    id="new-username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role">Role</Label>
                  <Select
                    value={newRole}
                    onValueChange={(v: string) =>
                      setNewRole(v as "user" | "admin")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-avatar">Avatar</Label>
                  <Input
                    id="new-avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNewAvatarFile(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>
              {createUserError && (
                <div className="mt-4">
                  <Alert variant="destructive">
                    <AlertDescription>{createUserError}</AlertDescription>
                  </Alert>
                </div>
              )}
              {createUserSuccess && (
                <div className="mt-4">
                  <Alert>
                    <AlertDescription>{createUserSuccess}</AlertDescription>
                  </Alert>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleCreateUser}
                  disabled={isCreatingUser}
                  className="min-w-32"
                >
                  {isCreatingUser ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users
              </CardTitle>
              <CardDescription>Manage existing users</CardDescription>
            </CardHeader>
            <CardContent>
              {usersError && (
                <div className="mb-4">
                  <Alert variant="destructive">
                    <AlertDescription>{usersError}</AlertDescription>
                  </Alert>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Avatar</th>
                      <th className="py-2 pr-4">Username</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingUsers ? (
                      <tr>
                        <td className="py-3" colSpan={5}>
                          Loading...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td className="py-3" colSpan={5}>
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u._id} className="border-b">
                          <td className="py-2 pr-4">
                            <img
                              src={
                                u.avatar
                                  ? u.avatar.startsWith("/uploads")
                                    ? `${apiOrigin}${u.avatar}`
                                    : u.avatar.startsWith("uploads/")
                                    ? `${apiOrigin}/${u.avatar}`
                                    : u.avatar
                                  : "https://placehold.co/40x40"
                              }
                              alt="avatar"
                              className="h-8 w-8 rounded-full object-cover border"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <Input
                                value={editUsername}
                                onChange={(e) =>
                                  setEditUsername(e.target.value)
                                }
                              />
                            ) : (
                              u.username
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <Input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                              />
                            ) : (
                              u.email ?? "—"
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <Select
                                value={editRole}
                                onValueChange={(v: string) =>
                                  setEditRole(v as "user" | "admin")
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant={
                                  u.role === "admin" ? "default" : "secondary"
                                }
                              >
                                {u.role}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={saveEditUser}
                                  disabled={isSavingEdit}
                                >
                                  {isSavingEdit ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingUserId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => beginEditUser(u._id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteUser(u._id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
