import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useIntl } from "react-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  Filter,
  X,
  Tag,
  UserX,
  FileUp,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import PaginationControls from "@/components/ui/pagination-controls";

export default function ContactsPage() {
  const intl = useIntl();

  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {intl.formatMessage({ id: "page.contacts.pleaseSignIn" })}
            </h1>
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
        <ContactsPageInner />
      </Authenticated>
    </>
  );
}

function ContactsPageInner() {
  const intl = useIntl();
  const [searchInput, setSearchInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [filterOptedOut, setFilterOptedOut] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Id<"contacts"> | null>(null);

  const [debouncedSearch] = useDebounce(searchInput, 500);

  const contacts = useQuery(api.contacts.listContacts, {
    searchQuery: debouncedSearch || undefined,
    tag: selectedTag !== "all" ? selectedTag : undefined,
    isOptedOut:
      filterOptedOut === "opted-out"
        ? true
        : filterOptedOut === "active"
          ? false
          : undefined,
  });

  const pagination = usePagination(contacts || [], { pageSize: 15 });

  const stats = useQuery(api.contacts.getContactStats, {});
  const tags = useQuery(api.contacts.getTags, {});

  const deleteContact = useMutation(api.contacts.deleteContact);

  const handleDelete = async (contactId: Id<"contacts">) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteContact({ contactId });
      toast.success("Contact deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete contact"
      );
    }
  };

  const handleEdit = (contactId: Id<"contacts">) => {
    setSelectedContact(contactId);
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSelectedTag("all");
    setFilterOptedOut("all");
  };

  const hasFilters = searchInput || selectedTag !== "all" || filterOptedOut !== "all";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {intl.formatMessage({ id: "page.contacts.title" })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {intl.formatMessage({ id: "page.contacts.subtitle" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <FileUp className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: "page.contacts.importContacts" })}
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: "page.contacts.addContact" })}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: "page.contacts.totalContacts" })}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: "page.contacts.activeContacts" })}
                </p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: "page.contacts.optedOut" })}
                </p>
                <p className="text-2xl font-bold">{stats.optedOut}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={intl.formatMessage({ id: "page.contacts.searchPlaceholder" })}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger>
              <SelectValue placeholder={intl.formatMessage({ id: "page.contacts.filterByTag" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {intl.formatMessage({ id: "page.contacts.allTags" })}
              </SelectItem>
              {tags?.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOptedOut} onValueChange={setFilterOptedOut}>
            <SelectTrigger>
              <SelectValue placeholder={intl.formatMessage({ id: "page.contacts.filterByStatus" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {intl.formatMessage({ id: "page.contacts.allContacts" })}
              </SelectItem>
              <SelectItem value="active">
                {intl.formatMessage({ id: "page.contacts.activeOnly" })}
              </SelectItem>
              <SelectItem value="opted-out">
                {intl.formatMessage({ id: "page.contacts.optedOutOnly" })}
              </SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg">
        {!contacts ? (
          <div className="p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : contacts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>
                {intl.formatMessage({ id: "page.contacts.noContacts" })}
              </EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? intl.formatMessage({ id: "page.contacts.noContactsFilter" })
                  : intl.formatMessage({ id: "page.contacts.noContactsDesc" })}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {!hasFilters && (
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: "page.contacts.addContact" })}
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {intl.formatMessage({ id: "common.name" })}
                  </TableHead>
                  <TableHead>
                    {intl.formatMessage({ id: "common.phone" })}
                  </TableHead>
                  <TableHead>
                    {intl.formatMessage({ id: "common.email" })}
                  </TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>
                    {intl.formatMessage({ id: "common.status" })}
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((contact) => (
                  <TableRow key={contact._id}>
                    <TableCell className="font-medium">
                      {contact.firstName || contact.lastName
                        ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>{contact.phoneNumber}</TableCell>
                    <TableCell>{contact.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.length > 0
                          ? contact.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.isOptedOut ? (
                        <Badge variant="destructive">
                          {intl.formatMessage({ id: "page.contacts.optedOut" })}
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          {intl.formatMessage({ id: "page.contacts.activeContacts" })}
                        </Badge>
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
                          <DropdownMenuItem onClick={() => handleEdit(contact._id)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {intl.formatMessage({ id: "page.contacts.editContact" })}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(contact._id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {intl.formatMessage({ id: "page.contacts.deleteContact" })}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t p-4">
              <PaginationControls {...pagination} itemLabel="contacts" />
            </div>
          </>
        )}
      </div>

      {/* Create Dialog */}
      <CreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {selectedContact && (
        <EditContactDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          contactId={selectedContact}
        />
      )}

      {/* Import Dialog */}
      <ImportContactsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}

function CreateContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const intl = useIntl();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const createContact = useMutation(api.contacts.createContact);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createContact({
        phoneNumber,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        tags,
      });

      toast.success("Contact created successfully");
      onOpenChange(false);

      // Reset form
      setPhoneNumber("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setTagsInput("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create contact"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "page.contacts.addContact" })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: "page.contacts.createNew" })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">
                  {intl.formatMessage({ id: "page.contacts.firstName" })}
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">
                  {intl.formatMessage({ id: "page.contacts.lastName" })}
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">
                {intl.formatMessage({ id: "common.email" })}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="tags">
                {intl.formatMessage({ id: "page.contacts.tagsComma" })}
              </Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vip, customer, prospect"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button type="submit">
              {intl.formatMessage({ id: "page.contacts.createContact" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditContactDialog({
  open,
  onOpenChange,
  contactId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: Id<"contacts">;
}) {
  const intl = useIntl();
  const contact = useQuery(api.contacts.getContact, { contactId });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const updateContact = useMutation(api.contacts.updateContact);

  // Load contact data
  useState(() => {
    if (contact) {
      setPhoneNumber(contact.phoneNumber);
      setFirstName(contact.firstName || "");
      setLastName(contact.lastName || "");
      setEmail(contact.email || "");
      setTagsInput(contact.tags.join(", "));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateContact({
        contactId,
        phoneNumber,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        tags,
      });

      toast.success("Contact updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update contact"
      );
    }
  };

  if (!contact) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "page.contacts.editContact" })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: "page.contacts.updateInfo" })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">
                  {intl.formatMessage({ id: "page.contacts.firstName" })}
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">
                  {intl.formatMessage({ id: "page.contacts.lastName" })}
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">
                {intl.formatMessage({ id: "common.email" })}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="tags">
                {intl.formatMessage({ id: "page.contacts.tagsComma" })}
              </Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vip, customer, prospect"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button type="submit">
              {intl.formatMessage({ id: "page.contacts.updateContact" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportContactsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const intl = useIntl();
  const [csvText, setCsvText] = useState("");

  const importContacts = useMutation(api.contacts.importContacts);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse CSV (simple implementation)
      const lines = csvText.trim().split("\n");
      const contacts = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(",").map((p) => p.trim());
        if (parts.length === 0) continue;

        contacts.push({
          phoneNumber: parts[0],
          firstName: parts[1] || undefined,
          lastName: parts[2] || undefined,
          email: parts[3] || undefined,
          tags: parts[4] ? parts[4].split(";").map((t) => t.trim()) : undefined,
        });
      }

      const result = await importContacts({ contacts });

      toast.success(
        `Import complete: ${result.imported} imported, ${result.skipped} skipped${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}`
      );

      onOpenChange(false);
      setCsvText("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import contacts"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "page.contacts.importContacts" })}
          </DialogTitle>
          <DialogDescription>
            Import contacts from CSV format. Format: phone,firstName,lastName,email,tags
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv">
                {intl.formatMessage({ id: "page.contacts.csvData" })}
              </Label>
              <Textarea
                id="csv"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`+1234567890,John,Doe,john@example.com,vip;customer
+0987654321,Jane,Smith,jane@example.com,prospect`}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">
                {intl.formatMessage({ id: "page.contacts.csvFormat" })}
              </p>
              <code className="block bg-muted p-2 rounded">
                phone,firstName,lastName,email,tags (semicolon-separated)
              </code>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button type="submit">
              {intl.formatMessage({ id: "page.contacts.importContacts" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
