import { useState, useEffect } from "react";
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
import { CheckCircle, XCircle, Save, AlertTriangle, Clock, Trophy, Target, Users } from "lucide-react";
import {
  currentWeekGames,
  pendingPropBets,
  mockUserPicks,
  users as mockUsers,
} from "../data/mockData";
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

  const [propBetActions, setPropBetActions] = useState<Record<number, string>>(
    {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedWeek] = useState("10");

  // Users list state
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Create User form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
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

  const fetchUserById = async (id: string) => {
    const res = await apiClient.get<ApiSuccess<ApiUser>>(`users/${id}`);
    return res.data as ApiUser;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      const errorMessage = err instanceof Error ? err.message : "Failed to create user";
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
      const body = { username: editUsername, email: editEmail || undefined, role: editRole };
      await apiClient.patch<ApiSuccess<ApiUser>>(`users/${editingUserId}`, body);
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

  const handlePropBetAction = (propBetId: number, action: string) => {
    setPropBetActions((prev) => ({
      ...prev,
      [propBetId]: action,
    }));
  };

  const savePropBetActions = async () => {
    setIsUpdating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUpdating(false);
    // Show success message
  };

  const getGameStatus = (gameTime: string) => {
    const now = new Date();
    const gameDate = new Date(gameTime);

    if (gameDate > now) return "scheduled";
    if (
      gameDate <= now &&
      gameDate > new Date(now.getTime() - 3 * 60 * 60 * 1000)
    )
      return "in_progress";
    return "completed";
  };

  const currentWeekStats = {
    totalGames: currentWeekGames.length,
    completedGames: currentWeekGames.filter(
      (g) => getGameStatus(g.gameTime) === "completed"
    ).length,
    submittedPicks: mockUserPicks.filter((p) => p.isFinalized).length,
    pendingProps: pendingPropBets.filter((p) => p.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Manage games, approve prop bets, and override results
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Week {selectedWeek} Games
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
              {currentWeekStats.submittedPicks}/{mockUsers.length}
            </div>
            <p className="text-xs text-muted-foreground">players</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Props</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekStats.pendingProps}
            </div>
            <p className="text-xs text-muted-foreground">need approval</p>
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
              <div className="space-y-4">
                {pendingPropBets.map((propBet) => {
                  const user = mockUsers.find((u) => u.id === propBet.userId);
                  const action = propBetActions[propBet.id];

                  return (
                    <div key={propBet.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium">
                            {propBet.description}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Submitted by {user?.name} •{" "}
                            {new Date(propBet.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            propBet.status === "pending"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {propBet.status}
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
                              handlePropBetAction(propBet.id, "approved")
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant={
                              action === "rejected" ? "destructive" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handlePropBetAction(propBet.id, "rejected")
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
                              action === "approved" ? "default" : "destructive"
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
                })}
              </div>

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
                  <Select value={newRole} onValueChange={(v: string) => setNewRole(v as "user" | "admin")}>
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
                    onChange={(e) => setNewAvatarFile(e.target.files?.[0] ?? null)}
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
                <Button onClick={handleCreateUser} disabled={isCreatingUser} className="min-w-32">
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
                      <tr><td className="py-3" colSpan={5}>Loading...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td className="py-3" colSpan={5}>No users found</td></tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u._id} className="border-b">
                          <td className="py-2 pr-4">
                            <img
                              src={u.avatar
                                ? (u.avatar.startsWith("/uploads")
                                    ? `${apiOrigin}${u.avatar}`
                                    : u.avatar.startsWith("uploads/")
                                    ? `${apiOrigin}/${u.avatar}`
                                    : u.avatar)
                                : "https://placehold.co/40x40"}
                              alt="avatar"
                              className="h-8 w-8 rounded-full object-cover border"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                            ) : (
                              u.username
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                            ) : (
                              u.email ?? "—"
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <Select value={editRole} onValueChange={(v: string) => setEditRole(v as "user" | "admin")}>
                                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {editingUserId === u._id ? (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEditUser} disabled={isSavingEdit}>
                                  {isSavingEdit ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => beginEditUser(u._id)}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteUser(u._id)}>Delete</Button>
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
