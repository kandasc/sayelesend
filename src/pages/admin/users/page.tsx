import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, UserPlus, Mail, Shield, MoreVertical, Edit, Trash2, Eye, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";

export default function AdminUsersPage() {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | undefined | "none">(undefined);
  const [selectedRole, setSelectedRole] = useState<"admin" | "client" | "viewer">("client");

  const users = useQuery(api.admin.listUsers);
  const clients = useQuery(api.admin.listClients);
  const assignUserToClient = useMutation(api.admin.assignUserToClient);
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const updateUserDetails = useMutation(api.admin.updateUserDetails);
  const unassignUser = useMutation(api.admin.unassignUserFromClient);
  const deleteUser = useMutation(api.admin.deleteUser);

  const handleAssignUser = async () => {
    if (!userEmail || !selectedClientId || selectedClientId === "none") {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await assignUserToClient({
        userEmail,
        clientId: selectedClientId as Id<"clients">,
        role: selectedRole,
      });
      toast.success("User assigned to client successfully");
      setAssignDialogOpen(false);
      setUserEmail("");
      setSelectedClientId(undefined);
      setSelectedRole("client");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to assign user to client");
      }
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUserId) return;

    // Handle "none" selection as undefined
    const finalClientId: Id<"clients"> | undefined = selectedClientId === "none" || selectedClientId === undefined 
      ? undefined 
      : selectedClientId as Id<"clients">;

    try {
      await updateUserRole({
        userId: selectedUserId,
        role: selectedRole,
        clientId: selectedRole === "client" || selectedRole === "viewer" ? finalClientId : undefined,
      });
      toast.success("User role updated successfully");
      setEditRoleDialogOpen(false);
      setSelectedUserId(null);
      setSelectedClientId(undefined);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update user role");
      }
    }
  };

  const handleUpdateDetails = async () => {
    if (!selectedUserId) return;

    try {
      await updateUserDetails({
        userId: selectedUserId,
        name: userName,
        email: userEmail,
      });
      toast.success("User details updated successfully");
      setEditDetailsDialogOpen(false);
      setSelectedUserId(null);
      setUserName("");
      setUserEmail("");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update user details");
      }
    }
  };

  const handleUnassignUser = async (userId: Id<"users">) => {
    if (!confirm("Are you sure you want to unassign this user? They will lose access to their client account.")) {
      return;
    }

    try {
      await unassignUser({ userId });
      toast.success("User unassigned successfully");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to unassign user");
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      await deleteUser({ userId: selectedUserId });
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to delete user");
      }
    }
  };

  if (users === undefined || clients === undefined || clients === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const admins = users.filter((u) => u.role === "admin");
  const clientUsers = users.filter((u) => u.role === "client");
  const viewers = users.filter((u) => u.role === "viewer");
  const unassignedUsers = users.filter((u) => !u.role || (!u.clientId && u.role !== "admin"));
  const usersPagination = usePagination(users, { pageSize: 15 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users and client assignments
          </p>
        </div>
        <Button onClick={() => setAssignDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign User to Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Users Alert */}
      {unassignedUsers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100">
              Unassigned Users
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              These users have signed in but haven't been assigned to a client yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between rounded-lg border border-orange-200 bg-white p-3 dark:border-orange-800 dark:bg-orange-900"
                >
                  <div>
                    <div className="font-medium">{user.name || "Unknown"}</div>
                    <div className="text-sm text-muted-foreground">{user.email || "No email"}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setUserEmail(user.email || "");
                      setAssignDialogOpen(true);
                    }}
                  >
                    Assign to Client
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Complete list of all system users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersPagination.paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                usersPagination.paginatedItems.map((user) => {
                  const client = user.clientId 
                    ? clients.find((c) => c._id === user.clientId)
                    : null;

                  return (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name || "Unknown"}</TableCell>
                      <TableCell>{user.email || "No email"}</TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge variant="default">Admin</Badge>
                        ) : user.role === "client" ? (
                          <Badge variant="secondary">Client</Badge>
                        ) : user.role === "viewer" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Eye className="h-3 w-3 mr-1" />
                            Viewer
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {client ? client.companyName : user.role === "admin" ? "N/A" : "-"}
                      </TableCell>
                      <TableCell>
                        {user.clientId || user.role === "admin" ? (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setUserName(user.name || "");
                                setUserEmail(user.email || "");
                                setEditDetailsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setSelectedRole(user.role || "client");
                                setSelectedClientId(user.clientId || "none");
                                setEditRoleDialogOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Edit Role & Client
                            </DropdownMenuItem>
                            {user.clientId && user.role !== "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleUnassignUser(user._id)}
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Unassign from Client
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <PaginationControls {...usersPagination} itemLabel="users" />
        </CardContent>
      </Card>

      {/* Assign User Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Client</DialogTitle>
            <DialogDescription>
              Assign a user to a client account. The user must have signed in at least once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userEmail">User Email</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The user must have signed in at least once
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignRole">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as "admin" | "client" | "viewer")}
              >
                <SelectTrigger id="assignRole">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full System Access</SelectItem>
                  <SelectItem value="client">Client - Can Manage Account</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-Only Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignUser}>
              Assign User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={editDetailsDialogOpen} onOpenChange={setEditDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update the user's name and email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="User name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDetails}>
              Update Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role & Client</DialogTitle>
            <DialogDescription>
              Change the user's role and client assignment. Admins have full system access, clients can manage their account, and viewers have read-only access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as "admin" | "client" | "viewer")}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full System Access</SelectItem>
                  <SelectItem value="client">Client - Can Manage Account</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-Only Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedRole === "client" || selectedRole === "viewer") && (
              <div className="space-y-2">
                <Label htmlFor="editClient">Client</Label>
                <Select
                  value={selectedClientId?.toString() || "none"}
                  onValueChange={(value) => setSelectedClientId(value === "none" ? "none" : value as Id<"clients">)}
                >
                  <SelectTrigger id="editClient">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Unassigned)</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedRole === "viewer" 
                    ? "Select a client or leave unassigned. Viewers can only view their assigned client's data." 
                    : "Select a client or leave unassigned."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
