import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin";
import { toast } from "sonner";
import {
  FolderPlus,
  Folders,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

export default function GroupsPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AuthLoading>
      <Authenticated>
        <GroupsPageInner />
      </Authenticated>
    </>
  );
}

function GroupsPageInner() {
  const [searchInput, setSearchInput] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Id<"contactGroups"> | null>(null);

  const [debouncedSearch] = useDebounce(searchInput, 500);

  const groups = useQuery(api.contactGroups.listGroups, {
    searchQuery: debouncedSearch || undefined,
  });

  const deleteGroup = useMutation(api.contactGroups.deleteGroup);

  const handleDelete = async (groupId: Id<"contactGroups">) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      await deleteGroup({ groupId });
      toast.success("Group deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete group"
      );
    }
  };

  const handleEdit = (groupId: Id<"contactGroups">) => {
    setSelectedGroup(groupId);
    setEditDialogOpen(true);
  };

  const handleViewMembers = (groupId: Id<"contactGroups">) => {
    setSelectedGroup(groupId);
    setViewDialogOpen(true);
  };

  const handleAddMembers = (groupId: Id<"contactGroups">) => {
    setSelectedGroup(groupId);
    setAddMembersDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Groups</h1>
          <p className="text-muted-foreground mt-1">
            Organize contacts into groups for targeted messaging
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Groups Grid */}
      {!groups ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Folders />
            </EmptyMedia>
            <EmptyTitle>No groups found</EmptyTitle>
            <EmptyDescription>
              {searchInput
                ? "No groups match your search"
                : "Create your first group to organize contacts"}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {!searchInput && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="mt-1">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewMembers(group._id)}>
                        <Users className="h-4 w-4 mr-2" />
                        View Members
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddMembers(group._id)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Members
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(group._id)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(group._id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{group.contactCount} contacts</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {selectedGroup && (
        <EditGroupDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          groupId={selectedGroup}
        />
      )}

      {/* View Members Dialog */}
      {selectedGroup && (
        <ViewMembersDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          groupId={selectedGroup}
        />
      )}

      {/* Add Members Dialog */}
      {selectedGroup && (
        <AddMembersDialog
          open={addMembersDialogOpen}
          onOpenChange={setAddMembersDialogOpen}
          groupId={selectedGroup}
        />
      )}
    </div>
  );
}

function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createGroup = useMutation(api.contactGroups.createGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createGroup({
        name,
        description: description || undefined,
      });

      toast.success("Group created successfully");
      onOpenChange(false);

      // Reset form
      setName("");
      setDescription("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create group"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>Create a new contact group</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VIP Customers"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-value customers with special offers"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Group</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditGroupDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"contactGroups">;
}) {
  const group = useQuery(api.contactGroups.getGroup, { groupId });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const updateGroup = useMutation(api.contactGroups.updateGroup);

  // Load group data
  useState(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateGroup({
        groupId,
        name,
        description: description || undefined,
      });

      toast.success("Group updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update group"
      );
    }
  };

  if (!group) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>Update group information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VIP Customers"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-value customers with special offers"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Group</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewMembersDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"contactGroups">;
}) {
  const group = useQuery(api.contactGroups.getGroup, { groupId });
  const members = useQuery(api.contactGroups.getGroupMembers, { groupId });
  const removeContact = useMutation(api.contactGroups.removeContactFromGroup);

  const handleRemove = async (contactId: Id<"contacts">) => {
    if (!confirm("Remove this contact from the group?")) return;

    try {
      await removeContact({ groupId, contactId });
      toast.success("Contact removed from group");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove contact"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{group?.name} Members</DialogTitle>
          <DialogDescription>
            {members?.length || 0} contacts in this group
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {!members ? (
            <Skeleton className="h-48 w-full" />
          ) : members.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No members</EmptyTitle>
                <EmptyDescription>
                  This group doesn't have any contacts yet
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((contact) => (
                  <TableRow key={contact._id}>
                    <TableCell>
                      {contact.firstName || contact.lastName
                        ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>{contact.phoneNumber}</TableCell>
                    <TableCell>{contact.email || "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(contact._id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMembersDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"contactGroups">;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<Id<"contacts">>>(
    new Set()
  );

  const [debouncedSearch] = useDebounce(searchInput, 300);

  const contacts = useQuery(api.contacts.listContacts, {
    searchQuery: debouncedSearch || undefined,
    isOptedOut: false,
  });

  const groupMembers = useQuery(api.contactGroups.getGroupMembers, { groupId });
  const addContacts = useMutation(api.contactGroups.addContactsToGroup);

  const memberIds = new Set(groupMembers?.map((m) => m._id) || []);
  const availableContacts = contacts?.filter((c) => !memberIds.has(c._id)) || [];

  const handleToggle = (contactId: Id<"contacts">) => {
    const newSet = new Set(selectedContacts);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedContacts(newSet);
  };

  const handleSubmit = async () => {
    if (selectedContacts.size === 0) return;

    try {
      const result = await addContacts({
        groupId,
        contactIds: Array.from(selectedContacts),
      });

      toast.success(`Added ${result.added} contacts to group`);
      onOpenChange(false);
      setSelectedContacts(new Set());
      setSearchInput("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add contacts"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>
            Select contacts to add to this group
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {!contacts ? (
              <div className="p-4">
                <Skeleton className="h-48 w-full" />
              </div>
            ) : availableContacts.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>No contacts available</EmptyTitle>
                  <EmptyDescription>
                    All active contacts are already in this group
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableContacts.map((contact) => (
                    <TableRow key={contact._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.has(contact._id)}
                          onCheckedChange={() => handleToggle(contact._id)}
                        />
                      </TableCell>
                      <TableCell>
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell>{contact.phoneNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="secondary">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {selectedContacts.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedContacts.size} contact{selectedContacts.size !== 1 ? "s" : ""}{" "}
              selected
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedContacts.size === 0}
          >
            Add {selectedContacts.size > 0 && `(${selectedContacts.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
