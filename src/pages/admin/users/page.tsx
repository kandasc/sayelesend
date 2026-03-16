import { useState } from "react";
import { useIntl } from "react-intl";
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
import { Users, UserPlus, Mail, Shield, MoreVertical, Edit, Trash2, Eye, UserMinus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";

export default function AdminUsersPage() {
  const intl = useIntl();
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
  const rejectUser = useMutation(api.admin.rejectUser);

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

  const handleRejectUser = async (userId: Id<"users">) => {
    try {
      await rejectUser({ userId });
      toast.success(intl.formatMessage({ id: "page.adminUsers.userRejected" }));
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to reject user");
      }
    }
  };

  const usersPagination = usePagination(users ?? [], { pageSize: 15 });

  if (users === undefined || users === null || clients === undefined || clients === null) {
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
  const unassignedUsers = users.filter((u) => (!u.role || (!u.clientId && u.role !== "admin")) && u.status !== "rejected");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{intl.formatMessage({ id: "page.adminUsers.title" })}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {intl.formatMessage({ id: "page.adminUsers.subtitle" })}
          </p>
        </div>
        <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {intl.formatMessage({ id: "page.adminUsers.assignToClient" })}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: "page.adminUsers.totalUsers" })}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: "page.adminUsers.admins" })}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: "page.adminUsers.clientUsers" })}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: "page.adminUsers.viewers" })}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: "common.unassigned" })}</CardTitle>
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
              {intl.formatMessage({ id: "page.adminUsers.unassignedUsers" })}
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {intl.formatMessage({ id: "page.adminUsers.unassignedUsersDescription" })}
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectUser(user._id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {intl.formatMessage({ id: "page.adminUsers.reject" })}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setUserEmail(user.email || "");
                        setAssignDialogOpen(true);
                      }}
                    >
                      {intl.formatMessage({ id: "page.adminUsers.assignToClient" })}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: "page.adminUsers.allUsers" })}</CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.adminUsers.allUsersDescription" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{intl.formatMessage({ id: "common.name" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "common.email" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "common.role" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "page.adminUsers.assignedClient" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "common.status" })}</TableHead>
                <TableHead className="w-[80px]">{intl.formatMessage({ id: "page.adminUsers.actions" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersPagination.paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {intl.formatMessage({ id: "page.adminUsers.noUsers" })}
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
                          <Badge variant="default">{intl.formatMessage({ id: "common.roleAdmin" })}</Badge>
                        ) : user.role === "client" ? (
                          <Badge variant="secondary">{intl.formatMessage({ id: "common.roleClient" })}</Badge>
                        ) : user.role === "viewer" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Eye className="h-3 w-3 mr-1" />
                            {intl.formatMessage({ id: "common.roleViewer" })}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{intl.formatMessage({ id: "common.unassigned" })}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {client ? client.companyName : user.role === "admin" ? intl.formatMessage({ id: "common.na" }) : "-"}
                      </TableCell>
                      <TableCell>
                        {user.clientId || user.role === "admin" ? (
                          <Badge variant="default" className="bg-green-600">
                            {intl.formatMessage({ id: "common.statusActive" })}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{intl.formatMessage({ id: "common.statusPending" })}</Badge>
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
                            <DropdownMenuLabel>{intl.formatMessage({ id: "page.adminUsers.actions" })}</DropdownMenuLabel>
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
                              {intl.formatMessage({ id: "page.adminUsers.editDetails" })}
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
                              {intl.formatMessage({ id: "page.adminUsers.editRole" })}
                            </DropdownMenuItem>
                            {user.clientId && user.role !== "admin" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleUnassignUser(user._id)}
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  {intl.formatMessage({ id: "page.adminUsers.removeFromClient" })}
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
                              {intl.formatMessage({ id: "page.adminUsers.deleteUser" })}
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
          </div>
        </CardContent>
      </Card>

      {/* Assign User Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.adminUsers.assignToClient" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.adminUsers.assignDialogDescription" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userEmail">{intl.formatMessage({ id: "common.email" })}</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "page.adminUsers.userSignedInNote" })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignRole">{intl.formatMessage({ id: "common.role" })}</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as "admin" | "client" | "viewer")}
              >
                <SelectTrigger id="assignRole">
                  <SelectValue placeholder={intl.formatMessage({ id: "page.adminUsers.selectRole" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{intl.formatMessage({ id: "page.adminUsers.roleAdminDescription" })}</SelectItem>
                  <SelectItem value="client">{intl.formatMessage({ id: "page.adminUsers.roleClientDescription" })}</SelectItem>
                  <SelectItem value="viewer">{intl.formatMessage({ id: "page.adminUsers.roleViewerDescription" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">{intl.formatMessage({ id: "page.adminUsers.assignedClient" })}</Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder={intl.formatMessage({ id: "page.adminUsers.selectClient" })} />
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
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button onClick={handleAssignUser}>
              {intl.formatMessage({ id: "page.adminUsers.assignToClient" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={editDetailsDialogOpen} onOpenChange={setEditDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.adminUsers.editDetails" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.adminUsers.editDetailsDescription" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">{intl.formatMessage({ id: "common.name" })}</Label>
              <Input
                id="editName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="User name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">{intl.formatMessage({ id: "common.email" })}</Label>
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
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button onClick={handleUpdateDetails}>
              {intl.formatMessage({ id: "buttons.save" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.adminUsers.editRole" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.adminUsers.editRoleDescription" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">{intl.formatMessage({ id: "common.role" })}</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as "admin" | "client" | "viewer")}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={intl.formatMessage({ id: "page.adminUsers.selectRole" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{intl.formatMessage({ id: "page.adminUsers.roleAdminDescription" })}</SelectItem>
                  <SelectItem value="client">{intl.formatMessage({ id: "page.adminUsers.roleClientDescription" })}</SelectItem>
                  <SelectItem value="viewer">{intl.formatMessage({ id: "page.adminUsers.roleViewerDescription" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedRole === "client" || selectedRole === "viewer") && (
              <div className="space-y-2">
                <Label htmlFor="editClient">{intl.formatMessage({ id: "page.adminUsers.assignedClient" })}</Label>
                <Select
                  value={selectedClientId?.toString() || "none"}
                  onValueChange={(value) => setSelectedClientId(value === "none" ? "none" : value as Id<"clients">)}
                >
                  <SelectTrigger id="editClient">
                    <SelectValue placeholder={intl.formatMessage({ id: "page.adminUsers.selectClient" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{intl.formatMessage({ id: "page.adminUsers.noneUnassigned" })}</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedRole === "viewer" 
                    ? intl.formatMessage({ id: "page.adminUsers.viewerClientNote" }) 
                    : intl.formatMessage({ id: "page.adminUsers.clientSelectNote" })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button onClick={handleUpdateRole}>
              {intl.formatMessage({ id: "buttons.save" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.adminUsers.deleteUser" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.adminUsers.deleteUserDescription" })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              {intl.formatMessage({ id: "page.adminUsers.deleteUser" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
